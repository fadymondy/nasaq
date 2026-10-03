/*
 * The Health Debug protocol-engine model, as plain data and pure helpers. No React, no clock reads:
 * every "now" arrives as a parameter, the same rule the engines themselves follow.
 *
 * Two opinions carry over from the product and shape every type here:
 *  1. Counts and verdicts, never rates. A day is on protocol, off protocol, or not judged. There is no
 *     percentage, score or grade anywhere in this file.
 *  2. No claim about a body. Every state describes the protocol or the record ("a dose was logged"),
 *     never a person's health.
 */
import type { StatusTone } from "../status";

export type HealthDateInput = Date | number | string;

/** The seven protocol engines, in the order the product lists them. */
export const ENGINE_IDS = ["hydration", "caffeine", "gerd", "medication", "triggers", "cycle", "contraceptive"] as const;
export type EngineId = (typeof ENGINE_IDS)[number];

/** Engines that judge each calendar day. The other four keep a ledger and issue no day verdict. */
export const DAY_VERDICT_ENGINES = ["hydration", "caffeine", "gerd"] as const;
export type DayVerdictEngineId = (typeof DAY_VERDICT_ENGINES)[number];

export function judgesDays(engine: EngineId): engine is DayVerdictEngineId {
  return (DAY_VERDICT_ENGINES as readonly string[]).includes(engine);
}

/** One protocol day's outcome. "unevaluated" means the engine declined to judge; it is never a pass and never a failure. */
export type DayVerdict = "on_protocol" | "off_protocol" | "unevaluated";
export const DAY_VERDICTS: readonly DayVerdict[] = ["on_protocol", "off_protocol", "unevaluated"];

/** The protocol constants each engine owns. Shown on the details page, never computed from. */
export const ENGINE_PROTOCOL = {
  hydration: { unitMl: 250, dailyCapMl: 5000, unitsPerDay: 20, cooldownSeconds: 30 },
  caffeine: { blockMinutes: 90 },
  gerd: { windowHours: 4, whitelist: ["water", "chamomile", "anise"] as readonly string[] },
  medication: { graceMinutes: 60 },
  triggers: { families: ["gout", "ibs_gerd", "fatty_liver"] as readonly string[] },
  cycle: { minCycles: 3, irregularSpreadDays: 9, averageOverCycles: 6, ovulationBeforeNextStartDays: 14, fertileOpensBeforeOvulationDays: 5, fertileClosesAfterOvulationDays: 1 },
  contraceptive: { methods: ["daily_pill", "monthly_injection", "implant"] as readonly string[] },
} as const;

/* ------------------------------------------------------------------ snapshots */

export type HydrationState = "idle" | "cooldown" | "capped";
export interface HydrationSnapshot {
  engine: "hydration";
  state: HydrationState;
  /** Today's accepted total in millilitres. */
  totalMl: number;
  dailyCapMl: number;
  /** The one loggable increment. */
  unitMl: number;
  unitsLogged: number;
  /** How many units a full day holds. The server sends it; the client draws that many. */
  unitsTotal: number;
  /** When the next unit may be logged. Absent when one may be logged now. */
  nextAllowedAt?: HealthDateInput;
}

export type CaffeineState = "awaiting_wake" | "blocked" | "clear";
export interface CaffeineSnapshot {
  engine: "caffeine";
  state: CaffeineState;
  /** Length of the block after waking, in minutes. */
  blockMinutes: number;
  wakeAt?: HealthDateInput;
  blockEndsAt?: HealthDateInput;
  /** Caffeine logged inside the block. */
  violationsToday: number;
  /** Caffeine-bearing drinks today: a count of fixed units, never an amount. */
  cupsToday: number;
  /** The person's own allowance in cups. Absent means none is set. */
  cupsAllowed?: number;
}

export type GerdState = "unanchored" | "open" | "window_active" | "sleeping";
export interface GerdSnapshot {
  engine: "gerd";
  state: GerdState;
  windowHours: number;
  windowStartsAt?: HealthDateInput;
  windowEndsAt?: HealthDateInput;
  violationsToday: number;
  /** Entries the engine could not classify (no anchor, or logged while asleep). */
  needsReviewToday: number;
  /** The closed set of items allowed inside the window. */
  whitelist: readonly string[];
}

export type MedicationDoseStatus = "scheduled" | "grace_open" | "logged" | "late_logged" | "missed";
export interface MedicationDose {
  id: string;
  name: string;
  scheduledFor: HealthDateInput;
  status: MedicationDoseStatus;
  loggedAt?: HealthDateInput;
}
export interface MedicationSnapshot {
  engine: "medication";
  doses: readonly MedicationDose[];
  /** How long a scheduled dose stays loggable on time, in minutes. */
  graceMinutes: number;
}

