/*
 * Fake data and fake async actions shared by the Health stories (batch L). Nothing here talks to a server.
 * Everything is deterministic: the same date always gives the same day, so screenshots and tests stay stable.
 */
import {
  addCivilDays,
  type DailySummaryData,
  type EngineAction,
  type EngineRecordEntry,
  type EngineReport,
  type EngineSnapshot,
  type HistoryDay,
  type HealthActionResult,
  type ReportDay,
  type SummarySource,
  useNasaq,
  type VitalsData,
} from "@nasaq/web";
import { useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The demo's "today" as a civil date, and as an instant for the countdowns. */
export const TODAY = "2026-09-29";
export const NOW = Date.parse("2026-09-29T10:00:00");

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Small seeded generator, so the same date always yields the same numbers. */
function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const between = (r: () => number, lo: number, hi: number) => Math.round(lo + r() * (hi - lo));

/* ------------------------------------------------------------------ engines */

/** One snapshot per engine, with every time relative to `now`, so the countdowns make sense whenever the story opens. */
export function engineSnapshots(now: number, ar: boolean): EngineSnapshot[] {
  return [
    { engine: "hydration", state: "cooldown", totalMl: 1750, dailyCapMl: 5000, unitMl: 250, unitsLogged: 7, unitsTotal: 20, nextAllowedAt: now + 22_000 },
    { engine: "caffeine", state: "clear", blockMinutes: 90, wakeAt: now - 3 * HOUR, blockEndsAt: now - 90 * MIN, violationsToday: 0, cupsToday: 2, cupsAllowed: 3 },
    { engine: "gerd", state: "open", windowHours: 4, windowStartsAt: now + 9 * HOUR, windowEndsAt: now + 13 * HOUR, violationsToday: 0, needsReviewToday: 0, whitelist: ["water", "chamomile", "anise"] },
    {
      engine: "medication",
      graceMinutes: 60,
      doses: [
        { id: "d1", name: ar ? "ميتفورمين" : "Metformin", scheduledFor: now - 2 * HOUR, status: "logged", loggedAt: now - 2 * HOUR + 4 * MIN },
        { id: "d2", name: ar ? "فيتامين د" : "Vitamin D", scheduledFor: now - 20 * MIN, status: "grace_open" },
        { id: "d3", name: ar ? "ميتفورمين" : "Metformin", scheduledFor: now + 10 * HOUR, status: "scheduled" },
      ],
    },
    {
      engine: "triggers",
      triggerBearing: 1,
      safe: 4,
      unclassified: 1,
      families: [
        { id: "gout", count: 0 },
        { id: "ibs_gerd", count: 1 },
        { id: "fatty_liver", count: 0 },
      ],
    },
    {
      engine: "cycle",
      state: "calibrated",
      countableCycles: 5,
      minCycles: 3,
      averageLengthDays: 28.4,
      prediction: { nextStart: now + 9 * 86_400_000, ovulation: now - 5 * 86_400_000, fertileFrom: now - 10 * 86_400_000, fertileTo: now - 4 * 86_400_000 },
    },
    { engine: "contraceptive", state: "due", method: "daily_pill", nextDueAt: now - 40 * MIN, lastRecordedAt: now - 24 * HOUR - 40 * MIN, daysOverdue: 0 },
  ];
}

/** The states a person can meet, for the component story's gallery. */
export function engineVariants(now: number, ar: boolean): { label: string; snapshot: EngineSnapshot }[] {
  const base = engineSnapshots(now, ar);
  const by = (id: string) => base.find((s) => s.engine === id) as EngineSnapshot;
  return [
    { label: "Hydration, idle", snapshot: { ...(by("hydration") as Extract<EngineSnapshot, { engine: "hydration" }>), state: "idle", nextAllowedAt: undefined } },
    { label: "Hydration, capped", snapshot: { engine: "hydration", state: "capped", totalMl: 5000, dailyCapMl: 5000, unitMl: 250, unitsLogged: 20, unitsTotal: 20 } },
    { label: "Caffeine, blocked", snapshot: { engine: "caffeine", state: "blocked", blockMinutes: 90, wakeAt: now - 25 * MIN, blockEndsAt: now + 65 * MIN, violationsToday: 0, cupsToday: 0, cupsAllowed: 3 } },
    { label: "Caffeine, waiting for wake", snapshot: { engine: "caffeine", state: "awaiting_wake", blockMinutes: 90, violationsToday: 0, cupsToday: 0 } },
    { label: "Reflux window, active", snapshot: { engine: "gerd", state: "window_active", windowHours: 4, windowStartsAt: now - 30 * MIN, windowEndsAt: now + 3.5 * HOUR, violationsToday: 1, needsReviewToday: 1, whitelist: ["water", "chamomile", "anise"] } },
    { label: "Reflux window, no anchor", snapshot: { engine: "gerd", state: "unanchored", windowHours: 4, violationsToday: 0, needsReviewToday: 0, whitelist: ["water", "chamomile", "anise"] } },
    { label: "Cycle, not enough data", snapshot: { engine: "cycle", state: "insufficient", countableCycles: 1, minCycles: 3, reason: "insufficient_cycles" } },
    { label: "Cycle, suspended", snapshot: { engine: "cycle", state: "suspended", countableCycles: 6, minCycles: 3, averageLengthDays: 31, reason: "irregular" } },
    { label: "Contraceptive, overdue", snapshot: { engine: "contraceptive", state: "overdue", method: "daily_pill", nextDueAt: now - 2 * 86_400_000, lastRecordedAt: now - 3 * 86_400_000, daysOverdue: 2 } },
    { label: "Contraceptive, not set up", snapshot: { engine: "contraceptive", state: "unconfigured", daysOverdue: 0 } },
    by("medication") && { label: "Medication, doses today", snapshot: by("medication") },
  ].filter(Boolean) as { label: string; snapshot: EngineSnapshot }[];
}

/** Applies an action to a snapshot the way a server might, or returns the server's own error message. */
export function applyAction(snapshot: EngineSnapshot, action: EngineAction, now: number, ar: boolean): { snapshot: EngineSnapshot } | { error: string } {
  if (snapshot.engine === "hydration" && action.kind === "log_unit") {
    if (snapshot.state === "capped") return { error: ar ? "بلغت الحد اليومي." : "You have reached today's cap." };
    if (snapshot.nextAllowedAt !== undefined && new Date(snapshot.nextAllowedAt).getTime() > now) return { error: ar ? "انتظر قليلًا بين كل كوب والذي بعده." : "Please wait a moment between cups." };
    const unitsLogged = snapshot.unitsLogged + 1;
    const totalMl = snapshot.totalMl + snapshot.unitMl;
    const capped = totalMl >= snapshot.dailyCapMl;
    return { snapshot: { ...snapshot, unitsLogged, totalMl, state: capped ? "capped" : "cooldown", nextAllowedAt: capped ? undefined : now + 30_000 } };
  }
  if (snapshot.engine === "caffeine" && action.kind === "log_wake") {
    return { snapshot: { ...snapshot, state: "blocked", wakeAt: now, blockEndsAt: now + snapshot.blockMinutes * MIN } };
  }
  if (snapshot.engine === "medication" && (action.kind === "log_dose" || action.kind === "record_dose")) {
    return { snapshot: { ...snapshot, doses: snapshot.doses.map((d) => (d.id === action.doseId ? { ...d, status: "logged", loggedAt: now } : d)) } };
  }
  return { snapshot };
}

/** Holds the engine list in state and answers the cards' actions after a short fake delay. */
export function useEngines(now: number | undefined) {
  const ar = useAr();
  const [clockStart] = useState(() => now ?? Date.now());
  const [snapshots, setSnapshots] = useState(() => engineSnapshots(clockStart, ar));
  const onAction = (id: string) => async (action: EngineAction): Promise<HealthActionResult> => {
    await wait(500);
    const current = snapshots.find((s) => s.engine === id);
    if (!current) return;
    const result = applyAction(current, action, now ?? Date.now(), ar);
    if ("error" in result) return { error: result.error };
    setSnapshots((all) => all.map((s) => (s.engine === id ? result.snapshot : s)));
  };
  return { snapshots, onAction, ar };
}

/* ------------------------------------------------------------------ history */

/** Day verdicts for one engine over the last `count` days ending at `TODAY`, oldest first. */
export function historyFor(engine: "hydration" | "caffeine" | "gerd", count: number): HistoryDay[] {
  const out: HistoryDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addCivilDays(TODAY, -i);
    const r = seeded(`${engine}:${date}`);
    const roll = r();
    const verdict = roll < 0.66 ? "on_protocol" : roll < 0.9 ? "off_protocol" : "unevaluated";
    const entries = verdict === "unevaluated" ? 0 : engine === "hydration" ? (verdict === "on_protocol" ? between(r, 16, 20) : between(r, 5, 13)) : between(r, verdict === "on_protocol" ? 0 : 1, verdict === "on_protocol" ? 2 : 4);
    out.push({ date, verdict, entries });
  }
  return out;
}

