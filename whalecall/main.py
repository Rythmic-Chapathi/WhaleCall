"""WhaleCall -- a rideshare-style boat transport app for an island
archipelago with no bridges or roads. FastAPI backend; Jinja2 + a thin
vanilla-JS/SVG frontend. See README.md for the full pitch.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import Cookie, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import data
from models import (
    AuthResponse,
    Island,
    LoginRequest,
    RideBookingRequest,
    RideBookingResponse,
    RideRequest,
    SignupRequest,
    SOSIntake,
    SOSResponse,
    User,
)
from priority import Call, score_breakdown, sorted_queue

app = FastAPI(title="WhaleCall")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

SESSION_COOKIE = "wc_session"


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def current_user(wc_session: Optional[str] = Cookie(default=None)) -> Optional[User]:
    return data.get_user_from_session(wc_session)


def require_user(wc_session: Optional[str] = Cookie(default=None)) -> User:
    user = data.get_user_from_session(wc_session)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    return user


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@app.get("/")
def landing(request: Request, wc_session: Optional[str] = Cookie(default=None)):
    user = data.get_user_from_session(wc_session)
    return templates.TemplateResponse("landing.html", {"request": request, "user": user})


@app.get("/sos")
def sos_page(request: Request, wc_session: Optional[str] = Cookie(default=None)):
    user = data.get_user_from_session(wc_session)
    return templates.TemplateResponse(
        "sos.html",
        {"request": request, "user": user, "islands": [i.model_dump() for i in data.ISLANDS],
         "default_origin": user.home_island_id if user else data.DEFAULT_HOME_ISLAND_ID},
    )


@app.get("/home")
def home_page(request: Request, wc_session: Optional[str] = Cookie(default=None)):
    user = data.get_user_from_session(wc_session)
    if not user:
        return RedirectResponse(url="/")
    return templates.TemplateResponse(
        "home.html",
        {"request": request, "user": user, "islands": [i.model_dump() for i in data.ISLANDS]},
    )


@app.get("/rides")
def rides_page(request: Request, wc_session: Optional[str] = Cookie(default=None)):
    user = data.get_user_from_session(wc_session)
    if not user:
        return RedirectResponse(url="/")
    my_rides = [r for r in data.RIDE_REQUESTS.values() if r.user_id == user.id]
    my_rides.sort(key=lambda r: r.created_at, reverse=True)
    return templates.TemplateResponse(
        "rides.html",
        {"request": request, "user": user, "rides": my_rides, "islands_by_id": data.ISLANDS_BY_ID,
         "boats_by_id": data.BOATS_BY_ID},
    )


@app.get("/dispatcher")
def dispatcher_page(request: Request, wc_session: Optional[str] = Cookie(default=None)):
    user = data.get_user_from_session(wc_session)
    return templates.TemplateResponse("dispatcher.html", {"request": request, "user": user})


# ---------------------------------------------------------------------------
# Islands & boats
# ---------------------------------------------------------------------------

@app.get("/api/islands", response_model=list[Island])
def api_islands():
    return data.ISLANDS


@app.get("/api/boats/nearby")
def api_boats_nearby(destination_id: str, origin_id: Optional[str] = None,
                      wc_session: Optional[str] = Cookie(default=None)):
    if destination_id not in data.ISLANDS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown destination island")
    user = data.get_user_from_session(wc_session)
    origin = origin_id or (user.home_island_id if user else data.DEFAULT_HOME_ISLAND_ID)
    if origin not in data.ISLANDS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown origin island")
    results = data.nearby_boats(destination_id, origin)
    return [{"boat": r["boat"], "eta_minutes": r["eta_minutes"]} for r in results]


# ---------------------------------------------------------------------------
# SOS flow -- no login required, taps only, always routes to Sanctuary Point
# ---------------------------------------------------------------------------

@app.post("/api/sos", response_model=SOSResponse)
def api_sos(intake: SOSIntake, wc_session: Optional[str] = Cookie(default=None)):
    if intake.origin_island_id not in data.ISLANDS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown origin island")

    user = data.get_user_from_session(wc_session)
    now = data.now_utc()
    request_id = data.new_id("sos")

    call = Call(
        id=request_id,
        age_bracket=intake.age_bracket,
        accessibility=intake.accessibility,
        medical=intake.medical,
        created_at=now,
        is_sos=True,
    )
    score = call.priority_score(now)
    breakdown = score_breakdown(call, now)

    boat = data.nearest_available_boat(intake.origin_island_id, emergency_only=True)
    destination = data.ISLANDS_BY_ID[data.HOSPITAL_ISLAND_ID]
    origin = data.ISLANDS_BY_ID[intake.origin_island_id]

    ride = RideRequest(
        id=request_id,
        user_id=user.id if user else None,
        origin_island_id=intake.origin_island_id,
        destination_island_id=data.HOSPITAL_ISLAND_ID,
        is_sos=True,
        age_bracket=intake.age_bracket,
        accessibility=intake.accessibility,
        medical=intake.medical,
        created_at=now.isoformat(),
        boat_id=boat.id if boat else None,
        status="assigned" if boat else "unassigned",
    )
    data.RIDE_REQUESTS[request_id] = ride
    call.meta = {
        "origin_name": origin.name,
        "destination_name": destination.name,
        "boat_captain": boat.captain_name if boat else None,
        "status": ride.status,
    }
    data.CALLS[request_id] = data.CallRecord(call=call, ride_request_id=request_id)

    eta = None
    if boat:
        data.hold_boat(boat.id)
        pickup_eta = data.eta_minutes(boat.current_island_id, intake.origin_island_id)
        transport_eta = data.eta_minutes(intake.origin_island_id, data.HOSPITAL_ISLAND_ID)
        eta = round(pickup_eta + transport_eta, 1)
        data.TRACKING[request_id] = data.Tracking(
            request_id=request_id,
            boat_start_island_id=boat.current_island_id,
            origin_island_id=intake.origin_island_id,
            destination_island_id=data.HOSPITAL_ISLAND_ID,
            pickup_minutes=pickup_eta,
            transport_minutes=transport_eta,
            started_at=now,
            boat_id=boat.id,
        )

    return SOSResponse(
        request_id=request_id,
        boat=boat,
        eta_minutes=eta,
        priority_score=round(score, 2),
        priority_breakdown=breakdown,
        destination=destination,
        origin=origin,
        queued=boat is None,
    )


# ---------------------------------------------------------------------------
# Standard flow -- login required
# ---------------------------------------------------------------------------

@app.post("/api/ride-request", response_model=RideBookingResponse)
def api_ride_request(booking: RideBookingRequest, wc_session: Optional[str] = Cookie(default=None)):
    user = require_user(wc_session)
    if booking.destination_island_id not in data.ISLANDS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown destination island")
    origin_id = booking.origin_island_id or user.home_island_id
    if origin_id not in data.ISLANDS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown origin island")

    boat = data.BOATS_BY_ID.get(booking.boat_id)
    if not boat or not boat.available:
        raise HTTPException(status_code=409, detail="That boat is no longer available")

    now = data.now_utc()
    request_id = data.new_id("ride")

    pickup_eta = data.eta_minutes(boat.current_island_id, origin_id)
    transport_eta = data.eta_minutes(origin_id, booking.destination_island_id)
    total_eta = round(pickup_eta + transport_eta, 1)

    ride = RideRequest(
        id=request_id,
        user_id=user.id,
        origin_island_id=origin_id,
        destination_island_id=booking.destination_island_id,
        is_sos=False,
        created_at=now.isoformat(),
        boat_id=boat.id,
        status="assigned",
    )
    data.RIDE_REQUESTS[request_id] = ride
    data.hold_boat(boat.id)
    data.TRACKING[request_id] = data.Tracking(
        request_id=request_id,
        boat_start_island_id=boat.current_island_id,
        origin_island_id=origin_id,
        destination_island_id=booking.destination_island_id,
        pickup_minutes=pickup_eta,
        transport_minutes=transport_eta,
        started_at=now,
        boat_id=boat.id,
    )

    # Standard rides join the dispatcher queue too (lightly biased, no
    # emergency weight) so the sonar view shows the whole system at once.
    call = Call(
        id=request_id,
        age_bracket="adult",
        accessibility="none",
        medical="routine",
        created_at=now,
        is_sos=False,
        meta={
            "origin_name": data.ISLANDS_BY_ID[origin_id].name,
            "destination_name": data.ISLANDS_BY_ID[booking.destination_island_id].name,
            "boat_captain": boat.captain_name,
            "status": ride.status,
        },
    )
    data.CALLS[request_id] = data.CallRecord(call=call, ride_request_id=request_id)

    return RideBookingResponse(
        request_id=request_id,
        boat=boat,
        eta_minutes=total_eta,
        destination=data.ISLANDS_BY_ID[booking.destination_island_id],
        origin=data.ISLANDS_BY_ID[origin_id],
    )


# ---------------------------------------------------------------------------
# Auth (minimal -- session cookie only, good enough for a hackathon demo)
# ---------------------------------------------------------------------------

@app.post("/api/signup", response_model=AuthResponse)
def api_signup(body: SignupRequest, response: Response):
    if body.home_island_id not in data.ISLANDS_BY_ID:
        raise HTTPException(status_code=404, detail="Unknown home island")
    if data.find_user_by_name(body.name):
        raise HTTPException(status_code=409, detail="That name is already taken")
    user = data.create_user(body.name, body.home_island_id, body.password)
    session_id = data.create_session(user.id)
    response.set_cookie(SESSION_COOKIE, session_id, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7)
    return AuthResponse(user=user)


@app.post("/api/login", response_model=AuthResponse)
def api_login(body: LoginRequest, response: Response):
    stored = data.find_user_by_name(body.name)
    if not stored or not data.verify_password(stored, body.password):
        raise HTTPException(status_code=401, detail="Invalid name or password")
    session_id = data.create_session(stored.user.id)
    response.set_cookie(SESSION_COOKIE, session_id, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7)
    return AuthResponse(user=stored.user)


@app.post("/api/logout")
def api_logout(response: Response, wc_session: Optional[str] = Cookie(default=None)):
    data.destroy_session(wc_session)
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@app.get("/api/me")
def api_me(wc_session: Optional[str] = Cookie(default=None)):
    user = data.get_user_from_session(wc_session)
    return {"user": user}


# ---------------------------------------------------------------------------
# Live tracking -- simulated boat movement over WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/tracking/{request_id}")
async def ws_tracking(websocket: WebSocket, request_id: str):
    await websocket.accept()
    try:
        tracking = data.TRACKING.get(request_id)
        if not tracking:
            await websocket.send_json({"error": "Unknown or unassigned ride"})
            await websocket.close()
            return

        while True:
            now = data.now_utc()
            pos = tracking.position(now)
            await websocket.send_json(pos)
            if pos["arrived"]:
                if not tracking.released:
                    data.release_boat(tracking.boat_id)
                    tracking.released = True
                    ride = data.RIDE_REQUESTS.get(request_id)
                    if ride:
                        ride.status = "completed"
                    call_record = data.CALLS.get(request_id)
                    if call_record:
                        call_record.call.meta["status"] = "completed"
                break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass


# ---------------------------------------------------------------------------
# Dispatcher sonar view -- live priority-sorted queue over WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/queue")
async def ws_queue(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            now = data.now_utc()
            active = [rec.call for rec in data.CALLS.values()
                      if rec.call.meta.get("status") != "completed"]
            ordered = sorted_queue(active, now)
            payload = []
            for call in ordered:
                breakdown = score_breakdown(call, now)
                payload.append({
                    "id": call.id,
                    "is_sos": call.is_sos,
                    "age_bracket": call.age_bracket,
                    "accessibility": call.accessibility,
                    "medical": call.medical,
                    "score": breakdown["total"],
                    "breakdown": breakdown,
                    "origin_name": call.meta.get("origin_name"),
                    "destination_name": call.meta.get("destination_name"),
                    "boat_captain": call.meta.get("boat_captain"),
                    "status": call.meta.get("status"),
                })
            await websocket.send_json({"calls": payload})
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
