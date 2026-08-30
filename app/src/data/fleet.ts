import type { BoatClass } from "../../shared/pricing";

/**
 * Raw status carried by a boat. Only three of these are user-facing:
 * `available` reads as "Available", `on_trip` and `en_route` both read as
 * "On trip", and `offline` boats are hidden from the fleet list and every
 * count. See statusLabel() in src/lib/fleet.ts.
 */
export type BoatStatus = "available" | "on_trip" | "en_route" | "offline";

export type Driver = {
  id: string;
  name: string;
  homeIslandId: string;
  yearsActive: number;
  tripsCompleted: number;
  boatClasses: BoatClass[];
  languages: string[];
  /** Seeded mean. The live value is recomputed from reviews on every read. */
  seedRating: number;
  seedReviewCount: number;
};

export type Boat = {
  id: string;
  name: string;
  driverId: string;
  boatClass: BoatClass;
  capacity: number;
  islandId: string;
  status: BoatStatus;
  /**
   * Rescue-equipped. Used by the dispatcher to pick a boat for an emergency.
   * Not surfaced as a fleet filter or badge, but load-bearing -- removing it
   * breaks emergency dispatch entirely.
   */
  emergencyEquipped: boolean;
};

export const DRIVERS: Driver[] = [
  { id: "d-marsha", name: "Marsha Joseph", homeIslandId: "antigua", yearsActive: 12, tripsCompleted: 1840, boatClasses: ["water_taxi", "speedboat"], languages: ["English"], seedRating: 4.9, seedReviewCount: 5 },
  { id: "d-elton", name: "Elton Baptiste", homeIslandId: "dominica", yearsActive: 8, tripsCompleted: 970, boatClasses: ["water_taxi", "cruiser"], languages: ["English", "Kwéyòl"], seedRating: 4.7, seedReviewCount: 4 },
  { id: "d-yvette", name: "Yvette Charles", homeIslandId: "guadeloupe", yearsActive: 15, tripsCompleted: 2310, boatClasses: ["catamaran", "cruiser"], languages: ["French", "English", "Kwéyòl"], seedRating: 4.8, seedReviewCount: 6 },
  { id: "d-kenroy", name: "Kenroy Phillip", homeIslandId: "saint-kitts", yearsActive: 6, tripsCompleted: 610, boatClasses: ["water_taxi"], languages: ["English"], seedRating: 4.5, seedReviewCount: 4 },
  { id: "d-anisa", name: "Anisa Browne", homeIslandId: "nevis", yearsActive: 10, tripsCompleted: 1420, boatClasses: ["water_taxi", "catamaran"], languages: ["English"], seedRating: 4.9, seedReviewCount: 5 },
  { id: "d-desmond", name: "Desmond Ryan", homeIslandId: "montserrat", yearsActive: 18, tripsCompleted: 2650, boatClasses: ["cruiser", "water_taxi"], languages: ["English"], seedRating: 4.6, seedReviewCount: 3 },
  { id: "d-lucine", name: "Lucine Prosper", homeIslandId: "guadeloupe", yearsActive: 4, tripsCompleted: 380, boatClasses: ["speedboat", "water_taxi"], languages: ["French", "English"], seedRating: 4.4, seedReviewCount: 3 },
  { id: "d-hensley", name: "Hensley Warner", homeIslandId: "barbuda", yearsActive: 21, tripsCompleted: 3100, boatClasses: ["water_taxi", "cruiser", "catamaran"], languages: ["English"], seedRating: 5.0, seedReviewCount: 6 },
  { id: "d-camille", name: "Camille Etienne", homeIslandId: "dominica", yearsActive: 7, tripsCompleted: 840, boatClasses: ["catamaran"], languages: ["English", "Kwéyòl", "Spanish"], seedRating: 4.7, seedReviewCount: 4 },
  { id: "d-orville", name: "Orville Grant", homeIslandId: "antigua", yearsActive: 9, tripsCompleted: 1150, boatClasses: ["speedboat", "cruiser"], languages: ["English"], seedRating: 4.3, seedReviewCount: 4 },
  { id: "d-selma", name: "Selma Fontaine", homeIslandId: "saint-kitts", yearsActive: 5, tripsCompleted: 520, boatClasses: ["water_taxi"], languages: ["English", "Spanish"], seedRating: 4.8, seedReviewCount: 3 },
  { id: "d-nigel", name: "Nigel Aymer", homeIslandId: "nevis", yearsActive: 14, tripsCompleted: 2020, boatClasses: ["cruiser", "catamaran"], languages: ["English"], seedRating: 4.6, seedReviewCount: 5 },
];

