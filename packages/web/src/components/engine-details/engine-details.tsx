"use client";

import { CircleAlert, CircleCheck, CircleDashed, CircleMinus, CircleX, ChevronLeft, Flame, type LucideIcon, Route } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/cn";
import { buttonVariants } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { ChartContainer, type ChartConfig, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import { ENGINE_ICONS, EngineCard } from "../engine-card/engine-card";
import {
  type EngineAction,
  ENGINE_PROTOCOL,
  type EngineSnapshot,
  type HealthDateInput,
  type HistoryDay,
  bucketDays,
  judgesDays,
  parseCivilDate,
  summariseDays,
} from "../engine-card/health-engines";
import { type HealthActionResult, Measure, formatMeasure, useHealthDate, useHealthLabels, useHealthLocale } from "../engine-card/health-format";
import { Timeline, TimelineItem } from "../timeline";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { SectionHeader } from "../section-header";
import { StatCard, StatGrid } from "../stat-card";
import type { StatusTone } from "../status";
import { Toggle, ToggleGroup } from "../toggle-group";
import { EngineHistoryLegend, EngineHistoryStrip } from "./history-strip";

export * from "./history-strip";

const STRINGS = {
  en: {
    back: "Back to today",
    lede: "What this engine says right now, and what it has recorded.",
    history: "History",
    historyDescription: "Days on protocol, off it, and days the engine declined to judge. Counts, never a rate.",
    window: "Window",
    windowOption: (days: number) => `${days} days`,
    windowLabel: "History window",
    onProtocol: "Days on protocol",
    offProtocol: "Days off protocol",
    unevaluated: "Days not judged",
    currentStreak: "Current streak",
    bestStreak: "Best streak",
    entriesChart: "Entries per day",
    weeklyChart: "Days per week",
    entries: "Entries",
    chartSummary: (days: number) => `Protocol history for the last ${days} days`,
    strip: "Every day",
    record: "Record",
    recordDescription: "What this engine has written down, newest first.",
    noRecord: "Nothing recorded yet.",
    noHistory: "No history yet",
    noHistoryHint: "History appears after the first day of tracking.",
    noLedger: "This engine keeps a ledger, not a day verdict.",
    noLedgerHint: "It never marks a day on or off protocol, because it makes no such judgement.",
    protocol: "The protocol",
    protocolDescription: "The fixed rules this engine follows. They live in the engine, not in this screen.",
    unit: "Loggable unit",
    dailyCap: "Daily cap",
    cooldown: "Cooldown between entries",
    blockAfterWake: "No caffeine after waking",
    windowBeforeSleep: "Window before sleep",
    allowedInside: "Allowed inside the window",
    graceWindow: "On-time window for a dose",
    familiesLabel: "Trigger families",
    minCycles: "Cycles needed for a prediction",
    irregularSpread: "Spread that withdraws a prediction",
    ovulationBefore: "Ovulation estimated before next start",
    fertileWindow: "Fertile window around ovulation",
    fertileWindowValue: (before: string, after: string) => `${before} before, ${after} after`,
    methodsLabel: "Methods tracked",
    ownPlan: "Every interval comes from your own plan. The engine has no default.",
    loadError: "The history could not be loaded.",
    retry: "Try again",
    disclaimer: "Every line on this page is about the protocol and what was logged. None of it is a claim about your body.",
  },
  ar: {
    back: "العودة إلى اليوم",
    lede: "ما يقوله هذا المحرّك الآن، وما سجّله.",
    history: "السجل",
    historyDescription: "أيام ضمن البروتوكول وخارجه، وأيام امتنع المحرّك عن تقييمها. أعداد، وليست نسبًا.",
    window: "النطاق",
    windowOption: (days: number) => `${days} يومًا`,
    windowLabel: "نطاق السجل",
    onProtocol: "أيام ضمن البروتوكول",
    offProtocol: "أيام خارج البروتوكول",
    unevaluated: "أيام لم تُقيَّم",
    currentStreak: "السلسلة الحالية",
    bestStreak: "أفضل سلسلة",
    entriesChart: "الإدخالات في اليوم",
    weeklyChart: "الأيام في الأسبوع",
    entries: "الإدخالات",
    chartSummary: (days: number) => `سجل البروتوكول لآخر ${days} يومًا`,
    strip: "كل الأيام",
    record: "التسجيلات",
    recordDescription: "ما دوّنه هذا المحرّك، من الأحدث.",
    noRecord: "لا شيء مسجّل بعد.",
    noHistory: "لا سجل بعد",
    noHistoryHint: "يظهر السجل بعد أول يوم من التتبّع.",
    noLedger: "يحتفظ هذا المحرّك بدفتر تسجيلات، لا بحكم يومي.",
    noLedgerHint: "لا يصف أي يوم بأنه ضمن البروتوكول أو خارجه، لأنه لا يصدر هذا الحكم.",
    protocol: "البروتوكول",
    protocolDescription: "القواعد الثابتة التي يتبعها هذا المحرّك. مكانها المحرّك نفسه لا هذه الشاشة.",
    unit: "الوحدة القابلة للتسجيل",
    dailyCap: "السقف اليومي",
    cooldown: "الفاصل بين الإدخالات",
    blockAfterWake: "لا كافيين بعد الاستيقاظ",
    windowBeforeSleep: "النافذة قبل النوم",
    allowedInside: "المسموح داخل النافذة",
    graceWindow: "نافذة الجرعة في وقتها",
    familiesLabel: "عائلات المحفّزات",
    minCycles: "الدورات اللازمة للتوقع",
    irregularSpread: "التفاوت الذي يسحب التوقع",
    ovulationBefore: "الإباضة المقدّرة قبل البداية التالية",
    fertileWindow: "فترة الخصوبة حول الإباضة",
    fertileWindowValue: (before: string, after: string) => `${before} قبلها، و${after} بعدها`,
    methodsLabel: "الوسائل المتتبَّعة",
    ownPlan: "كل فاصل يأتي من خطتك أنت. لا قيمة افتراضية لدى المحرّك.",
    loadError: "تعذّر تحميل السجل.",
    retry: "حاول مرة أخرى",
    disclaimer: "كل سطر في هذه الصفحة عن البروتوكول وما سُجّل. ليس فيه أي ادعاء عن جسدك.",
  },
};

export type EngineDetailsLabels = typeof STRINGS.en;

/** One line in the engine's record. */
export interface EngineRecordEntry {
  id: string;
  at: HealthDateInput;
  /** What happened, in the person's language. */
  title: string;
  detail?: string;
  /** Default "neutral". Drives the marker's icon as well as its colour. */
  tone?: StatusTone;
}

const TONE_MARK: Record<StatusTone, { icon: LucideIcon; text: string }> = {
  neutral: { icon: CircleMinus, text: "text-muted-foreground" },
  info: { icon: CircleDashed, text: "text-nq-info-text" },
  success: { icon: CircleCheck, text: "text-nq-success-text" },
  warning: { icon: CircleAlert, text: "text-nq-warning-text" },
  danger: { icon: CircleX, text: "text-nq-danger-text" },
};

export interface EngineDetailsProps extends Omit<ComponentProps<"div">, "children"> {
  /** The engine's live state, shown by the same card as the dashboard. */
  snapshot: EngineSnapshot;
  /** Fixed "now" for countdowns. Omit to follow the clock. */
  now?: HealthDateInput;
  /** Called by the live card's log actions. Resolve with `{ error }` to show the server's message. */
  onAction?: (action: EngineAction) => Promise<HealthActionResult>;
  /** Day verdicts, oldest first, one per calendar day. Only the engines that judge days (hydration, caffeine, GERD) use it. */
  history?: readonly HistoryDay[];
  historyLoading?: boolean;
  /** Shown instead of the history when it could not be loaded. Use the server's own message. */
  historyError?: string;
  /** Windows offered, in days. Default `[7, 30, 365]`. */
  windows?: readonly number[];
  /** The applied window, in days. Controlled; omit to let the component keep it. */
  windowDays?: number;
  /** Called when a window is chosen. Load that window and pass it back through `history`. */
  onWindowChange?: (days: number) => Promise<HealthActionResult> | void;
  /** Try again after `historyError`. */
  onRetry?: () => void;
  /** What the engine has written down, newest first. Every engine has one. */
  records?: readonly EngineRecordEntry[];
  /** Where "back" goes. Omit to hide the link. */
  backHref?: string;
  /** Extra content under the record, e.g. an engine-specific table. */
  children?: ReactNode;
  labels?: Partial<EngineDetailsLabels>;
}

/**
 * One engine's own page: its live card, its per-day history (with counts, streaks and a chart) for the engines that judge
 * days, its record as a timeline, and the fixed protocol it follows. Counts and verdicts only, never a rate.
 */
export function EngineDetails({
  snapshot,
  now,
  onAction,
  history,
  historyLoading = false,
  historyError,
  windows = [7, 30, 365],
  windowDays,
  onWindowChange,
  onRetry,
  records,
  backHref,
  children,
  labels,
  className,
  ...props
}: EngineDetailsProps) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  const engine = snapshot.engine;
  const meta = t.engines[engine];
  const Icon = ENGINE_ICONS[engine];
  const headingId = useId();
  const [ownWindow, setOwnWindow] = useState(windows[0] ?? 30);
  const active = windowDays ?? history?.length ?? ownWindow;

  function choose(days: number) {
    setOwnWindow(days);
    void onWindowChange?.(days);
  }

  return (
    <div data-slot="engine-details" data-engine={engine} className={cn("mx-auto flex w-full max-w-4xl flex-col gap-8", className)} {...props}>
      <header className="flex flex-col gap-4">
        {backHref ? (
          <a href={backHref} data-slot="engine-details-back" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ms-2.5 w-fit")}>
            <ChevronLeft aria-hidden className="rtl:-scale-x-100" />
            {t.back}
          </a>
        ) : null}
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-card bg-secondary text-muted-foreground [&_svg]:size-7">
            <Icon />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 id={headingId} className="text-h1 text-foreground">
              {meta.title}
            </h1>
            <p className="text-pretty text-body text-muted-foreground">{t.lede}</p>
          </div>
        </div>
      </header>

      <EngineCard snapshot={snapshot} now={now} onAction={onAction} hideTitle headingAs="h2" />

      {judgesDays(engine) ? (
        <section aria-labelledby={`${headingId}-history`} className="flex flex-col gap-4">
          <SectionHeader
            headingId={`${headingId}-history`}
            title={t.history}
            description={t.historyDescription}
            action={
              <ToggleGroup aria-label={t.windowLabel} value={[String(active)]} onValueChange={(v) => v[0] && choose(Number(v[0]))}>
                {windows.map((days) => (
                  <Toggle key={days} value={String(days)}>
                    {t.windowOption(days)}
                  </Toggle>
                ))}
              </ToggleGroup>
            }
          />
          {historyLoading ? (
            <HistorySkeleton />
          ) : historyError ? (
            <ErrorState title={t.loadError} description={historyError} actions={onRetry ? <button type="button" className={buttonVariants({ variant: "secondary", size: "sm" })} onClick={onRetry}>{t.retry}</button> : undefined} />
          ) : !history || history.length === 0 ? (
            <EmptyState icon={Route} title={t.noHistory} description={t.noHistoryHint} />
          ) : (
            <HistoryBody days={history} t={t} />
          )}
        </section>
      ) : (
        <EmptyState icon={Flame} title={t.noLedger} description={t.noLedgerHint} className="py-8" />
      )}

      <section aria-labelledby={`${headingId}-record`} className="flex flex-col gap-4">
        <SectionHeader headingId={`${headingId}-record`} title={t.record} description={t.recordDescription} />
        {records && records.length > 0 ? (
          <Card>
            <CardContent>
              <Timeline>
                {records.map((entry) => {
                  const mark = TONE_MARK[entry.tone ?? "neutral"];
                  const Glyph = mark.icon;
                  return (
                    <TimelineItem key={entry.id} icon={<Glyph aria-hidden className={mark.text} />} title={entry.title} description={entry.detail} time={entry.at} />
                  );
                })}
              </Timeline>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title={t.noRecord} className="py-8" />
        )}
        {children}
      </section>

      <ProtocolSection snapshot={snapshot} t={t} headingId={`${headingId}-protocol`} />

      <p className="text-caption text-muted-foreground">{t.disclaimer}</p>
    </div>
  );
}

