"use client";

import Link from "next/link";
import Image from "next/image";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/home", label: "Ride" },
  { href: "/fleet", label: "Fleet" },
  { href: "/rides", label: "My Rides" },
  { href: "/dispatcher", label: "Triage" },
];

export default function Nav() {
  return (
    <header
      className="fixed left-1/2 top-5 z-50 flex w-[92%] max-w-[1040px] -translate-x-1/2 items-center justify-between gap-3.5 rounded-full border-2 border-[#0F2537] bg-white/95 px-5 py-2.5 shadow-[4px_4px_0_#0F2537] backdrop-blur-md"
    >
      <Link
        href="/"
        className="flex flex-shrink-0 items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-extrabold uppercase tracking-wide text-[#0F2537]"
      >
        <Image src="/whalecall_logo.svg" alt="" width={34} height={34} />
        WhaleCall
      </Link>

      <nav className="flex flex-wrap items-center justify-end gap-3.5" aria-label="Main">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hidden text-sm font-bold text-[#74777D] hover:text-[#0F2537] sm:inline"
          >
            {link.label}
          </Link>
        ))}

        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full border-2 border-[#0F2537] bg-white px-4 py-1.5 text-sm font-bold text-[#0F2537] shadow-[3px_3px_0_#0F2537] transition-transform hover:-translate-x-px hover:-translate-y-px"
            >
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-full border-2 border-[#0F2537] bg-[#E2C364] px-4 py-1.5 text-sm font-bold text-[#0F2537] shadow-[3px_3px_0_#0F2537] transition-transform hover:-translate-x-px hover:-translate-y-px"
            >
              Sign up
            </button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>

        <Link
          href="/sos"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#0F2537] bg-[#BA1A1A] px-4 py-2 text-sm font-extrabold text-white shadow-[3px_3px_0_#0F2537] transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          <span aria-hidden="true">🚨</span>SOS
        </Link>
      </nav>
    </header>
  );
}
