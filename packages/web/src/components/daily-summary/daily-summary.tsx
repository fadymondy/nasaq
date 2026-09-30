"use client";

import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Coffee,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Laptop,
  type LucideIcon,
  Moon,
  Scale,
  Smartphone,
  Timer,
  Utensils,
  Watch,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import type { HealthDateInput } from "../engine-card/health-engines";
import { parseCivilDate } from "../engine-card/health-engines";
import { Duration, Measure, useHealthDate, useHealthLabels } from "../engine-card/health-format";
import { Meter } from "../progress";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { StatCard, StatGrid } from "../stat-card";
import { Status, type StatusTone } from "../status";
import { addCivilDays, isAfter, minutesToSeconds, unclassifiedCount } from "./daily-summary-math";

const STRINGS = {
  en: {
    previous: "Previous day",
    next: "Next day",
    today: "Today",
    protocol: "Protocol",
    body: "Body and activity",
    water: "Water",
    waterOfGoal: "of your goal",
    meals: "Meals",
    caffeine: "Caffeine",
    shutdown: "Shutdown violations",
    pomodoros: "Focus sessions",
    steps: "Steps",
    sleep: "Sleep",
    activeEnergy: "Active energy",
    restingHeartRate: "Resting heart rate",
    weight: "Weight",
    safe: "Safe",
    unsafe: "Unsafe",
    unclassified: "Not classified",
    clean: "Clean",
    sugar: "With sugar",
    none: "None",
    violationsN: (n: number) => (n === 1 ? "1 violation" : `${n} violations`),
    mealsN: (n: number) => (n === 1 ? "1 meal" : `${n} meals`),
    drinksN: (n: number) => (n === 1 ? "1 drink" : `${n} drinks`),
    sessionsN: (n: number) => (n === 1 ? "1 session" : `${n} sessions`),
    notSynced: "Not synced",
    source: "Source",
    sources: { ios: "iPhone", android: "Android", watch: "Apple Watch", wearos: "Wear OS", web: "Web" } as Record<string, string>,
    empty: "Nothing recorded for this day",
    emptyHint: "Log something, or sync a device, and it appears here.",
    loadError: "This day could not be loaded.",
    retry: "Try again",
    goalLabel: "Water against your goal",
  },
  ar: {
    previous: "اليوم السابق",
    next: "اليوم التالي",
    today: "اليوم",
    protocol: "البروتوكول",
    body: "الجسم والنشاط",
    water: "الماء",
    waterOfGoal: "من هدفك",
    meals: "الوجبات",
    caffeine: "الكافيين",
    shutdown: "مخالفات الإغلاق",
    pomodoros: "جلسات التركيز",
    steps: "الخطوات",
    sleep: "النوم",
    activeEnergy: "الطاقة النشطة",
    restingHeartRate: "نبض الراحة",
    weight: "الوزن",
    safe: "آمنة",
    unsafe: "غير آمنة",
    unclassified: "غير مصنّفة",
    clean: "بدون سكر",
    sugar: "مع سكر",
    none: "لا شيء",
    violationsN: (n: number) => (n === 0 ? "لا مخالفات" : n === 1 ? "مخالفة واحدة" : n === 2 ? "مخالفتان" : n <= 10 ? `${n} مخالفات` : `${n} مخالفة`),
    mealsN: (n: number) => (n === 0 ? "لا وجبات" : n === 1 ? "وجبة واحدة" : n === 2 ? "وجبتان" : n <= 10 ? `${n} وجبات` : `${n} وجبة`),
    drinksN: (n: number) => (n === 0 ? "لا مشروبات" : n === 1 ? "مشروب واحد" : n === 2 ? "مشروبان" : n <= 10 ? `${n} مشروبات` : `${n} مشروبًا`),
    sessionsN: (n: number) => (n === 0 ? "لا جلسات" : n === 1 ? "جلسة واحدة" : n === 2 ? "جلستان" : n <= 10 ? `${n} جلسات` : `${n} جلسة`),
    notSynced: "لم تتم المزامنة",
    source: "المصدر",
    sources: { ios: "آيفون", android: "أندرويد", watch: "ساعة آبل", wearos: "Wear OS", web: "الويب" } as Record<string, string>,
    empty: "لا شيء مسجّل لهذا اليوم",
    emptyHint: "سجّل شيئًا أو زامن جهازًا فيظهر هنا.",
    loadError: "تعذّر تحميل هذا اليوم.",
    retry: "حاول مرة أخرى",
    goalLabel: "الماء مقابل هدفك",
  },
};

export type DailySummaryLabels = typeof STRINGS.en;

export type SummarySource = "ios" | "android" | "watch" | "wearos" | "web";

/**
 * One day's rollup, one row per person per day. Every figure is optional: a device that did not report it leaves it
 * out, and the summary says "Not synced" instead of showing a zero.
 */
