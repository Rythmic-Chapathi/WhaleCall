import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { ISLANDS } from "@/data/islands";
import { api, errorField, getApiErrorMessage } from "@/lib/api";
import { BOAT_CLASS_LABELS, type BoatClass } from "@shared/pricing";

const CLASSES: BoatClass[] = ["catamaran", "water_taxi", "cruiser", "speedboat"];
const LANGUAGES = ["English", "French", "Spanish", "Kwéyòl", "Dutch"];
const AVAILABILITY = [
  { value: "weekday", label: "Weekdays" },
  { value: "weekend", label: "Weekends" },
  { value: "overnight", label: "Overnight" },
];
const MIN_CHARS = 100;

export default function DriverApplyPage() {
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", homeIslandId: "", yearsOperating: "",
    licenseId: "", experience: "", difficultSituation: "", emergencyTraining: "",
  });
  const [boatClasses, setBoatClasses] = useState<BoatClass[]>([]);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      api.createApplication({
        ...form,
        yearsOperating: form.yearsOperating === "" ? undefined : Number(form.yearsOperating),
        boatClasses, languages, availability, consent,
      }),
  });

  const badField = errorField(submit.error);
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  function toggle<T>(list: T[], setList: (v: T[]) => void, value: T) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  // The confirmation replaces the form, but the page keeps its content.
  if (submit.isSuccess) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-2xl px-4 py-16">
          <Card className="p-8">
            <h1 className="text-4xl font-bold tracking-[-.025em]">Application received</h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Thanks for applying. We review applications in the order they arrive and will
              contact you at {form.email}.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">Your application ID</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{submit.data.id}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Keep this ID — you'll need it if you get in touch about your application.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Drive with us</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Tell us about your experience on the water. Every section is required.
        </p>

        <form
          className="mt-10 space-y-10"
          onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
        >
          <Group title="About you">
            <Text label="Full name" value={form.fullName} onChange={set("fullName")} error={badField === "fullName"} autoComplete="name" />
            <Text label="Email" type="email" value={form.email} onChange={set("email")} error={badField === "email"} autoComplete="email" />
            <Text label="Phone" type="tel" value={form.phone} onChange={set("phone")} error={badField === "phone"} autoComplete="tel" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Home island</span>
              <select
                value={form.homeIslandId}
                onChange={(e) => set("homeIslandId")(e.target.value)}
                className={`tap w-full rounded-lg border bg-card px-3 py-2.5 text-sm ${badField === "homeIslandId" ? "border-red-500" : "border-border"}`}
              >
                <option value="">Select an island</option>
                {ISLANDS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>
          </Group>

          <Group title="Qualifications">
            <Text
              label="Years operating a boat" type="number" min={0} max={70}
              value={form.yearsOperating} onChange={set("yearsOperating")} error={badField === "yearsOperating"}
            />
            <Text label="Licence or certification ID" value={form.licenseId} onChange={set("licenseId")} error={badField === "licenseId"} />

            <Checkboxes
              label="Boat classes you are qualified for"
              error={badField === "boatClasses"}
              options={CLASSES.map((c) => ({ value: c, label: BOAT_CLASS_LABELS[c] }))}
              selected={boatClasses}
              onToggle={(v) => toggle(boatClasses, setBoatClasses, v as BoatClass)}
            />
            <Checkboxes
              label="Languages"
              error={badField === "languages"}
              options={LANGUAGES.map((l) => ({ value: l, label: l }))}
              selected={languages}
              onToggle={(v) => toggle(languages, setLanguages, v)}
            />
            <Checkboxes
              label="Availability"
              error={badField === "availability"}
              options={AVAILABILITY}
              selected={availability}
              onToggle={(v) => toggle(availability, setAvailability, v)}
            />
          </Group>

          <Group title="Experience">
            <LongText
              label="Describe your experience on these waters."
              value={form.experience} onChange={set("experience")} error={badField === "experience"}
            />
            <LongText
              label="Describe a difficult situation on the water and how you handled it."
              value={form.difficultSituation} onChange={set("difficultSituation")} error={badField === "difficultSituation"}
            />
            <LongText
              label="What emergency or first-aid training do you have?"
              value={form.emergencyTraining} onChange={set("emergencyTraining")} error={badField === "emergencyTraining"}
            />
          </Group>

          <div>
            <label className="flex cursor-pointer items-center gap-2">
              {/* The checkbox keeps a full 44px target of its own. */}
              <span className="tap flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="h-5 w-5 rounded border-border"
                />
              </span>
              <span className={`text-sm ${badField === "consent" ? "text-red-700" : ""}`}>
                I confirm this information is accurate.
              </span>
            </label>
          </div>

          {submit.isError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {getApiErrorMessage(submit.error)}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-2xl font-semibold tracking-[-.015em]">{title}</legend>
      <div className="space-y-4 pt-2">{children}</div>
    </fieldset>
  );
}

function Text({
  label, value, onChange, error, type = "text", ...rest
}: {
  label: string; value: string; onChange: (v: string) => void; error?: boolean;
  type?: string; min?: number; max?: number; autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        className={`tap w-full rounded-lg border bg-card px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-border"}`}
        {...rest}
      />
    </label>
  );
}

/** Live counter so the 100-character floor is visible before submitting. */
function LongText({
  label, value, onChange, error,
}: { label: string; value: string; onChange: (v: string) => void; error?: boolean }) {
  const short = value.trim().length < MIN_CHARS;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        aria-invalid={error || undefined}
        className={`w-full rounded-lg border bg-card px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-border"}`}
      />
      <span className={`mt-1 block text-sm ${short ? "text-muted-foreground" : "text-emerald-700"}`}>
        {value.trim().length}/{MIN_CHARS} characters
      </span>
    </label>
  );
}

function Checkboxes({
  label, options, selected, onToggle, error,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
  error?: boolean;
}) {
  return (
    <fieldset>
      <legend className={`mb-2 text-sm font-medium ${error ? "text-red-700" : ""}`}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(opt.value)}
              className={`tap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
