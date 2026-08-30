import { distanceKm } from "../../shared/pricing";

export type Dock = {
  id: string;
  name: string;
  islandId: string;
  lat: number;
  lon: number;
  /** Step-free access from the pier to the road, where that is the case. */
  stepFree: boolean;
  note: string;
};

export type Island = {
  id: string;
  name: string;
  country: string;
  tagline: string;
  intro: string;
  lat: number;
  lon: number;
  /** Normalised 0-100 placement on the hand-drawn chart. */
  x: number;
  y: number;
  docks: Dock[];
};

/**
 * Seven real islands in the Leeward Islands, north to south. Coordinates are
 * the actual island centroids and dock positions -- every distance, ETA and
 * fare in the app is computed from these, never hardcoded.
 */
export const ISLANDS: Island[] = [
  {
    id: "barbuda",
    name: "Barbuda",
    country: "Antigua and Barbuda",
    tagline: "Low, quiet, and ringed by pink sand",
    intro:
      "Barbuda is the flatter, far less crowded half of Antigua and Barbuda, with a single town and a long stretch of beach down its western shore. Its lagoon holds one of the largest frigatebird colonies in the region. Come for space and birdlife rather than nightlife.",
    lat: 17.628,
    lon: -61.771,
    x: 66,
    y: 7,
    docks: [
      { id: "codrington", name: "Codrington", islandId: "barbuda", lat: 17.637, lon: -61.828, stepFree: true, note: "The island's only town, at the edge of the lagoon." },
      { id: "river-landing", name: "River Landing", islandId: "barbuda", lat: 17.556, lon: -61.818, stepFree: false, note: "Southwest landing used by boats from Antigua." },
    ],
  },
  {
    id: "antigua",
    name: "Antigua",
    country: "Antigua and Barbuda",
    tagline: "Georgian harbours and a beach for the mood you are in",
    intro:
      "Antigua is the busier of the two islands, with a deep natural harbour in the south that the Royal Navy used through the eighteenth century and beaches scattered around the whole coastline. St. John's is the capital and the main port of call.",
    lat: 17.078,
    lon: -61.796,
    x: 66,
    y: 21,
    docks: [
      { id: "st-johns", name: "St. John's", islandId: "antigua", lat: 17.121, lon: -61.845, stepFree: true, note: "The capital and main harbour, on the northwest coast." },
      { id: "english-harbour", name: "English Harbour", islandId: "antigua", lat: 17.005, lon: -61.762, stepFree: true, note: "Sheltered south-coast harbour beside Nelson's Dockyard." },
    ],
  },
  {
    id: "saint-kitts",
    name: "Saint Kitts",
    country: "Saint Kitts and Nevis",
    tagline: "A fortress on the hill and a railway through the cane",
    intro:
      "Saint Kitts runs from the dormant peak of Mount Liamuiga in the northwest down to a narrow southeast peninsula. Sugar shaped the island for centuries, and the railway built to carry the cane still runs. Basseterre is the capital.",
    lat: 17.3,
    lon: -62.73,
    x: 13,
    y: 15,
    docks: [
      { id: "basseterre", name: "Basseterre", islandId: "saint-kitts", lat: 17.296, lon: -62.723, stepFree: true, note: "The capital, with the deep-water port at Port Zante." },
      { id: "majors-bay", name: "Major's Bay", islandId: "saint-kitts", lat: 17.243, lon: -62.653, stepFree: false, note: "On the southeast peninsula, the closest point to Nevis." },
    ],
  },
  {
    id: "nevis",
    name: "Nevis",
    country: "Saint Kitts and Nevis",
    tagline: "One peak, one road around it",
    intro:
      "Nevis is a near-circular island built around a single cloud-topped volcanic peak, separated from Saint Kitts by a two-mile channel called The Narrows. Charlestown, the main town, was the birthplace of Alexander Hamilton. The pace here is slower than almost anywhere else in the chain.",
    lat: 17.155,
    lon: -62.578,
    x: 26,
    y: 23,
    docks: [
      { id: "charlestown", name: "Charlestown", islandId: "nevis", lat: 17.137, lon: -62.623, stepFree: true, note: "The main town and ferry landing on the west coast." },
      { id: "oualie-bay", name: "Oualie Bay", islandId: "nevis", lat: 17.163, lon: -62.612, stepFree: false, note: "Calm northwest bay facing Saint Kitts." },
    ],
  },
  {
    id: "montserrat",
    name: "Montserrat",
    country: "Montserrat",
    tagline: "The Emerald Isle, rebuilt in the north",
    intro:
      "Montserrat's Soufrière Hills volcano became active in 1995 and buried the former capital, Plymouth. The south of the island remains an exclusion zone, and life has moved to the green northern hills around Little Bay. Irish heritage runs deep enough that the island is nicknamed the Emerald Isle of the Caribbean.",
    lat: 16.745,
    lon: -62.187,
    x: 41,
    y: 34,
    docks: [
      { id: "little-bay", name: "Little Bay", islandId: "montserrat", lat: 16.803, lon: -62.213, stepFree: true, note: "The island's main port, in the safe northern zone." },
      { id: "carrs-bay", name: "Carr's Bay", islandId: "montserrat", lat: 16.812, lon: -62.218, stepFree: false, note: "Small landing just north of Little Bay." },
    ],
  },
  {
    id: "guadeloupe",
    name: "Guadeloupe",
    country: "France",
    tagline: "A butterfly-shaped slice of France in the tropics",
    intro:
      "Guadeloupe is an overseas region of France, shaped like a butterfly: mountainous, forested Basse-Terre on one wing and flatter, drier Grande-Terre on the other. La Soufrière, on Basse-Terre, is the highest point in the Lesser Antilles. Expect French signage, euros, and very good bread.",
    lat: 16.25,
    lon: -61.58,
    x: 78,
    y: 46,
    docks: [
      { id: "pointe-a-pitre", name: "Pointe-à-Pitre", islandId: "guadeloupe", lat: 16.241, lon: -61.533, stepFree: true, note: "The main city and commercial port, between the two wings." },
      { id: "deshaies", name: "Deshaies", islandId: "guadeloupe", lat: 16.303, lon: -61.794, stepFree: false, note: "Fishing village on the northwest coast of Basse-Terre." },
    ],
  },
  {
    id: "dominica",
    name: "Dominica",
    country: "Dominica",
    tagline: "The Nature Island: rainforest, rivers, and a boiling lake",
    intro:
      "Dominica is the wettest and most mountainous island in the chain, with rainforest running to the shoreline and rivers in nearly every valley. Morne Trois Pitons National Park in the interior is a UNESCO World Heritage Site. Roseau is the capital, Portsmouth the second town in the north.",
    lat: 15.415,
    lon: -61.371,
    x: 85,
    y: 65,
    docks: [
      { id: "roseau", name: "Roseau", islandId: "dominica", lat: 15.301, lon: -61.388, stepFree: true, note: "The capital, on the southwest coast." },
      { id: "portsmouth", name: "Portsmouth", islandId: "dominica", lat: 15.585, lon: -61.462, stepFree: true, note: "Northern town on Prince Rupert Bay, near the Indian River." },
    ],
  },
];

