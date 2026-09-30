"use client";

import { Copy, Palmtree, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DateRangePicker, TimePicker } from "../date-picker";
import { Field, FieldLabel, Input } from "../field";
import { formatDate } from "../numeric";
import { Switch } from "../switch";
import {
  type Availability,
  type AvailabilityDay,
  type AvailabilityIssue,
  type AvailabilityRange,
  type AvailabilityVacation,
  copyDay,
  dayKey,
  nextRange,
  validateAvailability,
  vacationDays,
  weeklyMinutes,
  workedMinutes,
} from "./availability-math";

const STRINGS = {
  en: {
    weekly: "Weekly hours",
    weeklyHint: "The hours patients can book. Breaks are taken out of them.",
    total: (m: number) => `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min ` : ""}a week`,
    dayOn: (d: string) => `Open on ${d}`,
    closed: "Closed",
    hours: (m: number) => `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`,
    from: "From",
    to: "To",
    addHours: "Add hours",
    addBreak: "Add break",
    breaks: "Breaks",
    remove: "Remove",
    copyAll: "Copy to other open days",
    copied: "Copied",
    vacations: "Vacations and days off",
    vacationsHint: "No one can book these days.",
    pickDates: "Pick the days away",
    reason: "Reason (optional)",
    addVacation: "Add",
    noVacations: "No vacations planned.",
    daysCount: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    save: "Save availability",
    saving: "Saving",
    reset: "Discard changes",
    saved: "Availability saved.",
    failed: "It could not be saved. Try again.",
    fix: "Fix these before saving",
    issue: {
      "end-before-start": "ends before it starts",
      "invalid-time": "has a time that is not valid",
      overlap: "overlaps another one",
      "break-outside-hours": "is outside the open hours",
      "vacation-order": "ends before it starts",
      "vacation-overlap": "overlaps another vacation",
      "no-hours": "is open but has no hours",
    } as Record<string, string>,
    hoursWord: "hours",
    breakWord: "break",
    vacationWord: "Vacation",
    startLabel: (n: number) => `Start ${n}`,
    endLabel: (n: number) => `End ${n}`,
  },
  ar: {
    weekly: "ساعات العمل الأسبوعية",
    weeklyHint: "الساعات التي يمكن للمرضى الحجز فيها. تُخصم الاستراحات منها.",
    total: (m: number) => `${Math.floor(m / 60)} س ${m % 60 ? `${m % 60} د ` : ""}في الأسبوع`,
    dayOn: (d: string) => `مفتوح يوم ${d}`,
    closed: "مغلق",
    hours: (m: number) => `${Math.floor(m / 60)} س${m % 60 ? ` ${m % 60} د` : ""}`,
    from: "من",
    to: "إلى",
    addHours: "إضافة ساعات",
    addBreak: "إضافة استراحة",
    breaks: "الاستراحات",
    remove: "حذف",
    copyAll: "نسخ إلى الأيام المفتوحة الأخرى",
    copied: "تم النسخ",
    vacations: "الإجازات وأيام الغياب",
    vacationsHint: "لا يمكن الحجز في هذه الأيام.",
    pickDates: "اختر أيام الغياب",
    reason: "السبب (اختياري)",
    addVacation: "إضافة",
    noVacations: "لا إجازات مخططة.",
    daysCount: (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`),
    save: "حفظ أوقات العمل",
    saving: "جارٍ الحفظ",
    reset: "تجاهل التغييرات",
    saved: "تم حفظ أوقات العمل.",
    failed: "تعذّر الحفظ. حاول مجددًا.",
    fix: "صحّح هذه الأخطاء قبل الحفظ",
    issue: {
      "end-before-start": "ينتهي قبل أن يبدأ",
      "invalid-time": "به وقت غير صالح",
      overlap: "يتداخل مع آخر",
      "break-outside-hours": "خارج ساعات العمل",
      "vacation-order": "ينتهي قبل أن يبدأ",
      "vacation-overlap": "يتداخل مع إجازة أخرى",
      "no-hours": "مفتوح بلا ساعات",
    } as Record<string, string>,
    hoursWord: "ساعات العمل",
    breakWord: "استراحة",
    vacationWord: "إجازة",
    startLabel: (n: number) => `البداية ${n}`,
    endLabel: (n: number) => `النهاية ${n}`,
  },
};

export type AvailabilityEditorLabels = (typeof STRINGS)["en"];

