import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  state, id, resetState, driverById, driverRating, ratingDistribution, allDrivers,
  type Trip, type Incident, type DriverApplication,
} from "./db";
import { ISLANDS, getIsland, getDock, dockBelongsTo, routeKm, etaMinutes } from "../src/data/islands";
import { calculateFare, type BoatClass } from "../shared/pricing";
import { scoreIncident, explainScore, sortByPriority } from "../shared/priority";

const app = express();
app.use(express.json());

const IS_PROD = process.env.NODE_ENV === "production";

/** Errors carry a machine code and, where relevant, the field that failed. */
class ApiError extends Error {
  constructor(public status: number, message: string, public code: string, public field?: string) {
    super(message);
  }
}

const asyncRoute =
  (fn: (req: Request, res: Response) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = fn(req, res);
      if (out instanceof Promise) out.catch(next);
    } catch (err) {
      next(err);
    }
  };

/** The signed-in user, if the client sent one. Emergencies allow anonymous. */
function currentUser(req: Request): { id: string; name: string } | null {
  const uid = req.header("x-user-id");
  const name = req.header("x-user-name");
  return uid ? { id: uid, name: name || "Rider" } : null;
}

function requireUser(req: Request): { id: string; name: string } {
  const user = currentUser(req);
  if (!user) throw new ApiError(401, "Sign in to continue.", "UNAUTHENTICATED");
  return user;
}

const boatClassEnum = z.enum(["catamaran", "water_taxi", "cruiser", "speedboat"]);

// ---------------------------------------------------------------------------
// Islands and fleet
// ---------------------------------------------------------------------------

app.get("/api/islands", (_req, res) => res.json(ISLANDS));

/** Offline boats are excluded here, so they cannot appear in any count. */
function visibleBoats() {
  return state.boats.filter((b) => b.status !== "offline");
}

function hydrateBoat(b: (typeof state.boats)[number]) {
  const driver = driverById(b.driverId);
  const { rating, count } = driverRating(b.driverId);
  return {
    ...b,
    driver: driver
      ? { id: driver.id, name: driver.name, yearsActive: driver.yearsActive, homeIslandId: driver.homeIslandId, languages: driver.languages }
      : null,
    rating,
    reviewCount: count,
    islandName: getIsland(b.islandId)?.name ?? b.islandId,
  };
}

app.get("/api/fleet", (_req, res) => {
  const boats = visibleBoats().map(hydrateBoat);
  const available = boats.filter((b) => b.status === "available").length;
  res.json({
    boats,
    stats: { total: boats.length, available, onTrip: boats.length - available },
  });
});

// ---------------------------------------------------------------------------
// Drivers, reviews and applications
// ---------------------------------------------------------------------------

app.get("/api/drivers/applications", (_req, res) => {
  res.json([...state.applications].sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt)));
});

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(6, "Enter a phone number we can reach you on."),
  homeIslandId: z.string().refine((v) => !!getIsland(v), "Choose your home island."),
  yearsOperating: z.coerce.number().int("Enter a whole number of years.").min(0, "Years cannot be negative.").max(70, "Enter a realistic number of years."),
  boatClasses: z.array(boatClassEnum).min(1, "Select at least one boat class."),
  licenseId: z.string().trim().min(3, "Enter your licence or certification ID."),
  languages: z.array(z.string()).min(1, "Select at least one language."),
  availability: z.array(z.enum(["weekday", "weekend", "overnight"])).min(1, "Select when you can work."),
  experience: z.string().trim().min(100, "Give us at least 100 characters."),
  difficultSituation: z.string().trim().min(100, "Give us at least 100 characters."),
  emergencyTraining: z.string().trim().min(100, "Give us at least 100 characters."),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm the information is accurate." }) }),
});

app.post(
  "/api/drivers/applications",
  asyncRoute((req, res) => {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue.message, "INVALID_APPLICATION", String(issue.path[0] ?? ""));
    }
    const d = parsed.data;
    const application: DriverApplication = {
      id: id("app"),
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      homeIslandId: d.homeIslandId,
      yearsOperating: d.yearsOperating,
      boatClasses: d.boatClasses as BoatClass[],
      licenseId: d.licenseId,
      languages: d.languages,
      availability: d.availability,
      experience: d.experience,
      difficultSituation: d.difficultSituation,
      emergencyTraining: d.emergencyTraining,
      status: "pending",
      submittedAt: new Date().toISOString(),
      decidedAt: null,
    };
    state.applications.push(application);
    res.status(201).json({ id: application.id, status: application.status, submittedAt: application.submittedAt });
  }),
);

