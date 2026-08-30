"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, islandById, Island, AgeBracket, Accessibility, Medical, SOSResponse, TrackingUpdate, WS_BASE } from "@/lib/api";
import IslandMap, { BoatMarkerData, RouteLine } from "@/components/IslandMap";

const AGE_OPTIONS: { value: AgeBracket; icon: string; label: string }[] = [
  { value: "child", icon: "🧒", label: "Child" },
  { value: "adult", icon: "🧑", label: "Adult" },
  { value: "elderly", icon: "🧓", label: "Elderly" },
];
const ACCESS_OPTIONS: { value: Accessibility; icon: string; label: string }[] = [
  { value: "mobility", icon: "♿", label: "Mobility" },
  { value: "visual", icon: "👁️", label: "Visual" },
  { value: "hearing", icon: "👂", label: "Hearing" },
  { value: "cognitive", icon: "🧠", label: "Cognitive" },
  { value: "none", icon: "✅", label: "None" },
];
const MEDICAL_OPTIONS: { value: Medical; icon: string; label: string; urgent?: boolean }[] = [
  { value: "routine", icon: "🩹", label: "Routine" },
  { value: "urgent", icon: "⚠️", label: "Urgent", urgent: true },
  { value: "critical", icon: "🚨", label: "Critical", urgent: true },
];

