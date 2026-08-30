import { Link, useParams } from "wouter";
import AppShell from "@/components/AppShell";
import { Card, LinkButton, Photo } from "@/components/ui";
import { getIsland, nearestIslands, etaMinutes, ISLANDS } from "@/data/islands";
import { guideFor } from "@/data/islandContent";
import { calculateFare, distanceKm, formatMoney } from "@shared/pricing";
import NotFoundPage from "./NotFound";

export default function IslandPage() {
  const { id } = useParams<{ id: string }>();
  const island = getIsland(id);
  const guide = island ? guideFor(island.id) : undefined;

  if (!island || !guide) return <NotFoundPage />;

  const nearby = nearestIslands(island, 3);
  // "From" price: a water taxi for one, from the closest island.
  const closest = nearby[0];
  const fromFare = closest
    ? calculateFare({ km: closest.km, boatClass: "water_taxi", passengers: 1 })
    : null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 pb-28 lg:pb-12">
        <p className="text-sm text-muted-foreground">{island.country}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-[-.025em]">{island.name}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{island.tagline}</p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed">{island.intro}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {guide.heroSeeds.map((seed, i) => (
            <Photo
              key={seed}
              seed={seed}
              alt={`${island.name} scenery ${i + 1}`}
              label={island.name}
              width={640}
              height={360}
              lazy={i > 0}
              className="aspect-video w-full rounded-xl object-cover"
            />
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Things to do</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {guide.things.map((thing) => (
              <Card key={thing.name} className="flex flex-col overflow-hidden">
                <Photo
                  seed={thing.seed}
                  alt={thing.name}
                  label={thing.name}
                  width={480}
                  height={360}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg font-semibold">{thing.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{thing.blurb}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Good to know</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Info title="Best time to visit" body={guide.goodToKnow.bestTime} />
            <Info title="How busy" body={guide.goodToKnow.busyness} />
            <Info title="What to bring" body={guide.goodToKnow.bring} />
            <Info title="Dock accessibility" body={guide.goodToKnow.dockAccess} />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Where to land</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {island.docks.map((dock) => {
              const price = closest
                ? calculateFare({
                    km: distanceKm(dock, closest.island.docks[0]),
                    boatClass: "water_taxi",
                    passengers: 1,
                  })
                : null;
              return (
                <Card key={dock.id} className="flex flex-col p-6">
                  <h3 className="text-lg font-semibold">{dock.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{dock.note}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {dock.stepFree ? "Step-free access from the pier." : "No step-free access."}
                  </p>
                  {price !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      From {formatMoney(price)} from {closest!.island.name}
                    </p>
                  )}
                  <div className="mt-4">
                    <LinkButton
                      href={`/book?destinationIsland=${island.id}&destinationDock=${dock.id}`}
                      size="sm"
                    >
                      Book a ride here
                    </LinkButton>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Getting here</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Times and distances from the three nearest islands.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2.5 font-medium">From</th>
                  <th className="py-2.5 font-medium">Distance</th>
                  <th className="py-2.5 font-medium">Time</th>
                  <th className="py-2.5 font-medium">From</th>
                </tr>
              </thead>
              <tbody>
                {nearby.map(({ island: other, km, minutes }) => (
                  <tr key={other.id} className="border-b border-border">
                    <td className="py-3">
                      <Link
                        href={`/islands/${other.id}`}
                        className="flex min-h-[44px] items-center font-medium text-primary underline"
                      >
                        {other.name}
                      </Link>
                    </td>
                    <td className="py-3 tabular-nums">{km} km</td>
                    <td className="py-3 tabular-nums">{minutes} min</td>
                    <td className="py-3 tabular-nums">
                      {formatMoney(calculateFare({ km, boatClass: "water_taxi", passengers: 1 }))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-[-.015em]">Nearby islands</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {nearby.map(({ island: other, km }) => (
              <Link
                key={other.id}
                href={`/islands/${other.id}`}
                aria-label={`View ${other.name}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
              >
                <Photo
                  seed={`${other.id}-card`}
                  alt={`Coastline of ${other.name}`}
                  label={other.name}
                  width={480}
                  height={270}
                  className="h-32 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{other.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {km} km · about {etaMinutes(km)} min
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky booking action on small screens. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {fromFare !== null && (
            <span className="text-sm text-muted-foreground">From {formatMoney(fromFare)}</span>
          )}
          <LinkButton href={`/book?destinationIsland=${island.id}`} className="ml-auto flex-1 sm:flex-none">
            Book a ride to {island.name}
          </LinkButton>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Card>
  );
}

export { ISLANDS };
