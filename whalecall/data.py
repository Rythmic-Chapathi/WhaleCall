"""In-memory seed data and shared application state for WhaleCall.

Deliberately not backed by a database: this is a one-day build and the
"smart" part of the product is the priority algorithm, not persistence.
Everything here is a plain Python structure so it's easy to inspect,
reset, and reason about live during a demo.
"""
from __future__ import annotations

import hashlib
import math
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from models import Boat, Island, RideRequest, User
from priority import Call

# ---------------------------------------------------------------------------
# The archipelago
# ---------------------------------------------------------------------------

ISLANDS: list[Island] = [
    Island(id="kelp-hollow", name="Kelp Hollow", role="home", x_pct=20, y_pct=60),
    Island(id="port-marlin", name="Port Marlin", role="city", x_pct=50, y_pct=30),
    Island(id="driftmarket-isle", name="Driftmarket Isle", role="store", x_pct=70, y_pct=55),
    Island(id="sanctuary-point", name="Sanctuary Point", role="hospital", x_pct=35, y_pct=80),
    Island(id="reeftop-isle", name="Reeftop Isle", role="school", x_pct=65, y_pct=20),
]

ISLANDS_BY_ID: dict[str, Island] = {i.id: i for i in ISLANDS}
HOSPITAL_ISLAND_ID = "sanctuary-point"
DEFAULT_HOME_ISLAND_ID = "kelp-hollow"

# A simple, deterministic distance -> minutes scale. Tuned so cross-island
# hops land in a friendly "a few minutes to ~15 minutes" demo range.
MINUTES_PER_DISTANCE_UNIT = 0.35
MIN_ETA_MINUTES = 2.0


def island_distance(a_id: str, b_id: str) -> float:
    a, b = ISLANDS_BY_ID[a_id], ISLANDS_BY_ID[b_id]
    return math.hypot(a.x_pct - b.x_pct, a.y_pct - b.y_pct)


def eta_minutes(a_id: str, b_id: str) -> float:
    if a_id == b_id:
        return MIN_ETA_MINUTES
    dist = island_distance(a_id, b_id)
    return max(MIN_ETA_MINUTES, round(dist * MINUTES_PER_DISTANCE_UNIT, 1))


# ---------------------------------------------------------------------------
# Boats ("Pod Guides")
# ---------------------------------------------------------------------------

BOATS: list[Boat] = [
    Boat(id="boat-1", captain_name="Captain Manaia", capacity=4, vouch_count=27,
         current_island_id="kelp-hollow", available=True, is_emergency=False),
    Boat(id="boat-2", captain_name="Captain Teuila", capacity=6, vouch_count=41,
         current_island_id="port-marlin", available=True, is_emergency=True),
    Boat(id="boat-3", captain_name="Captain Rongo", capacity=2, vouch_count=12,
         current_island_id="driftmarket-isle", available=True, is_emergency=False),
    Boat(id="boat-4", captain_name="Captain Hina", capacity=8, vouch_count=63,
         current_island_id="reeftop-isle", available=True, is_emergency=True),
    Boat(id="boat-5", captain_name="Captain Vaiana", capacity=4, vouch_count=19,
         current_island_id="sanctuary-point", available=True, is_emergency=True),
]

BOATS_BY_ID: dict[str, Boat] = {b.id: b for b in BOATS}


def nearest_available_boat(origin_island_id: str, emergency_only: bool = False) -> Optional[Boat]:
    """Pick the closest free boat, preferring the emergency pool for SOS calls
    when one is free (falls back to any free boat if the pool is empty)."""
    candidates = [b for b in BOATS if b.available]
    if emergency_only:
        emergency_candidates = [b for b in candidates if b.is_emergency]
        if emergency_candidates:
            candidates = emergency_candidates
    if not candidates:
        return None
    return min(candidates, key=lambda b: island_distance(b.current_island_id, origin_island_id))


def nearby_boats(destination_island_id: str, origin_island_id: str) -> list[dict]:
    """Available boats sorted by total ETA (boat -> pickup -> destination)."""
    results = []
    for boat in BOATS:
        if not boat.available:
            continue
        pickup_eta = eta_minutes(boat.current_island_id, origin_island_id)
        transport_eta = eta_minutes(origin_island_id, destination_island_id)
        results.append({
            "boat": boat,
            "eta_minutes": round(pickup_eta + transport_eta, 1),
        })
    results.sort(key=lambda r: r["eta_minutes"])
    return results