function ChoiceButton({ selected, urgent, icon, label, onClick }: { selected: boolean; urgent?: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 p-4 font-bold transition-transform hover:-translate-x-px hover:-translate-y-px ${
        selected
          ? urgent
            ? "border-[#BA1A1A] bg-[#FFDAD6] text-[#93000A] shadow-[3px_3px_0_#93000A]"
            : "border-[#0097B8] bg-[#B6EBFF] text-[#002732] shadow-[3px_3px_0_#002732]"
          : "border-[#C3C7CD] bg-white text-[#0F2537] shadow-[3px_3px_0_#C3C7CD]"
      }`}
    >
      <span className="text-[1.9rem] leading-none">{icon}</span>
      {label}
      {selected && <span className="text-xs">&#10003; selected</span>}
    </button>
  );
}

export default function SOSPage() {
  const [islands, setIslands] = useState<Island[]>([]);
  const [step, setStep] = useState(1);
  const [ageBracket, setAgeBracket] = useState<AgeBracket | null>(null);
  const [accessibility, setAccessibility] = useState<Accessibility | null>(null);
  const [medical, setMedical] = useState<Medical | null>(null);
  const [originId, setOriginId] = useState("kelp-hollow");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SOSResponse | null>(null);
  const [tracking, setTracking] = useState<TrackingUpdate | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api.islands().then(setIslands).catch(() => setError("Could not load the archipelago map."));
  }, []);

  useEffect(() => () => socketRef.current?.close(), []);

  const origin = islandById(islands, originId);
  const hospital = islandById(islands, "sanctuary-point");
  const previewRoutes: RouteLine[] =
    origin && hospital && origin.id !== hospital.id
      ? [{ id: "preview", x1: origin.x_pct, y1: origin.y_pct, x2: hospital.x_pct, y2: hospital.y_pct }]
      : [];

  async function submit() {
    if (!ageBracket || !accessibility || !medical) {
      setError("Please answer every step first.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.sendSOS({ age_bracket: ageBracket, accessibility, medical, origin_island_id: originId });
      setResult(res);
      if (!res.queued) {
        const socket = new WebSocket(`${WS_BASE}/ws/tracking/${res.request_id}`);
        socketRef.current = socket;
        socket.addEventListener("message", (event) => {
          const data: TrackingUpdate = JSON.parse(event.data);
          if (data.error) return;
          setTracking(data);
          if (data.arrived) socket.close();
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const boats: BoatMarkerData[] =
      tracking && result.boat
        ? [{ id: result.request_id, x_pct: tracking.x_pct, y_pct: tracking.y_pct, label: result.boat.captain_name }]
        : [];
    const target = tracking?.phase === "to_pickup" ? result.origin : result.destination;
    const liveRoutes: RouteLine[] =
      tracking && !tracking.arrived
        ? [{ id: result.request_id, x1: tracking.x_pct, y1: tracking.y_pct, x2: target.x_pct, y2: target.y_pct }]
        : [];

    return (
      <div className="mx-auto max-w-2xl px-5 py-10 text-center">
        <div className="mb-3 text-[2.6rem]">🐋</div>
        <h1 className="mb-2 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-[#0F2537]">
          Your call has been heard.
        </h1>
        {result.queued ? (
          <p className="mb-4 text-[#74777D]">
            Every Pod Guide is out on a call right now -- you&apos;re first in line and a boat will be assigned the
            moment one is free.
          </p>
        ) : (
          <>
            <p className="mb-2 text-[#74777D]">
              {result.boat?.captain_name} is on the way to Sanctuary Point (the hospital island).
            </p>
            <p className="mb-4 text-xl font-extrabold text-[#0F2537]">
              {tracking?.arrived
                ? "Arrived at Sanctuary Point."
                : tracking
                  ? `Est. ${tracking.eta_remaining_minutes} min -- ${tracking.phase === "to_pickup" ? "coming to get you" : "on the way to the hospital"}`
                  : "Connecting to live tracking..."}
            </p>
          </>
        )}
        <div className="mx-auto mb-5 aspect-[4/3] max-w-[520px] overflow-hidden rounded-[14px] border-2 border-[#0F2537] bg-gradient-to-b from-[#cdeef0] to-[#A0E4E8] shadow-[6px_6px_0_#0F2537]">
          <IslandMap islands={islands} boats={boats} routes={liveRoutes} className="h-full w-full" />
        </div>
        <p className="mb-5 text-sm text-[#74777D]">
          Priority score: {result.priority_score} (fully explainable: age +{result.priority_breakdown.age},
          accessibility +{result.priority_breakdown.accessibility}, medical +{result.priority_breakdown.medical}).
        </p>
        <Link href="/" className="rounded-full border-2 border-[#0F2537] bg-white px-6 py-3 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]">
          Back to WhaleCall home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-[14px] border-2 border-[#0F2537] bg-white p-6 shadow-[6px_6px_0_#0F2537] my-10">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-[#0F2537]">We hear you.</h1>
      <p className="mb-4 text-[#74777D]">Answer with taps -- no typing needed. This takes about 20 seconds.</p>

      {step === 1 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F2537]">How old is the person needing help?</h2>
            <span className="text-sm font-bold text-[#74777D]">Step 1 of 4</span>
          </div>
          <div className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AGE_OPTIONS.map((o) => (
              <ChoiceButton key={o.value} selected={ageBracket === o.value} icon={o.icon} label={o.label} onClick={() => setAgeBracket(o.value)} />
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              disabled={!ageBracket}
              onClick={() => setStep(2)}
              className="rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-5 py-2.5 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F2537]">Any accessibility needs?</h2>
            <span className="text-sm font-bold text-[#74777D]">Step 2 of 4</span>
          </div>
          <div className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACCESS_OPTIONS.map((o) => (
              <ChoiceButton key={o.value} selected={accessibility === o.value} icon={o.icon} label={o.label} onClick={() => setAccessibility(o.value)} />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-full border-2 border-[#0F2537] bg-white px-5 py-2.5 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]">
              Back
            </button>
            <button
              disabled={!accessibility}
              onClick={() => setStep(3)}
              className="rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-5 py-2.5 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F2537]">How urgent is the medical need?</h2>
            <span className="text-sm font-bold text-[#74777D]">Step 3 of 4</span>
          </div>
          <div className="my-3 grid grid-cols-3 gap-3">
            {MEDICAL_OPTIONS.map((o) => (
              <ChoiceButton key={o.value} selected={medical === o.value} urgent={o.urgent} icon={o.icon} label={o.label} onClick={() => setMedical(o.value)} />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            <button onClick={() => setStep(2)} className="rounded-full border-2 border-[#0F2537] bg-white px-5 py-2.5 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]">
              Back
            </button>
            <button
              disabled={!medical}
              onClick={() => setStep(4)}
              className="rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-5 py-2.5 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F2537]">Where are you now?</h2>
            <span className="text-sm font-bold text-[#74777D]">Step 4 of 4</span>
          </div>
          <label className="mb-1.5 block font-bold text-[#0F2537]" htmlFor="origin-select">
            We&apos;ve pinned your nearest island. Change it if needed.
          </label>
          <select
            id="origin-select"
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="mb-3 w-full rounded-[10px] border-2 border-[#C3C7CD] px-3.5 py-3"
          >
            {islands.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <div className="mx-auto mb-4 aspect-[4/3] max-w-[420px] overflow-hidden rounded-[14px] border-2 border-[#0F2537] bg-gradient-to-b from-[#cdeef0] to-[#A0E4E8] shadow-[6px_6px_0_#0F2537]">
            <IslandMap islands={islands} selectedId={originId} onSelect={(i) => setOriginId(i.id)} routes={previewRoutes} className="h-full w-full" />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="rounded-full border-2 border-[#0F2537] bg-white px-5 py-2.5 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]">
              Back
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#0F2537] bg-[#BA1A1A] px-5 py-2.5 font-extrabold text-white shadow-[4px_4px_0_#0F2537] disabled:opacity-60"
            >
              🚨 {submitting ? "Sending..." : "Send SOS"}
            </button>
          </div>
          {error && <p className="mt-2 font-bold text-[#93000A]">{error}</p>}
        </div>
      )}
    </div>
  );
}
