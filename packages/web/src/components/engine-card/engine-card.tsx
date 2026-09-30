"use client";

import {
  CalendarClock,
  CalendarHeart,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleMinus,
  CircleX,
  Clock,
  Coffee,
  Droplets,
  Timer,
  Pill,
  BedDouble,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button, buttonVariants } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { DateTime } from "../numeric";
import { Meter } from "../progress";
import { Status, type StatusTone } from "../status";
import { Skeleton } from "../states";
import {
  type CaffeineSnapshot,
  type ContraceptiveSnapshot,
  type CycleSnapshot,
  doseTone,
  type EngineAction,
  type EngineId,
  type EngineSnapshot,
  engineStateKey,
  engineTone,
  type GerdSnapshot,
  type HealthDateInput,
  type HydrationSnapshot,
  type MedicationDose,
  type MedicationSnapshot,
  secondsUntil,
  summariseMedication,
  type TriggersSnapshot,
} from "./health-engines";
import { Duration, type HealthActionResult, Measure, useHealthDate, useHealthLabels, useNow } from "./health-format";

const STRINGS = {
  en: {
    details: "Details",
    logUnit: "Log one unit",
    logWake: "I woke up",
    logDose: "Log dose",
    recordDose: "Record a dose",
    wait: (time: ReactNode): ReactNode => <>Wait {time}</>,
    working: "Working…",
    unitsToday: "Units today",
    ofCap: "of",
    blockProgress: "Block",
    blockLeft: (time: ReactNode): ReactNode => <>{time} left</>,
    blockOver: "The block has ended.",
    blockWaiting: "Log when you woke up to start the block.",
    cupsToday: "Caffeine drinks today",
    cupsOf: (n: string, of: string) => `${n} of ${of}`,
    violations: "Logged inside the block",
    windowLabel: "Window",
    windowRange: (from: string, to: string) => `${from} to ${to}`,
    windowLeft: (time: ReactNode): ReactNode => <>{time} left in the window</>,
    windowNone: "Set your bedtime to open a window.",
    allowedInside: "Allowed inside the window",
    gerdViolations: "Outside the list, today",
    needsReview: "Needs review",
    nextDose: "Next dose",
    noDoses: "No doses are scheduled today.",
    logged: "Logged",
    triggerBearing: "Trigger-bearing",
    safe: "Judged safe",
    unclassified: "Not judged",
    unclassifiedNote: "An item nobody has classified is not judged. It is never shown as safe.",
    byFamily: "By family",
    calibration: "Cycles counted",
    calibrationValue: (n: string, of: string) => `${n} of ${of}`,
    average: "Average cycle",
    nextStart: "Next expected start",
    ovulation: "Estimated ovulation",
    fertile: "Fertile window",
    fertileRange: (from: string, to: string) => `${from} to ${to}`,
    reasons: {
      insufficient_cycles: "Not enough cycles are recorded yet.",
      irregular: "Recent cycles vary too much for a prediction.",
      recalibrating: "Building up history again after a suspension.",
    } as Record<string, string>,
    predictionNote: "A prediction is not a guarantee.",
    method: "Method",
    nextDue: "Next due",
    lastRecorded: "Last recorded",
    daysOverdue: "Past the plan",
    unconfiguredNote: "Add your schedule to start tracking.",
    graceNote: (time: ReactNode): ReactNode => <>Each dose can be logged on time for {time} after its scheduled time.</>,
    noSnapshot: "Something went wrong. Try again.",
    stateLabel: "State",
  },
  ar: {
    details: "التفاصيل",
    logUnit: "سجّل وحدة",
    logWake: "استيقظت",
    logDose: "سجّل الجرعة",
    recordDose: "سجّل جرعة",
    wait: (time: ReactNode): ReactNode => <>انتظر {time}</>,
    working: "جارٍ التنفيذ…",
    unitsToday: "وحدات اليوم",
    ofCap: "من",
    blockProgress: "الحظر",
    blockLeft: (time: ReactNode): ReactNode => <>متبقٍّ {time}</>,
    blockOver: "انتهى الحظر.",
    blockWaiting: "سجّل وقت استيقاظك لبدء الحظر.",
    cupsToday: "مشروبات الكافيين اليوم",
    cupsOf: (n: string, of: string) => `${n} من ${of}`,
    violations: "سُجّل داخل الحظر",
    windowLabel: "النافذة",
    windowRange: (from: string, to: string) => `من ${from} إلى ${to}`,
    windowLeft: (time: ReactNode): ReactNode => <>متبقٍّ {time} من النافذة</>,
    windowNone: "حدّد موعد نومك لفتح نافذة.",
    allowedInside: "المسموح داخل النافذة",
    gerdViolations: "خارج القائمة اليوم",
    needsReview: "بحاجة إلى مراجعة",
    nextDose: "الجرعة التالية",
    noDoses: "لا توجد جرعات مجدولة اليوم.",
    logged: "سُجّلت",
    triggerBearing: "يحمل محفّزًا",
    safe: "مُقيَّم آمنًا",
    unclassified: "لم يُقيَّم",
    unclassifiedNote: "ما لم يصنّفه أحد يبقى غير مُقيَّم، ولا يُعرض أبدًا على أنه آمن.",
    byFamily: "بحسب العائلة",
    calibration: "الدورات المحسوبة",
    calibrationValue: (n: string, of: string) => `${n} من ${of}`,
    average: "متوسط الدورة",
    nextStart: "البداية المتوقعة التالية",
    ovulation: "الإباضة المقدّرة",
    fertile: "فترة الخصوبة",
    fertileRange: (from: string, to: string) => `من ${from} إلى ${to}`,
    reasons: {
      insufficient_cycles: "لم تُسجَّل دورات كافية بعد.",
      irregular: "الدورات الأخيرة متفاوتة جدًا لإعطاء توقع.",
      recalibrating: "يُعاد بناء السجل بعد تعليق التوقع.",
    } as Record<string, string>,
    predictionNote: "التوقع ليس ضمانًا.",
    method: "الوسيلة",
    nextDue: "الموعد التالي",
    lastRecorded: "آخر تسجيل",
    daysOverdue: "بعد الخطة",
    unconfiguredNote: "أضف جدولك لبدء التتبّع.",
    graceNote: (time: ReactNode): ReactNode => <>يمكن تسجيل كل جرعة في وقتها خلال {time} من موعدها.</>,
    noSnapshot: "حدث خطأ ما. حاول مرة أخرى.",
    stateLabel: "الحالة",
  },
};

