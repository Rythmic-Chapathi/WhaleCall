/* WhaleCall frontend -- thin vanilla JS: map rendering, search, forms,
 * and the two WebSocket feeds (live tracking + dispatcher queue).
 * All actual logic (priority scoring, matching, ETA) lives in Python;
 * this file only draws what the server tells it. */

const SVGNS = "http://www.w3.org/2000/svg";
const ISLAND_ICONS = { home: "🏠", city: "🏙️", store: "🏬", hospital: "➕", school: "🏫" };
const WS_PROTOCOL = location.protocol === "https:" ? "wss" : "ws";
const WS_BASE = `${WS_PROTOCOL}://${location.host}`;

function iconFor(role) {
  return ISLAND_ICONS[role] || "🌴";
}

function islandById(islands, id) {
  return islands.find((i) => i.id === id) || null;
}

/* ------------------------------------------------------------------ */
/* Archipelago map -- stylized island "blobs" instead of plain pins    */
/* ------------------------------------------------------------------ */

// A couple of hand-drawn organic blob outlines (small local coordinate
// space, centered on 0,0) cycled across islands for visual variety --
// same idea as a hand-illustrated map, without needing per-island art.
const ISLAND_BLOBS = [
  {
    outer: "M -7,-3 C -7,-8 -2,-9 3,-8 C 8,-7 9,-2 8,3 C 7,8 2,9 -3,8 C -8,7 -8,2 -7,-3 Z",
    inner: "M -4,-1.5 C -4,-4.5 -1,-5 1.5,-4.5 C 4.5,-4 5,-1 4.5,1.5 C 4,4.5 1,5 -1.5,4.5 C -4.5,4 -4.5,1 -4,-1.5 Z",
  },
  {
    outer: "M -6,-4 C -8,-1 -8,3 -5,6 C -2,9 3,8 6,5 C 9,2 8,-3 5,-6 C 2,-9 -3,-8 -6,-4 Z",
    inner: "M -3.5,-2.5 C -4.5,-0.5 -4.5,2 -3,3.5 C -1,5.5 2,5 3.5,3 C 5,1 4.5,-2 3,-3.5 C 1.5,-5 -2,-4.5 -3.5,-2.5 Z",
  },
];

function renderIslandMap(svg, islands, { selectedId = null, onSelect = null, preserveAspectRatio = "xMidYMid meet" } = {}) {
  svg.setAttribute("viewBox", "0 0 100 75");
  svg.setAttribute("preserveAspectRatio", preserveAspectRatio);
  svg.innerHTML = "";
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Archipelago map");

  islands.forEach((island, i) => {
    const y = island.y_pct * 0.75;
    const blob = ISLAND_BLOBS[i % ISLAND_BLOBS.length];

    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", "island-marker" + (island.id === selectedId ? " selected" : ""));
    g.setAttribute("transform", `translate(${island.x_pct}, ${y})`);
    g.setAttribute("tabindex", onSelect ? "0" : "-1");
    g.setAttribute("role", onSelect ? "button" : "img");
    g.setAttribute("aria-label", `${island.name}${onSelect ? ", tap to select" : ""}`);
    g.dataset.islandId = island.id;

    const land = document.createElementNS(SVGNS, "path");
    land.setAttribute("class", "land");
    land.setAttribute("d", blob.outer);
    g.appendChild(land);

    const core = document.createElementNS(SVGNS, "path");
    core.setAttribute("class", "land-core");
    core.setAttribute("d", blob.inner);
    g.appendChild(core);

    const icon = document.createElementNS(SVGNS, "text");
    icon.setAttribute("class", "icon");
    icon.setAttribute("x", 0);
    icon.setAttribute("y", 2);
    icon.textContent = iconFor(island.role);
    g.appendChild(icon);

    const label = document.createElementNS(SVGNS, "text");
    label.setAttribute("class", "label");
    label.setAttribute("x", 0);
    label.setAttribute("y", 15);
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
    g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", "boat-marker");
    g.dataset.boatMarker = id;
    const ring = document.createElementNS(SVGNS, "circle");
    ring.setAttribute("class", "pulse-ring");
    const circle = document.createElementNS(SVGNS, "circle");
    circle.setAttribute("r", 3.4);
    const text = document.createElementNS(SVGNS, "text");
    text.textContent = "🚤";
    g.appendChild(ring);
    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);
  }
  g.setAttribute("class", "boat-marker" + (opts.stateClass ? ` ${opts.stateClass}` : ""));
  g.querySelectorAll("circle").forEach((c) => { c.setAttribute("cx", xPct); c.setAttribute("cy", y); });
  const text = g.querySelector("text");
  text.setAttribute("x", xPct);
  text.setAttribute("y", y + 1.8);
  if (opts.label) g.setAttribute("aria-label", opts.label);
}