export function engineReports(count: number): EngineReport[] {
  return (["hydration", "caffeine", "gerd"] as const).map((engine) => ({ engine, days: historyFor(engine, count) }));
}

/** A short record of what an engine wrote down, newest first. */
export function recordsFor(engine: EngineSnapshot["engine"], now: number, ar: boolean): EngineRecordEntry[] {
  switch (engine) {
    case "hydration":
      return [
        { id: "1", at: now - 25_000 * 0 - 8 * MIN, title: ar ? "سُجّل كوب" : "Cup logged", detail: ar ? "250 مل" : "250 mL", tone: "success" },
        { id: "2", at: now - 55 * MIN, title: ar ? "سُجّل كوب" : "Cup logged", detail: ar ? "250 مل" : "250 mL", tone: "success" },
        { id: "3", at: now - 56 * MIN, title: ar ? "رُفض إدخال" : "Entry declined", detail: ar ? "قبل انتهاء الفاصل بين الأكواب" : "Inside the wait between cups", tone: "warning" },
        { id: "4", at: now - 2 * HOUR, title: ar ? "سُجّل كوب" : "Cup logged", detail: ar ? "250 مل" : "250 mL", tone: "success" },
      ];
    case "caffeine":
      return [
        { id: "1", at: now - 90 * MIN, title: ar ? "انتهى حظر الكافيين" : "Caffeine block ended", tone: "success" },
        { id: "2", at: now - 2 * HOUR, title: ar ? "شاي" : "Tea", detail: ar ? "بعد انتهاء الحظر" : "After the block", tone: "neutral" },
        { id: "3", at: now - 3 * HOUR, title: ar ? "سُجّل الاستيقاظ" : "Wake logged", tone: "info" },
      ];
    case "gerd":
      return [
        { id: "1", at: now - 20 * HOUR, title: ar ? "انتهت نافذة الارتجاع" : "Reflux window ended", tone: "success" },
        { id: "2", at: now - 21 * HOUR, title: ar ? "مشروب خارج القائمة" : "Drink outside the list", detail: ar ? "سُجّل داخل النافذة" : "Logged inside the window", tone: "warning" },
        { id: "3", at: now - 24 * HOUR, title: ar ? "بدأت نافذة الارتجاع" : "Reflux window started", tone: "info" },
      ];
    default:
      return [{ id: "1", at: now - 3 * HOUR, title: ar ? "تحديث من المحرّك" : "Engine update", tone: "neutral" }];
  }
}