export type EngineCardLabels = typeof STRINGS.en;

/** The glyph for each engine. Decorative: the title names the engine. */
export const ENGINE_ICONS: Record<EngineId, LucideIcon> = {
  hydration: Droplets,
  caffeine: Coffee,
  gerd: BedDouble,
  medication: Pill,
  triggers: Utensils,
  cycle: CalendarHeart,
  contraceptive: CalendarClock,
};

const TONE_BADGE: Record<StatusTone, "neutral" | "info" | "success" | "warning" | "danger"> = {
  neutral: "neutral",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

/** Each tone has its own shape, so state never depends on colour alone. */
const TONE_ICON: Record<StatusTone, LucideIcon> = { neutral: CircleMinus, info: CircleDot, success: CircleCheck, warning: CircleAlert, danger: CircleX };

export interface EngineCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  /** The engine's current state, already decided by the server. The card renders it and computes no protocol state. */
  snapshot: EngineSnapshot;
  /** Fixed "now" for countdowns. Omit to follow the clock. */
  now?: HealthDateInput;
  /** Tick the countdown every second. Default true; only engines with a deadline tick. */
  live?: boolean;
  /**
   * Called when the person taps a log action. Resolve with nothing on success or `{ error }` with the server's own
   * message, which the card shows as it is. The card does not enforce any protocol rule itself.
   */
  onAction?: (action: EngineAction) => Promise<HealthActionResult>;
  /** Link to the engine's own page. Omit on that page itself. */
  detailHref?: string;
  /** Heading level of the title. Default "h3". */
  headingAs?: "h2" | "h3" | "h4";
  loading?: boolean;
  /** Hide the icon, title and subtitle and show only the state. For pages that already carry the engine's name in their own heading. */
  hideTitle?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<EngineCardLabels>;
}

