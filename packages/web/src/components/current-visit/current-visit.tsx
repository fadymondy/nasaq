"use client";

import { AlertTriangle, CalendarPlus, CheckCheck, Plus, Timer, Trash2 } from "lucide-react";
import { type ComponentProps, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DatePicker } from "../date-picker";
import { Field, FieldError, FieldLabel, Input, Textarea } from "../field";
import { formatDate } from "../numeric";
import { Timeline, TimelineItem } from "../timeline";
import { useQueueNow } from "../waiting-screen/use-now";
import { canFinishVisit, visitElapsedSeconds, followUpDate, formatVisitElapsed, type VisitPrescription, validatePrescription, withoutBlankPrescriptions } from "./visit-math";

const STRINGS = {
  en: {
    years: (n: number) => `${n} years`,
    allergies: "Allergies",
    conditions: "Conditions",
    none: "None recorded",
    history: "Earlier visits",
    noHistory: "No earlier visits.",
    visit: "This visit",
    timer: "Time in visit",
    notes: "Visit notes",
    notesHint: "Findings, diagnosis and advice.",
    prescriptions: "Prescriptions",
    addRx: "Add medicine",
    removeRx: (n: number) => `Remove medicine ${n}`,
    drug: "Medicine",
    dose: "Dose",
    frequency: "How often",
    days: "Days",
    frequencyHint: "Twice daily",
    required: "Required",
    invalid: "1 to 365",
    followUp: "Follow-up",
    noFollowUp: "None",
    inDays: (n: number) => (n % 30 === 0 ? `In ${n / 30} ${n === 30 ? "month" : "months"}` : n % 7 === 0 ? `In ${n / 7} ${n === 7 ? "week" : "weeks"}` : `In ${n} days`),
    orPick: "Or pick a date",
    followUpOn: (d: string) => `Follow-up on ${d}`,
    finish: "Finish visit",
    finishing: "Saving",
    needSomething: "Add a note or a prescription to finish.",
    fixRx: "Fix the highlighted medicines to finish.",
    failed: "The visit could not be saved. Try again.",
    saved: "Visit saved.",
    room: (r: string) => `Room ${r}`,
  },
  ar: {
    years: (n: number) => (n === 1 ? "سنة" : n === 2 ? "سنتان" : n <= 10 ? `${n} سنوات` : `${n} سنة`),
    allergies: "الحساسية",
    conditions: "الحالات",
    none: "لا شيء مسجل",
    history: "الزيارات السابقة",
    noHistory: "لا زيارات سابقة.",
    visit: "هذه الزيارة",
    timer: "مدة الزيارة",
    notes: "ملاحظات الزيارة",
    notesHint: "الفحص والتشخيص والنصائح.",
    prescriptions: "الوصفة الطبية",
    addRx: "إضافة دواء",
    removeRx: (n: number) => `حذف الدواء ${n}`,
    drug: "الدواء",
    dose: "الجرعة",
    frequency: "التكرار",
    days: "الأيام",
    frequencyHint: "مرتين يوميًا",
    required: "مطلوب",
    invalid: "من 1 إلى 365",
    followUp: "المتابعة",
    noFollowUp: "بدون",
    inDays: (n: number) => (n % 30 === 0 ? (n === 30 ? "بعد شهر" : "بعد شهرين") : n % 7 === 0 ? (n === 7 ? "بعد أسبوع" : "بعد أسبوعين") : `بعد ${n} أيام`),
    orPick: "أو اختر تاريخًا",
    followUpOn: (d: string) => `المتابعة في ${d}`,
    finish: "إنهاء الزيارة",
    finishing: "جارٍ الحفظ",
    needSomething: "أضف ملاحظة أو دواءً لإنهاء الزيارة.",
    fixRx: "صحّح الأدوية المظللة لإنهاء الزيارة.",
    failed: "تعذّر حفظ الزيارة. حاول مجددًا.",
    saved: "تم حفظ الزيارة.",
    room: (r: string) => `الغرفة ${r}`,
  },
};

export type CurrentVisitLabels = (typeof STRINGS)["en"];

export interface VisitPatient {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  avatar?: string;
  allergies?: string[];
  conditions?: string[];
}

export interface VisitHistoryItem {
  id: string;
  date: Date;
  title: string;
  summary?: string;
}

export interface VisitResult {
  notes: string;
  prescriptions: VisitPrescription[];
  /** The follow-up date the doctor chose, or null. The host books it. */
  followUp: Date | null;
}