type T = ReturnType<typeof useHealthLabels<{ en: typeof STRINGS.en; ar: typeof STRINGS.ar }>>;

function HistorySkeleton() {
  return (
    <div aria-busy data-slot="engine-details-history-skeleton" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

function HistoryBody({ days, t }: { days: readonly HistoryDay[]; t: T }) {
  const totals = useMemo(() => summariseDays(days), [days]);
  const d = useHealthDate();
  const { xAxis, yAxis } = useChartAxis();
  const daily = days.length <= 31;
  const weekly = useMemo(() => bucketDays(days), [days]);

  const dailyConfig: ChartConfig = { entries: { label: t.entries, color: "var(--primary)" } };
  const weeklyConfig: ChartConfig = {
    onProtocol: { label: t.verdicts.on_protocol, color: "var(--nq-success)" },
    offProtocol: { label: t.verdicts.off_protocol, color: "var(--nq-danger)" },
    unevaluated: { label: t.verdicts.unevaluated, color: "var(--nq-line)" },
  };
  const dayCount = (value: number) => <Measure value={value} unit="day" format={{ unitDisplay: "long" }} />;

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatCard label={t.onProtocol} value={dayCount(totals.daysOnProtocol)} icon={<CircleCheck />} />
        <StatCard label={t.offProtocol} value={dayCount(totals.daysOffProtocol)} icon={<CircleX />} />
        <StatCard label={t.unevaluated} value={dayCount(totals.daysUnevaluated)} icon={<CircleDashed />} />
        <StatCard label={t.currentStreak} value={dayCount(totals.currentStreak)} />
        <StatCard label={t.bestStreak} value={dayCount(totals.bestStreak)} />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle as="h3" className="text-h3">
            {daily ? t.entriesChart : t.weeklyChart}
          </CardTitle>
          <CardDescription>{t.chartSummary(days.length)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {daily ? (
            <ChartContainer config={dailyConfig} label={`${t.entriesChart}. ${t.chartSummary(days.length)}`} className="aspect-auto h-52">
              <BarChart data={days.map((day) => ({ label: d.date(parseCivilDate(day.date), { day: "numeric", month: "short" }), entries: day.entries }))} barCategoryGap={4}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} {...xAxis} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} {...yAxis} />
                <ChartTooltip content={<ChartTooltipContent config={dailyConfig} />} />
                <Bar dataKey="entries" fill="var(--color-entries)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartContainer config={weeklyConfig} label={`${t.weeklyChart}. ${t.chartSummary(days.length)}`} className="aspect-auto h-56">
              <BarChart data={weekly.map((w) => ({ label: d.date(parseCivilDate(w.start), { day: "numeric", month: "short" }), onProtocol: w.onProtocol, offProtocol: w.offProtocol, unevaluated: w.unevaluated }))}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} {...xAxis} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} {...yAxis} />
                <ChartTooltip content={<ChartTooltipContent config={weeklyConfig} />} />
                <ChartLegend content={<ChartLegendContent config={weeklyConfig} />} />
                <Bar dataKey="onProtocol" stackId="w" fill="var(--color-onProtocol)" isAnimationActive={false} />
                <Bar dataKey="offProtocol" stackId="w" fill="var(--color-offProtocol)" isAnimationActive={false} />
                <Bar dataKey="unevaluated" stackId="w" fill="var(--color-unevaluated)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-label text-foreground">{t.strip}</span>
            <EngineHistoryStrip days={days} />
            <EngineHistoryLegend />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtocolSection({ snapshot, t, headingId }: { snapshot: EngineSnapshot; t: T; headingId: string }) {
  const { locale } = useHealthLocale();
  const rows = protocolRows(snapshot.engine, t, locale);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeader headingId={headingId} title={t.protocol} description={t.protocolDescription} />
      <Card>
        <CardContent>
          <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5 border-b border-border pb-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                <dt className="text-caption text-muted-foreground">{label}</dt>
                <dd className="m-0 text-body-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}

function protocolRows(engine: EngineSnapshot["engine"], t: T, locale: string): [string, ReactNode][] {
  const P = ENGINE_PROTOCOL;
  switch (engine) {
    case "hydration":
      return [
        [t.unit, <Measure key="u" value={P.hydration.unitMl} unit="milliliter" />],
        [t.dailyCap, <Measure key="c" value={P.hydration.dailyCapMl} unit="milliliter" />],
        [t.cooldown, <Measure key="d" value={P.hydration.cooldownSeconds} unit="second" format={{ unitDisplay: "long" }} />],
      ];
    case "caffeine":
      return [[t.blockAfterWake, <Measure key="b" value={P.caffeine.blockMinutes} unit="minute" format={{ unitDisplay: "long" }} />]];
    case "gerd":
      return [
        [t.windowBeforeSleep, <Measure key="w" value={P.gerd.windowHours} unit="hour" format={{ unitDisplay: "long" }} />],
        [t.allowedInside, P.gerd.whitelist.map((item) => t.whitelist[item] ?? item).join(" · ")],
      ];
    case "medication":
      return [[t.graceWindow, <Measure key="g" value={P.medication.graceMinutes} unit="minute" format={{ unitDisplay: "long" }} />]];
    case "triggers":
      return [[t.familiesLabel, P.triggers.families.map((f) => t.families[f] ?? f).join(" · ")]];
    case "cycle":
      return [
        [t.minCycles, <Measure key="m" value={P.cycle.minCycles} unit="cycles" />],
        [t.irregularSpread, <Measure key="i" value={P.cycle.irregularSpreadDays} unit="day" format={{ unitDisplay: "long" }} />],
        [t.ovulationBefore, <Measure key="o" value={P.cycle.ovulationBeforeNextStartDays} unit="day" format={{ unitDisplay: "long" }} />],
        [
          t.fertileWindow,
          t.fertileWindowValue(
            formatMeasure(P.cycle.fertileOpensBeforeOvulationDays, "day", locale, { unitDisplay: "long" }),
            formatMeasure(P.cycle.fertileClosesAfterOvulationDays, "day", locale, { unitDisplay: "long" }),
          ),
        ],
      ];
    case "contraceptive":
      return [
        [t.methodsLabel, P.contraceptive.methods.map((m) => t.methods[m] ?? m).join(" · ")],
      ];
  }
}