export type TriggerFamily = "gout" | "ibs_gerd" | "fatty_liver";
export interface TriggersSnapshot {
  engine: "triggers";
  /** Exposures today by verdict. Unclassified is "not judged", never "safe". */
  triggerBearing: number;
  safe: number;
  unclassified: number;
  families: readonly { id: TriggerFamily; count: number }[];
}

export type CycleState = "insufficient" | "calibrated" | "suspended";
export type CycleReason = "insufficient_cycles" | "irregular" | "recalibrating";
export interface CycleSnapshot {
  engine: "cycle";
  state: CycleState;
  countableCycles: number;
  minCycles: number;
  averageLengthDays?: number;
  /** Present only when a prediction is offered. Otherwise the card says "unavailable" and why. */
  prediction?: { nextStart: HealthDateInput; ovulation: HealthDateInput; fertileFrom: HealthDateInput; fertileTo: HealthDateInput };
  reason?: CycleReason;
}

export type ContraceptiveState = "unconfigured" | "on_schedule" | "due" | "overdue" | "expiring" | "expired";
export type ContraceptiveMethod = "daily_pill" | "monthly_injection" | "implant";
export interface ContraceptiveSnapshot {
  engine: "contraceptive";
  state: ContraceptiveState;
  method?: ContraceptiveMethod;
  nextDueAt?: HealthDateInput;
  lastRecordedAt?: HealthDateInput;
  /** Whole days past the point the plan expected a record. A fact about the record, not about a body. */
  daysOverdue: number;
}

export type EngineSnapshot =
  | HydrationSnapshot
  | CaffeineSnapshot
  | GerdSnapshot
  | MedicationSnapshot
  | TriggersSnapshot
  | CycleSnapshot
  | ContraceptiveSnapshot;

/** What the person asked an engine card to do. The host sends it to the engine and resolves. */
export interface EngineAction {
  engine: EngineId;
  kind: "log_unit" | "log_wake" | "log_dose" | "record_dose";
  /** The dose, for `log_dose`. */
  doseId?: string;
}

/* ------------------------------------------------------------------ state, tone, headline */

export const MEDICATION_STATUS_ORDER: readonly MedicationDoseStatus[] = ["grace_open", "missed", "scheduled", "late_logged", "logged"];

export interface MedicationSummary {
  total: number;
  logged: number;
  lateLogged: number;
  missed: number;
  graceOpen: number;
  scheduled: number;
  /** The most pressing state across today's doses, for the card's headline. */
  state: MedicationDoseStatus | "none";
}

export function summariseMedication(doses: readonly MedicationDose[]): MedicationSummary {
  const count = (s: MedicationDoseStatus) => doses.filter((d) => d.status === s).length;
  const summary = {
    total: doses.length,
    logged: count("logged"),
    lateLogged: count("late_logged"),
    missed: count("missed"),
    graceOpen: count("grace_open"),
    scheduled: count("scheduled"),
  };
  const state: MedicationSummary["state"] =
    doses.length === 0
      ? "none"
      : summary.graceOpen > 0
        ? "grace_open"
        : summary.missed > 0
          ? "missed"
          : summary.scheduled > 0
            ? "scheduled"
            : summary.lateLogged > 0
              ? "late_logged"
              : "logged";
  return { ...summary, state };
}

/** The state name shown on the badge and used to look up its label. Medication and triggers have derived states. */
export function engineStateKey(snapshot: EngineSnapshot): string {
  switch (snapshot.engine) {
    case "medication":
      return summariseMedication(snapshot.doses).state;
    case "triggers":
      return snapshot.triggerBearing > 0 ? "exposed" : snapshot.safe + snapshot.unclassified === 0 ? "none" : snapshot.unclassified > 0 && snapshot.safe === 0 ? "unjudged" : "clear";
    default:
      return snapshot.state;
  }
}

const TONES: Record<string, StatusTone> = {
  // hydration
  "hydration.idle": "neutral",
  "hydration.cooldown": "info",
  "hydration.capped": "success",
  // caffeine
  "caffeine.awaiting_wake": "neutral",
  "caffeine.blocked": "warning",
  "caffeine.clear": "success",
  // gerd
  "gerd.unanchored": "neutral",
  "gerd.open": "success",
  "gerd.window_active": "warning",
  "gerd.sleeping": "info",
  // medication (derived)
  "medication.none": "neutral",
  "medication.grace_open": "info",
  "medication.missed": "warning",
  "medication.scheduled": "neutral",
  "medication.late_logged": "warning",
  "medication.logged": "success",
  // triggers (derived)
  "triggers.none": "neutral",
  "triggers.unjudged": "neutral",
  "triggers.clear": "success",
  "triggers.exposed": "warning",
  // cycle
  "cycle.insufficient": "neutral",
  "cycle.calibrated": "success",
  "cycle.suspended": "warning",
  // contraceptive
  "contraceptive.unconfigured": "neutral",
  "contraceptive.on_schedule": "success",
  "contraceptive.due": "info",
  "contraceptive.overdue": "danger",
  "contraceptive.expiring": "warning",
  "contraceptive.expired": "danger",
};

