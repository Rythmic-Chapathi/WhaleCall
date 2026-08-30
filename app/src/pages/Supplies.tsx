import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { ISLANDS, getIsland, routeKm } from "@/data/islands";
import { api, getApiErrorMessage } from "@/lib/api";
import { rememberGuestTrip, useAuth } from "@/lib/auth";
import { fareBreakdown, formatMoney } from "@shared/pricing";

/**
 * Supply runs reuse the trip pipeline: a boat is dispatched to a dock with
 * essentials aboard, priced the same way as any other crossing.
 */
const KITS = [
  { id: "water", label: "Drinking water", detail: "Bottled water and purification tablets." },
  { id: "food", label: "Food staples", detail: "Rice, tinned goods and dry provisions." },
  { id: "medical", label: "Medical supplies", detail: "First-aid consumables and basic medication." },
  { id: "fuel", label: "Fuel", detail: "Jerry cans for generators and outboards." },
  { id: "power", label: "Power and light", detail: "Batteries, torches and charging packs." },
];

export default function SuppliesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [fromIsland, setFromIsland] = useState("");
  const [toIsland, setToIsland] = useState("");
  const [kits, setKits] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const from = getIsland(fromIsland);
  const to = getIsland(toIsland);
  const km = from && to ? routeKm(from.docks[0].id, to.docks[0].id) : 0;
  const fare = useMemo(
    () => fareBreakdown({ km, boatClass: "cruiser", passengers: 1 }),
    [km],
  );

  const send = useMutation({
    mutationFn: () =>
      api.createTrip({
        pickupIslandId: fromIsland,
        pickupDockId: from!.docks[0].id,
        destinationIslandId: toIsland,
        destinationDockId: to!.docks[0].id,
        passengers: 1,
      }),
    onSuccess: (trip) => {
      if (!user) rememberGuestTrip(trip.id);
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
      setLocation(`/trip/${trip.id}`);
    },
  });

  const ready = !!from && !!to && from.id !== to.id && kits.length > 0;

  return (
    <AppShell mode="supply-mode">
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Request supplies</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Have essentials brought to your island by boat.
        </p>

        <div className="mt-10 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Collect from</span>
              <select
                value={fromIsland}
                onChange={(e) => setFromIsland(e.target.value)}
                className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
              >
                <option value="">Select an island</option>
                {ISLANDS.filter((i) => i.id !== toIsland).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Deliver to</span>
              <select
                value={toIsland}
                onChange={(e) => setToIsland(e.target.value)}
                className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
              >
                <option value="">Select an island</option>
                {ISLANDS.filter((i) => i.id !== fromIsland).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="text-lg font-semibold">What do you need?</legend>
            <div className="mt-3 space-y-2">
              {KITS.map((kit) => {
                const on = kits.includes(kit.id);
                return (
                  <button
                    key={kit.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setKits(on ? kits.filter((k) => k !== kit.id) : [...kits, kit.id])}
                    className={`tap flex w-full flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors ${
                      on ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm font-medium">{kit.label}</span>
                    <span className="mt-0.5 text-sm text-muted-foreground">{kit.detail}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Additional details (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
              placeholder="Quantities, contact on arrival, anything else"
            />
          </label>

          {ready && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{km} km delivery</span>
                <span className="text-lg font-semibold tabular-nums">{formatMoney(fare.total)}</span>
              </div>
            </Card>
          )}

          {send.isError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {getApiErrorMessage(send.error)}
            </p>
          )}

          <Button size="lg" disabled={!ready || send.isPending} onClick={() => send.mutate()}>
            {send.isPending ? "Requesting…" : "Request supplies"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