/**
 * One protocol engine's live state: name, a state badge with icon and words, the engine-specific readout
 * (units, countdown, window, doses, counts, prediction, schedule) and its log action. Seven engines, one card.
 */
export function EngineCard({ snapshot, now, live = true, onAction, detailHref, headingAs = "h3", loading = false, hideTitle = false, labels, className, ...props }: EngineCardProps) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  const titleId = useId();
  const clock = useNow(now, live);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engine = snapshot.engine;
  const meta = t.engines[engine];
  const Icon = ENGINE_ICONS[engine];
  const tone = engineTone(snapshot);
  const stateKey = engineStateKey(snapshot);
  const StateIcon = TONE_ICON[tone];
  const stateLabel = t.states[`${engine}.${stateKey}`] ?? stateKey;

  async function run(action: EngineAction) {
    if (!onAction) return;
    setPending(`${action.kind}:${action.doseId ?? ""}`);
    setError(null);
    try {
      const result = await onAction(action);
      if (result && result.error) setError(result.error);
    } catch {
      setError(t.noSnapshot);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card
      data-slot="engine-card"
      data-engine={engine}
      data-state={stateKey}
      data-tone={tone}
      aria-labelledby={hideTitle ? undefined : titleId}
      aria-label={hideTitle ? meta.title : undefined}
      aria-busy={loading || undefined}
      className={cn("min-w-0", className)}
      {...props}
    >
      {loading ? (
        <div data-slot="engine-card-skeleton" className="flex flex-col gap-3 px-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-2 w-full" />
        </div>
      ) : (
        <>
          <CardHeader className={hideTitle ? "grid-cols-[1fr_auto]" : undefined}>
            {hideTitle ? (
              <span className="text-label text-muted-foreground">{t.stateLabel}</span>
            ) : (
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden data-slot="engine-card-icon" className="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4.5">
                <Icon />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <CardTitle as={headingAs} id={titleId} className="text-h3 text-foreground">
                  {meta.title}
                </CardTitle>
                <CardDescription className="text-pretty text-body-sm">{meta.subtitle}</CardDescription>
              </div>
            </div>
            )}
            <CardAction>
              <Badge variant={TONE_BADGE[tone]} data-slot="engine-card-state" title={t.stateLabel}>
                <StateIcon aria-hidden />
                {stateLabel}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {snapshot.engine === "hydration" ? <HydrationBody s={snapshot} t={t} clock={clock} /> : null}
            {snapshot.engine === "caffeine" ? <CaffeineBody s={snapshot} t={t} clock={clock} /> : null}
            {snapshot.engine === "gerd" ? <GerdBody s={snapshot} t={t} clock={clock} /> : null}
            {snapshot.engine === "medication" ? <MedicationBody s={snapshot} t={t} pending={pending} busy={pending !== null} onLog={onAction ? (doseId) => run({ engine, kind: "log_dose", doseId }) : undefined} /> : null}
            {snapshot.engine === "triggers" ? <TriggersBody s={snapshot} t={t} /> : null}
            {snapshot.engine === "cycle" ? <CycleBody s={snapshot} t={t} /> : null}
            {snapshot.engine === "contraceptive" ? <ContraceptiveBody s={snapshot} t={t} clock={clock} /> : null}
            {error ? (
              <p role="alert" data-slot="engine-card-error" className="flex items-start gap-2 rounded-control border border-nq-warning/30 bg-nq-warning-soft px-3 py-2 text-body-sm text-foreground">
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-warning-text" />
                {error}
              </p>
            ) : null}
          </CardContent>

          {onAction || detailHref ? (
            <CardFooter className="flex flex-wrap items-center gap-2 px-4">
              {primaryAction(snapshot, t, clock, pending, run)}
              {detailHref ? (
                <a data-slot="engine-card-details" href={detailHref} aria-describedby={titleId} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ms-auto")}>
                  {t.details}
                  <ChevronRight aria-hidden className="rtl:-scale-x-100" />
                </a>
              ) : null}
            </CardFooter>
          ) : null}
        </>
      )}
    </Card>
  );
}

