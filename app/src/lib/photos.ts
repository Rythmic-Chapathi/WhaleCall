/**
 * Deterministic illustrated scenery, generated as data-URI SVG.
 *
 * Why not stock photography: a demo must not depend on a third-party image
 * host being reachable, and a randomised endpoint reshuffles its pictures on
 * every load, so the same card changes photo mid-presentation. These scenes
 * are derived from a seed string, so a given place always renders the same
 * image, offline, with no request and no layout shift.
 *
 * To move to real photographs later, replace `photoUrl` with the pinned URL
 * for each seed. Every caller already passes width, height, alt text and an
 * error fallback, so nothing else has to change.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** A small deterministic generator so each seed gets a stable set of numbers. */
function rng(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return Math.abs(state % 10000) / 10000;
  };
}

const SKIES: Array<[string, string, string]> = [
  ["#8FD4E8", "#D8F0F4", "#FFE9C9"], // clear morning
  ["#5FB8DA", "#A8DCE8", "#FFF2D8"], // bright midday
  ["#F3B27A", "#F7D6A8", "#FBEBD2"], // late afternoon
  ["#6E9FD4", "#B6D4EC", "#F2E4D0"], // hazy
  ["#4E8FC4", "#93C6E2", "#FFE3BE"], // deep blue
];

const SEAS: Array<[string, string]> = [
  ["#1F7A96", "#3AA7BE"],
  ["#166B85", "#2E97AE"],
  ["#1B8AA0", "#48B6C6"],
  ["#14607A", "#2A8FA6"],
];

const LANDS: Array<[string, string]> = [
  ["#2E6B4F", "#1F4C39"],
  ["#3A7355", "#265240"],
  ["#4A6E45", "#2F4A31"],
  ["#5A6B3E", "#3B492C"],
];

/**
 * Builds one horizon scene: sky, sun, layered headlands, sea and a foreground
 * shore. Composition varies by seed but the structure stays consistent so a
 * grid of these reads as one set rather than a collage.
 */
export function photoUrl(seed: string, w = 800, h = 450): string {
  const r = rng(seed);
  const sky = SKIES[Math.floor(r() * SKIES.length)];
  const sea = SEAS[Math.floor(r() * SEAS.length)];
  const land = LANDS[Math.floor(r() * LANDS.length)];

  const horizon = h * (0.52 + r() * 0.12);
  const sunX = w * (0.12 + r() * 0.76);
  const sunY = horizon * (0.28 + r() * 0.38);
  const sunR = Math.min(w, h) * (0.045 + r() * 0.035);

  // Two headland ridges behind the water line, at different depths.
  const ridge = (yBase: number, amp: number, fill: string, opacity: number) => {
    const pts: string[] = [`0,${yBase + amp}`];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const x = (w / steps) * i;
      const y = yBase - Math.sin((i / steps) * Math.PI) * amp * (0.6 + r() * 0.8);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    pts.push(`${w},${yBase + amp}`);
    return `<polygon points="${pts.join(" ")}" fill="${fill}" opacity="${opacity}"/>`;
  };

  const bands = Array.from({ length: 5 }, (_, i) => {
    const y = horizon + ((h - horizon) / 5) * i + 4;
    const width = w * (0.25 + r() * 0.5);
    const x = r() * (w - width);
    return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${width.toFixed(0)}" height="2.5" rx="1.25" fill="#FFFFFF" opacity="${(0.16 + r() * 0.2).toFixed(2)}"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${sky[0]}"/><stop offset="62%" stop-color="${sky[1]}"/><stop offset="100%" stop-color="${sky[2]}"/>
</linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${sea[1]}"/><stop offset="100%" stop-color="${sea[0]}"/>
</linearGradient>
<radialGradient id="glow"><stop offset="0%" stop-color="#FFF8E2" stop-opacity="0.95"/><stop offset="100%" stop-color="#FFF8E2" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${(sunR * 3.2).toFixed(0)}" fill="url(#glow)"/>
<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${sunR.toFixed(0)}" fill="#FFF3D0" opacity="0.95"/>
${ridge(horizon, h * 0.2, land[1], 0.45)}
${ridge(horizon, h * 0.13, land[0], 0.85)}
<rect y="${horizon.toFixed(1)}" width="${w}" height="${(h - horizon).toFixed(1)}" fill="url(#sea)"/>
${bands}
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The neutral block shown if an image ever fails to load. */
export const FALLBACK_BG = "#F6F6F6";