/* A dashed route line between two map points -- used both as a "planned
 * trip" preview before booking, and as a live line from a moving boat to
 * its next waypoint while tracking. Inserted behind existing markers so
 * it never covers them. */
function upsertRouteLine(svg, id, x1Pct, y1Pct, x2Pct, y2Pct) {
  let line = svg.querySelector(`[data-route-line="${id}"]`);
  if (!line) {
    line = document.createElementNS(SVGNS, "line");
    line.setAttribute("class", "route-line");
    line.dataset.routeLine = id;
    svg.insertBefore(line, svg.firstChild);
  }
  line.setAttribute("x1", x1Pct);
  line.setAttribute("y1", y1Pct * 0.75);
  line.setAttribute("x2", x2Pct);
  line.setAttribute("y2", y2Pct * 0.75);
}

function removeRouteLine(svg, id) {
  const line = svg.querySelector(`[data-route-line="${id}"]`);
  if (line) line.remove();
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

function trackRide(requestId, svg, { onUpdate = null, boatLabel = "Your Pod Guide", origin = null, destination = null } = {}) {
  const socket = new WebSocket(`${WS_BASE}/ws/tracking/${requestId}`);
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.error) return;
    upsertBoatMarker(svg, requestId, data.x_pct, data.y_pct, { label: boatLabel });

    if (origin && destination) {
      const target = data.phase === "to_pickup" ? origin : destination;
      if (data.arrived) {
        removeRouteLine(svg, requestId);
      } else {
        upsertRouteLine(svg, requestId, data.x_pct, data.y_pct, target.x_pct, target.y_pct);
      }
    }

    if (onUpdate) onUpdate(data);
    if (data.arrived) socket.close();
  });
  return socket;
}

/* ------------------------------------------------------------------ */
/* Ambient water shader -- purely decorative canvas background, shared */
/* by the landing page and the full-screen map views. Fails silently  */
/* with no WebGL rather than breaking the page.                       */
/* ------------------------------------------------------------------ */

function startWaterShader(canvas, opts = {}) {
  if (!canvas) return;
  const shallow = opts.shallow || [0.11, 0.55, 0.60];
  const deep = opts.deep || [0.059, 0.145, 0.216];
  const highlight = opts.highlight || [1.0, 1.0, 1.0];

  function syncSize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 220;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(syncSize).observe(canvas);
  syncSize();

  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return;

  const vs = `attribute vec2 a_position; varying vec2 v_uv;
    void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;
  const fs = `precision highp float;
    uniform float u_time; varying vec2 v_uv;
    vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
    float snoise(vec2 v){
      const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
      vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
      vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.0);
      vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
      vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
      m=m*m; m=m*m;
      vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 a0=x-floor(x+0.5);
      float m1=1.79284291400159-0.85373472095314*(a0.x*a0.x+h.x*h.x);
      float m2=1.79284291400159-0.85373472095314*(a0.y*a0.y+h.y*h.y);
      float m3=1.79284291400159-0.85373472095314*(a0.z*a0.z+h.z*h.z);
      vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.0*dot(m*vec3(m1,m2,m3),g);
    }
    void main() {
      vec2 uv = v_uv;
      vec3 shallow = vec3(${shallow[0]}, ${shallow[1]}, ${shallow[2]});
      vec3 deep = vec3(${deep[0]}, ${deep[1]}, ${deep[2]});
      vec3 white = vec3(${highlight[0]}, ${highlight[1]}, ${highlight[2]});
      float noise = snoise(uv * 4.0 + u_time * 0.1);
      float wave = sin(uv.y * 12.0 + u_time * 1.5 + noise) * 0.05;
      vec3 color = mix(shallow, deep, uv.y + wave);
      float ripple = smoothstep(0.45, 0.5, sin(uv.y * 40.0 + u_time * 2.0 + noise * 2.0));
      color = mix(color, white, ripple * 0.12 * (1.0 - uv.y));
      gl_FragColor = vec4(color, 1.0);
    }`;
  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, "u_time");

  function render(t) {
    if (typeof ResizeObserver === "undefined") syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
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