export const DRIVERS_BY_ID: Record<string, Driver> = Object.fromEntries(
  DRIVERS.map((d) => [d.id, d]),
);

/**
 * At least four rescue-equipped boats start `available`. If every rescue boat
 * is busy at boot, emergency dispatch has nothing to assign and the SOS flow
 * fails for every caller -- see the boot assertion in server/db.ts.
 */
export const BOATS: Boat[] = [
  { id: "b-01", name: "Sea Swift", driverId: "d-marsha", boatClass: "water_taxi", capacity: 6, islandId: "antigua", status: "available", emergencyEquipped: true },
  { id: "b-02", name: "Morning Gull", driverId: "d-elton", boatClass: "water_taxi", capacity: 6, islandId: "dominica", status: "available", emergencyEquipped: true },
  { id: "b-03", name: "Papillon", driverId: "d-yvette", boatClass: "catamaran", capacity: 12, islandId: "guadeloupe", status: "available", emergencyEquipped: false },
  { id: "b-04", name: "Blue Reach", driverId: "d-kenroy", boatClass: "water_taxi", capacity: 6, islandId: "saint-kitts", status: "available", emergencyEquipped: true },
  { id: "b-05", name: "Narrows Runner", driverId: "d-anisa", boatClass: "water_taxi", capacity: 8, islandId: "nevis", status: "available", emergencyEquipped: true },
  { id: "b-06", name: "Emerald Star", driverId: "d-desmond", boatClass: "cruiser", capacity: 10, islandId: "montserrat", status: "available", emergencyEquipped: true },
  { id: "b-07", name: "Petit Vent", driverId: "d-lucine", boatClass: "speedboat", capacity: 4, islandId: "guadeloupe", status: "on_trip", emergencyEquipped: false },
  { id: "b-08", name: "Frigate", driverId: "d-hensley", boatClass: "cruiser", capacity: 10, islandId: "barbuda", status: "available", emergencyEquipped: true },
  { id: "b-09", name: "Riverbend", driverId: "d-camille", boatClass: "catamaran", capacity: 12, islandId: "dominica", status: "en_route", emergencyEquipped: false },
  { id: "b-10", name: "Long Point", driverId: "d-orville", boatClass: "speedboat", capacity: 4, islandId: "antigua", status: "available", emergencyEquipped: false },
  { id: "b-11", name: "Circus Belle", driverId: "d-selma", boatClass: "water_taxi", capacity: 6, islandId: "saint-kitts", status: "available", emergencyEquipped: false },
  { id: "b-12", name: "Cloud Cap", driverId: "d-nigel", boatClass: "cruiser", capacity: 10, islandId: "nevis", status: "offline", emergencyEquipped: false },
];

/** Seed review bodies, drawn on to turn each driver's seedRating into real rows. */
export const REVIEW_SEED_BODIES = [
  "On time, smooth run, helped with the bags at both ends.",
  "Very steady in choppy water. Told us what to expect before we left the dock.",
  "Good communication about the pickup point. Would book again.",
  "Calm and professional. Sorted a late change of dock without any fuss.",
  "Knew the channel well and got us in ahead of the weather.",
  "Friendly, careful with the kids, life jackets checked before we moved.",
  "Straightforward and quick. No complaints at all.",
  "Waited for us when our connection ran late. Much appreciated.",
];

export const REVIEWER_NAMES = [
  "T. Alleyne", "M. Richards", "J. Sébastien", "P. Warrington", "K. Dubois",
  "R. Matthias", "S. Hodge", "L. Bertrand", "D. Nanton", "C. Isaac",
  "N. Gumbs", "A. Laville", "F. Osborne", "G. Pemberton",
];