/* ------------------------------------------------------------------ daily summary, vitals, reports */

const SOURCES: SummarySource[] = ["watch", "ios", "android", "wearos", "web"];

/** One day's rollup. The same date always gives the same day, and some days leave figures out. */
export function summaryFor(date: string): DailySummaryData {
  const r = seeded(`day:${date}`);
  const index = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${TODAY}T12:00:00Z`)) / 86_400_000);
  const source = SOURCES[Math.floor(r() * 4)] ?? "ios";
  const webOnly = r() < 0.12;
  const total = between(r, 2, 5);
  const unsafe = r() < 0.3 ? between(r, 1, 2) : 0;
  const drinks = between(r, 0, 4);
  const sugar = Math.min(drinks, r() < 0.3 ? 1 : 0);
  const isToday = date === TODAY;
  return {
    date,
    waterMl: isToday ? 1750 : between(r, 1200, 4200),
    meals: { total: isToday ? 3 : total, safe: (isToday ? 3 : total) - (isToday ? 1 : unsafe), unsafe: isToday ? 1 : unsafe },
    caffeine: { total: isToday ? 2 : drinks, sugar: isToday ? 0 : sugar, clean: (isToday ? 2 : drinks) - (isToday ? 0 : sugar) },
    pomodorosCompleted: isToday ? 4 : between(r, 0, 8),
    shutdownViolations: r() < 0.22 ? between(r, 1, 3) : 0,
    ...(webOnly ? {} : { steps: isToday ? 5480 : between(r, 3000, 14000), sleepMinutes: between(r, 330, 510), activeEnergyKcal: between(r, 250, 780), restingHeartRate: between(r, 56, 68) }),
    weightKg: r() < 0.6 ? Math.round((84.6 + index * 0.05 + (r() - 0.5) * 0.6) * 10) / 10 : undefined,
    source: webOnly ? "web" : source,
    syncedAt: date === TODAY ? NOW - 12 * MIN : undefined,
  };
}

/** Rollups for the last `count` days ending today, oldest first. */
export function reportDays(count: number): ReportDay[] {
  return Array.from({ length: count }, (_, i) => {
    const { source: _source, syncedAt: _syncedAt, ...day } = summaryFor(addCivilDays(TODAY, -(count - 1 - i)));
    return day;
  });
}

export function demoVitals(): VitalsData {
  return {
    weightKg: 84.2,
    heightCm: 178,
    bodyWaterPercent: 54.1,
    visceralFat: 11,
    muscleMassKg: 36.8,
    metabolicAge: 38,
    restingHeartRate: 62,
    measuredAt: NOW - 3 * HOUR,
    hasBaseline: true,
    targets: {
      weight: { current: 84.2, target: 80, percent: 62, onTarget: false },
      visceralFat: { current: 11, target: 9, percent: 55, onTarget: false },
      bodyWater: { current: 54.1, target: 50, percent: 100, onTarget: true },
      metabolicAge: { current: 38, target: 35, percent: 40, onTarget: false },
    },
    trends: { weight: [85.6, 85.4, 85.5, 85.1, 84.9, 84.8, 84.6, 84.5, 84.3, 84.2], restingHeartRate: [66, 65, 64, 65, 63, 63, 62, 62, 63, 62] },
  };
}
