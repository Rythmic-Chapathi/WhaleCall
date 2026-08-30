/**
 * Client for the WhaleCall API.
 *
 * Error handling rule: the server's own message is always what the user sees.
 * The "check your connection" line is reserved for a genuine network failure,
 * because showing it on a request that arrived and was answered tells the user
 * to fix the wrong thing.
 */

export type ApiErrorShape = { error: string; code?: string; field?: string };

export class ApiError extends Error {
  code: string;
  field?: string;
  status: number;
  constructor(message: string, status: number, code = "ERROR", field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

let authHeaders: () => Record<string, string> = () => ({});
export function setAuthHeaderSource(fn: () => Record<string, string>) {
  authHeaders = fn;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    // Only a genuine transport failure reaches here.
    throw new ApiError(
      "We could not reach the network. Check your connection and try again.",
      0,
      "NETWORK",
    );
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const body = (data ?? {}) as ApiErrorShape;
    throw new ApiError(
      body.error || `Request failed (${res.status}).`,
      res.status,
      body.code || "ERROR",
      body.field,
    );
  }
  return data as T;
}

/** Renders any thrown value as something worth showing a user. */
export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return "We could not reach the network. Check your connection and try again.";
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong.";
}

export function errorField(err: unknown): string | undefined {
  return err instanceof ApiError ? err.field : undefined;
}

export type FleetBoat = {
  id: string;
  name: string;
  driverId: string;
  boatClass: "catamaran" | "water_taxi" | "cruiser" | "speedboat";
  capacity: number;
  islandId: string;
  islandName: string;
  status: "available" | "on_trip" | "en_route";
  emergencyEquipped: boolean;
  rating: number | null;
  reviewCount: number;
  driver: { id: string; name: string; yearsActive: number; homeIslandId: string; languages: string[] } | null;
};

export type TripRecord = {
  id: string;
  userId: string | null;
  pickupIslandId: string;
  pickupDockId: string;
  destinationIslandId: string;
  destinationDockId: string;
  boatId: string;
  driverId: string;
  boatClass: FleetBoat["boatClass"];
  passengers: number;
  km: number;
  fare: number;
  etaMinutes: number;
  status: "in_progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
  pickupIslandName: string;
  pickupDockName: string;
  destinationIslandName: string;
  destinationDockName: string;
  driverName: string;
  driverRating: number | null;
  boatName: string;
  rated: boolean;
};

export type QueueRow = {
  id: string;
  situation: "taking_on_water" | "medical" | "stranded" | "other";
  ageGroup: "child" | "adult" | "older_adult" | null;
  accessNeeds: Array<"mobility" | "vision" | "hearing" | "cognitive">;
  urgency: "routine" | "urgent" | "critical" | null;
  position: string;
  notes: string;
  createdAt: string;
  score: number;
  reason: string;
  minutesWaiting: number;
  boatName: string | null;
  driverName: string | null;
  breakdown: { situation: number; age: number; access: number; urgency: number; waitBonus: number; total: number };
};

export type IncidentRecord = QueueRow & {
  status: "active" | "resolved";
  resolvedAt: string | null;
  etaMinutes: number | null;
  retasked?: boolean;
};

export type Review = {
  id: string; driverId: string; userId: string; userName: string;
  rating: number; body: string; createdAt: string; tripId: string | null;
};

export type DriverProfile = {
  id: string; name: string; homeIslandId: string; homeIslandName: string;
  yearsActive: number; tripsCompleted: number; boatClasses: FleetBoat["boatClass"][];
  languages: string[]; rating: number | null; reviewCount: number;
  distribution: Record<string, number>;
  boat: { id: string; name: string; boatClass: FleetBoat["boatClass"]; status: string } | null;
};

export type Application = {
  id: string; fullName: string; email: string; phone: string; homeIslandId: string;
  yearsOperating: number; boatClasses: string[]; licenseId: string; languages: string[];
  availability: string[]; experience: string; difficultSituation: string;
  emergencyTraining: string; status: "pending" | "approved" | "rejected";
  submittedAt: string; decidedAt: string | null;
};

export const api = {
  fleet: () => request<{ boats: FleetBoat[]; stats: { total: number; available: number; onTrip: number } }>("/api/fleet"),

  createTrip: (body: Record<string, unknown>) => request<TripRecord>("/api/trips", { method: "POST", body: JSON.stringify(body) }),
  trip: (id: string) => request<TripRecord>(`/api/trips/${id}`),
  trips: (page = 1) => request<{ trips: TripRecord[]; total: number; hasMore: boolean; stats: { trips: number; km: number; spent: number } }>(`/api/trips?page=${page}`),
  completeTrip: (id: string) => request<TripRecord>(`/api/trips/${id}/complete`, { method: "POST" }),
  claimTrips: (tripIds: string[]) => request<{ claimed: number }>("/api/trips/claim", { method: "POST", body: JSON.stringify({ tripIds }) }),

  createEmergency: (body: Record<string, unknown>) => request<IncidentRecord>("/api/emergencies", { method: "POST", body: JSON.stringify(body) }),
  emergency: (id: string) => request<IncidentRecord>(`/api/emergencies/${id}`),
  queue: () => request<QueueRow[]>("/api/emergencies/queue"),
  resolveEmergency: (id: string) => request<IncidentRecord>(`/api/emergencies/${id}/resolve`, { method: "POST" }),
  ageEmergency: (id: string, minutes = 5) => request<IncidentRecord>(`/api/emergencies/${id}/age`, { method: "POST", body: JSON.stringify({ minutes }) }),

  driver: (id: string) => request<DriverProfile>(`/api/drivers/${id}`),
  driverReviews: (id: string, page = 1) => request<{ reviews: Review[]; total: number; hasMore: boolean; page: number }>(`/api/drivers/${id}/reviews?page=${page}`),
  createReview: (id: string, body: { rating: number; body: string; tripId?: string | null }) =>
    request<{ review: Review; rating: number | null; count: number }>(`/api/drivers/${id}/reviews`, { method: "POST", body: JSON.stringify(body) }),
  updateReview: (id: string, body: { rating: number; body: string }) =>
    request<{ review: Review; rating: number | null; count: number }>(`/api/drivers/${id}/reviews`, { method: "PATCH", body: JSON.stringify(body) }),

  applications: () => request<Application[]>("/api/drivers/applications"),
  createApplication: (body: Record<string, unknown>) =>
    request<{ id: string; status: string; submittedAt: string }>("/api/drivers/applications", { method: "POST", body: JSON.stringify(body) }),
  decideApplication: (id: string, decision: "approve" | "reject") =>
    request<Application>(`/api/drivers/applications/${id}/${decision}`, { method: "POST" }),

  resetDemo: () => request<{ ok: boolean }>("/api/dev/reset", { method: "POST" }),
};
