import { useState } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { signIn } = useAuth();
  const isSignUp = location === "/sign-up";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const { claimed } = await signIn(email, name);
    setBusy(false);
    // Trips booked before signing in are attached to the new account.
    setLocation(claimed > 0 ? `/profile?claimed=${claimed}` : "/profile");
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-4xl font-bold tracking-[-.025em]">
          {isSignUp ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {isSignUp ? "Save your trips and preferred docks." : "Sign in to book a ride and view your trips."}
        </p>

        <Card className="mt-8 p-6">
          <form onSubmit={submit} className="space-y-4">
            {isSignUp && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="tap w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
              />
            </label>

            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? "Signing in…" : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            {isSignUp ? "Already have an account? " : "New here? "}
            <a href={isSignUp ? "/sign-in" : "/sign-up"} className="font-medium text-primary underline">
              {isSignUp ? "Sign in" : "Create an account"}
            </a>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
