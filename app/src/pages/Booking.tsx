import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import CaribbeanMap from "@/components/CaribbeanMap";
import { Button, Card } from "@/components/ui";
import { ISLANDS, getIsland, getDock, dockBelongsTo, routeKm, etaMinutes, type Island } from "@/data/islands";
import { api, getApiErrorMessage } from "@/lib/api";
import { rememberGuestTrip, useAuth } from "@/lib/auth";
import { fareBreakdown, formatMoney, BOAT_CLASS_LABELS, type BoatClass } from "@shared/pricing";

const CLASSES: BoatClass[] = ["catamaran", "water_taxi", "cruiser", "speedboat"];

export default function BookingPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [pickupIsland, setPickupIsland] = useState<string | null>(null);
  const [pickupDock, setPickupDock] = useState<string | null>(null);
  const [destinationIsland, setDestinationIsland] = useState<string | null>(null);
  const [destinationDock, setDestinationDock] = useState<string | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [boatClass, setBoatClass] = useState<BoatClass>("water_taxi");
  const [presetActive, setPresetActive] = useState(false);

  /**
   * A preset destination arrives in the query string from an island page.
   * The ref is keyed by island:dock so the effect applies a given preset once
   * and only once -- it must survive re-renders and any refetch that happens
   * mid-flow, and it must not re-fire after the user clears it with Change.
   */
  const appliedPreset = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const islandId = params.get("destinationIsland");
    const dockId = params.get("destinationDock");
    if (!islandId) return;

    const key = `${islandId}:${dockId ?? ""}`;
    if (appliedPreset.current === key) return;

    const island = getIsland(islandId);
    // An unknown island, or a dock named that does not belong to it, drops the
    // preset entirely and leaves the ordinary flow untouched. Silently sending
    // someone to a dock they did not ask for is worse than not presetting.
    if (!island || (dockId && !dockBelongsTo(dockId, islandId))) {
      appliedPreset.current = key;
      return;
    }

    appliedPreset.current = key;
    setDestinationIsland(island.id);
    // Without a dock in the link the destination island is prefilled but the
    // dock is still the user's to choose, so the flow keeps all three steps.
    if (dockId) {
      setDestinationDock(dockId);
      setPresetActive(true);
    }
    // A pickup already chosen on the destination island is no longer valid.
    setPickupIsland((current) => (current === island.id ? null : current));
    setPickupDock((current) => (getDock(current)?.islandId === island.id ? null : current));
  }, [search]);

  function clearPreset() {
    appliedPreset.current = null;
    setPresetActive(false);
    setDestinationIsland(null);
    setDestinationDock(null);
    // Drop the query string so a refresh does not reapply what was cleared.
    setLocation("/book", { replace: true });
  }

  // The destination can never also be the pickup.
  const pickupOptions = useMemo(
    () => ISLANDS.filter((i) => i.id !== destinationIsland),
    [destinationIsland],
  );
  const destinationOptions = useMemo(
    () => ISLANDS.filter((i) => i.id !== pickupIsland),
    [pickupIsland],
  );

  const totalSteps = presetActive ? 2 : 3;
  const step = !pickupIsland || !pickupDock ? 1 : presetActive ? 2 : !destinationIsland || !destinationDock ? 2 : 3;

  const km = pickupDock && destinationDock ? routeKm(pickupDock, destinationDock) : 0;
  const fare = useMemo(() => fareBreakdown({ km, boatClass, passengers }), [km, boatClass, passengers]);
  const ready = !!(pickupIsland && pickupDock && destinationIsland && destinationDock);

  const createTrip = useMutation({
    mutationFn: () =>
      api.createTrip({
        pickupIslandId: pickupIsland,
        pickupDockId: pickupDock,
        destinationIslandId: destinationIsland,
        destinationDockId: destinationDock,
        passengers,
      }),
    onSuccess: (trip) => {
      if (!user) rememberGuestTrip(trip.id);
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
      setLocation(`/trip/${trip.id}`);
    },
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-.025em]">Book a ride</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Choose your pickup and destination.
        </p>

        {presetActive && destinationIsland && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3">
            <span className="text-sm">
              Going to <strong className="font-semibold">{getIsland(destinationIsland)?.name}</strong>
              {destinationDock && <> · {getDock(destinationDock)?.name}</>}
            </span>
            <button
              onClick={clearPreset}
              className="tap ml-auto rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background"
            >
              Change
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-8">
            <Section title="Pickup" step={1}>
              <IslandPicker
                options={pickupOptions}
                islandId={pickupIsland}
                dockId={pickupDock}
                onIsland={(id) => { setPickupIsland(id); setPickupDock(null); }}
                onDock={setPickupDock}
                idPrefix="pickup"
              />
            </Section>

            {!presetActive && (
              <Section title="Destination" step={2}>
                {pickupIsland ? (
                  <IslandPicker
                    options={destinationOptions}
                    islandId={destinationIsland}
                    dockId={destinationDock}
                    onIsland={(id) => { setDestinationIsland(id); setDestinationDock(null); }}
                    onDock={setDestinationDock}
                    idPrefix="destination"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Choose your pickup island first.</p>
                )}
              </Section>
            )}

            <Section title="Review your trip" step={totalSteps}>
              {ready ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Passengers">
                      <select
                        value={passengers}
                        onChange={(e) => setPassengers(Number(e.target.value))}
                        className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                        aria-label="Number of passengers"
                      >
                        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "passenger" : "passengers"}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Boat class">
                      <select
                        value={boatClass}
                        onChange={(e) => setBoatClass(e.target.value as BoatClass)}
                        className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                        aria-label="Boat class"
                      >
                        {CLASSES.map((c) => (
                          <option key={c} value={c}>{BOAT_CLASS_LABELS[c]}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {createTrip.isError && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      {getApiErrorMessage(createTrip.error)}
                    </p>
                  )}

                  <Button
                    size="lg"
                    disabled={createTrip.isPending}
                    onClick={() => createTrip.mutate()}
                  >
                    {createTrip.isPending ? "Requesting…" : "Request boat"}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Need emergency help? <a href="/emergency" className="font-medium text-primary underline">Emergency</a>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Choose both ends of the trip to see your fare.</p>
              )}
            </Section>
          </div>

          <div className="space-y-6">
            <CaribbeanMap
              pickupId={pickupIsland}
              destinationId={destinationIsland}
              onSelect={(island) => {
                if (!pickupIsland) { setPickupIsland(island.id); setPickupDock(null); return; }
                if (!presetActive && island.id !== pickupIsland) { setDestinationIsland(island.id); setDestinationDock(null); }
              }}
            />

            {ready && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold">Fare</h2>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label="Base fare" value={formatMoney(fare.base)} />
                  <Row label={`Distance · ${fare.km} km`} value={formatMoney(fare.distance)} />
                  <Row label={`${BOAT_CLASS_LABELS[boatClass]} · ×${fare.classMultiplier}`} value="" />
                  {fare.additionalPassengers > 0 && (
                    <Row
                      label={`${fare.passengers - 1} additional ${fare.passengers - 1 === 1 ? "passenger" : "passengers"}`}
                      value={formatMoney(fare.additionalPassengers)}
                    />
                  )}
                  <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatMoney(fare.total)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-muted-foreground">
                  About {etaMinutes(fare.km)} min on the water.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
          {step}
        </span>
        <h2 className="text-2xl font-semibold tracking-[-.015em]">{title}</h2>
      </div>
      <div className="mt-4 pl-10">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function IslandPicker({
  options, islandId, dockId, onIsland, onDock, idPrefix,
}: {
  options: Island[];
  islandId: string | null;
  dockId: string | null;
  onIsland: (id: string) => void;
  onDock: (id: string) => void;
  idPrefix: string;
}) {
  const island = getIsland(islandId);
  return (
    <div className="space-y-4">
      <Field label="Island">
        <select
          id={`${idPrefix}-island`}
          value={islandId ?? ""}
          onChange={(e) => onIsland(e.target.value)}
          className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
        >
          <option value="">Select an island</option>
          {options.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </Field>

      {island && (
        <Field label="Dock">
          <div className="flex flex-wrap gap-2">
            {island.docks.map((dock) => (
              <button
                key={dock.id}
                onClick={() => onDock(dock.id)}
                aria-pressed={dockId === dock.id}
                className={`tap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  dockId === dock.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {dock.name}
              </button>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}