app.post(
  "/api/drivers/applications/:id/:decision",
  asyncRoute((req, res) => {
    const { id: appId, decision } = req.params;
    if (decision !== "approve" && decision !== "reject") {
      throw new ApiError(400, "Unknown decision.", "BAD_DECISION");
    }
    const application = state.applications.find((a) => a.id === appId);
    if (!application) throw new ApiError(404, "Application not found.", "NOT_FOUND");
    if (application.status !== "pending") {
      throw new ApiError(409, "That application has already been decided.", "ALREADY_DECIDED");
    }

    application.status = decision === "approve" ? "approved" : "rejected";
    application.decidedAt = new Date().toISOString();

    // Approving creates a real driver record so the new captain is bookable.
    if (decision === "approve") {
      state.extraDrivers.push({
        id: id("d"),
        name: application.fullName,
        homeIslandId: application.homeIslandId,
        yearsActive: application.yearsOperating,
        tripsCompleted: 0,
        boatClasses: application.boatClasses,
        languages: application.languages,
        seedRating: 0,
        seedReviewCount: 0,
      });
    }
    res.json(application);
  }),
);

app.get(
  "/api/drivers/:id",
  asyncRoute((req, res) => {
    const driver = driverById(req.params.id);
    if (!driver) throw new ApiError(404, "Driver not found.", "NOT_FOUND");
    const { rating, count } = driverRating(driver.id);
    const boat = state.boats.find((b) => b.driverId === driver.id && b.status !== "offline");
    res.json({
      ...driver,
      rating,
      reviewCount: count,
      distribution: ratingDistribution(driver.id),
      homeIslandName: getIsland(driver.homeIslandId)?.name ?? driver.homeIslandId,
      boat: boat ? { id: boat.id, name: boat.name, boatClass: boat.boatClass, status: boat.status } : null,
    });
  }),
);

app.get(
  "/api/drivers/:id/reviews",
  asyncRoute((req, res) => {
    const driver = driverById(req.params.id);
    if (!driver) throw new ApiError(404, "Driver not found.", "NOT_FOUND");
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = 10;
    const all = state.reviews
      .filter((r) => r.driverId === driver.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    res.json({
      reviews: all.slice((page - 1) * perPage, page * perPage),
      total: all.length,
      page,
      perPage,
      hasMore: page * perPage < all.length,
    });
  }),
);

const reviewSchema = z.object({
  rating: z.coerce.number().int("Choose a rating.").min(1, "Choose a rating.").max(5, "Choose a rating."),
  body: z.string().trim().max(500, "Keep your review under 500 characters.").default(""),
  tripId: z.string().nullish(),
});

app.post(
  "/api/drivers/:id/reviews",
  asyncRoute((req, res) => {
    const user = requireUser(req);
    const driver = driverById(req.params.id);
    if (!driver) throw new ApiError(404, "Driver not found.", "NOT_FOUND");

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue.message, "INVALID_REVIEW", String(issue.path[0] ?? ""));
    }

    const existing = state.reviews.find((r) => r.driverId === driver.id && r.userId === user.id);
    if (existing) {
      throw new ApiError(409, "You have already reviewed this captain.", "ALREADY_REVIEWED");
    }

    const review = {
      id: id("rv"),
      driverId: driver.id,
      userId: user.id,
      userName: user.name,
      rating: parsed.data.rating,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
      tripId: parsed.data.tripId ?? null,
    };
    state.reviews.push(review);
    // The average moves immediately, everywhere it renders.
    res.status(201).json({ review, ...driverRating(driver.id) });
  }),
);

app.patch(
  "/api/drivers/:id/reviews",
  asyncRoute((req, res) => {
    const user = requireUser(req);
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue.message, "INVALID_REVIEW", String(issue.path[0] ?? ""));
    }
    const existing = state.reviews.find((r) => r.driverId === req.params.id && r.userId === user.id);
    if (!existing) throw new ApiError(404, "You have not reviewed this captain yet.", "NOT_FOUND");
    existing.rating = parsed.data.rating;
    existing.body = parsed.data.body;
    existing.createdAt = new Date().toISOString();
    res.json({ review: existing, ...driverRating(req.params.id) });
  }),
);

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

