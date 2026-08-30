import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button, Card, ErrorState, LinkButton, Loading, Stars } from "@/components/ui";
import { api, getApiErrorMessage } from "@/lib/api";
import { formatMoney, BOAT_CLASS_LABELS } from "@shared/pricing";
import RateCaptain from "@/components/RateCaptain";

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: trip, isLoading, error, refetch } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.trip(id),
  });

  const [remaining, setRemaining] = useState<number | null>(null);
  const [ratedNow, setRatedNow] = useState(false);
  const autoCompleted = useRef(false);

  const complete = useMutation({
    mutationFn: () => api.completeTrip(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["trip", id], updated);
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  // Count down to arrival, then finish through the same endpoint the button
  // uses so the two paths cannot drift apart.
  useEffect(() => {
    if (!trip || trip.status !== "in_progress") return;
    const arriveAt = new Date(trip.createdAt).getTime() + trip.etaMinutes * 60000;
    const tick = () => {
      const mins = Math.max(0, Math.ceil((arriveAt - Date.now()) / 60000));
      setRemaining(mins);
      if (mins === 0 && !autoCompleted.current) {
        autoCompleted.current = true;
        complete.mutate();
      }
    };
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, [trip, complete]);

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) {
    const message = getApiErrorMessage(error);
    return (
      <AppShell>
        <ErrorState message={message.includes("not found") ? "Trip not found." : message} onRetry={() => refetch()} />
      </AppShell>
    );
  }
  if (!trip) return <AppShell><ErrorState message="Trip not found." /></AppShell>;

  const done = trip.status === "completed";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">
          {done ? "Trip completed" : "Your boat is on the way."}
        </h1>
        {!done && remaining !== null && (
          <p className="mt-2 text-base text-muted-foreground">
            {remaining > 0 ? `Arriving in ${remaining} min` : "Arriving now"}
          </p>
        )}

        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Trip details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="From" value={`${trip.pickupIslandName} · ${trip.pickupDockName}`} />
            <Row label="To" value={`${trip.destinationIslandName} · ${trip.destinationDockName}`} />
            <Row label="Distance" value={`${trip.km} km`} />
            <Row label="Passengers" value={String(trip.passengers)} />
            <Row label="Boat" value={`${trip.boatName} · ${BOAT_CLASS_LABELS[trip.boatClass]}`} />
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Captain</dt>
              <dd>
                <Link href={`/drivers/${trip.driverId}`} className="font-medium text-primary underline">
                  {trip.driverName}
                </Link>
                {trip.driverRating !== null && (
                  <span className="ml-2 inline-flex items-center gap-1 align-middle text-muted-foreground">
                    <Stars value={trip.driverRating} size={13} />
                    <span className="tabular-nums">{trip.driverRating.toFixed(1)}</span>
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Fare</dt>
              <dd className="tabular-nums">{formatMoney(trip.fare)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {!done && (
              <Button disabled={complete.isPending} onClick={() => complete.mutate()}>
                {complete.isPending ? "Completing…" : "Complete trip"}
              </Button>
            )}
            {done && <LinkButton href={`/receipt/${trip.id}`} variant="secondary">View receipt</LinkButton>}
            <LinkButton href="/profile" variant="ghost">Your trips</LinkButton>
          </div>

          {complete.isError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {getApiErrorMessage(complete.error)}
            </p>
          )}
        </Card>

        {done && (!trip.rated || ratedNow) && (
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-semibold">Rate your captain</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How was your trip with {trip.driverName}?
            </p>
            <RateCaptain
              driverId={trip.driverId}
              tripId={trip.id}
              onDone={() => {
                setRatedNow(true);
                queryClient.invalidateQueries({ queryKey: ["trips"] });
              }}
            />
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
