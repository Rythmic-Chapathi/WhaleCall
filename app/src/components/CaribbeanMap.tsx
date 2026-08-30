import { useId } from "react";
import { ISLANDS, type Island } from "@/data/islands";

/**
 * A hand-drawn chart of the seven islands.
 *
 * The container holds a fixed 4:3 ratio and the viewBox is 100x75, so one
 * chart unit is one percent of the width in both axes. That lets the labels
 * be real HTML positioned over the shapes: they hold a true 9px on desktop
 * and 8px on small screens instead of scaling with the drawing, which is what
 * made them collide before.
 *
 * Each island is a real link target -- reachable by keyboard, named for a
 * screen reader, and showing a focus ring.
 */

type Props = {
  pickupId?: string | null;
  destinationId?: string | null;
  onSelect?: (island: Island) => void;
  className?: string;
};

const RX = 5.4;
const RY = 3.9;

/** A stable, slightly irregular blob per island rather than a plain circle. */
function blobPath(island: Island): string {
  let seed = 0;
  for (let i = 0; i < island.id.length; i++) seed = (seed * 31 + island.id.charCodeAt(i)) % 997;
  const jitter = (n: number) => 0.78 + ((seed * (n + 3)) % 40) / 100;
  const pts: string[] = [];
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(`${(Math.cos(a) * RX * jitter(i)).toFixed(2)},${(Math.sin(a) * RY * jitter(i + 1)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export default function CaribbeanMap({
  pickupId, destinationId, onSelect, className = "",
}: Props) {
  const gid = useId().replace(/:/g, "");

  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-[#EAF6FA] ${className}`}>
      <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full" role="group" aria-label="Map of the islands">
        <defs>
          <linearGradient id={`sea-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EAF6FA" />
            <stop offset="100%" stopColor="#D6ECF3" />
          </linearGradient>
        </defs>
        <rect width="100" height="75" fill={`url(#sea-${gid})`} />

        {pickupId && destinationId && pickupId !== destinationId && (() => {
          const a = ISLANDS.find((i) => i.id === pickupId);
          const b = ISLANDS.find((i) => i.id === destinationId);
          if (!a || !b) return null;
          return (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0E7490" strokeWidth="0.4" strokeDasharray="1.4 1.2" opacity="0.75" />
          );
        })()}

        {ISLANDS.map((island) => {
          const active = island.id === pickupId || island.id === destinationId;
          return (
            <g
              key={island.id}
              transform={`translate(${island.x} ${island.y})`}
              role="link"
              tabIndex={0}
              aria-label={`View ${island.name}`}
              className="cursor-pointer focus:outline-none [&:focus-visible>path]:stroke-[#083344] [&:focus-visible>path]:stroke-[1.1]"
              onClick={() => onSelect?.(island)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(island);
                }
              }}
            >
              <path
                d={blobPath(island)}
                fill={active ? "#0E7490" : "#7FB8A0"}
                stroke={active ? "#083344" : "#5C9A82"}
                strokeWidth="0.3"
              />
            </g>
          );
        })}
      </svg>

      {/* Labels sit below each shape, centred, at a real pixel size. */}
      <div className="pointer-events-none absolute inset-0">
        {ISLANDS.map((island) => {
          const isPickup = island.id === pickupId;
          const isDestination = island.id === destinationId;
          const active = isPickup || isDestination;
          return (
            <div
              key={island.id}
              className="absolute -translate-x-1/2 whitespace-nowrap text-center"
              style={{ left: `${island.x}%`, top: `${((island.y + RY + 1.6) / 75) * 100}%` }}
            >
              <span
                className="block text-[8px] font-medium sm:text-[9px]"
                style={{ color: active ? "#000000" : "#6B6B6B" }}
              >
                {island.name}
              </span>
              {active && (
                <span className="block text-[8px] font-medium sm:text-[9px]" style={{ color: "#0E7490" }}>
                  {isPickup ? "Leaving" : "Arriving"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