const tripSchema = z.object({
  pickupIslandId: z.string(),
  pickupDockId: z.string(),
  destinationIslandId: z.string(),
  destinationDockId: z.string(),
  passengers: z.coerce.number().int().min(1, "At least one passenger.").max(12, "Too many passengers for one boat."),
  boatId: z.string().optional(),
});

function validateRoute(d: z.infer<typeof tripSchema>) {
  if (!getIsland(d.pickupIslandId)) throw new ApiError(400, "Choose a pickup island.", "BAD_PICKUP", "pickupIslandId");
  if (!getIsland(d.destinationIslandId)) throw new ApiError(400, "Choose a destination island.", "BAD_DESTINATION", "destinationIslandId");
  if (!dockBelongsTo(d.pickupDockId, d.pickupIslandId)) throw new ApiError(400, "That dock is not on your pickup island.", "BAD_PICKUP_DOCK", "pickupDockId");
  if (!dockBelongsTo(d.destinationDockId, d.destinationIslandId)) throw new ApiError(400, "That dock is not on your destination island.", "BAD_DESTINATION_DOCK", "destinationDockId");
  if (d.pickupIslandId === d.destinationIslandId) throw new ApiError(400, "Pick two different islands.", "SAME_ISLAND", "destinationIslandId");
}

app.post(
  "/api/trips",
  asyncRoute((req, res) => {
    const parsed = tripSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue.message, "INVALID_TRIP", String(issue.path[0] ?? ""));
    }
    const d = parsed.data;
    validateRoute(d);

    const candidates = state.boats.filter(
      (b) => b.status === "available" && b.capacity >= d.passengers,
    );
    if (candidates.length === 0) {
      throw new ApiError(409, "No boat is currently available for that many passengers.", "NO_BOAT");
    }
    // Prefer the requested boat, otherwise the one already nearest the pickup.
    const boat =
      candidates.find((b) => b.id === d.boatId) ??
      candidates.find((b) => b.islandId === d.pickupIslandId) ??
      candidates[0];

    const km = routeKm(d.pickupDockId, d.destinationDockId);
    const fare = calculateFare({ km, boatClass: boat.boatClass, passengers: d.passengers });

    boat.status = "on_trip";

    const user = currentUser(req);
    const trip: Trip = {
      id: id("trip"),
      userId: user?.id ?? null,
      pickupIslandId: d.pickupIslandId,
      pickupDockId: d.pickupDockId,
      destinationIslandId: d.destinationIslandId,
      destinationDockId: d.destinationDockId,
      boatId: boat.id,
      driverId: boat.driverId,
      boatClass: boat.boatClass,
      passengers: d.passengers,
      km,
      fare,
      etaMinutes: etaMinutes(km),
      status: "in_progress",
      createdAt: new Date().toISOString(),
      completedAt: null,
      cancelledAt: null,
    };
    state.trips.push(trip);
    res.status(201).json(hydrateTrip(trip));
  }),
);

function hydrateTrip(trip: Trip) {
  const driver = driverById(trip.driverId);
  const boat = state.boats.find((b) => b.id === trip.boatId);
  const { rating } = driverRating(trip.driverId);
  return {
    ...trip,
    pickupIslandName: getIsland(trip.pickupIslandId)?.name ?? trip.pickupIslandId,
    pickupDockName: getDock(trip.pickupDockId)?.name ?? trip.pickupDockId,
    destinationIslandName: getIsland(trip.destinationIslandId)?.name ?? trip.destinationIslandId,
    destinationDockName: getDock(trip.destinationDockId)?.name ?? trip.destinationDockId,
    driverName: driver?.name ?? "Captain",
    driverRating: rating,
    boatName: boat?.name ?? trip.boatId,
    rated: state.reviews.some((r) => r.tripId === trip.id),
  };
}