type T = ReturnType<typeof useHealthLabels<{ en: typeof STRINGS.en; ar: typeof STRINGS.ar }>>;

function primaryAction(s: EngineSnapshot, t: T, clock: number, pending: string | null, run: (a: EngineAction) => Promise<void>): ReactNode {
  const busy = pending !== null;
  if (s.engine === "hydration") {
    const wait = s.state === "cooldown" ? secondsUntil(s.nextAllowedAt, clock) : 0;
    const blocked = s.state === "capped" || wait > 0;
    return (
      <Button variant="primary" size="sm" disabled={blocked} loading={pending === "log_unit:"} onClick={() => run({ engine: "hydration", kind: "log_unit" })}>
        {wait > 0 ? t.wait(<Duration seconds={wait} />) : t.logUnit}
      </Button>
    );
  }
  if (s.engine === "caffeine" && s.state === "awaiting_wake") {
    return (
      <Button variant="primary" size="sm" disabled={busy} loading={pending === "log_wake:"} onClick={() => run({ engine: "caffeine", kind: "log_wake" })}>
        {t.logWake}
      </Button>
    );
  }
  if (s.engine === "contraceptive" && s.state !== "unconfigured") {
    return (
      <Button variant={s.state === "on_schedule" ? "secondary" : "primary"} size="sm" disabled={busy} loading={pending === "record_dose:"} onClick={() => run({ engine: "contraceptive", kind: "record_dose" })}>
        {t.recordDose}
      </Button>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ bodies */

interface BodyProps<S> {
  s: S;
  t: T;
}

function Fact({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div data-slot="engine-card-fact" className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="m-0 text-body-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Facts({ children }: { children: ReactNode }) {
  return <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>;
}

function HydrationBody({ s, t }: BodyProps<HydrationSnapshot> & { clock: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span data-slot="engine-card-value" className="text-h2 leading-tight text-foreground">
          <Measure value={s.totalMl} unit="milliliter" />
        </span>
        <span className="text-body-sm text-muted-foreground">
          {t.ofCap} <Measure value={s.dailyCapMl} unit="milliliter" />
        </span>
      </div>
      <Meter
        label={t.unitsToday}
        value={s.unitsLogged}
        max={s.unitsTotal}
        tone={s.state === "capped" ? "success" : "default"}
        valueText={
          <>
            <Measure value={s.unitsLogged} unit="cups" format={{ maximumFractionDigits: 0 }} /> / <Measure value={s.unitsTotal} unit="cups" format={{ maximumFractionDigits: 0 }} />
          </>
        }
      />
      <ol aria-hidden data-slot="engine-card-units" className="m-0 flex list-none flex-wrap gap-1 p-0">
        {Array.from({ length: s.unitsTotal }, (_, i) => (
          <li key={i} className={cn("size-3.5 rounded-full border", i < s.unitsLogged ? "border-primary bg-primary" : "border-border bg-transparent")} />
        ))}
      </ol>
    </div>
  );
}

function CaffeineBody({ s, t, clock }: BodyProps<CaffeineSnapshot> & { clock: number }) {
  const total = s.blockMinutes * 60;
  const left = s.state === "blocked" ? Math.min(total, secondsUntil(s.blockEndsAt, clock)) : 0;
  return (
    <div className="flex flex-col gap-3">
      {s.state === "awaiting_wake" ? (
        <p className="text-body-sm text-muted-foreground">{t.blockWaiting}</p>
      ) : (
        <Meter
          label={t.blockProgress}
          value={total - left}
          max={total}
          tone={s.state === "blocked" ? "warning" : "success"}
          showValue
          valueText={left > 0 ? t.blockLeft(<Duration seconds={left} />) : t.blockOver}
        />
      )}
      <Facts>
        <Fact label={t.cupsToday}>
          {s.cupsAllowed ? t.cupsOf(String(s.cupsToday), String(s.cupsAllowed)) : <Measure value={s.cupsToday} unit="cups" format={{ maximumFractionDigits: 0 }} />}
        </Fact>
        <Fact label={t.violations}>
          <Measure value={s.violationsToday} unit="level" format={{ maximumFractionDigits: 0 }} className="[&]:font-medium" />
        </Fact>
      </Facts>
    </div>
  );
}

function GerdBody({ s, t, clock }: BodyProps<GerdSnapshot> & { clock: number }) {
  const d = useHealthDate();
  const left = s.state === "window_active" ? secondsUntil(s.windowEndsAt, clock) : 0;
  return (
    <div className="flex flex-col gap-3">
      {s.windowStartsAt && s.windowEndsAt ? (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Clock aria-hidden className="size-4 self-center text-muted-foreground" />
          <span data-slot="engine-card-value" className="text-h3 text-foreground">
            <bdi dir="ltr" className="tabular-nums">
              {t.windowRange(d.time(s.windowStartsAt), d.time(s.windowEndsAt))}
            </bdi>
          </span>
          {left > 0 ? (
            <span className="text-body-sm text-muted-foreground">{t.windowLeft(<Duration seconds={left} />)}</span>
          ) : null}
        </div>
      ) : (
        <p className="text-body-sm text-muted-foreground">{t.windowNone}</p>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-caption text-muted-foreground">{t.allowedInside}</span>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {s.whitelist.map((item) => (
            <li key={item}>
              <Badge variant="outline">{t.whitelist[item] ?? item}</Badge>
            </li>
          ))}
        </ul>
      </div>
      <Facts>
        <Fact label={t.gerdViolations}>
          <Measure value={s.violationsToday} unit="level" format={{ maximumFractionDigits: 0 }} />
        </Fact>
        <Fact label={t.needsReview}>
          <Measure value={s.needsReviewToday} unit="level" format={{ maximumFractionDigits: 0 }} />
        </Fact>
      </Facts>
    </div>
  );
}

const DOSE_ICON: Record<MedicationDose["status"], LucideIcon> = { scheduled: Clock, grace_open: Timer, logged: CircleCheck, late_logged: CircleAlert, missed: CircleMinus };

function MedicationBody({ s, t, onLog, pending, busy }: BodyProps<MedicationSnapshot> & { onLog?: (doseId: string) => void; pending: string | null; busy: boolean }) {
  const d = useHealthDate();
  const sum = summariseMedication(s.doses);
  if (s.doses.length === 0) return <p className="text-body-sm text-muted-foreground">{t.noDoses}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span data-slot="engine-card-value" className="text-h2 leading-tight text-foreground">
          <Measure value={sum.logged + sum.lateLogged} unit="level" format={{ maximumFractionDigits: 0 }} className="[&]:tabular-nums" />
        </span>
        <span className="text-body-sm text-muted-foreground">
          {t.ofCap} <Measure value={sum.total} unit="level" format={{ maximumFractionDigits: 0 }} /> · {t.logged}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0" data-slot="engine-card-doses">
        {s.doses.map((dose) => (
          <li key={dose.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm font-medium text-foreground">{dose.name}</span>
              <span className="text-caption text-muted-foreground">
                <bdi dir="ltr" className="tabular-nums">
                  {d.time(dose.scheduledFor)}
                </bdi>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Status tone={doseTone(dose.status)} icon={DOSE_ICON[dose.status]}>
                {t.doseStatus[dose.status]}
              </Status>
              {onLog && (dose.status === "grace_open" || dose.status === "missed") ? (
                <Button size="sm" variant="secondary" disabled={busy} loading={pending === `log_dose:${dose.id}`} onClick={() => onLog(dose.id)}>
                  {t.logDose}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted-foreground">
        {t.graceNote(<Duration seconds={s.graceMinutes * 60} />)}
      </p>
      <p className="text-caption text-muted-foreground">{t.consult}</p>
    </div>
  );
}

function TriggersBody({ s, t }: BodyProps<TriggersSnapshot>) {
  return (
    <div className="flex flex-col gap-3">
      <Facts>
        <Fact label={t.triggerBearing}>
          <span className="text-h3">
            <Measure value={s.triggerBearing} unit="level" format={{ maximumFractionDigits: 0 }} />
          </span>
        </Fact>
        <Fact label={t.safe}>
          <span className="text-h3">
            <Measure value={s.safe} unit="level" format={{ maximumFractionDigits: 0 }} />
          </span>
        </Fact>
        <Fact label={t.unclassified}>
          <span className="text-h3">
            <Measure value={s.unclassified} unit="level" format={{ maximumFractionDigits: 0 }} />
          </span>
        </Fact>
      </Facts>
      {s.families.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">{t.byFamily}</span>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {s.families.map((f) => (
              <li key={f.id}>
                <Badge variant="outline">
                  {t.families[f.id] ?? f.id} <Measure value={f.count} unit="level" format={{ maximumFractionDigits: 0 }} />
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {s.unclassified > 0 ? <p className="text-caption text-muted-foreground">{t.unclassifiedNote}</p> : null}
    </div>
  );
}

function CycleBody({ s, t }: BodyProps<CycleSnapshot>) {
  const d = useHealthDate();
  return (
    <div className="flex flex-col gap-3">
      {s.state !== "calibrated" ? (
        <Meter
          label={t.calibration}
          value={Math.min(s.countableCycles, s.minCycles)}
          max={s.minCycles}
          tone="default"
          valueText={<Measure value={s.countableCycles} unit="level" format={{ maximumFractionDigits: 0 }} className="[&]:font-normal" />}
        />
      ) : null}
      {s.prediction ? (
        <Facts>
          <Fact label={t.nextStart}>
            <DateTime value={s.prediction.nextStart} format={{ dateStyle: "medium" }} />
          </Fact>
          <Fact label={t.ovulation}>
            <DateTime value={s.prediction.ovulation} format={{ dateStyle: "medium" }} />
          </Fact>
          <Fact label={t.fertile} className="col-span-2">
            <bdi className="tabular-nums">{t.fertileRange(d.date(s.prediction.fertileFrom, { day: "numeric", month: "short" }), d.date(s.prediction.fertileTo, { day: "numeric", month: "short" }))}</bdi>
          </Fact>
        </Facts>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-h3 text-foreground">{t.unavailable}</span>
          {s.reason ? <p className="text-body-sm text-muted-foreground">{t.reasons[s.reason]}</p> : null}
        </div>
      )}
      {s.averageLengthDays ? (
        <Facts>
          <Fact label={t.average}>
            <Measure value={s.averageLengthDays} unit="day" format={{ maximumFractionDigits: 1 }} />
          </Fact>
        </Facts>
      ) : null}
      <p className="text-caption text-muted-foreground">{s.prediction ? t.predictionNote : t.consult}</p>
    </div>
  );
}

function ContraceptiveBody({ s, t, clock }: BodyProps<ContraceptiveSnapshot> & { clock: number }) {
  void clock;
  if (s.state === "unconfigured") return <p className="text-body-sm text-muted-foreground">{t.unconfiguredNote}</p>;
  return (
    <div className="flex flex-col gap-3">
      <Facts>
        {s.method ? <Fact label={t.method}>{t.methods[s.method]}</Fact> : null}
        {s.nextDueAt ? (
          <Fact label={t.nextDue}>
            <DateTime value={s.nextDueAt} format={{ dateStyle: "medium" }} />
          </Fact>
        ) : null}
        {s.lastRecordedAt ? (
          <Fact label={t.lastRecorded}>
            <DateTime value={s.lastRecordedAt} relative />
          </Fact>
        ) : null}
        {s.daysOverdue > 0 ? (
          <Fact label={t.daysOverdue}>
            <Measure value={s.daysOverdue} unit="day" format={{ unitDisplay: "long" }} />
          </Fact>
        ) : null}
      </Facts>
      {s.state !== "on_schedule" ? <p className="text-body-sm text-foreground">{t.consult}</p> : null}
    </div>
  );
}

/** Responsive grid for EngineCards: as many equal columns as fit, each at least 20rem wide. */
export function EngineCardGrid({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="engine-card-grid" className={cn("grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4", className)} {...props} />;
}
