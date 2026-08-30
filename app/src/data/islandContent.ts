/**
 * Destination guide content, keyed by island id.
 *
 * These are real places. Everything here is limited to durable, verifiable
 * facts -- what somewhere is, where it is, why people go. No opening hours,
 * no prices and no admission details, because those change and a stale
 * number in a guide is worse than no number at all.
 */

export type Thing = { name: string; blurb: string; seed: string };

export type GoodToKnow = {
  bestTime: string;
  busyness: string;
  bring: string;
  dockAccess: string;
};

export type IslandGuide = {
  heroSeeds: [string, string, string];
  things: Thing[];
  goodToKnow: GoodToKnow;
};

const DRY_SEASON =
  "December to April is the dry season, with the steadiest seas for the trip over. June to November is hurricane season, when weather can cancel sailings at short notice.";

export const ISLAND_CONTENT: Record<string, IslandGuide> = {
  antigua: {
    heroSeeds: ["antigua-1", "antigua-2", "antigua-3"],
    things: [
      {
        name: "Nelson's Dockyard",
        blurb:
          "A restored Georgian naval dockyard in English Harbour, still working as a marina. It is the centrepiece of a UNESCO World Heritage Site inscribed in 2016.",
        seed: "antigua-dockyard",
      },
      {
        name: "Shirley Heights Lookout",
        blurb:
          "A restored military lookout on the hills above English Harbour, with a long view down over the harbour and out to the south coast.",
        seed: "antigua-shirley",
      },
      {
        name: "Devil's Bridge",
        blurb:
          "A natural limestone arch cut by the Atlantic at Indian Town Point on the east coast, with blowholes spouting around it in a heavy swell.",
        seed: "antigua-devils",
      },
      {
        name: "Dickenson Bay",
        blurb:
          "A wide, calm beach on the northwest coast, close to St. John's and the easiest swim on the island to reach from the capital.",
        seed: "antigua-dickenson",
      },
      {
        name: "Half Moon Bay",
        blurb:
          "A crescent of sand on the southeast coast, more exposed to the Atlantic and considerably quieter than the northwest beaches.",
        seed: "antigua-halfmoon",
      },
    ],
    goodToKnow: {
      bestTime: DRY_SEASON,
      busyness:
        "The busiest island in this group. St. John's fills when cruise ships are in port; English Harbour is busiest during the spring sailing regattas.",
      bring:
        "Sun cover and water for the Shirley Heights climb. The east-coast sites have little shade.",
      dockAccess:
        "Both St. John's and English Harbour have step-free access from the pier to the road.",
    },
  },

  barbuda: {
    heroSeeds: ["barbuda-1", "barbuda-2", "barbuda-3"],
    things: [
      {
        name: "Codrington Lagoon",
        blurb:
          "A large sheltered lagoon on the west side of the island, home to one of the biggest frigatebird colonies in the Caribbean. Reached by small boat from Codrington.",
        seed: "barbuda-lagoon",
      },
      {
        name: "Seventeen Mile Beach",
        blurb:
          "A very long, largely empty stretch of sand running down the western shore, known for the pink tint the sand takes from crushed shell.",
        seed: "barbuda-beach",
      },
      {
        name: "Two Foot Bay Caves",
        blurb:
          "Limestone caves in the low cliffs on the east coast, some with openings you can climb through to a view over the Atlantic.",
        seed: "barbuda-caves",
      },
      {
        name: "Martello Tower",
        blurb:
          "A stone fortification in the south of the island, one of the most visible historic structures left standing on Barbuda.",
        seed: "barbuda-tower",
      },
    ],
    goodToKnow: {
      bestTime: DRY_SEASON,
      busyness: "Very quiet year round. Barbuda has one town and few visitors compared with Antigua.",
      bring:
        "Everything you expect to need. Shops are limited to Codrington, and there is almost no shade on the beach.",
      dockAccess:
        "Codrington is step-free. River Landing is a working landing without step-free access; tell dispatch if you need assistance.",
    },
  },

  "saint-kitts": {
    heroSeeds: ["kitts-1", "kitts-2", "kitts-3"],
    things: [
      {
        name: "Brimstone Hill Fortress",
        blurb:
          "A large eighteenth-century fortress built high on a volcanic hill on the northwest coast. It became a UNESCO World Heritage Site in 1999.",
        seed: "kitts-brimstone",
      },
      {
        name: "St. Kitts Scenic Railway",
        blurb:
          "A narrow-gauge railway originally laid to carry sugar cane to the mill, now running passengers around the island's northern coast.",
        seed: "kitts-railway",
      },
      {
        name: "Basseterre",
        blurb:
          "The capital, laid out around Independence Square and the roundabout known as The Circus, with the deep-water port at Port Zante.",
        seed: "kitts-basseterre",
      },
      {
        name: "Mount Liamuiga",
        blurb:
          "The dormant volcano that forms the island's highest point, with a crater at the summit reached by a steep forest trail.",
        seed: "kitts-liamuiga",
      },
      {
        name: "Frigate Bay",
        blurb:
          "A narrow neck of land with beaches on both sides: calm Caribbean water on one shore, Atlantic surf on the other.",
        seed: "kitts-frigate",
      },
    ],
    goodToKnow: {
      bestTime: DRY_SEASON,
      busyness: "Basseterre is busy on cruise days. The southeast peninsula stays quieter.",
      bring: "Proper footwear for Brimstone Hill and anything on Mount Liamuiga; both are steep.",
      dockAccess:
        "Basseterre is step-free. Major's Bay is an open landing on the peninsula without step-free access.",
    },
  },

  nevis: {
    heroSeeds: ["nevis-1", "nevis-2", "nevis-3"],
    things: [
      {
        name: "Pinney's Beach",
        blurb:
          "A long golden beach running up the western shore, facing the channel toward Saint Kitts and calm for most of the year.",
        seed: "nevis-pinneys",
      },
      {
        name: "Museum of Nevis History",
        blurb:
          "In Charlestown, on the site of Alexander Hamilton's birthplace, covering the island's history and his early life here.",
        seed: "nevis-museum",
      },
      {
        name: "Nevis Peak",
        blurb:
          "The volcanic peak at the centre of the island, usually wearing a cap of cloud. The ascent is steep, muddy and best done with a guide.",
        seed: "nevis-peak",
      },
      {
        name: "Bath Hot Springs",
        blurb:
          "Naturally heated mineral water surfacing just outside Charlestown, channelled into open bathing pools.",
        seed: "nevis-springs",
      },
      {
        name: "Nevis Botanical Gardens",
        blurb:
          "Landscaped tropical gardens on the southern slopes, with planted terraces and a view down toward the sea.",
        seed: "nevis-gardens",
      },
    ],
    goodToKnow: {
      bestTime: DRY_SEASON,
      busyness: "Quiet almost always. Nevis takes far fewer day visitors than Saint Kitts across the channel.",
      bring: "Swimwear for the hot springs, and grippy shoes if you intend to go up the peak.",
      dockAccess:
        "Charlestown is step-free. Oualie Bay is a beach landing without step-free access.",
    },
  },

  montserrat: {
    heroSeeds: ["mont-1", "mont-2", "mont-3"],
    things: [
      {
        name: "Montserrat Volcano Observatory",
        blurb:
          "The monitoring station for Soufrière Hills, with a public viewing point and displays explaining the eruption that began in 1995.",
        seed: "mont-observatory",
      },
      {
        name: "Plymouth exclusion zone viewpoints",
        blurb:
          "The former capital was buried by volcanic activity and remains inside a restricted zone. Viewpoints in the hills look down over it from a safe distance.",
        seed: "mont-plymouth",
      },
      {
        name: "Rendezvous Bay",
        blurb:
          "The island's white-sand beach, in the far north. Most other Montserrat beaches are dark volcanic sand. Reached on foot over the hill or by boat.",
        seed: "mont-rendezvous",
      },
      {
        name: "Little Bay",
        blurb:
          "The island's main port and the centre of the rebuilt north, where most services and boat traffic now are.",
        seed: "mont-littlebay",
      },
    ],
    goodToKnow: {
      bestTime: DRY_SEASON,
      busyness: "The least visited island in this group by a wide margin. Expect to have most places to yourself.",
      bring:
        "Walking shoes for the northern hills. Access to the southern zone is controlled and changes with volcanic activity.",
      dockAccess:
        "Little Bay is step-free. Carr's Bay is a small landing without step-free access.",
    },
  },

  guadeloupe: {
    heroSeeds: ["guad-1", "guad-2", "guad-3"],
    things: [
      {
        name: "La Soufrière",
        blurb:
          "An active volcano on Basse-Terre and the highest point in the Lesser Antilles, with a marked trail through cloud forest to the summit area.",
        seed: "guad-soufriere",
      },
      {
        name: "Les Chutes du Carbet",
        blurb:
          "A set of waterfalls dropping through the rainforest on the eastern flank of Basse-Terre, within the national park.",
        seed: "guad-carbet",
      },
      {
        name: "Parc national de la Guadeloupe",
        blurb:
          "The national park covering the mountainous interior of Basse-Terre, with rainforest trails running between the peaks and rivers.",
        seed: "guad-park",
      },
      {
        name: "Plage de Grande Anse",
        blurb:
          "A broad sweep of sand near Deshaies on the northwest coast, backed by palms and one of the largest beaches on Basse-Terre.",
        seed: "guad-grandeanse",
      },
      {
        name: "Pointe-à-Pitre",
        blurb:
          "The island's commercial centre, with the covered markets, the waterfront and the main transport connections for both wings.",
        seed: "guad-pap",
      },
    ],
    goodToKnow: {
      bestTime: DRY_SEASON,
      busyness:
        "Pointe-à-Pitre is a working city and busy on weekdays. The Basse-Terre trails are quiet outside French school holidays.",
      bring:
        "Rain layers for the interior, which is markedly wetter than the coast. Euros are the currency and French is the working language.",
      dockAccess:
        "Pointe-à-Pitre is step-free. Deshaies is a village quay without step-free access.",
    },
  },

  dominica: {
    heroSeeds: ["dom-1", "dom-2", "dom-3"],
    things: [
      {
        name: "Morne Trois Pitons National Park",
        blurb:
          "The mountainous, forested interior of the island, inscribed as a UNESCO World Heritage Site in 1997 for its volcanic landscape.",
        seed: "dom-morne",
      },
      {
        name: "Boiling Lake",
        blurb:
          "A flooded fumarole in the national park and one of the largest hot lakes in the world. It is a long, demanding hike each way, done with a guide.",
        seed: "dom-boiling",
      },
      {
        name: "Trafalgar Falls",
        blurb:
          "Twin waterfalls in the valley above Roseau, reached by a short walk from the road with a viewing platform facing both drops.",
        seed: "dom-trafalgar",
      },
      {
        name: "Champagne Reef",
        blurb:
          "A snorkelling and diving site on the southwest coast where volcanic gas rises through the seabed in streams of small bubbles.",
        seed: "dom-champagne",
      },
      {
        name: "Indian River",
        blurb:
          "A slow river near Portsmouth, rowed rather than motored through overhanging swamp bloodwood trees.",
        seed: "dom-indian",
      },
    ],
    goodToKnow: {
      bestTime:
        DRY_SEASON + " Dominica is the wettest island in the chain, so expect rain in the interior in any month.",
      busyness:
        "Roseau is busy on cruise days and quiet otherwise. The interior trails are never crowded.",
      bring:
        "Waterproofs and shoes with grip. Trails run through genuine rainforest and stay muddy year round.",
      dockAccess: "Roseau and Portsmouth both have step-free access from the pier to the road.",
    },
  },
};

export function guideFor(islandId: string): IslandGuide | undefined {
  return ISLAND_CONTENT[islandId];
}