export interface DailySummaryData {
  /** Civil date, `YYYY-MM-DD`. */
  date: string;
  waterMl?: number;
  meals?: { total: number; safe: number; unsafe: number };
  /** Caffeine-bearing drinks, counted, never measured. */
  caffeine?: { total: number; sugar: number; clean: number };
  pomodorosCompleted?: number;
  shutdownViolations?: number;
  steps?: number;
  sleepMinutes?: number;
  activeEnergyKcal?: number;
  restingHeartRate?: number;
  weightKg?: number;
  source?: SummarySource;
  syncedAt?: HealthDateInput;
}

export interface DailySummaryProps extends Omit<ComponentProps<"section">, "children" | "onError"> {
  summary?: DailySummaryData;
  /** The day being shown when `summary` is absent (loading, error or empty). `YYYY-MM-DD`. */
  date?: string;
  /** Shown as the last day the next button can reach. Default: no limit. */
  maxDate?: string;
  /** Called with the neighbouring civil date. Omit to hide the day switcher. */
  onDateChange?: (date: string) => void;
  /** The person's own daily water goal in millilitres. Absent means no goal is drawn. */
  waterGoalMl?: number;
  loading?: boolean;
  /** The server's message when the day could not be loaded. */
  error?: string;
  onRetry?: () => void;
  labels?: Partial<DailySummaryLabels>;
}

const SOURCE_ICON: Record<SummarySource, LucideIcon> = { ios: Smartphone, android: Smartphone, watch: Watch, wearos: Watch, web: Laptop };

/**
 * A day at a glance: water, meals by safety, caffeine by kind, focus sessions, shutdown violations, steps, sleep,
 * energy, resting heart rate and weight, with a switcher to move between days. Counts stay counts, units keep their
 * order in Arabic, and a figure the device did not send is "Not synced", never zero.
 */
