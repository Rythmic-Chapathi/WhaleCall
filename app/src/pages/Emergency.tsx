import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui";
import { api, getApiErrorMessage } from "@/lib/api";
import type { AccessNeed, AgeGroup, Situation, Urgency } from "@shared/priority";

/**
 * Emergency intake.
 *
 * Everything past the situation is optional and answerable by tapping, so a
 * caller under stress can send the request in three taps and still give the
 * dispatcher what it needs to triage. The triage answers feed the priority
 * score directly -- see shared/priority.ts.
 */

const SITUATIONS: Array<{ value: Situation; label: string; icon: string }> = [
  { value: "medical", label: "Medical emergency", icon: "✚" },
  { value: "taking_on_water", label: "Taking on water", icon: "🌊" },
  { value: "stranded", label: "Stranded or adrift", icon: "⚓" },
  { value: "other", label: "Something else", icon: "•" },
];

const AGES: Array<{ value: AgeGroup; label: string; icon: string }> = [
  { value: "child", label: "Child", icon: "🧒" },
  { value: "adult", label: "Adult", icon: "🧑" },
  { value: "older_adult", label: "Older adult", icon: "🧓" },
];

const NEEDS: Array<{ value: AccessNeed; label: string; icon: string }> = [
  { value: "mobility", label: "Mobility", icon: "♿" },
  { value: "vision", label: "Vision", icon: "👁" },
  { value: "hearing", label: "Hearing", icon: "👂" },
  { value: "cognitive", label: "Cognitive", icon: "🧠" },
  { value: "none", label: "None", icon: "—" },
];

const URGENCIES: Array<{ value: Urgency; label: string; icon: string }> = [
  { value: "routine", label: "Routine", icon: "•" },
  { value: "urgent", label: "Urgent", icon: "!" },
  { value: "critical", label: "Critical", icon: "!!" },
];

export default function EmergencyPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [accessNeeds, setAccessNeeds] = useState<AccessNeed[]>([]);
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [notes, setNotes] = useState("");
  const [position, setPosition] = useState("");
  const [locating, setLocating] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      api.createEmergency({ situation, ageGroup, accessNeeds, urgency, notes, position }),
    onSuccess: (incident) => setLocation(`/emergency/${incident.id}`),
  });

  function toggleNeed(need: AccessNeed) {
    setAccessNeeds((current) => {
      if (need === "none") return current.includes("none") ? [] : ["none"];
      const without = current.filter((n) => n !== "none");
      return without.includes(need) ? without.filter((n) => n !== need) : [...without, need];
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <AppShell mode="response-mode">
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Emergency assistance</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Tell us what's happening. A rescue boat will be dispatched to your location.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your location is sent to dispatch immediately.
        </p>

        {step === 1 ? (
          <div className="mt-10 space-y-9">
            <Group label="What's the emergency?" required>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {SITUATIONS.map((s) => (
                  <Choice
                    key={s.value}
                    icon={s.icon}
                    label={s.label}
                    selected={situation === s.value}
                    onClick={() => setSituation(s.value)}
                  />
                ))}
              </div>
            </Group>

            <Group label="Who needs help?" hint="Optional. Helps us prioritise.">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {AGES.map((a) => (
                  <Choice key={a.value} icon={a.icon} label={a.label} selected={ageGroup === a.value} onClick={() => setAgeGroup(a.value)} />
                ))}
              </div>
            </Group>

            <Group label="Accessibility needs" hint="Optional. Select any that apply.">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {NEEDS.map((n) => (
                  <Choice
                    key={n.value}
                    icon={n.icon}
                    label={n.label}
                    selected={accessNeeds.includes(n.value)}
                    onClick={() => toggleNeed(n.value)}
                    multi
                  />
                ))}
              </div>
            </Group>

            <Group label="How urgent is it?" hint="Optional.">
              <div className="grid gap-2.5 sm:grid-cols-3">
                {URGENCIES.map((u) => (
                  <Choice key={u.value} icon={u.icon} label={u.label} selected={urgency === u.value} onClick={() => setUrgency(u.value)} />
                ))}
              </div>
            </Group>

            <Button size="lg" disabled={!situation} onClick={() => setStep(2)}>Continue</Button>
          </div>
        ) : (
          <div className="mt-10 space-y-7">
            <h2 className="text-2xl font-semibold tracking-[-.015em]">Confirm emergency request</h2>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Your location</span>
              <div className="flex flex-wrap gap-2">
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Describe where you are"
                  className="tap min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                />
                <Button variant="secondary" onClick={useMyLocation} disabled={locating}>
                  {locating ? "Locating…" : "Use my location"}
                </Button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Additional details (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder="Describe the situation"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
              />
            </label>

            {send.isError && (
              <p role="alert" className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">
                {getApiErrorMessage(send.error)}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="danger" size="lg" disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? "Requesting…" : "Request help now"}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Back</Button>
            </div>
          </div>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          Not an emergency?{" "}
          <a href="/supplies" className="inline-flex min-h-[44px] items-center font-medium underline">Request supplies</a>
        </p>
      </div>
    </AppShell>
  );
}

function Group({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold">
        {label}
        {!required && hint && <span className="ml-2 text-sm font-normal text-muted-foreground">{hint}</span>}
      </legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function Choice({
  icon, label, selected, onClick, multi,
}: { icon: string; label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      onClick={onClick}
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      className={`tap flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
      }`}
    >
      <span aria-hidden="true" className="text-lg leading-none">{icon}</span>
      {label}
    </button>
  );
}
