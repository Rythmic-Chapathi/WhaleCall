/* WhaleCall frontend -- thin vanilla JS: map rendering, search, forms,
 * and the two WebSocket feeds (live tracking + dispatcher queue).
 * All actual logic (priority scoring, matching, ETA) lives in Python;
 * this file only draws what the server tells it. */

const ISLAND_ICONS = { home: "🏠", city: "🏙️", store: "🏬", hospital: "➕", school: "🏫" };
const WS_PROTOCOL = location.protocol === "https:" ? "wss" : "ws";
const WS_BASE = `${WS_PROTOCOL}://${location.host}`;

function iconFor(role) {
  return ISLAND_ICONS[role] || "🌴";
}

/* ------------------------------------------------------------------ */
/* Archipelago map                                                     */
/* ------------------------------------------------------------------ */

function renderIslandMap(svg, islands, { selectedId = null, onSelect = null, boats = [] } = {}) {
  svg.setAttribute("viewBox", "0 0 100 75");
  svg.innerHTML = "";
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Archipelago map");

  islands.forEach((island) => {
    const y = island.y_pct * 0.75;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "island-marker" + (island.id === selectedId ? " selected" : ""));
    g.setAttribute("tabindex", onSelect ? "0" : "-1");
    g.setAttribute("role", onSelect ? "button" : "img");
    g.setAttribute("aria-label", `${island.name}${onSelect ? ", tap to select" : ""}`);
    g.dataset.islandId = island.id;

    const pad = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pad.setAttribute("class", "pad");
    pad.setAttribute("cx", island.x_pct);
    pad.setAttribute("cy", y);
    pad.setAttribute("r", 6);
    g.appendChild(pad);

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "text");
    icon.setAttribute("class", "icon");
    icon.setAttribute("x", island.x_pct);
    icon.setAttribute("y", y + 2);
    icon.textContent = iconFor(island.role);
    g.appendChild(icon);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", "label");
    label.setAttribute("x", island.x_pct);
    label.setAttribute("y", y + 11);
    label.textContent = island.name;
    g.appendChild(label);

    if (onSelect) {
      g.addEventListener("click", () => onSelect(island));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(island);
        }
      });
    }
    svg.appendChild(g);
  });

  return svg;
}

function upsertBoatMarker(svg, id, xPct, yPct, opts = {}) {
  const y = yPct * 0.75;
  let g = svg.querySelector(`[data-boat-marker="${id}"]`);
  if (!g) {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "boat-marker");
    g.dataset.boatMarker = id;
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("class", "pulse-ring");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", 3.4);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = "🚤";
    g.appendChild(ring);
    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
  }
  g.querySelectorAll("circle").forEach((c) => { c.setAttribute("cx", xPct); c.setAttribute("cy", y); });
  const text = g.querySelector("text");
  text.setAttribute("x", xPct);
  text.setAttribute("y", y + 1.8);
  if (opts.label) g.setAttribute("aria-label", opts.label);
}

/* ------------------------------------------------------------------ */
/* Island search / autocomplete                                       */
/* ------------------------------------------------------------------ */

function setupIslandSearch(input, resultsBox, islands, onSelect) {
  function render(list) {
    resultsBox.innerHTML = "";
    if (!list.length) { resultsBox.hidden = true; return; }
    list.forEach((island) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = `${iconFor(island.role)}  ${island.name}`;
      btn.addEventListener("click", () => {
        input.value = island.name;
        resultsBox.hidden = true;
        onSelect(island);
      });
      resultsBox.appendChild(btn);
    });
    resultsBox.hidden = false;
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { resultsBox.hidden = true; return; }
    render(islands.filter((i) => i.name.toLowerCase().includes(q)));
  });
  input.addEventListener("focus", () => {
    if (input.value.trim()) render(islands.filter((i) => i.name.toLowerCase().includes(input.value.trim().toLowerCase())));
  });
  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) resultsBox.hidden = true;
  });
}

/* ------------------------------------------------------------------ */
/* Live tracking (SOS confirmation + standard ride confirmation)      */
/* ------------------------------------------------------------------ */

function trackRide(requestId, svg, { onUpdate = null, boatLabel = "Your Pod Guide" } = {}) {
  const socket = new WebSocket(`${WS_BASE}/ws/tracking/${requestId}`);
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.error) return;
    upsertBoatMarker(svg, requestId, data.x_pct, data.y_pct, { label: boatLabel });
    if (onUpdate) onUpdate(data);
    if (data.arrived) socket.close();
  });
  return socket;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Something went wrong.");
  return data;
}

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Something went wrong.");
  return data;
}