export function DailySummary({ summary, date, maxDate, onDateChange, waterGoalMl, loading = false, error, onRetry, labels, className, ...props }: DailySummaryProps) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  const d = useHealthDate();
  const headingId = useId();
  const day = summary?.date ?? date;
  const SourceIcon = summary?.source ? SOURCE_ICON[summary.source] : null;
  const canNext = day ? !(maxDate && isAfter(addCivilDays(day, 1), maxDate)) : false;

  const missing = <span className="text-body-sm font-normal text-muted-foreground">{t.notSynced}</span>;
  const num = (value: number | undefined, node: (n: number) => ReactNode) => (value === undefined ? missing : node(value));

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {onDateChange && day ? (
          <Button variant="secondary" size="icon" aria-label={t.previous} onClick={() => onDateChange(addCivilDays(day, -1))}>
            <ChevronLeft aria-hidden className="rtl:-scale-x-100" />
          </Button>
        ) : null}
        <h2 id={headingId} className="min-w-0 text-h3 text-foreground">
          {day ? d.date(parseCivilDate(day), { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null}
        </h2>
        {onDateChange && day ? (
          <Button variant="secondary" size="icon" aria-label={t.next} disabled={!canNext} onClick={() => onDateChange(addCivilDays(day, 1))}>
            <ChevronRight aria-hidden className="rtl:-scale-x-100" />
          </Button>
        ) : null}
      </div>
      {summary?.source && SourceIcon ? (
        <Badge variant="outline">
          <SourceIcon aria-hidden />
          <span className="sr-only">{t.source}: </span>
          {t.sources[summary.source] ?? summary.source}
        </Badge>
      ) : null}
    </header>
  );

  let body: ReactNode;
  if (loading) {
    body = (
      <div aria-busy className="flex flex-col gap-3">
        <StatGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </StatGrid>
      </div>
    );
  } else if (error) {
    body = (
      <ErrorState
        title={t.loadError}
        description={error}
        actions={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (!summary || isEmptyDay(summary)) {
    body = <EmptyState title={t.empty} description={t.emptyHint} />;
  } else {
    const s = summary;
    const shutdown = s.shutdownViolations;
    body = (
      <>
        <section aria-label={t.protocol} className="flex flex-col gap-3">
          <h3 className="text-label text-muted-foreground">{t.protocol}</h3>
          <StatGrid>
            <Card data-slot="daily-summary-water" className="gap-3 px-4 py-4">
              <TileLabel icon={<Droplets />}>{t.water}</TileLabel>
              <div className="text-h2 leading-tight text-foreground tabular-nums">{num(s.waterMl, (n) => <Measure value={n} unit="milliliter" />)}</div>
              {s.waterMl !== undefined && waterGoalMl ? (
                <Meter label={t.goalLabel} value={s.waterMl} max={waterGoalMl} tone={s.waterMl >= waterGoalMl ? "success" : "default"} valueText={<Measure value={waterGoalMl} unit="milliliter" />} showValue />
              ) : null}
            </Card>
            <TallyCard
              icon={<Utensils />}
              label={t.meals}
              total={s.meals ? t.mealsN(s.meals.total) : undefined}
              missing={missing}
              rows={
                s.meals
                  ? [
                      { key: "safe", tone: "success", icon: CircleCheck, label: t.safe, count: s.meals.safe },
                      { key: "unsafe", tone: "warning", icon: CircleAlert, label: t.unsafe, count: s.meals.unsafe },
                      ...(unclassifiedCount(s.meals.total, s.meals.safe, s.meals.unsafe) > 0
                        ? [{ key: "un", tone: "neutral" as const, icon: undefined, label: t.unclassified, count: unclassifiedCount(s.meals.total, s.meals.safe, s.meals.unsafe) }]
                        : []),
                    ]
                  : []
              }
            />
            <TallyCard
              icon={<Coffee />}
              label={t.caffeine}
              total={s.caffeine ? t.drinksN(s.caffeine.total) : undefined}
              missing={missing}
              rows={
                s.caffeine
                  ? [
                      { key: "clean", tone: "success", icon: CircleCheck, label: t.clean, count: s.caffeine.clean },
                      { key: "sugar", tone: "warning", icon: CircleAlert, label: t.sugar, count: s.caffeine.sugar },
                    ]
                  : []
              }
            />
            <Card data-slot="daily-summary-shutdown" className="gap-3 px-4 py-4">
              <TileLabel icon={<Moon />}>{t.shutdown}</TileLabel>
              <div className="flex flex-col gap-1">
                <div className="text-h2 leading-tight text-foreground tabular-nums">{num(shutdown, (n) => <Measure value={n} unit="level" format={{ maximumFractionDigits: 0 }} />)}</div>
                {shutdown !== undefined ? (
                  <Status tone={shutdown === 0 ? "success" : "warning"} icon={shutdown === 0 ? CircleCheck : CircleAlert}>
                    {shutdown === 0 ? t.none : t.violationsN(shutdown)}
                  </Status>
                ) : null}
              </div>
            </Card>
            <StatCard label={t.pomodoros} icon={<Timer />} value={num(s.pomodorosCompleted, (n) => <Measure value={n} unit="level" format={{ maximumFractionDigits: 0 }} />)} />
          </StatGrid>
        </section>

        <section aria-label={t.body} className="flex flex-col gap-3">
          <h3 className="text-label text-muted-foreground">{t.body}</h3>
          <StatGrid>
            <StatCard label={t.steps} icon={<Footprints />} value={num(s.steps, (n) => <Measure value={n} unit="steps" format={{ maximumFractionDigits: 0 }} />)} />
            <StatCard label={t.sleep} icon={<BedDouble />} value={num(s.sleepMinutes, (n) => <Duration seconds={minutesToSeconds(n)} />)} />
            <StatCard label={t.activeEnergy} icon={<Flame />} value={num(s.activeEnergyKcal, (n) => <Measure value={n} unit="kcal" format={{ maximumFractionDigits: 0 }} />)} />
            <StatCard label={t.restingHeartRate} icon={<Heart />} value={num(s.restingHeartRate, (n) => <Measure value={n} unit="bpm" format={{ maximumFractionDigits: 0 }} />)} />
            <StatCard label={t.weight} icon={<Scale />} value={num(s.weightKg, (n) => <Measure value={n} unit="kilogram" format={{ maximumFractionDigits: 1 }} />)} />
          </StatGrid>
        </section>
      </>
    );
  }

  return (
    <section data-slot="daily-summary" data-date={day} aria-labelledby={day ? headingId : undefined} className={cn("flex flex-col gap-6", className)} {...props}>
      {header}
      {body}
    </section>
  );
}

function isEmptyDay(s: DailySummaryData): boolean {
  return [s.waterMl, s.meals, s.caffeine, s.pomodorosCompleted, s.shutdownViolations, s.steps, s.sleepMinutes, s.activeEnergyKcal, s.restingHeartRate, s.weightKg].every((x) => x === undefined);
}

function TileLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 truncate text-body-sm text-muted-foreground">{children}</div>
    </div>
  );
}

interface TallyRow {
  key: string;
  tone: StatusTone;
  icon?: LucideIcon;
  label: string;
  count: number;
}

/** A total split by kind. Each kind is a count with its own icon and word, so no kind depends on colour. */
function TallyCard({ icon, label, total, rows, missing }: { icon: ReactNode; label: string; total?: string; rows: TallyRow[]; missing: ReactNode }) {
  return (
    <Card data-slot="daily-summary-tally" className="gap-3 px-4 py-4">
      <TileLabel icon={icon}>{label}</TileLabel>
      <div className="text-h2 leading-tight text-foreground tabular-nums">{total ?? missing}</div>
      {rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-body-sm">
          {rows.map((row) => (
            <li key={row.key}>
              <Status tone={row.tone} icon={row.icon}>
                {row.label} <Measure value={row.count} unit="level" format={{ maximumFractionDigits: 0 }} />
              </Status>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
