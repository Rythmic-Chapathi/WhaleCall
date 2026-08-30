import { currentUser } from "@clerk/nextjs/server";

// Placeholder for the full Uber-style ride flow (section 4 of the rewrite).
// For now this exists to prove the auth gate end-to-end: proxy.ts protects
// this route, and a signed-in user's real Clerk identity renders here.
export default async function HomePage() {
  const user = await currentUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-[#0F2537]">
        Where to, {user?.firstName ?? user?.username ?? "friend"}?
      </h1>
      <p className="max-w-md text-[#74777D]">
        Signed in via Clerk as {user?.emailAddresses?.[0]?.emailAddress ?? user?.id}. The full
        map + booking flow lands in a later section of the rewrite -- this page exists to prove
        the auth gate works end to end.
      </p>
    </div>
  );
}
