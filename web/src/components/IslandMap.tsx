"use client";

import { Island, ISLAND_ICONS } from "@/lib/api";

// Hand-drawn organic blob outlines, cycled per island for visual variety --
// same approach as the original vanilla-JS map.
const ISLAND_BLOBS = [
  {
    outer: "M -7,-3 C -7,-8 -2,-9 3,-8 C 8,-7 9,-2 8,3 C 7,8 2,9 -3,8 C -8,7 -8,2 -7,-3 Z",
    inner: "M -4,-1.5 C -4,-4.5 -1,-5 1.5,-4.5 C 4.5,-4 5,-1 4.5,1.5 C 4,4.5 1,5 -1.5,4.5 C -4.5,4 -4.5,1 -4,-1.5 Z",
  },
  {
    outer: "M -6,-4 C -8,-1 -8,3 -5,6 C -2,9 3,8 6,5 C 9,2 8,-3 5,-6 C 2,-9 -3,-8 -6,-4 Z",
    inner: "M -3.5,-2.5 C -4.5,-0.5 -4.5,2 -3,3.5 C -1,5.5 2,5 3.5,3 C 5,1 4.5,-2 3,-3.5 C 1.5,-5 -2,-4.5 -3.5,-2.5 Z",
  },
];

export type BoatMarkerData = { id: string; x_pct: number; y_pct: number; label: string; stateClass?: "moving" | "docked" };
export type RouteLine = { id: string; x1: number; y1: number; x2: number; y2: number };

type Props = {
  islands: Island[];
  selectedId?: string | null;
  onSelect?: (island: Island) => void;
  boats?: BoatMarkerData[];
  routes?: RouteLine[];
  zoom?: number;
  className?: string;
};

export default function IslandMap({ islands, selectedId, onSelect, boats = [], routes = [], zoom = 1, className }: Props) {
  return (
    <svg
      viewBox="0 0 100 75"
      role="group"
      aria-label="Archipelago map"
      className={className}
      style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease" }}
    >
      {routes.map((r) => (
        <line
          key={r.id}
          x1={r.x1}
          y1={r.y1 * 0.75}
          x2={r.x2}
          y2={r.y2 * 0.75}
          stroke="#0F2537"
          strokeWidth={0.6}
          strokeDasharray="2,1.6"
          opacity={0.75}
        />
      ))}

      {islands.map((island, i) => {
        const y = island.y_pct * 0.75;
        const blob = ISLAND_BLOBS[i % ISLAND_BLOBS.length];
        const selected = island.id === selectedId;
        return (
          <g
            key={island.id}
            transform={`translate(${island.x_pct}, ${y})`}
            tabIndex={onSelect ? 0 : -1}
            role={onSelect ? "button" : "img"}
            aria-label={`${island.name}${onSelect ? ", tap to select" : ""}`}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            onClick={onSelect ? () => onSelect(island) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(island);
                    }
                  }
                : undefined
            }
          >
            <path d={blob.outer} fill="#F4C28F" stroke={selected ? "#BA1A1A" : "#0F2537"} strokeWidth={selected ? 2.2 : 1.4} />
            <path d={blob.inner} fill="#8BC34A" stroke="#0F2537" strokeWidth={0.6} />
            <text x={0} y={2} fontSize={6} textAnchor="middle">
              {ISLAND_ICONS[island.role]}
            </text>
            <text
              x={0}
              y={15}
              fontSize={3.4}
              fontWeight={800}
              fill="#0F2537"
              textAnchor="middle"
              stroke="#FFFFFF"
              strokeWidth={0.6}
              paintOrder="stroke"
            >
              {island.name}
            </text>
          </g>
        );
      })}

      {boats.map((boat) => {
        const y = boat.y_pct * 0.75;
        const color = boat.stateClass === "moving" ? "#0097B8" : boat.stateClass === "docked" ? "#2e7d32" : "#BA1A1A";
        return (
          <g key={boat.id} aria-label={boat.label}>
            <circle cx={boat.x_pct} cy={y} r={3} fill="none" stroke={color} strokeWidth={1} opacity={0.7}>
              <animate attributeName="r" values="3;10" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx={boat.x_pct} cy={y} r={3.4} fill={color} stroke="#FFFFFF" strokeWidth={1.4} />
            <text x={boat.x_pct} y={y + 1.8} fontSize={5} textAnchor="middle">
              🚤
            </text>
          </g>
        );
      })}
    </svg>
  );
}
