import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import CaribbeanMap from "@/components/CaribbeanMap";
import { Card, LinkButton, Photo } from "@/components/ui";
import { ISLANDS } from "@/data/islands";
import { api } from "@/lib/api";
import { navigate } from "wouter/use-browser-location";

function IslandCard({ island }: { island: (typeof ISLANDS)[number] }) {
  return (
    <Link
      href={`/islands/${island.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
      aria-label={`View ${island.name}`}
    >
      <Photo
        seed={`${island.id}-card`}
        alt={`Coastline of ${island.name}`}
        label={island.name}
        width={640}
        height={360}
        className="h-40 w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold">{island.name}</h3>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{island.tagline}</p>
        <p className="mt-3 text-sm text-muted-foreground">{island.docks.length} docks</p>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const { data: fleet } = useQuery({ queryKey: ["fleet"], queryFn: api.fleet });

  return (
    <AppShell>
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-[-.03em] sm:text-6xl">
            Adaptive Maritime Dispatch.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Book a boat between the islands, request supplies, or call for emergency help. Rescue
            dispatch is sorted by who needs it most, not who called first.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/book" size="lg">Book a ride</LinkButton>
          <LinkButton href="/supplies" variant="secondary" size="lg">Request supplies</LinkButton>
          <LinkButton href="/emergency" variant="danger" size="lg">Emergency</LinkButton>
        </div>

        {fleet && (
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <p className="text-3xl font-bold tabular-nums">{fleet.stats.total}</p>
              <p className="text-sm text-muted-foreground">Total boats</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">{fleet.stats.available}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums">{fleet.stats.onTrip}</p>
              <p className="text-sm text-muted-foreground">On trip</p>
            </div>
            <div className="self-end">
              <LinkButton href="/fleet" variant="secondary" size="sm">View available boats</LinkButton>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-.015em]">Where we sail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Our fleet operates across 7 Caribbean islands.
            </p>
          </div>
          <LinkButton href="/book" variant="secondary" size="sm">View islands</LinkButton>
        </div>
        <CaribbeanMap
          className="mt-6"
          onSelect={(island) => navigate(`/islands/${island.id}`)}
        />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-semibold tracking-[-.015em]">Islands</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ISLANDS.map((island) => (
            <IslandCard key={island.id} island={island} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Emergency assistance</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Request an immediate response for a medical emergency, a disabled vessel, or a boat
            taking on water. Rescue-equipped boats are dispatched to your location.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href="/emergency" variant="danger">Emergency</LinkButton>
            <LinkButton href="/dispatch" variant="secondary">Dispatch board</LinkButton>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
