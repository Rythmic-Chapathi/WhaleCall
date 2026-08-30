/**
 * Vulnerability triage scoring.
 *
 * Emergency dispatch here is not first-come-first-served. Every active
 * incident carries a score built from a plain weighted sum, so a dispatcher
 * can read any row and see exactly why it sits where it does. Nothing is
 * learned, nothing is hidden.
 *
 * The decay term is the fairness guarantee. Without it a routine call can be
 * starved forever behind a steady arrival of higher-base ones. With it every
 * waiting call gets louder until someone responds, so it always eventually
 * reaches the top of the queue on its own.
 *
 * Scores are recomputed on read, never frozen at creation -- that is what
 * makes the decay real rather than decorative.
 */

export const SITUATION_WEIGHTS = {
  taking_on_water: 4,
  medical: 3,
  stranded: 2,
  other: 1,
} as const;

export const AGE_WEIGHTS = {
  child: 2,
  adult: 0,
  older_adult: 2,
} as const;

export const ACCESS_WEIGHTS = {
  mobility: 2,
  cognitive: 2,
  vision: 1,
  hearing: 1,
  none: 0,
} as const;

export const URGENCY_WEIGHTS = {
  routine: 1,
  urgent: 3,
  critical: 5,
} as const;

export const DECAY_PER_MINUTE = 0.15;

export type Situation = keyof typeof SITUATION_WEIGHTS;
export type AgeGroup = keyof typeof AGE_WEIGHTS;
export type AccessNeed = keyof typeof ACCESS_WEIGHTS;
export type Urgency = keyof typeof URGENCY_WEIGHTS;

export type TriageInput = {
  situation: Situation;
  ageGroup?: AgeGroup | null;
  accessNeeds?: readonly AccessNeed[] | null;
  urgency?: Urgency | null;
};

export type ScoreBreakdown = {
  situation: number;
  age: number;
  access: number;
  urgency: number;
  minutesWaiting: number;
  waitBonus: number;
  total: number;
};

const SITUATION_LABELS: Record<Situation, string> = {
  taking_on_water: "taking on water",
  medical: "medical emergency",
  stranded: "stranded vessel",
  other: "other",
};

const AGE_LABELS: Record<AgeGroup, string> = {
  child: "child",
  adult: "adult",
  older_adult: "older adult",
};

const ACCESS_LABELS: Record<AccessNeed, string> = {
  mobility: "mobility need",
  cognitive: "cognitive need",
  vision: "vision need",
  hearing: "hearing need",
  none: "no access needs",
};

const URGENCY_LABELS: Record<Urgency, string> = {
  routine: "routine",
  urgent: "urgent",
  critical: "critical",
};

/** Access needs are summed, so several needs stack. "none" contributes zero. */
export function accessScore(needs?: readonly AccessNeed[] | null): number {
  if (!needs || needs.length === 0) return 0;
  // De-duplicate so a repeated need cannot inflate the score.
  return [...new Set(needs)].reduce((sum, n) => sum + (ACCESS_WEIGHTS[n] ?? 0), 0);
}

export function minutesBetween(createdAt: string | number | Date, now: Date): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, (now.getTime() - created) / 60000);
}

export function scoreIncident(
  input: TriageInput,
  createdAt: string | number | Date,
  now: Date = new Date(),
): ScoreBreakdown {
  const situation = SITUATION_WEIGHTS[input.situation] ?? SITUATION_WEIGHTS.other;
  const age = input.ageGroup ? (AGE_WEIGHTS[input.ageGroup] ?? 0) : 0;
  const access = accessScore(input.accessNeeds);
  const urgency = input.urgency ? (URGENCY_WEIGHTS[input.urgency] ?? 0) : 0;
  const minutesWaiting = minutesBetween(createdAt, now);
  const waitBonus = minutesWaiting * DECAY_PER_MINUTE;

  return {
    situation,
    age,
    access,
    urgency,
    minutesWaiting: round1(minutesWaiting),
    waitBonus: round2(waitBonus),
    total: round2(situation + age + access + urgency + waitBonus),
  };
}

/**
 * Plain-English reason a row sits where it does, e.g.
 * "Priority 9.4 - critical medical, older adult, mobility need, waiting 4 min".
 * Only the parts that actually contributed are named.
 */
export function explainScore(input: TriageInput, breakdown: ScoreBreakdown): string {
  const parts: string[] = [];
  const urgencyLabel = input.urgency ? URGENCY_LABELS[input.urgency] : null;
  const situationLabel = SITUATION_LABELS[input.situation] ?? "other";
  parts.push(urgencyLabel ? `${urgencyLabel} ${situationLabel}` : situationLabel);

  if (input.ageGroup && AGE_WEIGHTS[input.ageGroup] > 0) parts.push(AGE_LABELS[input.ageGroup]);

  const needs = [...new Set(input.accessNeeds ?? [])].filter((n) => ACCESS_WEIGHTS[n] > 0);
  for (const need of needs) parts.push(ACCESS_LABELS[need]);

  if (breakdown.minutesWaiting >= 1) parts.push(`waiting ${humanizeWait(breakdown.minutesWaiting)}`);

  return `Priority ${breakdown.total.toFixed(1)} · ${parts.join(", ")}`;
}

export type Scorable = TriageInput & { id: string; createdAt: string };

/** Highest score first. Ties break by earliest arrival, so waiting still wins. */
export function sortByPriority<T extends Scorable>(items: T[], now: Date = new Date()): Array<T & { breakdown: ScoreBreakdown }> {
  return items
    .map((item) => ({ ...item, breakdown: scoreIncident(item, item.createdAt, now) }))
    .sort((a, b) => b.breakdown.total - a.breakdown.total || +new Date(a.createdAt) - +new Date(b.createdAt));
}

/** Matches the wait shown beside a row, so the two never read differently. */
export function humanizeWait(minutes: number): string {
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
