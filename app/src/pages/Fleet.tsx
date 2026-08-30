import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorState, LinkButton, Loading, Photo, StatusChip, Stars } from "@/components/ui";
import { api, getApiErrorMessage, type FleetBoat } from "@/lib/api";
import { ISLANDS } from "@/data/islands";
import { BOAT_CLASS_LABELS, type BoatClass } from "@shared/pricing";

const CLASS_TINT: Record<BoatClass, string> = {
  catamaran: "bg-teal-50 text-teal-700",
  water_taxi: "bg-sky-50 text-sky-700",
  cruiser: "bg-indigo-50 text-indigo-700",
  speedboat: "bg-amber-50 text-amber-700",
};

function BoatCard({ boat }: { boat: FleetBoat }) {
  return (
    <Card className="relative flex flex-col overflow-hidden transition-colors hover:border-primary/50">
      <div className="relative">
        <Photo
          seed={`boat-${boat.boatClass}-${boat.id}`}
          alt={`${boat.name}, a ${BOAT_CLASS_LABELS[boat.boatClass].toLowerCase()}`}
          label={boat.name}
          width={480}
          height={270}
          className="h-36 w-full object-cover"
        />
        <span className="absolute right-3 top-3">
          <StatusChip status={boat.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{boat.name}</h3>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${CLASS_TINT[boat.boatClass]}`}>
            {BOAT_CLASS_LABELS[boat.boatClass]}
          </span>
        </div>

        {boat.driver && (
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/drivers/${boat.driver.id}`} className="font-medium text-primary underline">
              {boat.driver.name}
            </Link>
            {boat.rating !== null && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle">
                <Stars value={boat.rating} size={13} />
                <span className="tabular-nums">{boat.rating.toFixed(1)}</span>
              </span>
            )}
          </p>
        )}

        <p className="mt-3 text-sm text-muted-foreground">Up to {boat.capacity} passengers</p>
        <p className="text-sm text-muted-foreground">Currently at {boat.islandName}</p>
        {boat.driver && (
          <p className="text-sm text-muted-foreground">{boat.driver.yearsActive} years experience</p>
        )}

        <div className="mt-4 pt-1">
          <LinkButton href={`/drivers/${boat.driverId}`} variant="secondary" size="sm">Details</LinkButton>
        </div>
      </div>
    </Card>
  );
}

export default function FleetPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["fleet"], queryFn: api.fleet });
  const [islandId, setIslandId] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const boats = useMemo(() => {
    if (!data) return [];
    return data.boats.filter(
      (b) => (!islandId || b.islandId === islandId) && (!availableOnly || b.status === "available"),
    );
  }, [data, islandId, availableOnly]);

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} /></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Available boats</h1>
        <p className="mt-2 text-base text-muted-foreground">All boats currently in service.</p>

        {data && (
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Stat label="Total boats" value={data.stats.total} />
            <Stat label="Available" value={data.stats.available} />
            <Stat label="On trip" value={data.stats.onTrip} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <select
            value={islandId}
            onChange={(e) => setIslandId(e.target.value)}
            aria-label="Filter by island"
            className="tap rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">All islands</option>
            {ISLANDS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <button
            onClick={() => setAvailableOnly((v) => !v)}
            aria-pressed={availableOnly}
            className={`tap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              availableOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            Available now
          </button>
          <span className="ml-auto text-sm text-muted-foreground">{boats.length} boats</span>
        </div>

        <div className="mt-6">
          {boats.length === 0 ? (
            <EmptyState
              title="No boats match those filters."
              body="Try clearing a filter."
              action={
                <button
                  onClick={() => { setIslandId(""); setAvailableOnly(false); }}
                  className="tap rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {boats.map((b) => <BoatCard key={b.id} boat={b} />)}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
