import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorState, LinkButton, Loading } from "@/components/ui";
import RateCaptain from "@/components/RateCaptain";
import { api, getApiErrorMessage, type TripRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@shared/pricing";
import { shortDate } from "@/lib/format";

export default function ProfilePage() {
  const { user, ready } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trips"],
    queryFn: () => api.trips(1),
    enabled: !!user,
  });
  const [rating, setRating] = useState<string | null>(null);

  if (!ready) return <AppShell><Loading /></AppShell>;

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-[-.025em]">Your trips</h1>
          <p className="mt-2 text-base text-muted-foreground">Sign in to view your trip history.</p>
          <div className="mt-6 flex justify-center gap-3">
            <LinkButton href="/sign-in">Sign in</LinkButton>
            <LinkButton href="/book" variant="secondary">Book a ride</LinkButton>
          </div>
        </div>
      </AppShell>
    );
  }

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} /></AppShell>;

  const trips = data?.trips ?? [];
  const inProgress = trips.filter((t) => t.status === "in_progress");
  const past = trips.filter((t) => t.status !== "in_progress");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Your trips</h1>
        <p className="mt-2 text-base text-muted-foreground">Signed in as {user.email}</p>

        {data && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Tile label="Trips" value={String(data.stats.trips)} />
            <Tile label="Total distance" value={`${data.stats.km} km`} />
            <Tile label="Total spent" value={formatMoney(data.stats.spent)} />
          </div>
        )}

        {inProgress.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-semibold tracking-[-.015em]">In progress</h2>
            <div className="mt-4 space-y-3">
              {inProgress.map((trip) => (
                <Card key={trip.id} className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {trip.pickupIslandName} → {trip.destinationIslandName}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {shortDate(trip.createdAt)} · {formatMoney(trip.fare)}
                    </p>
                  </div>
                  <LinkButton href={`/trip/${trip.id}`} size="sm">Track</LinkButton>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">History</h2>
          <div className="mt-4">
            {past.length === 0 ? (
              <EmptyState
                title="No trips yet"
                body="Your completed trips will appear here."
                action={<LinkButton href="/book">Book your first ride</LinkButton>}
              />
            ) : (
              <div className="space-y-3">
                {past.map((trip) => (
                  <TripRow
                    key={trip.id}
                    trip={trip}
                    rating={rating === trip.id}
                    onRate={() => setRating(rating === trip.id ? null : trip.id)}
                    onRated={() => refetch()}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

function TripRow({
  trip, rating, onRate, onRated,
}: { trip: TripRecord; rating: boolean; onRate: () => void; onRated: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <Link href={`/trip/${trip.id}`} className="font-semibold hover:underline">
            {trip.pickupIslandName} → {trip.destinationIslandName}
          </Link>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {shortDate(trip.completedAt ?? trip.createdAt)} · {formatMoney(trip.fare)} · {trip.km} km
          </p>
        </div>

        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${
          trip.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
        }`}>
          {trip.status === "completed" ? "Completed" : "Cancelled"}
        </span>

        {trip.status === "completed" && !trip.rated && (
          <button
            onClick={onRate}
            className="tap rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Rate captain
          </button>
        )}
      </div>

      {rating && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-medium">Rate {trip.driverName}</p>
          <RateCaptain driverId={trip.driverId} tripId={trip.id} onDone={onRated} />
        </div>
      )}
    </Card>
  );
}