export interface CurrentVisitProps extends Omit<ComponentProps<"div">, "children" | "onSubmit"> {
  patient: VisitPatient;
  /** What the visit is for, when it started (epoch ms) and where. */
  service: string;
  startedAt: number;
  room?: string;
  history?: readonly VisitHistoryItem[];
  defaultNotes?: string;
  defaultPrescriptions?: readonly VisitPrescription[];
  /** Quick follow-up choices in days. Default 7, 14 and 30. */
  followUpOptions?: readonly number[];
  /** Working weekdays (0 = Sunday) so a follow-up never lands on a day off. */
  workingWeekdays?: readonly number[];
  /** Save the visit. Return `{ error }` (or throw) to keep the panel open with a message. */
  onFinish: (result: VisitResult) => Promise<void | { error?: string }>;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  labels?: Partial<CurrentVisitLabels>;
}

let counter = 0;
const blankRx = (): VisitPrescription => ({ id: `rx-new-${++counter}`, drug: "", dose: "", frequency: "", days: 5 });

/**
 * The visit in progress: the patient card with allergies up front, earlier visits, a running timer, notes, a prescription list
 * and a follow-up choice. Finishing is blocked until there is a note or a valid prescription, and a half-filled medicine is never dropped silently.
 */
export function CurrentVisit({ patient, service, startedAt, room, history = [], defaultNotes = "", defaultPrescriptions = [], followUpOptions = [7, 14, 30], workingWeekdays, onFinish, now: nowProp, labels, className, ...rest }: CurrentVisitProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as CurrentVisitLabels;
  const now = useQueueNow(1000, nowProp);
  const id = useId();
  const [notes, setNotes] = useState(defaultNotes);
  const [rx, setRx] = useState<VisitPrescription[]>(() => [...defaultPrescriptions]);
  const [followUp, setFollowUp] = useState<Date | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verdict = canFinishVisit({ notes, prescriptions: rx });
  const patch = (rid: string, p: Partial<VisitPrescription>) => setRx((l) => l.map((r) => (r.id === rid ? { ...r, ...p } : r)));
  const isBlank = (r: VisitPrescription) => !r.drug.trim() && !r.dose.trim() && !r.frequency.trim();

  const finish = async () => {
    setAttempted(true);
    setError(null);
    if (!verdict.ok) return;
    setBusy(true);
    try {
      const r = await onFinish({ notes: notes.trim(), prescriptions: withoutBlankPrescriptions(rx), followUp });
      if (r && r.error) setError(r.error);
      else setDone(true);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const today = new Date(now);
  const chosenDays = followUp ? followUpOptions.find((n) => followUpDate(today, n, workingWeekdays).getTime() === followUp.getTime()) : undefined;
  const errText = (e?: "required" | "invalid") => (e === "invalid" ? t.invalid : e === "required" ? t.required : undefined);
  const locked = busy || done;

  return (
    <div data-slot="current-visit" className={cn("grid gap-4 lg:grid-cols-[18rem_1fr] lg:items-start", className)} {...rest}>
      <div className="flex flex-col gap-4">
        <Card data-slot="current-visit-patient">
          <CardHeader className="flex-row items-center gap-3">
            <Avatar name={patient.name} src={patient.avatar} size="lg" />
            <div className="min-w-0">
              <CardTitle as="h2" className="truncate">
                {patient.name}
              </CardTitle>
              <CardDescription>
                {patient.age !== undefined ? t.years(patient.age) : null}
                {patient.age !== undefined && patient.gender ? " · " : null}
                {patient.gender}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {patient.phone ? (
              <bdi dir="ltr" className="text-body-sm tabular-nums text-muted-foreground">
                {patient.phone}
              </bdi>
            ) : null}
            <div>
              <p className="text-caption text-muted-foreground">{t.allergies}</p>
              {patient.allergies && patient.allergies.length > 0 ? (
                <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                  {patient.allergies.map((a) => (
                    <li key={a}>
                      <Badge variant="danger">
                        <AlertTriangle aria-hidden className="size-3" />
                        {a}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm">{t.none}</p>
              )}
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t.conditions}</p>
              {patient.conditions && patient.conditions.length > 0 ? (
                <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                  {patient.conditions.map((c) => (
                    <li key={c}>
                      <Badge variant="outline">{c}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm">{t.none}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-slot="current-visit-history">
          <CardHeader>
            <CardTitle as="h3">{t.history}</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t.noHistory}</p>
            ) : (
              <Timeline>
                {[...history]
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((h) => (
                    <TimelineItem key={h.id} title={h.title} description={h.summary} time={h.date} />
                  ))}
              </Timeline>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-slot="current-visit-panel">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle as="h2">{t.visit}</CardTitle>
            <CardDescription>
              {service}
              {room ? ` · ${t.room(room)}` : ""}
            </CardDescription>
          </div>
          <div className="text-end">
            <p className="text-caption text-muted-foreground">{t.timer}</p>
            <p className="inline-flex items-center gap-1.5 text-h3 tabular-nums" role="timer" aria-label={t.timer}>
              <Timer aria-hidden className="size-4 text-muted-foreground" />
              <bdi dir="ltr">{formatVisitElapsed(visitElapsedSeconds(startedAt, now))}</bdi>
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field>
            <FieldLabel>{t.notes}</FieldLabel>
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesHint} disabled={locked} />
          </Field>

          <section aria-labelledby={`${id}-rx`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 id={`${id}-rx`} className="text-label">
                {t.prescriptions}
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setRx((l) => [...l, blankRx()])} disabled={locked}>
                <Plus aria-hidden />
                {t.addRx}
              </Button>
            </div>
            {rx.map((r, i) => {
              const errors = attempted && !isBlank(r) ? validatePrescription(r) : {};
              return (
                <div key={r.id} data-slot="current-visit-rx" className="grid grid-cols-2 gap-2 rounded-card border border-border p-3 sm:grid-cols-[2fr_1fr_1.5fr_5rem_auto] sm:items-start">
                  <Field className="col-span-2 sm:col-span-1" invalid={!!errors.drug}>
                    <FieldLabel>{t.drug}</FieldLabel>
                    <Input value={r.drug} onChange={(e) => patch(r.id, { drug: e.target.value })} disabled={locked} />
                    <FieldError match={!!errors.drug}>{errText(errors.drug)}</FieldError>
                  </Field>
                  <Field invalid={!!errors.dose}>
                    <FieldLabel>{t.dose}</FieldLabel>
                    <Input ltr value={r.dose} onChange={(e) => patch(r.id, { dose: e.target.value })} disabled={locked} />
                    <FieldError match={!!errors.dose}>{errText(errors.dose)}</FieldError>
                  </Field>
                  <Field invalid={!!errors.frequency}>
                    <FieldLabel>{t.frequency}</FieldLabel>
                    <Input value={r.frequency} placeholder={t.frequencyHint} onChange={(e) => patch(r.id, { frequency: e.target.value })} disabled={locked} />
                    <FieldError match={!!errors.frequency}>{errText(errors.frequency)}</FieldError>
                  </Field>
                  <Field invalid={!!errors.days}>
                    <FieldLabel>{t.days}</FieldLabel>
                    <Input ltr inputMode="numeric" value={Number.isFinite(r.days) ? String(r.days) : ""} onChange={(e) => patch(r.id, { days: e.target.value.trim() === "" ? Number.NaN : Number(e.target.value.replace(/[^\d.]/g, "")) })} disabled={locked} />
                    <FieldError match={!!errors.days}>{errText(errors.days)}</FieldError>
                  </Field>
                  <Button size="icon" variant="ghost" className="self-end" aria-label={t.removeRx(i + 1)} onClick={() => setRx((l) => l.filter((x) => x.id !== r.id))} disabled={locked}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              );
            })}
          </section>

          <section aria-label={t.followUp} className="flex flex-col gap-2">
            <h3 className="text-label">{t.followUp}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={followUp === null ? "primary" : "secondary"} aria-pressed={followUp === null} onClick={() => setFollowUp(null)} disabled={locked}>
                {t.noFollowUp}
              </Button>
              {followUpOptions.map((n) => (
                <Button key={n} size="sm" variant={chosenDays === n ? "primary" : "secondary"} aria-pressed={chosenDays === n} onClick={() => setFollowUp(followUpDate(today, n, workingWeekdays))} disabled={locked}>
                  {t.inDays(n)}
                </Button>
              ))}
              <DatePicker value={followUp} onValueChange={setFollowUp} min={today} placeholder={t.orPick} aria-label={t.orPick} disabled={locked} className="w-auto min-w-40" />
            </div>
            {followUp ? (
              <p className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
                <CalendarPlus aria-hidden className="size-4" />
                {t.followUpOn(formatDate(followUp, locale, { weekday: "long", day: "numeric", month: "long" }))}
              </p>
            ) : null}
          </section>

          {attempted && !verdict.ok ? <Alert tone="warning">{verdict.reason === "invalid-prescription" ? t.fixRx : t.needSomething}</Alert> : null}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {done ? <Alert tone="success">{t.saved}</Alert> : null}

          <div className="flex justify-end">
            <Button size="lg" onClick={finish} disabled={locked}>
              <CheckCheck aria-hidden />
              {busy ? t.finishing : t.finish}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
