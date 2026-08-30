import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "wouter";
import { photoUrl, FALLBACK_BG } from "@/lib/photos";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent",
  secondary: "bg-card text-foreground border border-border hover:bg-muted",
  ghost: "bg-transparent text-foreground border border-transparent hover:bg-muted",
  danger: "bg-danger text-white hover:bg-danger/90 border border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`tap inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
});

export function LinkButton({
  href, children, variant = "primary", size = "md", className = "",
}: { href: string; children: ReactNode; variant?: Variant; size?: Size; className?: string }) {
  return (
    <Link
      href={href}
      className={`tap inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card ${className}`}>{children}</div>;
}

/** Two user-facing fleet states. Offline boats never reach this component. */
export function StatusChip({ status }: { status: "available" | "on_trip" | "en_route" }) {
  const available = status === "available";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
        available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {available ? "Available" : "On trip"}
    </span>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="py-16 text-center">
      <h2 className="text-2xl font-semibold tracking-[-.015em]">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message || "Please try again."}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-14 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Every image carries explicit dimensions so nothing shifts as it loads, and
 * falls back to a neutral block naming the subject rather than a broken icon.
 */
export function Photo({
  seed, alt, width, height, className = "", lazy = true, label,
}: { seed: string; alt: string; width: number; height: number; className?: string; lazy?: boolean; label?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        style={{ background: FALLBACK_BG, aspectRatio: `${width} / ${height}` }}
        className={`flex items-center justify-center px-3 text-center text-sm text-muted-foreground ${className}`}
      >
        {label ?? alt}
      </div>
    );
  }

  return (
    <img
      src={photoUrl(seed, width, height)}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
          <defs>
            <linearGradient id={`s${n}-${Math.round(value * 10)}`}>
              <stop offset={`${Math.max(0, Math.min(1, value - n + 1)) * 100}%`} stopColor="#F59E0B" />
              <stop offset={`${Math.max(0, Math.min(1, value - n + 1)) * 100}%`} stopColor="#D6DAE0" />
            </linearGradient>
          </defs>
          <path
            d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"
            fill={`url(#s${n}-${Math.round(value * 10)})`}
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * Star input as a real radio group: arrow keys move between options, the
 * selection is announced, and each target is at least 44px.
 */
export function StarInput({
  value, onChange, name = "rating",
}: { value: number; onChange: (n: number) => void; name?: string }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className="tap flex cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-primary"
        >
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            aria-label={`Rate ${n} out of 5`}
            className="sr-only"
          />
          <svg width="28" height="28" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"
              fill={n <= value ? "#F59E0B" : "#D6DAE0"}
            />
          </svg>
        </label>
      ))}
    </div>
  );
}
