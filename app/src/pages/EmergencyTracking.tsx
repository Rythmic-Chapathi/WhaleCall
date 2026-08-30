import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button, Card, ErrorState, LinkButton, Loading } from "@/components/ui";
import { api, getApiErrorMessage } from "@/lib/api";
import { waitLabel } from "@/lib/format";

export default function EmergencyTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: incident, isLoading, error } = useQuery({
    queryKey: ["emergency", id],
    queryFn: () => api.emergency(id),
    refetchInterval: 5000,
  });

  const resolve = useMutation({
    mutationFn: () => api.resolveEmergency(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["emergency", id], updated);
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
    },
  });

  if (isLoading) return <AppShell mode="response-mode"><Loading /></AppShell>;
  if (error) return <AppShell mode="response-mode"><ErrorState message={getApiErrorMessage(error)} /></AppShell>;
  if (!incident) return <AppShell mode="response-mode"><ErrorState message="Response not found." /></AppShell>;

  const resolved = incident.status === "resolved";

  return (
    <AppShell mode="response-mode">
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">
          {resolved ? "Response resolved" : "Rescue boat dispatched"}
        </h1>
        {!resolved && incident.boatName && (
          <p className="mt-2 text-base text-muted-foreground">
            {incident.boatName}
            {incident.driverName && <> · {incident.driverName}</>} is on the way.
          </p>
        )}
        {incident.retasked && !resolved && (
          <p className="mt-2 text-sm text-muted-foreground">
            The nearest rescue boat was redirected from another job to reach you.
          </p>
        )}

        {/* The score and the reason behind it, shown to the caller too. */}
        <Card className="mt-8 p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Priority</h2>
            <span className="text-3xl font-bold tabular-nums">{incident.score.toFixed(1)}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{incident.reason}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <Part label="Situation" value={incident.breakdown.situation} />
            <Part label="Age group" value={incident.breakdown.age} />
            <Part label="Access needs" value={incident.breakdown.access} />
            <Part label="Urgency" value={incident.breakdown.urgency} />
            <Part label="Time waiting" value={incident.breakdown.waitBonus} />
          </dl>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold">Response details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Location" value={incident.position || "Not given"} />
            <Row label="Waiting" value={waitLabel(incident.minutesWaiting)} />
            {incident.boatName && <Row label="Boat" value={incident.boatName} />}
            {incident.notes && <Row label="Details" value={incident.notes} />}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            {!resolved ? (
              <Button disabled={resolve.isPending} onClick={() => resolve.mutate()}>
                {resolve.isPending ? "Updating…" : "Mark resolved"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">This response is closed.</p>
            )}
            <LinkButton href="/dispatch" variant="secondary">Dispatch board</LinkButton>
          </div>

          {resolve.isError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">
              {getApiErrorMessage(resolve.error)}
            </p>
          )}
        </Card>
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

function Part({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">+{value}</dd>
    </div>
  );
}
