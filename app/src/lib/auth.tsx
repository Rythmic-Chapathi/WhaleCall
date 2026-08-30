import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAuthHeaderSource } from "./api";

/**
 * Minimal account layer.
 *
 * Self-contained on purpose: the app runs with no keys and no external service
 * to configure, which matters for a demo. Everything the rest of the app uses
 * goes through this one hook, so swapping in a hosted identity provider means
 * changing this file and nothing else.
 */

export type User = { id: string; name: string; email: string };

const USER_KEY = "wc_user";
const GUEST_TRIPS_KEY = "wc_guest_trips";

type AuthValue = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, name?: string) => Promise<{ claimed: number }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

/** Trips taken before signing in, so they can be attached to a new account. */
export function rememberGuestTrip(tripId: string): void {
  try {
    const ids = readGuestTrips();
    if (!ids.includes(tripId)) localStorage.setItem(GUEST_TRIPS_KEY, JSON.stringify([...ids, tripId]));
  } catch {
    /* storage unavailable; the trip simply will not be claimable */
  }
}

export function readGuestTrips(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_TRIPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readUser());
    setReady(true);
  }, []);

  // Every request carries the current identity.
  useEffect(() => {
    setAuthHeaderSource((): Record<string, string> =>
      user ? { "x-user-id": user.id, "x-user-name": user.name } : {},
    );
  }, [user]);

  const signIn = useCallback(async (email: string, name?: string) => {
    const clean = email.trim().toLowerCase();
    const next: User = {
      id: `u_${btoa(clean).replace(/[^a-z0-9]/gi, "").slice(0, 20)}`,
      name: name?.trim() || clean.split("@")[0] || "Rider",
      email: clean,
    };
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setUser(next);

    // Attach anything booked while signed out.
    const guestTrips = readGuestTrips();
    if (guestTrips.length === 0) return { claimed: 0 };
    try {
      const res = await fetch("/api/trips/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": next.id, "x-user-name": next.name },
        body: JSON.stringify({ tripIds: guestTrips }),
      });
      const data = (await res.json()) as { claimed?: number };
      localStorage.removeItem(GUEST_TRIPS_KEY);
      return { claimed: data.claimed ?? 0 };
    } catch {
      return { claimed: 0 };
    }
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { api };