export interface AvailabilityEditorProps extends Omit<ComponentProps<"div">, "children" | "defaultValue" | "onChange"> {
  /** The availability being edited. Controlled. */
  value?: Availability;
  defaultValue?: Availability;
  onValueChange?: (value: Availability) => void;
  /** Save it. Return `{ error }` (or throw) to keep the editor open with a message. */
  onSave?: (value: Availability) => Promise<void | { error?: string }>;
  /** First day of the week, 0 = Sunday. Default 6 (Saturday), as in Egypt. */
  weekStartsOn?: number;
  /** Minutes between choices in the time pickers. Default 15. */
  minuteStep?: number;
  labels?: Partial<AvailabilityEditorLabels>;
}

let counter = 0;
const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

const issuesFor = (issues: AvailabilityIssue[], day: number, list: "ranges" | "breaks", index: number) => issues.find((i) => i.day === day && i.list === list && i.index === index);

/**
 * A provider's availability: weekly hours with breaks per day, copy one day to the others, and vacations picked as date ranges.
 * Problems (overlaps, an end before a start, a break outside the hours) are shown beside the row and block saving. Times are 24 hour under the hood.
 */
export function AvailabilityEditor({ value: valueProp, defaultValue, onValueChange, onSave, weekStartsOn = 6, minuteStep = 15, labels, className, ...rest }: AvailabilityEditorProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as AvailabilityEditorLabels;
  const [initial] = useState<Availability>(() => valueProp ?? defaultValue ?? { weekly: Array.from({ length: 7 }, () => ({ enabled: false, ranges: [], breaks: [] })), vacations: [] });
  const [inner, setInner] = useState<Availability>(initial);
  const [saved, setSaved] = useState<Availability>(initial);
  const av = valueProp ?? inner;
  const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const issues = validateAvailability(av);
  const dirty = JSON.stringify(av) !== JSON.stringify(saved);

  const commit = (next: Availability) => {
    setInner(next);
    setMessage(null);
    onValueChange?.(next);
  };
  const setDay = (d: number, patch: Partial<AvailabilityDay>) => commit({ ...av, weekly: av.weekly.map((x, i) => (i === d ? { ...x, ...patch } : x)) });
  const setList = (d: number, list: "ranges" | "breaks", next: AvailabilityRange[]) => setDay(d, { [list]: next });
  const patchRange = (d: number, list: "ranges" | "breaks", i: number, p: Partial<AvailabilityRange>) => setList(d, list, av.weekly[d]![list].map((r, k) => (k === i ? { ...r, ...p } : r)));

  const dayName = (d: number) => formatDate(new Date(2023, 0, 1 + d), locale, { weekday: "long" });
  const order = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
  const timeFor = (v: string) => (v ? v : null);

  const addVacation = () => {
    if (!range.from || !range.to) return;
    const v: AvailabilityVacation = { id: `vac-new-${++counter}`, from: dayKey(range.from), to: dayKey(range.to), reason: reason.trim() || undefined };
    commit({ ...av, vacations: [...av.vacations, v].sort((a, b) => a.from.localeCompare(b.from)) });
    setRange({ from: null, to: null });
    setReason("");
  };

  const save = async () => {
    if (issues.length > 0 || !onSave) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await onSave(av);
      if (r && r.error) setMessage({ tone: "danger", text: r.error });
      else {
        setSaved(av);
        setMessage({ tone: "success", text: t.saved });
      }
    } catch {
      setMessage({ tone: "danger", text: t.failed });
    } finally {
      setBusy(false);
    }
  };

  const issueText = (i: AvailabilityIssue) => {
    const what = i.vacationId ? t.vacationWord : i.day !== undefined ? `${dayName(i.day)}: ${i.list === "breaks" ? t.breakWord : t.hoursWord}${i.index !== undefined ? ` ${i.index + 1}` : ""}` : "";
    return `${what} ${t.issue[i.code] ?? i.code}`;
  };

  const renderList = (d: number, day: AvailabilityDay, list: "ranges" | "breaks") => (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {day[list].map((r, i) => {
        const bad = issuesFor(issues, d, list, i);
        return (
          <li key={`${list}-${i}`} data-invalid={bad ? "" : undefined} className={cn("flex flex-wrap items-center gap-2 rounded-control", bad && "outline outline-1 outline-nq-danger")}>
            <TimePicker value={timeFor(r.start)} onValueChange={(v) => patchRange(d, list, i, { start: v ?? "" })} minuteStep={minuteStep} aria-label={`${dayName(d)} ${t.startLabel(i + 1)}`} />
            <span aria-hidden className="text-muted-foreground">
              {t.to}
            </span>
            <TimePicker value={timeFor(r.end)} onValueChange={(v) => patchRange(d, list, i, { end: v ?? "" })} minuteStep={minuteStep} aria-label={`${dayName(d)} ${t.endLabel(i + 1)}`} />
            <Button size="icon" variant="ghost" aria-label={`${t.remove} ${dayName(d)} ${i + 1}`} onClick={() => setList(d, list, day[list].filter((_, k) => k !== i))}>
              <Trash2 aria-hidden />
            </Button>
            {bad ? <span className="text-caption text-nq-danger-text">{t.issue[bad.code]}</span> : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div data-slot="availability-editor" className={cn("flex flex-col gap-4", className)} {...rest}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle as="h2">{t.weekly}</CardTitle>
            <CardDescription>{t.weeklyHint}</CardDescription>
          </div>
          <p className="text-label tabular-nums">{t.total(weeklyMinutes(av))}</p>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {order.map((d) => {
            const day = av.weekly[d]!;
            const noHours = issues.some((i) => i.code === "no-hours" && i.day === d);
            return (
              <section key={d} aria-label={dayName(d)} data-slot="availability-day" data-open={day.enabled ? "" : undefined} className="grid gap-3 py-3 sm:grid-cols-[10rem_1fr]">
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-start">
                  <label className="flex items-center gap-2 text-label">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(on) => setDay(d, on && day.ranges.length === 0 ? { enabled: true, ranges: [nextRange([], 480)] } : { enabled: on })}
                      aria-label={t.dayOn(dayName(d))}
                    />
                    {dayName(d)}
                  </label>
                  <span className="text-caption text-muted-foreground">{day.enabled ? t.hours(workedMinutes(day)) : t.closed}</span>
                </div>
                {day.enabled ? (
                  <div className="flex flex-col gap-3">
                    {renderList(d, day, "ranges")}
                    {noHours ? <p className="text-caption text-nq-danger-text">{t.issue["no-hours"]}</p> : null}
                    {day.breaks.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-caption text-muted-foreground">{t.breaks}</p>
                        {renderList(d, day, "breaks")}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setList(d, "ranges", [...day.ranges, nextRange(day.ranges, 60)])}>
                        <Plus aria-hidden />
                        {t.addHours}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setList(d, "breaks", [...day.breaks, { start: "13:00", end: "13:30" }])}>
                        <Plus aria-hidden />
                        {t.addBreak}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => commit({ ...av, weekly: copyDay(av.weekly, d, av.weekly.flatMap((x, i) => (i !== d && x.enabled ? [i] : []))) })}>
                        <Copy aria-hidden />
                        {t.copyAll}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">{t.vacations}</CardTitle>
          <CardDescription>{t.vacationsHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <Field className="w-full sm:w-auto">
              <FieldLabel>{t.pickDates}</FieldLabel>
              <DateRangePicker value={range} onValueChange={setRange} placeholder={t.pickDates} aria-label={t.pickDates} className="sm:w-72" />
            </Field>
            <Field className="min-w-40 flex-1">
              <FieldLabel>{t.reason}</FieldLabel>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={addVacation} disabled={!range.from || !range.to}>
              <Plus aria-hidden />
              {t.addVacation}
            </Button>
          </div>
          {av.vacations.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.noVacations}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {av.vacations.map((v) => {
                const bad = issues.find((i) => i.vacationId === v.id);
                return (
                  <li key={v.id} data-slot="availability-vacation" className={cn("flex items-center gap-3 rounded-control border border-border p-2", bad && "border-nq-danger")}>
                    <Palmtree aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-label">
                        <bdi>{formatDate(parseKey(v.from), locale, { dateStyle: "medium" })}</bdi>
                        {v.to !== v.from ? (
                          <>
                            {" - "}
                            <bdi>{formatDate(parseKey(v.to), locale, { dateStyle: "medium" })}</bdi>
                          </>
                        ) : null}
                        <span className="ms-2 text-caption text-muted-foreground">{t.daysCount(vacationDays(v))}</span>
                      </p>
                      {v.reason ? <p className="truncate text-caption text-muted-foreground">{v.reason}</p> : null}
                      {bad ? <p className="text-caption text-nq-danger-text">{t.issue[bad.code]}</p> : null}
                    </div>
                    <Button size="icon" variant="ghost" aria-label={`${t.remove} ${t.vacationWord}`} onClick={() => commit({ ...av, vacations: av.vacations.filter((x) => x.id !== v.id) })}>
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {issues.length > 0 ? (
        <Alert tone="danger" title={t.fix}>
          <ul className="m-0 ps-4">
            {issues.map((i, k) => (
              <li key={k}>{issueText(i)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          disabled={!dirty || busy}
          onClick={() => {
            setInner(saved);
            onValueChange?.(saved);
            setMessage(null);
          }}
        >
          {t.reset}
        </Button>
        <Button onClick={save} disabled={!dirty || busy || issues.length > 0 || !onSave}>
          {busy ? t.saving : t.save}
        </Button>
      </div>
    </div>
  );
}
