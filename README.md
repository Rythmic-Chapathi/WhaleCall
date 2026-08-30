# 🐋 WhaleCall

*Your call always reaches the pod.*

WhaleCall is a rideshare-style boat transport app for a small tropical
archipelago with no bridges or roads -- boats ("Pod Guides") are the only
way to get anywhere. The app has two faces:

- **Normal mode** (Uber-style): a logged-in rider picks a destination
  island on a map and books a nearby available boat.
- **SOS mode**: one big button on the landing page, usable *without
  logging in*, that takes anyone straight into a tap-only emergency
  intake flow. Based on age, accessibility needs, and medical urgency,
  the system computes a fully-explainable priority score and
  auto-books the nearest emergency boat -- always routed to Sanctuary
  Point, the island with the hospital.

## Why this stack

The brief asked for "primarily Python." A browser map needs some
HTML/CSS/JS no matter what backend language is used, so the split here
puts **100% of the actual logic** -- priority scoring, boat matching,
ETA calculation, booking state, live-queue ordering -- in Python, and
keeps the frontend as thin as possible:

- **FastAPI** for the backend: async, built-in WebSocket support (for
  the live-updating map and dispatcher queue), automatic OpenAPI docs.
- **Jinja2** templates rendered server-side -- no JS build step, no npm.
- **Vanilla JS** (`static/app.js`) for map interactivity, search, and
  WebSocket handling -- one file, no framework.
- **A hand-drawn SVG archipelago**, not a real map API. This is a
  fictional set of islands, so Leaflet/Mapbox/Google Maps would add
  API-key setup and a network dependency for zero benefit. Islands are
  positioned with plain `x_pct`/`y_pct` and rendered by
  `renderIslandMap()` in `app.js`.
- **In-memory Python data structures** (`whalecall/data.py`) instead of
  a database -- intentional for a fast, fully-inspectable demo. No
  persistence between server restarts.
- **No ML in the priority algorithm.** It's a plain weighted sum plus a
  linear time-decay term. That's the pitch to judges: every score is
  auditable, nothing is a black box.

## Priority algorithm (`whalecall/priority.py`)

```python
AGE_WEIGHTS = {"child": 2, "adult": 0, "elderly": 2}
ACCESSIBILITY_WEIGHTS = {"mobility": 2, "visual": 1, "hearing": 1, "cognitive": 2, "none": 0}
MEDICAL_WEIGHTS = {"routine": 1, "urgent": 3, "critical": 5}
DECAY_RATE_PER_MINUTE = 0.15  # unanswered calls get "louder" over time

priority_score = age_weight + accessibility_weight + medical_weight + minutes_waited * DECAY_RATE_PER_MINUTE
```

The decay term is the fairness guarantee: without it, a "routine" call
could in theory wait forever behind a steady stream of higher-base
calls. With it, every waiting call gets louder the longer it goes
unanswered, so it always eventually rises to the top. See
`tests/test_priority.py` for a worked example of a low-priority call
that has waited long enough to overtake a fresh high-priority one.

The dispatcher view (`/dispatcher`) renders this live: every active
call is a ring on a sonar display, sized and brightened by its current
score, drifting toward the center as it climbs the queue.

## Running it

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd whalecall
uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000**.

A demo account is seeded so you can skip signup: name `Lani`, password
`whalecall`.

### Tests

The priority algorithm is unit-tested standalone (no server needed):

```bash
pytest tests/
```

## Project layout

```
whalecall/
  main.py          FastAPI app: pages, REST API, WebSockets
  models.py        Pydantic request/response models
  priority.py       Priority scoring + fair queue sort (the core logic)
  data.py           In-memory seed data: islands, boats, users, sessions,
                     live-tracking state
  static/
    app.js          Map rendering, search, forms, WebSocket handling
    style.css       Tropical theme (ocean blue / teal / coral / sand)
    whalecall_logo.svg
  templates/
    _layout.html     Shared header/footer/ocean background
    landing.html     SOS button + login/signup
    sos.html         Tap-only emergency intake + live confirmation
    home.html        Uber-style map, search, boat list, booking
    rides.html        Ride history
    dispatcher.html   Live sonar/priority-queue view
tests/
  test_priority.py   Unit tests for the scoring algorithm
```

## The archipelago

| Island | Role | Position |
|---|---|---|
| Kelp Hollow | Home / residential (default pickup) | 20%, 60% |
| Port Marlin | City hub | 50%, 30% |
| Driftmarket Isle | Store / market | 70%, 55% |
| Sanctuary Point | Hospital (fixed SOS destination) | 35%, 80% |
| Reeftop Isle | School | 65%, 20% |

## API

- `GET /`, `/sos`, `/home`, `/rides`, `/dispatcher` -- pages
- `GET /api/islands` -- the archipelago
- `GET /api/boats/nearby?destination_id=&origin_id=` -- available boats, sorted by ETA
- `POST /api/sos` -- submit an SOS call: scores it, auto-books the nearest emergency boat to Sanctuary Point
- `POST /api/ride-request` -- book a standard ride
- `POST /api/login`, `/api/signup`, `/api/logout` -- minimal session-cookie auth
- `WS /ws/tracking/{request_id}` -- live boat position for one ride (two-phase linear interpolation: boat &rarr; pickup &rarr; destination)
- `WS /ws/queue` -- live priority-sorted queue of every active call, for the dispatcher sonar view

## Accessibility

- The entire SOS intake is completable with **taps only** -- no typing required.
- Tap targets are at least 44px, text is large throughout.
- Category weight + wait time are shown to icons as well as color (e.g. the
  "urgent"/"critical" medical choices use both a warning icon and a coral
  color, never color alone) so the flow stays legible for colorblind users.
- All interactive elements have visible focus outlines and `aria-label`s.
- Nothing in the SOS flow times out or logs the user out mid-flow.

## Known limitations (by design, for a one-day build)

- Data is in-memory only -- restarting the server clears all bookings,
  boats, and signed-up users back to the seed state.
- Auth is a single session cookie with SHA-256-hashed passwords -- fine
  for a demo, not production-grade.
- Boat movement is simulated with linear interpolation over the
  computed ETA, not real GPS.
- Stretch goals from the original spec not yet built: storm/weather
  mode, multi-language icon toggle, sound cues, and a vouch-detail view.
