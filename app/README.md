# Whale Call

Boat transportation and emergency response across seven Caribbean islands.

Two things happen here. Anyone can book a boat between islands, with the fare
quoted before booking. And anyone can call for emergency help, where dispatch is
ordered by **who needs it most, not who called first**.

## The triage queue

Emergency dispatch is the part worth reading the code for. Every active
incident carries a score built from a plain weighted sum:

```
score = situation + ageGroup + Σ(accessNeeds) + urgency + minutesWaiting × 0.15
```

Weights live in `shared/priority.ts` — a pure module with no imports, unit
tested in `tests/logic.test.ts`.

Two properties matter:

**It is auditable.** No model, no hidden ranking. Every row on `/dispatch`
shows its own reason in plain English:
`Priority 12.1 · critical medical emergency, older adult, mobility need`.

**It cannot starve a caller.** The decay term means an unanswered call gets
louder every minute. A routine call that has waited 70 minutes scores 12.6 and
outranks a critical one that just arrived at 12.1. Scores are recomputed on
every read, never frozen at creation — that is what makes the decay real
rather than decorative.

`/dispatch` polls every 3 seconds and rows reorder live. In development each
row has a **+5 min** button that ages an incident, so the reordering is
demonstrable in seconds instead of an hour.

## Running it

```bash
npm install
npm run dev      # API on :8787, web on :5173
```

Open http://localhost:5173. No keys or external services are needed.

```bash
npm test         # pricing and priority logic
npm run lint     # typecheck
npm run build    # production bundle
```

`POST /api/dev/reset` restores the fleet and clears trips and incidents, so a
demo can be rehearsed repeatedly without draining the boat pool. It is
disabled when `NODE_ENV=production`.

## Fares

Pricing lives in `shared/pricing.ts` and is imported by both the browser
estimate and the server that writes the trip, so a quote and a receipt cannot
diverge.

```
fare = (8.00 + 1.60 × km) × classMultiplier × passengerFactor
```

First passenger pays full, each additional three quarters; totals round to the
nearest 50 cents. A 26 km water taxi for two is $87.00. Every distance is a
great-circle calculation from real island coordinates — no hardcoded numbers.

## Layout

```
shared/          priority.ts, pricing.ts  — pure logic, shared by client and server
server/          Express API over in-memory state; Zod-validated
src/data/        islands, docks, fleet, and the destination guide content
src/pages/       one file per route
src/components/  AppShell, the chart, and UI primitives
tests/           unit tests for the two shared modules
```

## Notes

- **Islands are real; scenery is illustrated.** The seven islands, their docks
  and everything in the destination guides describe real places, limited to
  durable facts — no invented landmarks and no opening hours or prices, which
  go stale. The photography is generated SVG so the app never depends on an
  image host being reachable mid-demo. Swap `photoUrl` in `src/lib/photos.ts`
  for pinned URLs to use real photographs.
- **Accounts are local.** `src/lib/auth.tsx` keeps a signed-in user in
  `localStorage` so the app runs with nothing to configure. Trips booked while
  signed out are remembered and claimed on sign-in. Everything else goes
  through that one hook, so a hosted identity provider replaces this file
  alone.
- **State is in memory.** Restarting the server returns everything to seed.
- `emergencyEquipped` is not shown as a fleet filter or badge, but it is load
  bearing: the dispatcher picks rescue boats with it. At least four rescue
  boats start available, a boot assertion fails loudly if none are, and if
  every one is busy the nearest is re-tasked rather than turning a caller away.
