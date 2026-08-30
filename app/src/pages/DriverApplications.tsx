import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button, Card, EmptyState, ErrorState, Loading } from "@/components/ui";
import { api, getApiErrorMessage, type Application } from "@/lib/api";
import { getIsland } from "@/data/islands";
import { shortDate } from "@/lib/format";

const TABS = ["pending", "approved", "rejected"] as const;

export default function DriverApplicationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["applications"],
    queryFn: api.applications,
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      api.decideApplication(id, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  if (isLoading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} /></AppShell>;

  const applications = (data ?? []).filter((a) => a.status === tab);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Driver applications</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Approving an application creates a driver record.
        </p>

        <div className="mt-8 flex gap-2">
          {TABS.map((t) => {
            const count = (data ?? []).filter((a) => a.status === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`tap rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {applications.length === 0 ? (
            <EmptyState title={`No ${tab} applications.`} />
          ) : (
            applications.map((app) => (
              <Row
                key={app.id}
                app={app}
                busy={decide.isPending}
                onDecide={(decision) => decide.mutate({ id: app.id, decision })}
              />
            ))
          )}
        </div>

        {decide.isError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(decide.error)}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Row({
  app, onDecide, busy,
}: { app: Application; onDecide: (d: "approve" | "reject") => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{app.fullName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getIsland(app.homeIslandId)?.name ?? app.homeIslandId} · {app.yearsOperating} years · {app.email}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Applied {shortDate(app.submittedAt)} · {app.id}
          </p>
        </div>

        {app.status === "pending" ? (
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onDecide("approve")}>Approve</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDecide("reject")}>Reject</Button>
          </div>
        ) : (
          <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            app.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}>
            {app.status === "approved" ? "Approved" : "Rejected"}
          </span>
        )}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap mt-3 rounded-lg text-sm font-medium text-primary underline"
      >
        {open ? "Hide details" : "View details"}
      </button>

      {open && (
        <dl className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          <Detail label="Boat classes" body={app.boatClasses.join(", ")} />
          <Detail label="Languages" body={app.languages.join(", ")} />
          <Detail label="Availability" body={app.availability.join(", ")} />
          <Detail label="Licence" body={app.licenseId} />
          <Detail label="Experience" body={app.experience} />
          <Detail label="A difficult situation" body={app.difficultSituation} />
          <Detail label="Emergency training" body={app.emergencyTraining} />
        </dl>
      )}
    </Card>
  );
}

function Detail({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <dt className="font-medium">{label}</dt>
      <dd className="mt-0.5 leading-relaxed text-muted-foreground">{body}</dd>
    </div>
  );
}