app.get(
  "/api/trips",
  asyncRoute((req, res) => {
    const user = requireUser(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = 20;
    const mine = state.trips
      .filter((t) => t.userId === user.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    const completed = mine.filter((t) => t.status === "completed");
    res.json({
      trips: mine.slice((page - 1) * perPage, page * perPage).map(hydrateTrip),
      total: mine.length,
      page,
      perPage,
      hasMore: page * perPage < mine.length,
      stats: {
        trips: completed.length,
        km: Math.round(completed.reduce((s, t) => s + t.km, 0) * 10) / 10,
        spent: Math.round(completed.reduce((s, t) => s + t.fare, 0) * 100) / 100,
      },
    });
  }),
);

app.get(
  "/api/trips/:id",
  asyncRoute((req, res) => {
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) throw new ApiError(404, "Trip not found.", "NOT_FOUND");
    const user = currentUser(req);
    // A trip with an owner is only visible to that owner.
    if (trip.userId && trip.userId !== user?.id) {
      throw new ApiError(404, "Trip not found.", "NOT_FOUND");
    }
    res.json(hydrateTrip(trip));
  }),
);

/**
 * The single path for finishing a trip, shared by the button and the ETA
 * timer so the two can never diverge. Completing releases the boat -- without
 * that the fleet drains permanently, one booking at a time.
 */
function completeTrip(tripId: string) {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip) throw new ApiError(404, "Trip not found.", "NOT_FOUND");
  if (trip.status === "completed") {
    throw new ApiError(409, "That trip is already complete.", "ALREADY_COMPLETED");
  }
  if (trip.status === "cancelled") {
    throw new ApiError(409, "That trip was cancelled.", "TRIP_CANCELLED");
  }

  trip.status = "completed";
  trip.completedAt = new Date().toISOString();

  const boat = state.boats.find((b) => b.id === trip.boatId);
  if (boat && boat.status !== "offline") {
    boat.status = "available";
    boat.islandId = trip.destinationIslandId;
  }
  return trip;
}

app.post(
  "/api/trips/:id/complete",
  asyncRoute((req, res) => {
    const trip = state.trips.find((t) => t.id === req.params.id);
    if (!trip) throw new ApiError(404, "Trip not found.", "NOT_FOUND");
    const user = currentUser(req);
    if (trip.userId && trip.userId !== user?.id) throw new ApiError(404, "Trip not found.", "NOT_FOUND");
    res.json(hydrateTrip(completeTrip(trip.id)));
  }),
);

/** Attaches trips taken before sign-in to the account that just signed in. */
app.post(
  "/api/trips/claim",
  asyncRoute((req, res) => {
    const user = requireUser(req);
    const ids = z.array(z.string()).max(200).safeParse(req.body?.tripIds);
    if (!ids.success) throw new ApiError(400, "Send a list of trip ids.", "INVALID_CLAIM", "tripIds");

    let claimed = 0;
    for (const tripId of ids.data) {
      const trip = state.trips.find((t) => t.id === tripId && t.userId === null);
      if (trip) {
        trip.userId = user.id;
        claimed += 1;
      }
    }
    res.json({ claimed });
  }),
);

// ---------------------------------------------------------------------------
// Emergencies and the triage queue
// ---------------------------------------------------------------------------

const emergencySchema = z.object({
  situation: z.enum(["taking_on_water", "medical", "stranded", "other"]),
  ageGroup: z.enum(["child", "adult", "older_adult"]).nullish(),
  accessNeeds: z.array(z.enum(["mobility", "vision", "hearing", "cognitive", "none"])).default([]),
  urgency: z.enum(["routine", "urgent", "critical"]).nullish(),
  notes: z.string().trim().max(1000).default(""),
  position: z.string().trim().max(200).default(""),
});

/**
 * Picks a rescue boat. If none is free, the nearest en-route rescue boat is
 * re-tasked rather than turning the caller away -- an emergency outranks a
 * scheduled crossing.
 */
function assignRescueBoat(): { boatId: string | null; retasked: boolean } {
  const free = state.boats.find((b) => b.emergencyEquipped && b.status === "available");
  if (free) {
    free.status = "on_trip";
    return { boatId: free.id, retasked: false };
  }
  const busy = state.boats.find((b) => b.emergencyEquipped && b.status === "en_route");
  if (busy) {
    busy.status = "on_trip";
    return { boatId: busy.id, retasked: true };
  }
  const anyRescue = state.boats.find((b) => b.emergencyEquipped && b.status !== "offline");
  return { boatId: anyRescue?.id ?? null, retasked: !!anyRescue };
}

