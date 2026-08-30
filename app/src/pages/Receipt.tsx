import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Card, ErrorState, LinkButton, Loading } from "@/components/ui";
import { api, getApiErrorMessage } from "@/lib/api";
import { fareBreakdown, formatMoney, BOAT_CLASS_LABELS } from "@shared/pricing";
import { shortDate } from "@/lib/format";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trip, isLoading, error } = useQuery({ queryKey: ["trip", id], queryFn: () => api.trip(id) });

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><ErrorState message={getApiErrorMessage(error)} /></AppShell>;
  if (!trip) return <AppShell><ErrorState message="Trip not found." /></AppShell>;

  // Rebuilt from the same module the fare was quoted with, so the line items
  // always add up to the amount actually charged.
  const fare = fareBreakdown({ km: trip.km, boatClass: trip.boatClass, passengers: trip.passengers });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Receipt</h1>
        <p className="mt-2 text-base text-muted-foreground">Thanks for riding.</p>

        <Card className="mt-8 p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{shortDate(trip.completedAt ?? trip.createdAt)}</span>
            <span className="text-sm text-muted-foreground">{trip.id}</span>
          </div>

          <p className="mt-4 text-lg font-semibold">
            {trip.pickupIslandName} → {trip.destinationIslandName}
          </p>
          <p className="text-sm text-muted-foreground">
            {trip.pickupDockName} to {trip.destinationDockName} · {trip.km} km
          </p>

          <dl className="mt-6 space-y-2.5 border-t border-border pt-4 text-sm">
            <Row label="Base fare" value={formatMoney(fare.base)} />
            <Row label={`Distance · ${trip.km} km`} value={formatMoney(fare.distance)} />
            <Row label={`${BOAT_CLASS_LABELS[trip.boatClass]} · ×${fare.classMultiplier}`} value="" />
            {fare.additionalPassengers > 0 && (
              <Row
                label={`${trip.passengers - 1} additional ${trip.passengers - 1 === 1 ? "passenger" : "passengers"}`}
                value={formatMoney(fare.additionalPassengers)}
              />
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(trip.fare)}</dd>
            </div>
          </dl>

          <p className="mt-6 text-sm text-muted-foreground">
            Captain{" "}
            <Link href={`/drivers/${trip.driverId}`} className="font-medium text-primary underline">
              {trip.driverName}
            </Link>{" "}
            · {trip.boatName}
          </p>
          {trip.status === "completed" && (
            <p className="mt-1 text-sm text-muted-foreground">Trip complete</p>
          )}
        </Card>

        <div className="mt-6 flex gap-3">
          <LinkButton href="/profile" variant="secondary">Your trips</LinkButton>
          <LinkButton href="/book">Book a ride</LinkButton>
        </div>
      </div>
    </AppShell>
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
