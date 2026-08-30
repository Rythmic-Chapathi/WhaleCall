import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button, Card, EmptyState, ErrorState, Loading, Stars } from "@/components/ui";
import { api, getApiErrorMessage } from "@/lib/api";
import { getIsland } from "@/data/islands";
import { BOAT_CLASS_LABELS } from "@shared/pricing";
import { initials, relativeDate } from "@/lib/format";

export default function DriverProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ["driver", id],
    queryFn: () => api.driver(id),
  });
  const { data: reviews } = useQuery({
    queryKey: ["driver-reviews", id, page],
    queryFn: () => api.driverReviews(id, page),
  });

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><ErrorState message={getApiErrorMessage(error)} /></AppShell>;
  if (!driver) return <AppShell><ErrorState message="Driver not found." /></AppShell>;

  const total = driver.reviewCount || 0;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="flex flex-wrap items-center gap-5">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold"
          >
            {initials(driver.name)}
          </span>
          <div>
            <h1 className="text-4xl font-bold tracking-[-.025em]">{driver.name}</h1>
            <p className="mt-1 text-base text-muted-foreground">
              {getIsland(driver.homeIslandId)?.name ?? driver.homeIslandName} · {driver.yearsActive} years experience
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Tile label="Trips completed" value={driver.tripsCompleted.toLocaleString()} />
          <Tile label="Rating" value={driver.rating !== null ? driver.rating.toFixed(1) : "—"} />
          <Tile label="Reviews" value={String(total)} />
        </div>

        <div className="mt-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Boat classes:</span>{" "}
            {driver.boatClasses.map((c) => BOAT_CLASS_LABELS[c]).join(", ")}</p>
          <p><span className="font-medium text-foreground">Languages:</span> {driver.languages.join(", ")}</p>
        </div>

        {driver.boat && (
          <p className="mt-2 text-sm text-muted-foreground">
            Currently sailing {driver.boat.name} · {BOAT_CLASS_LABELS[driver.boat.boatClass]}
          </p>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Ratings</h2>
          {driver.rating === null ? (
            <p className="mt-3 text-sm text-muted-foreground">No ratings yet.</p>
          ) : (
            <Card className="mt-4 p-6">
              <div className="flex flex-wrap items-center gap-5">
                <div>
                  <p className="text-3xl font-bold tabular-nums">{driver.rating.toFixed(1)}</p>
                  <Stars value={driver.rating} />
                  <p className="mt-1 text-sm text-muted-foreground">{total} {total === 1 ? "review" : "reviews"}</p>
                </div>
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = driver.distribution?.[String(star)] ?? 0;
                    const pct = total ? (count / total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-3 tabular-nums text-muted-foreground">{star}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Reviews</h2>
          <div className="mt-4 space-y-4">
            {!reviews || reviews.reviews.length === 0 ? (
              <EmptyState title="No reviews yet." />
            ) : (
              reviews.reviews.map((review) => (
                <Card key={review.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{review.userName}</span>
                    <Stars value={review.rating} size={14} />
                    <span className="text-sm text-muted-foreground">{relativeDate(review.createdAt)}</span>
                  </div>
                  {review.body && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
                  )}
                </Card>
              ))
            )}
          </div>

          {reviews && (reviews.hasMore || page > 1) && (
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={!reviews.hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </section>

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/fleet" className="font-medium text-primary underline">Back to boats</Link>
        </p>
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