app.post(
  "/api/emergencies",
  asyncRoute((req, res) => {
    const parsed = emergencySchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue.message, "INVALID_EMERGENCY", String(issue.path[0] ?? ""));
    }
    const d = parsed.data;
    const { boatId, retasked } = assignRescueBoat();
    if (!boatId) throw new ApiError(503, "No rescue boat is currently available.", "NO_RESCUE_BOAT");

    const incident: Incident = {
      id: id("inc"),
      userId: currentUser(req)?.id ?? null,
      situation: d.situation,
      ageGroup: d.ageGroup ?? null,
      accessNeeds: d.accessNeeds.filter((n) => n !== "none"),
      urgency: d.urgency ?? null,
      notes: d.notes,
      position: d.position,
      boatId,
      status: "active",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    state.incidents.push(incident);
    res.status(201).json({ ...hydrateIncident(incident), retasked });
  }),
);

function hydrateIncident(incident: Incident) {
  const breakdown = scoreIncident(incident, incident.createdAt);
  const boat = state.boats.find((b) => b.id === incident.boatId);
  const driver = boat ? driverById(boat.driverId) : undefined;
  return {
    ...incident,
    breakdown,
    score: breakdown.total,
    reason: explainScore(incident, breakdown),
    boatName: boat?.name ?? null,
    driverName: driver?.name ?? null,
    etaMinutes: boat ? etaMinutes(12) : null,
  };
}

/** Every score is recomputed here, so decay reorders the board on each read. */
app.get("/api/emergencies/queue", (_req, res) => {
  const active = state.incidents.filter((i) => i.status === "active");
  const ranked = sortByPriority(active);
  res.json(
    ranked.map((row) => {
      const boat = state.boats.find((b) => b.id === row.boatId);
      const driver = boat ? driverById(boat.driverId) : undefined;
      return {
        id: row.id,
        situation: row.situation,
        ageGroup: row.ageGroup,
        accessNeeds: row.accessNeeds,
        urgency: row.urgency,
        position: row.position,
        notes: row.notes,
        createdAt: row.createdAt,
        score: row.breakdown.total,
        breakdown: row.breakdown,
        reason: explainScore(row, row.breakdown),
        minutesWaiting: row.breakdown.minutesWaiting,
        boatName: boat?.name ?? null,
        driverName: driver?.name ?? null,
      };
    }),
  );
});

app.get(
  "/api/emergencies/:id",
  asyncRoute((req, res) => {
    const incident = state.incidents.find((i) => i.id === req.params.id);
    if (!incident) throw new ApiError(404, "Response not found.", "NOT_FOUND");
    res.json(hydrateIncident(incident));
  }),
);

app.post(
  "/api/emergencies/:id/resolve",
  asyncRoute((req, res) => {
    const incident = state.incidents.find((i) => i.id === req.params.id);
    if (!incident) throw new ApiError(404, "Response not found.", "NOT_FOUND");
    if (incident.status === "resolved") {
      throw new ApiError(409, "This response is already closed.", "ALREADY_RESOLVED");
    }
    incident.status = "resolved";
    incident.resolvedAt = new Date().toISOString();
    const boat = state.boats.find((b) => b.id === incident.boatId);
    if (boat && boat.status !== "offline") boat.status = "available";
    res.json(hydrateIncident(incident));
  }),
);

/**
 * Ages an incident so decay reordering can be shown in seconds rather than
 * waiting out real minutes. Not available in production.
 */
app.post(
  "/api/emergencies/:id/age",
  asyncRoute((req, res) => {
    if (IS_PROD) throw new ApiError(404, "Not found.", "NOT_FOUND");
    const incident = state.incidents.find((i) => i.id === req.params.id);
    if (!incident) throw new ApiError(404, "Response not found.", "NOT_FOUND");
    const minutes = Number(req.body?.minutes) || 5;
    incident.createdAt = new Date(new Date(incident.createdAt).getTime() - minutes * 60000).toISOString();
    res.json(hydrateIncident(incident));
  }),
);

// ---------------------------------------------------------------------------
// Demo reset
// ---------------------------------------------------------------------------

app.post(
  "/api/dev/reset",
  asyncRoute((_req, res) => {
    if (IS_PROD) throw new ApiError(404, "Not found.", "NOT_FOUND");
    resetState();
    res.json({ ok: true, boats: state.boats.length, drivers: allDrivers().length });
  }),
);

// ---------------------------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, code: err.code, field: err.field });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end.", code: "INTERNAL" });
});

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  console.log(`[whalecall] api listening on http://localhost:${PORT}`);
});

export { app };