export const ISLANDS_BY_ID: Record<string, Island> = Object.fromEntries(
  ISLANDS.map((i) => [i.id, i]),
);

export const ALL_DOCKS: Dock[] = ISLANDS.flatMap((i) => i.docks);
export const DOCKS_BY_ID: Record<string, Dock> = Object.fromEntries(
  ALL_DOCKS.map((d) => [d.id, d]),
);

export function getIsland(id: string | null | undefined): Island | undefined {
  return id ? ISLANDS_BY_ID[id] : undefined;
}

export function getDock(id: string | null | undefined): Dock | undefined {
  return id ? DOCKS_BY_ID[id] : undefined;
}

/** A dock only counts as valid for an island if it actually belongs to it. */
export function dockBelongsTo(dockId: string | null | undefined, islandId: string | null | undefined): boolean {
  const dock = getDock(dockId);
  return !!dock && !!islandId && dock.islandId === islandId;
}

export function routeKm(fromDockId: string, toDockId: string): number {
  const a = getDock(fromDockId);
  const b = getDock(toDockId);
  if (!a || !b) return 0;
  return distanceKm(a, b);
}

export function islandKm(a: Island, b: Island): number {
  return distanceKm(a, b);
}

/** Crossing time at a steady ~32 km/h working speed, floored at 5 minutes. */
export function etaMinutes(km: number): number {
  return Math.max(5, Math.round((km / 32) * 60));
}

/** The n closest islands to the given one, nearest first. */
export function nearestIslands(island: Island, n = 3): Array<{ island: Island; km: number; minutes: number }> {
  return ISLANDS.filter((i) => i.id !== island.id)
    .map((i) => {
      const km = islandKm(island, i);
      return { island: i, km, minutes: etaMinutes(km) };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}
