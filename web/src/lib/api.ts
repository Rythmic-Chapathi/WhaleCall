// Typed client for the FastAPI backend. Mirrors whalecall/models.py.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export type Island = {
  id: string;
  name: string;
  role: "home" | "city" | "store" | "hospital" | "school";
  x_pct: number;
  y_pct: number;
};

export type Boat = {
  id: string;
  captain_name: string;
  capacity: number;
  vouch_count: number;
  current_island_id: string;
  available: boolean;
  is_emergency: boolean;
};

export type FleetState = {
  boat_id: string;
  x_pct: number;
  y_pct: number;
  destination_island_id: string | null;
  phase: string;
  moving: boolean;
};

export type FleetEntry = {
  boat: Boat;
  state: FleetState;
  current_island_name: string;
  destination_name: string | null;
};

export type NearbyBoat = { boat: Boat; eta_minutes: number };

export type AgeBracket = "child" | "adult" | "elderly";
export type Accessibility = "mobility" | "visual" | "hearing" | "cognitive" | "none";
export type Medical = "routine" | "urgent" | "critical";

export type SOSResponse = {
  request_id: string;
  boat: Boat | null;
  eta_minutes: number | null;
  priority_score: number;
  priority_breakdown: { age: number; accessibility: number; medical: number; minutes_waited: number; wait_bonus: number; total: number };
  destination: Island;
  origin: Island;
  queued: boolean;
};

export type RideBookingResponse = {
  request_id: string;
  boat: Boat;
  eta_minutes: number;
  destination: Island;
  origin: Island;
};

export type TrackingUpdate = {
  phase: "to_pickup" | "to_destination";
  x_pct: number;
  y_pct: number;
  eta_remaining_minutes: number;
  arrived: boolean;
  error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request to ${path} failed (${res.status})`);
  return data as T;
}

export const api = {
  islands: () => request<Island[]>("/api/islands"),
  fleet: () => request<FleetEntry[]>("/api/fleet"),
  nearbyBoats: (destinationId: string, originId: string) =>
    request<NearbyBoat[]>(`/api/boats/nearby?destination_id=${destinationId}&origin_id=${originId}`),
  sendSOS: (body: { age_bracket: AgeBracket; accessibility: Accessibility; medical: Medical; origin_island_id: string }) =>
    request<SOSResponse>("/api/sos", { method: "POST", body: JSON.stringify(body) }),
  bookRide: (body: { destination_island_id: string; origin_island_id: string; boat_id: string }) =>
    request<RideBookingResponse>("/api/ride-request", { method: "POST", body: JSON.stringify(body) }),
};

export function islandById(islands: Island[], id: string | null | undefined): Island | undefined {
  return islands.find((i) => i.id === id);
}

export const ISLAND_ICONS: Record<Island["role"], string> = {
  home: "🏠",
  city: "🏙️",
  store: "🏬",
  hospital: "➕",
  school: "🏫",
};
