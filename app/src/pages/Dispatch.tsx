import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Card, EmptyState, ErrorState, Loading } from "@/components/ui";
import { api, getApiErrorMessage, type QueueRow } from "@/lib/api";
import { waitLabel } from "@/lib/format";

const SITUATION_LABEL: Record<QueueRow["situation"], string> = {
  taking_on_water: "Taking on water",
  medical: "Medical",
  stranded: "Stranded",
  other: "Other",
};

const IS_DEV = import.meta.env.DEV;

/**
 * The live triage board.
 *
 * Scores are recomputed server-side on every poll, so rows reorder on their
 * own as waiting time accrues. That reordering is the point: an unanswered
 * call climbs until it is answered.
 */
export default function DispatchPage() {
  const queryClient = useQueryClient();
  const { data: queue, isLoading, error, refetch } = useQuery({
    queryKey: ["queue"],
    queryFn: api.queue,
    refetchInterval: 3000,
  });

  const age = useMutation({
    mutationFn: (id: string) => api.ageEmergency(id, 5),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queue"] }),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => api.resolveEmergency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
    },
  });

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} /></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Dispatch</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Active responses, highest priority first. Scores rise the longer a call
          goes unanswered, so nothing waits forever behind a steady stream of
          newer requests.
        </p>

        <div className="mt-8 space-y-3">
          {!queue || queue.length === 0 ? (
            <EmptyState title="No active responses." body="New emergency requests appear here immediately." />
          ) : (
            queue.map((row, index) => (
              <Card
                key={row.id}
                className="flex flex-col gap-4 p-5 transition-all duration-500 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                  <span className="text-3xl font-bold tabular-nums">{row.score.toFixed(1)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                      {SITUATION_LABEL[row.situation]}
                    </span>
                    {row.urgency && (
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${
                        row.urgency === "critical" ? "bg-red-50 text-red-700"
                        : row.urgency === "urgent" ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                        {row.urgency === "critical" ? "Critical" : row.urgency === "urgent" ? "Urgent" : "Routine"}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">Waiting {waitLabel(row.minutesWaiting)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{row.reason}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.position || "Location not given"} ·{" "}
                    {row.boatName ? `${row.boatName}${row.driverName ? ` · ${row.driverName}` : ""}` : "Unassigned"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {IS_DEV && (
                    <button
                      onClick={() => age.mutate(row.id)}
                      title="Age this incident by five minutes to show decay reordering"
                      className="tap rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      +5 min
                    </button>
                  )}
                  <Link
                    href={`/emergency/${row.id}`}
                    className="tap inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => resolve.mutate(row.id)}
                    className="tap rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Resolve
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {IS_DEV && (
          <p className="mt-8 text-sm text-muted-foreground">
            The <strong>+5 min</strong> button ages a call so decay reordering is visible
            immediately rather than after a real wait. Development only.
          </p>
        )}
      </div>
    </AppShell>
  );
}