def release_boat(boat_id: str) -> None:
    boat = BOATS_BY_ID.get(boat_id)
    if boat:
        boat.available = True


def hold_boat(boat_id: str) -> None:
    boat = BOATS_BY_ID.get(boat_id)
    if boat:
        boat.available = False


# ---------------------------------------------------------------------------
# Users & sessions (minimal, hackathon-grade auth)
# ---------------------------------------------------------------------------

@dataclass
class StoredUser:
    user: User
    password_hash: str


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


USERS: dict[str, StoredUser] = {}
SESSIONS: dict[str, str] = {}  # session_id -> user_id


def seed_users() -> None:
    demo = User(id="user-demo", name="Lani", home_island_id="kelp-hollow")
    USERS[demo.id] = StoredUser(user=demo, password_hash=_hash_password("whalecall"))


def create_user(name: str, home_island_id: str, password: str) -> User:
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    user = User(id=user_id, name=name, home_island_id=home_island_id)
    USERS[user_id] = StoredUser(user=user, password_hash=_hash_password(password))
    return user


def find_user_by_name(name: str) -> Optional[StoredUser]:
    for stored in USERS.values():
        if stored.user.name.lower() == name.lower():
            return stored
    return None


def verify_password(stored: StoredUser, password: str) -> bool:
    return stored.password_hash == _hash_password(password)


def create_session(user_id: str) -> str:
    session_id = secrets.token_urlsafe(24)
    SESSIONS[session_id] = user_id
    return session_id


def destroy_session(session_id: Optional[str]) -> None:
    if session_id:
        SESSIONS.pop(session_id, None)


def get_user_from_session(session_id: Optional[str]) -> Optional[User]:
    if not session_id:
        return None
    user_id = SESSIONS.get(session_id)
    if not user_id:
        return None
    stored = USERS.get(user_id)
    return stored.user if stored else None


seed_users()


# ---------------------------------------------------------------------------
# Ride requests, live tracking & the dispatcher queue
# ---------------------------------------------------------------------------

@dataclass
class Tracking:
    """Two-phase linear interpolation: boat's current island -> pickup
    (the rider's origin island) -> destination island. Good enough to
    animate a boat moving on the map without any real GPS."""
    request_id: str
    boat_start_island_id: str
    origin_island_id: str
    destination_island_id: str
    pickup_minutes: float
    transport_minutes: float
    started_at: datetime
    boat_id: str
    released: bool = False

    @property
    def total_minutes(self) -> float:
        return self.pickup_minutes + self.transport_minutes

    def elapsed_minutes(self, now: datetime) -> float:
        return (now - self.started_at).total_seconds() / 60

    def position(self, now: datetime) -> dict:
        a = ISLANDS_BY_ID[self.boat_start_island_id]
        b = ISLANDS_BY_ID[self.origin_island_id]
        c = ISLANDS_BY_ID[self.destination_island_id]
        elapsed = self.elapsed_minutes(now)

        if elapsed <= self.pickup_minutes:
            phase = "to_pickup"
            t = 1.0 if self.pickup_minutes <= 0 else min(1.0, elapsed / self.pickup_minutes)
            x = a.x_pct + (b.x_pct - a.x_pct) * t
            y = a.y_pct + (b.y_pct - a.y_pct) * t
        else:
            phase = "to_destination"
            leg_elapsed = elapsed - self.pickup_minutes
            t = 1.0 if self.transport_minutes <= 0 else min(1.0, leg_elapsed / self.transport_minutes)
            x = b.x_pct + (c.x_pct - b.x_pct) * t
            y = b.y_pct + (c.y_pct - b.y_pct) * t

        remaining = max(0.0, self.total_minutes - elapsed)
        arrived = elapsed >= self.total_minutes
        return {
            "phase": phase,
            "x_pct": round(x, 2),
            "y_pct": round(y, 2),
            "eta_remaining_minutes": round(remaining, 1),
            "arrived": arrived,
        }


@dataclass
class CallRecord:
    """Joins a priority Call to its RideRequest for the dispatcher view."""
    call: Call
    ride_request_id: str


RIDE_REQUESTS: dict[str, RideRequest] = {}
TRACKING: dict[str, Tracking] = {}
CALLS: dict[str, CallRecord] = {}


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
