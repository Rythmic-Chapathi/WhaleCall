import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { api } from "@/lib/api";
import WaterShader from "@/components/WaterShader";

export default async function LandingPage() {
  const [islands, fleet] = await Promise.all([api.islands(), api.fleet()]);
  const available = fleet.filter((f) => f.boat.available).length;
  const fleetStats = { total: fleet.length, available, inTransit: fleet.length - available };

  return (
    <div className="flex flex-1 flex-col">
      {/* Sky */}
      <section className="relative overflow-hidden bg-[#D1F2EB] px-5 pb-[130px] pt-[150px] text-center">
        <div className="pointer-events-none absolute left-[6%] top-[70px] h-11 w-[120px] rounded-full bg-white opacity-60 blur-[2px]" />
        <div className="pointer-events-none absolute right-[8%] top-[140px] h-14 w-[170px] rounded-full bg-white opacity-50 blur-[2px]" />

        <h1 className="mx-auto max-w-3xl font-[family-name:var(--font-heading)] text-[clamp(2.1rem,5vw,3.4rem)] font-extrabold leading-[1.1] text-[#0F2537]">
          Priority Calls.
          <br />
          No Islander Left Behind.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#0F2537]/85">
          Your call always reaches the pod. Emergency maritime dispatch and everyday island transport, on one
          clear, fast, fully-explainable system.
        </p>

        <Link
          href="/sos"
          aria-label="Send an SOS -- no login needed"
          className="relative mx-auto mt-6 mb-6 flex h-[min(220px,55vw)] w-[min(220px,55vw)] items-center justify-center rounded-full border-[3px] border-[#0F2537] bg-[radial-gradient(circle_at_35%_30%,#e2534a,#BA1A1A_70%)] font-[family-name:var(--font-heading)] text-[1.8rem] font-extrabold tracking-wide text-white shadow-[8px_8px_0_#0F2537]"
        >
          SOS
        </Link>
        <p className="mx-auto mb-8 max-w-md text-[#0F2537]/80">
          No login needed. Tap SOS any time you or someone near you needs help fast.
        </p>

        <Show when="signed-in">
          <div className="flex justify-center gap-3">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-6 py-3 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]"
            >
              🗺️ Go to the map
            </Link>
          </div>
        </Show>
        <Show when="signed-out">
          <div className="flex justify-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-full border-2 border-[#0F2537] bg-white px-6 py-3 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-6 py-3 font-bold text-[#0F2537] shadow-[4px_4px_0_#0F2537]"
            >
              Sign up
            </Link>
          </div>
        </Show>
      </section>

      {/* Sand */}
      <section className="bg-[#F4C28F] px-5 pb-24 pt-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article className="relative flex flex-col overflow-hidden rounded-[14px] border-2 border-[#0F2537] bg-white p-6 shadow-[6px_6px_0_#0F2537]">
            <div className="absolute left-0 top-0 h-1.5 w-full bg-[#BA1A1A]" />
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#93000A] bg-[#FFDAD6] px-3 py-1 text-xs font-extrabold text-[#93000A]">
              🚨 Emergency
            </span>
            <h3 className="mb-2 text-xl font-extrabold text-[#0F2537]">Send an SOS</h3>
            <p className="mb-4 flex-1 text-[#74777D]">
              Tap-only intake, no login. Priority scored instantly and routed straight to a Pod Guide headed for
              Sanctuary Point.
            </p>
            <Link
              href="/sos"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0F2537] bg-[#BA1A1A] px-4 py-3 font-bold text-white shadow-[3px_3px_0_#0F2537]"
            >
              Send SOS &rarr;
            </Link>
          </article>

          <article className="relative flex flex-col overflow-hidden rounded-[14px] border-2 border-[#0F2537] bg-white p-6 shadow-[6px_6px_0_#0F2537]">
            <div className="absolute left-0 top-0 h-1.5 w-full bg-[#0097B8]" />
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#002732] bg-[#B6EBFF] px-3 py-1 text-xs font-extrabold text-[#002732]">
              🚤 Standard Transfer
            </span>
            <h3 className="mb-2 text-xl font-extrabold text-[#0F2537]">Book a Ride</h3>
            <p className="mb-4 flex-1 text-[#74777D]">
              Pick a destination island, see nearby Pod Guides with ETA and neighbor vouches, and book in a couple
              of taps.
            </p>
            <Show when="signed-in">
              <Link
                href="/home"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-4 py-3 font-bold text-[#0F2537] shadow-[3px_3px_0_#0F2537]"
              >
                Plan a Trip &rarr;
              </Link>
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-4 py-3 font-bold text-[#0F2537] shadow-[3px_3px_0_#0F2537]"
              >
                Sign Up to Book
              </Link>
            </Show>
          </article>

          <article className="flex flex-col rounded-[14px] border-2 border-dashed border-[#0F2537] bg-[#f6f3ee] p-6 shadow-[6px_6px_0_#0F2537]">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-2.5 py-1.5 text-lg">📡</span>
              <h3 className="text-xl font-extrabold text-[#0F2537]">Fleet Status</h3>
            </div>
            <ul className="mt-3 flex-1 font-mono">
              <li className="flex justify-between border-b border-dashed border-[#C3C7CD] py-2.5">
                <span>Total Pod Guides</span>
                <span className="font-extrabold text-[#0F2537]">{fleetStats.total}</span>
              </li>
              <li className="flex justify-between border-b border-dashed border-[#C3C7CD] py-2.5">
                <span>Available Now</span>
                <span className="font-extrabold text-[#0F2537]">{fleetStats.available}</span>
              </li>
              <li className="flex justify-between py-2.5">
                <span>Currently In Transit</span>
                <span className="font-extrabold text-[#0F2537]">{fleetStats.inTransit}</span>
              </li>
            </ul>
            <Link
              href="/fleet"
              className="mt-3.5 inline-flex w-fit items-center gap-2 rounded-full border-2 border-[#0F2537] bg-white px-4 py-1.5 text-sm font-bold text-[#0F2537] shadow-[3px_3px_0_#0F2537]"
            >
              View Full Fleet &rarr;
            </Link>
          </article>
        </div>
      </section>

      {/* Water */}
      <section className="h-[220px] bg-[#A0E4E8]">
        <WaterShader />
      </section>

      <footer className="bg-[#000F1D] px-5 py-11 text-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap justify-between gap-6">
          <div>
            <div className="mb-2.5 flex items-center gap-2 font-[family-name:var(--font-heading)] text-xl font-extrabold">
              ⚓ WhaleCall
            </div>
            <p className="max-w-[340px] opacity-75">
              A fictional archipelago, a real priority algorithm. Every score is auditable -- no black box. (
              {islands.length} islands charted.)
            </p>
          </div>
          <nav className="flex flex-wrap items-start gap-4.5">
            <Link href="/sos" className="text-sm font-semibold opacity-80 hover:opacity-100 hover:underline">
              Emergency SOS
            </Link>
            <Link href="/home" className="text-sm font-semibold opacity-80 hover:opacity-100 hover:underline">
              Plan a Ride
            </Link>
            <Link href="/fleet" className="text-sm font-semibold opacity-80 hover:opacity-100 hover:underline">
              Fleet
            </Link>
            <Link href="/dispatcher" className="text-sm font-semibold opacity-80 hover:opacity-100 hover:underline">
              Triage
            </Link>
            <Link href="/rides" className="text-sm font-semibold opacity-80 hover:opacity-100 hover:underline">
              My Rides
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
