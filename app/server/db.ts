import { BOATS, DRIVERS, REVIEWER_NAMES, REVIEW_SEED_BODIES, type Boat } from "../src/data/fleet";
import type { AccessNeed, AgeGroup, Situation, Urgency } from "../shared/priority";
import type { BoatClass } from "../shared/pricing";

export type Review = {
  id: string;
  driverId: string;
  userId: string;
  userName: string;
  rating: number;
  body: string;
  createdAt: string;
  tripId?: string | null;
};

export type Trip = {
  id: string;
  userId: string | null;
  pickupIslandId: string;
  pickupDockId: string;
  destinationIslandId: string;
  destinationDockId: string;
  boatId: string;
  driverId: string;
  boatClass: BoatClass;
  passengers: number;
  km: number;
  fare: number;
  etaMinutes: number;
  status: "in_progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type Incident = {
  id: string;
  userId: string | null;
  situation: Situation;
  ageGroup: AgeGroup | null;
  accessNeeds: AccessNeed[];
  urgency: Urgency | null;
  notes: string;
  position: string;
  boatId: string | null;
  status: "active" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

export type DriverApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  homeIslandId: string;
  yearsOperating: number;
  boatClasses: BoatClass[];
  licenseId: string;
  languages: string[];
  availability: string[];
  experience: string;
  difficultSituation: string;
  emergencyTraining: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  decidedAt: string | null;
};

type State = {
  boats: Boat[];
  reviews: Review[];
  trips: Trip[];
  incidents: Incident[];
  applications: DriverApplication[];
  extraDrivers: typeof DRIVERS;
};

export const state: State = {
  boats: [],
  reviews: [],
  trips: [],
  incidents: [],
  applications: [],
  extraDrivers: [],
};

let seq = 0;
export function id(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`;
}

/**
 * Turns each driver's seeded average into real review rows, so the number on
 * a card and the list underneath it can never contradict each other. Ratings
 * are chosen to land on the seeded mean rather than being drawn at random.
 */
function seedReviews(): Review[] {
  const out: Review[] = [];
  let n = 0;
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

  for (const driver of DRIVERS) {
    const count = driver.seedReviewCount;
    // Distribute integer ratings whose mean is as close as possible to seedRating.
    const target = driver.seedRating * count;
    const ratings: number[] = Array(count).fill(5);
    let current = 5 * count;
    let i = 0;
    while (current - target >= 1 && i < count) {
      ratings[i] = 4;
      current -= 1;
      i += 1;
    }
    if (current - target >= 0.5 && i < count) {
      ratings[i] = 4;
    }

    ratings.forEach((rating, idx) => {
      n += 1;
      out.push({
        id: `rv-seed-${driver.id}-${idx}`,
        driverId: driver.id,
        userId: `seed-user-${n}`,
        userName: REVIEWER_NAMES[n % REVIEWER_NAMES.length],
        rating,
        body: REVIEW_SEED_BODIES[n % REVIEW_SEED_BODIES.length],
        createdAt: daysAgo(3 + idx * 9 + (n % 5)),
        tripId: null,
      });
    });
  }
  return out;
}

export function resetState(): void {
  state.boats = BOATS.map((b) => ({ ...b }));
  state.reviews = seedReviews();
  state.trips = [];
  state.incidents = [];
  state.applications = [];
  state.extraDrivers = [];
  assertRescueCapacity();
}

/**
 * Boot check. If no rescue-equipped boat is free at startup, every emergency
 * request fails and the failure only shows up mid-demo, so fail loudly here
 * instead.
 */
export function assertRescueCapacity(): void {
  const free = state.boats.filter((b) => b.emergencyEquipped && b.status === "available");
  if (free.length === 0) {
    throw new Error(
      "Fleet seed is invalid: no rescue-equipped boat is available. Emergency dispatch would fail for every caller.",
    );
  }
  if (free.length < 4) {
    console.warn(`[whalecall] only ${free.length} rescue boats available at boot; expected at least 4.`);
  }
}

export function allDrivers() {
  return [...DRIVERS, ...state.extraDrivers];
}

export function driverById(driverId: string) {
  return allDrivers().find((d) => d.id === driverId);
}

/** The live mean, recomputed from stored reviews. Never read a frozen rating. */
export function driverRating(driverId: string): { rating: number | null; count: number } {
  const rows = state.reviews.filter((r) => r.driverId === driverId);
  if (rows.length === 0) return { rating: null, count: 0 };
  const mean = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  return { rating: Math.round(mean * 10) / 10, count: rows.length };
}

export function ratingDistribution(driverId: string): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of state.reviews.filter((x) => x.driverId === driverId)) {
    const k = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    dist[k] += 1;
  }
  return dist;
}

resetState();
