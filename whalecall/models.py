"""Pydantic request/response models for the WhaleCall FastAPI app."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class Island(BaseModel):
    id: str
    name: str
    role: str  # "home" | "city" | "store" | "hospital" | "school"
    x_pct: float
    y_pct: float


class User(BaseModel):
    id: str
    name: str
    home_island_id: str


class Boat(BaseModel):
    id: str
    captain_name: str
    capacity: int
    vouch_count: int
    current_island_id: str
    available: bool = True
    is_emergency: bool = False


class RideRequest(BaseModel):
    id: str
    user_id: Optional[str] = None  # None for anonymous SOS calls
    origin_island_id: str
    destination_island_id: str
    is_sos: bool
    age_bracket: Optional[str] = None
    accessibility: Optional[str] = None
    medical: Optional[str] = None
    created_at: str
    boat_id: Optional[str] = None
    status: str = "assigned"  # assigned | en_route | completed | unassigned


class SOSIntake(BaseModel):
    age_bracket: str = Field(pattern="^(child|adult|elderly)$")
    accessibility: str = Field(pattern="^(mobility|visual|hearing|cognitive|none)$")
    medical: str = Field(pattern="^(routine|urgent|critical)$")
    origin_island_id: str = "kelp-hollow"


class SOSResponse(BaseModel):
    request_id: str
    boat: Optional[Boat]
    eta_minutes: Optional[float]
    priority_score: float
    priority_breakdown: dict
    destination: Island
    origin: Island
    queued: bool = False


class RideBookingRequest(BaseModel):
    destination_island_id: str
    origin_island_id: Optional[str] = None
    boat_id: str


class RideBookingResponse(BaseModel):
    request_id: str
    boat: Boat
    eta_minutes: float
    destination: Island
    origin: Island


class SignupRequest(BaseModel):
    name: str
    home_island_id: str = "kelp-hollow"
    password: str


class LoginRequest(BaseModel):
    name: str
    password: str


class AuthResponse(BaseModel):
    user: User
