import AppShell from "@/components/AppShell";
import { LinkButton } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-[-.025em]">Page not found</h1>
        <p className="mt-2 text-base text-muted-foreground">
          That page does not exist, or it has moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href="/">Go home</LinkButton>
          <LinkButton href="/book" variant="secondary">Book a ride</LinkButton>
        </div>
      </div>
    </AppShell>
  );
}
