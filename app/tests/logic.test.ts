import { describe, expect, it } from "vitest";
import { calculateFare, fareBreakdown, distanceKm, roundFare } from "@shared/pricing";
import { scoreIncident, sortByPriority, explainScore, DECAY_PER_MINUTE } from "@shared/priority";

describe("pricing", () => {
  it("quotes a 26 km water taxi for 2 at roughly $88", () => {
    const total = calculateFare({ km: 26, boatClass: "water_taxi", passengers: 2 });
    expect(total).toBeGreaterThanOrEqual(85);
    expect(total).toBeLessThanOrEqual(90);
  });

  it("keeps a short hop in water-taxi range", () => {
    const solo = calculateFare({ km: 9, boatClass: "water_taxi", passengers: 1 });
    const pair = calculateFare({ km: 9, boatClass: "water_taxi", passengers: 2 });
    expect(solo).toBeLessThan(pair);
    expect(pair).toBeGreaterThanOrEqual(25);
    expect(pair).toBeLessThanOrEqual(45);
  });

  it("charges additional passengers three quarters of the first", () => {
    const b = fareBreakdown({ km: 20, boatClass: "water_taxi", passengers: 3 });
    expect(b.passengerFactor).toBe(2.5);
    expect(b.subtotal + b.additionalPassengers).toBeCloseTo(b.total, 2);
  });

  it("orders boat classes by multiplier", () => {
    const f = (c: "catamaran" | "water_taxi" | "cruiser" | "speedboat") =>
      calculateFare({ km: 20, boatClass: c, passengers: 1 });
    expect(f("catamaran")).toBeLessThan(f("water_taxi"));
    expect(f("water_taxi")).toBeLessThan(f("cruiser"));
    expect(f("cruiser")).toBeLessThan(f("speedboat"));
  });

  it("rounds to the nearest half dollar", () => {
    expect(roundFare(22.4)).toBe(22.5);
    expect(roundFare(86.8)).toBe(87);
    expect(calculateFare({ km: 13.3, boatClass: "cruiser", passengers: 2 }) % 0.5).toBe(0);
  });

  it("measures real distance between islands", () => {
    const antigua = { lat: 17.078, lon: -61.796 };
    const barbuda = { lat: 17.628, lon: -61.771 };
    expect(distanceKm(antigua, barbuda)).toBeGreaterThan(55);
    expect(distanceKm(antigua, barbuda)).toBeLessThan(70);
    expect(distanceKm(antigua, antigua)).toBe(0);
  });
});

describe("priority", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const at = (minAgo: number) => new Date(now.getTime() - minAgo * 60000).toISOString();

  it("sums every category", () => {
    const b = scoreIncident(
      { situation: "medical", ageGroup: "older_adult", accessNeeds: ["mobility"], urgency: "critical" },
      at(0),
      now,
    );
    // medical 3 + older adult 2 + mobility 2 + critical 5 = 12
    expect(b.total).toBe(12);
  });

  it("stacks multiple access needs", () => {
    const one = scoreIncident({ situation: "other", accessNeeds: ["vision"] }, at(0), now);
    const two = scoreIncident({ situation: "other", accessNeeds: ["vision", "mobility"] }, at(0), now);
    expect(two.total - one.total).toBe(2);
  });

  it("ignores a duplicated access need", () => {
    const dup = scoreIncident({ situation: "other", accessNeeds: ["mobility", "mobility"] }, at(0), now);
    const single = scoreIncident({ situation: "other", accessNeeds: ["mobility"] }, at(0), now);
    expect(dup.total).toBe(single.total);
  });

  it("ranks a critical vulnerable call above a routine one", () => {
    const q = sortByPriority(
      [
        { id: "routine", situation: "other", urgency: "routine", createdAt: at(0) },
        { id: "vulnerable", situation: "medical", ageGroup: "older_adult", accessNeeds: ["mobility"], urgency: "critical", createdAt: at(0) },
      ],
      now,
    );
    expect(q[0].id).toBe("vulnerable");
  });

  it("lets a starved low-priority call overtake a fresh high-priority one", () => {
    const q = sortByPriority(
      [
        { id: "fresh", situation: "medical", urgency: "urgent", createdAt: at(0) },
        { id: "waiting", situation: "other", urgency: "routine", createdAt: at(90) },
      ],
      now,
    );
    // routine 1 + 1 + 90*0.15 = 15.5 beats a fresh urgent medical at 6.
    expect(q[0].id).toBe("waiting");
  });

  it("grows a score by the decay rate every minute", () => {
    const a = scoreIncident({ situation: "other" }, at(0), now);
    const b = scoreIncident({ situation: "other" }, at(10), now);
    expect(b.total - a.total).toBeCloseTo(10 * DECAY_PER_MINUTE, 5);
  });

  it("never counts negative waiting time for a future timestamp", () => {
    const b = scoreIncident({ situation: "other" }, at(-30), now);
    expect(b.waitBonus).toBe(0);
  });

  it("explains a score in plain English", () => {
    const input = { situation: "medical", ageGroup: "older_adult", accessNeeds: ["mobility"], urgency: "critical" } as const;
    const text = explainScore(input, scoreIncident(input, at(4), now));
    expect(text).toContain("critical medical emergency");
    expect(text).toContain("older adult");
    expect(text).toContain("mobility need");
    expect(text).toContain("waiting 4 min");
  });
});

describe("wait formatting", () => {
  it("reads the same in a reason string as beside the row", async () => {
    const { humanizeWait, explainScore, scoreIncident } = await import("@shared/priority");
    const { waitLabel } = await import("@/lib/format");
    expect(humanizeWait(70)).toBe("1h 10m");
    expect(humanizeWait(45)).toBe("45 min");
    expect(humanizeWait(120)).toBe("2h");
    expect(waitLabel(70)).toBe(humanizeWait(70));

    const now = new Date("2026-01-01T12:00:00Z");
    const input = { situation: "other", urgency: "routine" } as const;
    const b = scoreIncident(input, new Date(now.getTime() - 70 * 60000).toISOString(), now);
    expect(explainScore(input, b)).toContain("waiting 1h 10m");
  });
});

describe("fare consistency", () => {
  it("quotes, charges and itemises the same amount", () => {
    for (const km of [4.2, 9, 20.6, 26, 61.3]) {
      for (const passengers of [1, 2, 5]) {
        for (const boatClass of ["catamaran", "water_taxi", "cruiser", "speedboat"] as const) {
          const b = fareBreakdown({ km, boatClass, passengers });
          // What the receipt itemises must add up to what the trip was charged.
          expect(b.subtotal + b.additionalPassengers).toBeCloseTo(b.total, 2);
          expect(calculateFare({ km, boatClass, passengers })).toBe(b.total);
          expect(Number.isInteger(b.total * 2)).toBe(true);
        }
      }
    }
  });
});