/** The semantic tone of an engine's state. It always travels with a label and an icon, never alone. */
export function engineTone(snapshot: EngineSnapshot): StatusTone {
  return TONES[`${snapshot.engine}.${engineStateKey(snapshot)}`] ?? "neutral";
}

export function doseTone(status: MedicationDoseStatus): StatusTone {
  return status === "logged" ? "success" : status === "grace_open" ? "info" : status === "scheduled" ? "neutral" : "warning";
}

/** Whole seconds until a deadline, floored at zero. */
export function secondsUntil(deadline: HealthDateInput | undefined, now: number): number {
  if (deadline === undefined) return 0;
  const at = deadline instanceof Date ? deadline.getTime() : new Date(deadline).getTime();
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
}

/** Splits seconds into at most two units: 1 h 12 min, 4 min 30 s, 25 s. */
export function splitDuration(totalSeconds: number): { unit: "hour" | "minute" | "second"; value: number }[] {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours) return minutes ? [{ unit: "hour", value: hours }, { unit: "minute", value: minutes }] : [{ unit: "hour", value: hours }];
  if (minutes) return seconds ? [{ unit: "minute", value: minutes }, { unit: "second", value: seconds }] : [{ unit: "minute", value: minutes }];
  return [{ unit: "second", value: seconds }];
}

/* ------------------------------------------------------------------ history */

export interface HistoryDay {
  /** A civil date in the person's timezone, `YYYY-MM-DD`. Not an instant. */
  date: string;
  verdict: DayVerdict;
  /** How many entries the engine accepted on the day. A count of events, never a volume. */
  entries: number;
}

export interface HistoryTotals {
  daysTracked: number;
  daysOnProtocol: number;
  daysOffProtocol: number;
  daysUnevaluated: number;
  currentStreak: number;
  bestStreak: number;
}

/**
 * Rolls an OLDEST-FIRST, dense window of day verdicts into counts and two streaks.
 * A streak is consecutive days on protocol. An unevaluated day ends a streak without counting as a failure.
 */
export function summariseDays(days: readonly { verdict: DayVerdict }[]): HistoryTotals {
  const totals: HistoryTotals = { daysTracked: days.length, daysOnProtocol: 0, daysOffProtocol: 0, daysUnevaluated: 0, currentStreak: 0, bestStreak: 0 };
  let run = 0;
  for (const { verdict } of days) {
    if (verdict === "on_protocol") {
      totals.daysOnProtocol++;
      run++;
      if (run > totals.bestStreak) totals.bestStreak = run;
    } else {
      run = 0;
      if (verdict === "off_protocol") totals.daysOffProtocol++;
      else totals.daysUnevaluated++;
    }
  }
  // The current streak is the run that reaches the most recent day.
  for (let i = days.length - 1; i >= 0 && days[i]!.verdict === "on_protocol"; i--) totals.currentStreak++;
  return totals;
}

/** Groups a window into `YYYY-MM` months for the day strip, keeping order. */
export function groupByMonth<T extends { date: string }>(days: readonly T[]): { month: string; days: T[] }[] {
  const groups: { month: string; days: T[] }[] = [];
  for (const day of days) {
    const month = day.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.days.push(day);
    else groups.push({ month, days: [day] });
  }
  return groups;
}

/** Parses a civil `YYYY-MM-DD` as a local date at noon, so a timezone shift never moves it to another day. */
export function parseCivilDate(date: string): Date {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export interface WeekBucket {
  /** Civil date of the first day in the bucket. */
  start: string;
  onProtocol: number;
  offProtocol: number;
  unevaluated: number;
}

/** Buckets an oldest-first window into runs of `size` days (default 7) for a stacked chart. The last bucket may be short. */
export function bucketDays(days: readonly { date: string; verdict: DayVerdict }[], size = 7): WeekBucket[] {
  const out: WeekBucket[] = [];
  for (let i = 0; i < days.length; i += size) {
    const slice = days.slice(i, i + size);
    out.push({
      start: slice[0]!.date,
      onProtocol: slice.filter((d) => d.verdict === "on_protocol").length,
      offProtocol: slice.filter((d) => d.verdict === "off_protocol").length,
      unevaluated: slice.filter((d) => d.verdict === "unevaluated").length,
    });
  }
  return out;
}
