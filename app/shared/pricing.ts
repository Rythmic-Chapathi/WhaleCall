/**
 * Fare calculation.
 *
 * Imported by both the booking estimate in the browser and the server that
 * writes the trip. There is exactly one implementation so a quote and a
 * receipt can never disagree.
 */

export const BASE = 8.0;
export const PER_KM = 1.6;

export const CLASS_MULTIPLIER = {
  catamaran: 0.8,
  water_taxi: 1.0,
  cruiser: 1.3,
  speedboat: 1.6,
} as const;

export type BoatClass = keyof typeof CLASS_MULTIPLIER;

export const BOAT_CLASS_LABELS: Record<BoatClass, string> = {
  catamaran: "Catamaran",
  water_taxi: "Water taxi",
  cruiser: "Cruiser",
  speedboat: "Speedboat",
};

/** First passenger pays full, each additional passenger three quarters. */
export function passengerFactor(passengers: number): number {
  const n = Math.max(1, Math.floor(passengers || 1));
  return 1 + 0.75 * (n - 1);
}

/** Fares settle to the nearest 50 cents so quoted totals stay legible. */
export function roundFare(amount: number): number {
  return Math.round(amount * 2) / 2;
}

export type FareInput = { km: number; boatClass: BoatClass; passengers: number };

export type FareBreakdown = {
  base: number;
  distance: number;
  km: number;
  classMultiplier: number;
  boatClass: BoatClass;
  passengers: number;
  passengerFactor: number;
  subtotal: number;
  additionalPassengers: number;
  total: number;
};

export function fareBreakdown({ km, boatClass, passengers }: FareInput): FareBreakdown {
  const distanceKm = Math.max(0, km);
  const multiplier = CLASS_MULTIPLIER[boatClass] ?? CLASS_MULTIPLIER.water_taxi;
  const factor = passengerFactor(passengers);

  const distance = PER_KM * distanceKm;
  // One passenger at the boat's rate, before the additional-passenger uplift.
  const subtotal = roundFare((BASE + distance) * multiplier);
  const total = roundFare((BASE + distance) * multiplier * factor);

  return {
    base: BASE,
    distance,
    km: distanceKm,
    classMultiplier: multiplier,
    boatClass,
    passengers: Math.max(1, Math.floor(passengers || 1)),
    passengerFactor: factor,
    subtotal,
    additionalPassengers: roundFare(total - subtotal),
    total,
  };
}

export function calculateFare(input: FareInput): number {
  return fareBreakdown(input).total;
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Great-circle distance, used for every route in the app. Never hardcode a km. */
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
