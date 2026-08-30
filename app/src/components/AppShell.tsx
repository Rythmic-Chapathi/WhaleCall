import { Link, useLocation } from "wouter";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { LinkButton } from "./ui";

const NAV = [
  { href: "/book", label: "Book a ride" },
  { href: "/supplies", label: "Supplies" },
  { href: "/fleet", label: "Boats" },
  { href: "/profile", label: "Trips" },
];

function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`${className} rounded-[10px]`} aria-hidden="true">
      <rect width="64" height="64" rx="10" fill="#12708C" />
      <path
        d="M12 38c8-1 14-4 19-9 4-4 6-9 6-15 4 3 6 8 6 13 0 3-1 6-2 8 3 0 6-2 8-5-1 7-6 13-13 16-6 2-16 2-24-8z"
        fill="#0B2545"
      />
      <path d="M14 38c6-1 11-3 15-6-3 5-8 8-15 6z" fill="#3DE3F2" />
      <path d="M40 12l1.8 5.2L47 19l-5.2 1.8L40 26l-1.8-5.2L33 19l5.2-1.8z" fill="#fff" />
    </svg>
  );
}

/**
 * The mode class drives the colour treatment. Emergency surfaces stay dark
 * and red; everything else uses the default palette.
 */
export default function AppShell({
  children, mode = "voyage-mode",
}: { children: ReactNode; mode?: "voyage-mode" | "response-mode" | "supply-mode" }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div data-mode={mode} className={`${mode} flex min-h-screen flex-col bg-background text-foreground`}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="tap flex items-center gap-2.5 rounded-lg">
            <Logo />
            <span className="text-lg font-semibold tracking-[-.015em]">Whale Call</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`tap inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LinkButton href="/emergency" variant="danger" size="sm" className="hidden sm:inline-flex">
              Emergency
            </LinkButton>
            {user ? (
              <button
                onClick={signOut}
                className="tap hidden rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted sm:inline-flex"
              >
                Sign out
              </button>
            ) : (
              <LinkButton href="/sign-in" variant="secondary" size="sm" className="hidden sm:inline-flex">
                Sign in
              </LinkButton>
            )}
            <button
              className="tap inline-flex items-center justify-center rounded-lg border border-border px-3 md:hidden"
              aria-expanded={open}
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-border px-4 py-2 md:hidden">
            {[...NAV, { href: "/emergency", label: "Emergency" }, { href: user ? "/profile" : "/sign-in", label: user ? "Account" : "Sign in" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="tap flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-[#0B2545] text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo className="h-9 w-9" />
              <span className="text-base font-semibold">Whale Call</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              Boat transportation and emergency response across the Caribbean.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Get around</h3>
            <ul className="mt-3 text-sm text-white/70">
              <li><Link href="/book" className="inline-flex min-h-[44px] items-center hover:text-white">Book a ride</Link></li>
              <li><Link href="/fleet" className="inline-flex min-h-[44px] items-center hover:text-white">Boats</Link></li>
              <li><Link href="/profile" className="inline-flex min-h-[44px] items-center hover:text-white">Trips</Link></li>
              <li><Link href="/emergency" className="inline-flex min-h-[44px] items-center hover:text-white">Emergency</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Work with us</h3>
            <ul className="mt-3 text-sm text-white/70">
              <li><Link href="/drivers/apply" className="inline-flex min-h-[44px] items-center hover:text-white">Drive with us</Link></li>
              <li><Link href="/drivers/applications" className="inline-flex min-h-[44px] items-center hover:text-white">Application review</Link></li>
              <li><Link href="/dispatch" className="inline-flex min-h-[44px] items-center hover:text-white">Dispatch board</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Contact</h3>
            <ul className="mt-3 text-sm text-white/70">
              <li className="flex min-h-[44px] items-center">VHF Channel 16</li>
              <li className="flex min-h-[44px] items-center">Daily, 6:00 AM – 10:00 PM</li>
              <li className="flex min-h-[44px] items-center">St. John's, Antigua</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-5">
          <p className="mx-auto max-w-6xl text-xs text-white/50">
            Island scenery is illustrated. Destination information describes real places.
          </p>
        </div>
      </footer>
    </div>
  );
}
