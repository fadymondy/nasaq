"use client";

import { ArrowLeft, ArrowRight, CalendarClock, Check, CheckCircle2, CreditCard, Landmark, Loader2, MapPin, Pencil, Stethoscope, UserRound } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Avatar } from "../avatar";
import { bookingCode, type BookingSlot, bookingTotals, validateDetails, type BookingDetailsErrors } from "./booking-math";
import type { BookingLocation, BookingPayment, BookingProvider, BookingRecord, BookingService } from "./booking-types";
import { BookingSlots } from "../booking-slots";
import { BookingTicket } from "../booking-manage";
import { Button } from "../button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../card";
import { Field, FieldError, FieldLabel, Input, Textarea } from "../field";
import { FileUpload, type UploadFile } from "../file-upload";
import { formatDate, useFormatNumber } from "../numeric";
import { Progress } from "../progress";
import { RadioCard, RadioGroup } from "../radio-group";
import { Rating } from "../rating";
import { Stepper, StepperItem } from "../stepper";
import { Switch } from "../switch";

export type BookingStepId = "location" | "service" | "provider" | "time" | "details" | "notes" | "payment" | "review";

const STRINGS = {
  en: {
    steps: { location: "Branch", service: "Service", provider: "Doctor", time: "Time", details: "Details", notes: "Notes", payment: "Payment", review: "Review" } as Record<BookingStepId, string>,
    heading: {
      location: "Where would you like to be seen?",
      service: "What do you need?",
      provider: "Who would you like to see?",
      time: "Pick a day and time",
      details: "Who is this booking for?",
      notes: "Anything the clinic should know?",
      payment: "How would you like to pay?",
      review: "Check and confirm",
    } as Record<BookingStepId, string>,
    stepOf: (n: number, total: number, name: string) => `Step ${n} of ${total}: ${name}`,
    progress: "Booking steps",
    back: "Back",
    next: "Continue",
    confirm: "Confirm booking",
    confirming: "Confirming",
    minutes: (n: number) => `${n} min`,
    anyProvider: "First available doctor",
    anyProviderText: "We match you with whoever has the earliest time.",
    noRating: "New",
    reviews: "reviews",
    noProviders: "No doctor offers this service here. Go back and change the service or branch.",
    slotsFailed: "We could not load the times.",
    retry: "Try again",
    name: "Full name",
    phone: "Mobile number",
    phoneHint: "We send the confirmation and reminders here.",
    email: "Email (optional)",
    forOther: "I am booking for someone else",
    otherName: "Patient's full name",
    bookingAs: (n: string) => `Booking as ${n}`,
    guestNote: "No account needed. You get a code and a QR ticket.",
    required: "This field is required.",
    invalid: "This does not look right.",
    notesLabel: "Notes for the clinic (optional)",
    notesHint: "Symptoms, questions, or anything that helps prepare.",
    attachments: "Attachments (optional)",
    attachmentsHint: "Earlier results or referrals. Images or PDF, up to 5 MB each.",
    payOnline: "Pay online now",
    payOnlineText: "Secure card payment. Nothing more to pay at the clinic.",
    payVisit: "Pay at the visit",
    payVisitText: "Cash or card at reception. Your time is held.",
    subtotal: "Service",
    tax: "Tax",
    total: "Total",
    summary: "Your booking",
    empty: "Nothing chosen yet.",
    edit: "Edit",
    location: "Branch",
    provider: "Doctor",
    when: "When",
    patient: "Patient",
    payment: "Payment",
    attachedCount: (n: number) => `${n} ${n === 1 ? "file" : "files"} attached`,
    submitFailed: "We could not confirm the booking. Try again.",
    confirmedTitle: "Your booking is confirmed",
    confirmedText: "Keep this ticket. Scan the code at the kiosk, or give reception the code.",
    another: "Book another visit",
    cancelPolicy: "Free cancellation up to 24 hours before.",
    payLater: "Pay at the visit",
    payNow: "Pay online",
  },
  ar: {
    steps: { location: "الفرع", service: "الخدمة", provider: "الطبيب", time: "الموعد", details: "البيانات", notes: "ملاحظات", payment: "الدفع", review: "المراجعة" } as Record<BookingStepId, string>,
    heading: {
      location: "أين تودّ أن تُعالَج؟",
      service: "ما الذي تحتاجه؟",
      provider: "مع من تريد الحجز؟",
      time: "اختر اليوم والوقت",
      details: "لمن هذا الحجز؟",
      notes: "هل من شيء تودّ أن تعرفه العيادة؟",
      payment: "كيف تودّ الدفع؟",
      review: "راجع وأكّد",
    } as Record<BookingStepId, string>,
    stepOf: (n: number, total: number, name: string) => `الخطوة ${n} من ${total}: ${name}`,
    progress: "خطوات الحجز",
    back: "رجوع",
    next: "متابعة",
    confirm: "تأكيد الحجز",
    confirming: "جارٍ التأكيد",
    minutes: (n: number) => `${n} دقيقة`,
    anyProvider: "أول طبيب متاح",
    anyProviderText: "نحجز لك مع من لديه أقرب موعد.",
    noRating: "جديد",
    reviews: "تقييم",
    noProviders: "لا يقدّم أي طبيب هذه الخدمة هنا. ارجع وغيّر الخدمة أو الفرع.",
    slotsFailed: "تعذّر تحميل المواعيد.",
    retry: "حاول مجددًا",
    name: "الاسم الكامل",
    phone: "رقم الجوال",
    phoneHint: "نرسل التأكيد والتذكيرات على هذا الرقم.",
    email: "البريد الإلكتروني (اختياري)",
    forOther: "أحجز لشخص آخر",
    otherName: "الاسم الكامل للمريض",
    bookingAs: (n: string) => `الحجز باسم ${n}`,
    guestNote: "لا حاجة لحساب. ستحصل على رمز وتذكرة QR.",
    required: "هذا الحقل مطلوب.",
    invalid: "القيمة غير صحيحة.",
    notesLabel: "ملاحظات للعيادة (اختياري)",
    notesHint: "الأعراض أو الأسئلة أو أي شيء يساعد على التحضير.",
    attachments: "مرفقات (اختياري)",
    attachmentsHint: "نتائج سابقة أو تحويلات. صور أو PDF، حتى 5 ميجابايت لكل ملف.",
    payOnline: "الدفع إلكترونيًا الآن",
    payOnlineText: "دفع آمن بالبطاقة. لا شيء آخر عند العيادة.",
    payVisit: "الدفع عند الزيارة",
    payVisitText: "نقدًا أو بالبطاقة عند الاستقبال. موعدك محجوز.",
    subtotal: "الخدمة",
    tax: "الضريبة",
    total: "الإجمالي",
    summary: "حجزك",
    empty: "لم تختر شيئًا بعد.",
    edit: "تعديل",
    location: "الفرع",
    provider: "الطبيب",
    when: "الموعد",
    patient: "المريض",
    payment: "الدفع",
    attachedCount: (n: number) => (n === 1 ? "ملف واحد مرفق" : n === 2 ? "ملفان مرفقان" : `${n} ملفات مرفقة`),
    submitFailed: "تعذّر تأكيد الحجز. حاول مجددًا.",
    confirmedTitle: "تم تأكيد حجزك",
    confirmedText: "احتفظ بهذه التذكرة. امسح الرمز في الكشك أو أعطِ الاستقبال الرمز.",
    another: "احجز زيارة أخرى",
    cancelPolicy: "إلغاء مجاني حتى 24 ساعة قبل الموعد.",
    payLater: "الدفع عند الزيارة",
    payNow: "الدفع إلكترونيًا",
  },
};

export type BookingFlowLabels = (typeof STRINGS)["en"];

export interface BookingDetailsValue {
  name: string;
  phone: string;
  email: string;
  forOther: boolean;
  otherName: string;
}

/** What the patient chose, sent to `onSubmit`. `providerId` is "any" when they took the first available doctor. */
export interface BookingSubmission {
  locationId: string | null;
  serviceId: string;
  providerId: string | "any";
  start: Date;
  details: BookingDetailsValue;
  notes: string;
  files: File[];
  payment: BookingPayment;
  total: number;
}

export interface BookingSlotQuery {
  locationId: string | null;
  serviceId: string;
  providerId: string | "any";
}

export interface BookingFlowProps extends Omit<ComponentProps<"div">, "onSubmit" | "children"> {
  locations?: readonly BookingLocation[];
  services: readonly BookingService[];
  providers: readonly BookingProvider[];
  /** Times for the chosen branch, service and doctor. Called when the time step opens and when the choice changes. */
  getSlots: (query: BookingSlotQuery) => Promise<readonly BookingSlot[]>;
  /**
   * Create the booking. Resolve with the created record's code, or `{ error }` to stay on the review step.
   * Throwing shows the generic error.
   */
  onSubmit: (submission: BookingSubmission) => Promise<void | { code?: string; error?: string }>;
  /** A signed-in patient: their details are filled and the details step shows a short "booking as" line. */
  signedIn?: { name: string; phone: string; email?: string };
  /** Offer online payment. Default true. */
  allowOnlinePayment?: boolean;
  /** ISO currency code. Default "EGP". */
  currency?: string;
  /** Tax as a fraction, 0.14 for 14%. Default 0. */
  taxRate?: number;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  /** Called after each step change, for analytics or routing. */
  onStepChange?: (step: BookingStepId) => void;
  /** Called when the patient presses "Book another visit" on the confirmation. */
  onReset?: () => void;
  labels?: Partial<BookingFlowLabels>;
}

const emptyDetails = (signedIn?: BookingFlowProps["signedIn"]): BookingDetailsValue => ({ name: signedIn?.name ?? "", phone: signedIn?.phone ?? "", email: signedIn?.email ?? "", forOther: false, otherName: "" });

/**
 * The online booking flow: branch, service, doctor (with ratings), day and time, details (guest or signed in),
 * notes and attachments, payment or pay at the visit, then a review and the confirmation ticket.
 * A branch step is skipped when there is only one. It holds all the choices in state and calls `onSubmit` once, at the end;
 * it never fetches by itself. Finished steps are clickable to go back.
 */
export function BookingFlow({
  locations = [],
  services,
  providers,
  getSlots,
  onSubmit,
  signedIn,
  allowOnlinePayment = true,
  currency = "EGP",
  taxRate = 0,
  now: nowProp,
  onStepChange,
  onReset,
  labels,
  className,
  ...rest
}: BookingFlowProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as BookingFlowLabels;
  const fmt = useFormatNumber();
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);
  const money = useCallback((n: number) => fmt(n, { style: "currency", currency, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }), [fmt, currency]);

  const stepIds = useMemo<BookingStepId[]>(() => {
    const all: BookingStepId[] = ["location", "service", "provider", "time", "details", "notes", "payment", "review"];
    return all.filter((s) => (s === "location" ? locations.length > 1 : true));
  }, [locations.length]);

  const [index, setIndex] = useState(0);
  const [locationId, setLocationId] = useState<string | null>(locations.length === 1 ? locations[0]!.id : null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [start, setStart] = useState<Date | null>(null);
  const [details, setDetails] = useState<BookingDetailsValue>(() => emptyDetails(signedIn));
  const [touched, setTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [payment, setPayment] = useState<BookingPayment>("visit");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [record, setRecord] = useState<BookingRecord | null>(null);

  const step = stepIds[Math.min(index, stepIds.length - 1)]!;
  const service = services.find((s) => s.id === serviceId) ?? null;
  const location = locations.find((l) => l.id === locationId) ?? null;
  const eligible = useMemo(
    () => providers.filter((p) => (!serviceId || !p.serviceIds || p.serviceIds.includes(serviceId)) && (!locationId || !p.locationIds || p.locationIds.includes(locationId))),
    [providers, serviceId, locationId],
  );
  const provider = providerId && providerId !== "any" ? (providers.find((p) => p.id === providerId) ?? null) : null;
  const totals = bookingTotals(service ? [{ id: service.id, price: service.price }] : [], { taxRate });

  // Slots for the time step.
  const [slotState, setSlotState] = useState<{ status: "idle" | "loading" | "ready" | "error"; slots: readonly BookingSlot[] }>({ status: "idle", slots: [] });
  const slotRun = useRef(0);
  const getSlotsRef = useRef(getSlots);
  getSlotsRef.current = getSlots;
  const slotKey = `${locationId}|${serviceId}|${providerId}`;
  const loadSlots = useCallback(() => {
    if (!serviceId || !providerId) return;
    const run = ++slotRun.current;
    setSlotState((s) => ({ status: "loading", slots: s.slots }));
    getSlotsRef.current({ locationId, serviceId, providerId }).then(
      (slots) => run === slotRun.current && setSlotState({ status: "ready", slots }),
      () => run === slotRun.current && setSlotState({ status: "error", slots: [] }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotKey]);
  useEffect(() => {
    if (step === "time") loadSlots();
  }, [step, loadSlots]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
    onStepChange?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const detailErrors: BookingDetailsErrors = validateDetails(details);
  const valid: Record<BookingStepId, boolean> = {
    location: locationId !== null,
    service: serviceId !== null,
    provider: providerId !== null && (providerId === "any" || eligible.some((p) => p.id === providerId)),
    time: start !== null,
    details: Object.keys(detailErrors).length === 0,
    notes: !files.some((f) => f.status === "error" || f.status === "uploading"),
    payment: true,
    review: true,
  };

  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(stepIds.length - 1, to)));
    setSubmitError(null);
  };
  const next = () => {
    if (step === "details" && !valid.details) {
      setTouched(true);
      return;
    }
    if (valid[step]) go(index + 1);
  };

  const submit = async () => {
    if (!service || !providerId || !start) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit({ locationId, serviceId: service.id, providerId, start, details, notes, files: files.map((f) => f.file), payment, total: totals.total });
      if (result && result.error) {
        setSubmitError(result.error);
        return;
      }
      const code = (result && result.code) || bookingCode(`${service.id}-${start.getTime()}-${details.phone}`);
      setRecord({
        id: code,
        code,
        status: payment === "online" ? "confirmed" : "requested",
        start,
        end: new Date(start.getTime() + service.durationMinutes * 60000),
        service: service.name,
        provider: provider?.name ?? t.anyProvider,
        location: location?.name,
        address: location?.address,
        patient: details.forOther ? details.otherName : details.name,
        phone: details.phone,
        price: totals.total,
        currency,
        payment,
        paid: payment === "online",
      });
    } catch {
      setSubmitError(t.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setIndex(0);
    setLocationId(locations.length === 1 ? locations[0]!.id : null);
    setServiceId(null);
    setProviderId(null);
    setStart(null);
    setDetails(emptyDetails(signedIn));
    setTouched(false);
    setNotes("");
    setFiles([]);
    setPayment("visit");
    setRecord(null);
    onReset?.();
  };

  const dateLine = start ? `${formatDate(start, locale, { weekday: "short", day: "numeric", month: "short" })}, ${formatDate(start, locale, { hour: "numeric", minute: "2-digit" })}` : null;

  if (record) {
    return (
      <div data-slot="booking-flow" data-state="confirmed" className={cn("mx-auto flex w-full max-w-2xl flex-col gap-4", className)} {...rest}>
        <div className="flex items-start gap-3" role="status">
          <CheckCircle2 aria-hidden className="mt-1 size-6 shrink-0 text-nq-success-text" />
          <div>
            <h2 ref={(el) => el?.focus()} tabIndex={-1} className="text-h2 outline-none">
              {t.confirmedTitle}
            </h2>
            <p className="text-body-sm text-muted-foreground">{t.confirmedText}</p>
          </div>
        </div>
        <BookingTicket booking={record}>
          <Button variant="ghost" size="sm" onClick={reset}>
            {t.another}
          </Button>
        </BookingTicket>
      </div>
    );
  }

  const Forward = ar ? ArrowLeft : ArrowRight;
  const Backward = ar ? ArrowRight : ArrowLeft;

  const err = (code?: "required" | "invalid") => (code === "required" ? t.required : code === "invalid" ? t.invalid : undefined);

  const rows: { id: BookingStepId; icon: ReactNode; label: string; value: ReactNode }[] = [
    ...(locations.length > 1 ? [{ id: "location" as const, icon: <MapPin />, label: t.location, value: location?.name }] : []),
    { id: "service", icon: <Stethoscope />, label: t.steps.service, value: service ? service.name : null },
    { id: "provider", icon: <UserRound />, label: t.provider, value: providerId === "any" ? t.anyProvider : provider?.name },
    { id: "time", icon: <CalendarClock />, label: t.when, value: dateLine ? <bdi>{dateLine}</bdi> : null },
  ];

  return (
    <div data-slot="booking-flow" data-step={step} className={cn("flex w-full flex-col gap-5", className)} {...rest}>
      <div>
        <div className="hidden md:block">
          <Stepper current={index} aria-label={t.progress}>
            {stepIds.map((s, i) => (
              <StepperItem key={s} title={t.steps[s]} onClick={i < index ? () => go(i) : undefined} />
            ))}
          </Stepper>
        </div>
        <div className="flex flex-col gap-2 md:hidden">
          <p className="text-label">{t.stepOf(index + 1, stepIds.length, t.steps[step])}</p>
          <Progress value={((index + 1) / stepIds.length) * 100} aria-label={t.progress} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_17rem] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-h3">
              <span ref={headingRef} tabIndex={-1} className="outline-none">
                {t.heading[step]}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {step === "location" ? (
              <RadioGroup aria-label={t.heading.location} value={locationId} onValueChange={(v) => { setLocationId(v as string); setProviderId(null); setStart(null); }}>
                {locations.map((l) => (
                  <RadioCard key={l.id} value={l.id} title={l.name} description={[l.address, l.city].filter(Boolean).join(", ")} />
                ))}
              </RadioGroup>
            ) : null}

            {step === "service" ? (
              <RadioGroup aria-label={t.heading.service} value={serviceId} onValueChange={(v) => { setServiceId(v as string); setStart(null); if (providerId && providerId !== "any") { const p = providers.find((x) => x.id === providerId); if (p?.serviceIds && !p.serviceIds.includes(v as string)) setProviderId(null); } }}>
                {services.map((s) => (
                  <RadioCard
                    key={s.id}
                    value={s.id}
                    title={s.name}
                    description={[s.category, s.description].filter(Boolean).join(" · ") || undefined}
                    meta={
                      <span className="flex flex-col items-end text-caption">
                        <bdi className="text-label">{s.price > 0 ? money(s.price) : ""}</bdi>
                        <bdi className="text-muted-foreground">{t.minutes(s.durationMinutes)}</bdi>
                      </span>
                    }
                  />
                ))}
              </RadioGroup>
            ) : null}

            {step === "provider" ? (
              eligible.length === 0 ? (
                <Alert tone="warning">{t.noProviders}</Alert>
              ) : (
                <RadioGroup aria-label={t.heading.provider} value={providerId} onValueChange={(v) => { setProviderId(v as string); setStart(null); }}>
                  {eligible.length > 1 ? <RadioCard value="any" title={t.anyProvider} description={t.anyProviderText} /> : null}
                  {eligible.map((p) => (
                    <RadioCard
                      key={p.id}
                      value={p.id}
                      title={
                        <span className="flex items-center gap-2">
                          <Avatar name={p.name} src={p.avatar} size="sm" />
                          <span>{p.name}</span>
                        </span>
                      }
                      description={p.specialty}
                      meta={p.rating !== undefined ? <Rating value={p.rating} count={p.reviews} countLabel={t.reviews} /> : <span className="text-caption text-muted-foreground">{t.noRating}</span>}
                    />
                  ))}
                </RadioGroup>
              )
            ) : null}

            {step === "time" ? (
              slotState.status === "error" ? (
                <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={loadSlots}>{t.retry}</Button>}>
                  {t.slotsFailed}
                </Alert>
              ) : (
                <BookingSlots slots={slotState.slots} loading={slotState.status !== "ready"} now={now} value={start} onValueChange={setStart} />
              )
            ) : null}

            {step === "details" ? (
              <div className="flex flex-col gap-4">
                {signedIn ? (
                  <p className="text-body-sm text-muted-foreground">{t.bookingAs(signedIn.name)}</p>
                ) : (
                  <p className="text-body-sm text-muted-foreground">{t.guestNote}</p>
                )}
                <Field invalid={touched && !!detailErrors.name}>
                  <FieldLabel>{t.name}</FieldLabel>
                  <Input autoComplete="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                  {touched && detailErrors.name ? <FieldError match>{err(detailErrors.name)}</FieldError> : null}
                </Field>
                <Field invalid={touched && !!detailErrors.phone}>
                  <FieldLabel>{t.phone}</FieldLabel>
                  <Input ltr type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
                  <p className="text-caption text-muted-foreground">{t.phoneHint}</p>
                  {touched && detailErrors.phone ? <FieldError match>{err(detailErrors.phone)}</FieldError> : null}
                </Field>
                <Field invalid={touched && !!detailErrors.email}>
                  <FieldLabel>{t.email}</FieldLabel>
                  <Input ltr type="email" autoComplete="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
                  {touched && detailErrors.email ? <FieldError match>{err(detailErrors.email)}</FieldError> : null}
                </Field>
                <label className="flex items-center gap-2 text-body-sm">
                  <Switch checked={details.forOther} onCheckedChange={(v) => setDetails({ ...details, forOther: v })} />
                  {t.forOther}
                </label>
                {details.forOther ? (
                  <Field invalid={touched && !!detailErrors.otherName}>
                    <FieldLabel>{t.otherName}</FieldLabel>
                    <Input value={details.otherName} onChange={(e) => setDetails({ ...details, otherName: e.target.value })} />
                    {touched && detailErrors.otherName ? <FieldError match>{err(detailErrors.otherName)}</FieldError> : null}
                  </Field>
                ) : null}
              </div>
            ) : null}

            {step === "notes" ? (
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel>{t.notesLabel}</FieldLabel>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={600} />
                  <p className="text-caption text-muted-foreground">{t.notesHint}</p>
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-label">{t.attachments}</span>
                  <FileUpload
                    multiple
                    accept="image/*,.pdf"
                    maxSize={5 * 1024 * 1024}
                    maxFiles={4}
                    value={files}
                    onValueChange={setFiles}
                    onFiles={(added, controls) => added.forEach((f) => controls.update(f.id, { status: "done", progress: 100 }))}
                  />
                  <p className="text-caption text-muted-foreground">{t.attachmentsHint}</p>
                </div>
              </div>
            ) : null}

            {step === "payment" ? (
              <div className="flex flex-col gap-4">
                <RadioGroup aria-label={t.heading.payment} value={payment} onValueChange={(v) => setPayment(v as BookingPayment)}>
                  {allowOnlinePayment ? <RadioCard value="online" title={<span className="flex items-center gap-2"><CreditCard aria-hidden className="size-4" />{t.payOnline}</span>} description={t.payOnlineText} /> : null}
                  <RadioCard value="visit" title={<span className="flex items-center gap-2"><Landmark aria-hidden className="size-4" />{t.payVisit}</span>} description={t.payVisitText} />
                </RadioGroup>
                <Totals t={t} money={money} totals={totals} showTax={taxRate > 0} />
              </div>
            ) : null}

            {step === "review" ? (
              <div className="flex flex-col gap-4">
                <dl className="m-0 grid gap-3">
                  {rows.map((r) => (
                    <ReviewRow key={r.id} label={r.label} edit={t.edit} onEdit={() => go(stepIds.indexOf(r.id))}>
                      {r.value}
                    </ReviewRow>
                  ))}
                  <ReviewRow label={t.patient} edit={t.edit} onEdit={() => go(stepIds.indexOf("details"))}>
                    {details.forOther ? details.otherName : details.name}
                    <span className="block text-muted-foreground"><bdi dir="ltr">{details.phone}</bdi></span>
                  </ReviewRow>
                  {notes || files.length ? (
                    <ReviewRow label={t.steps.notes} edit={t.edit} onEdit={() => go(stepIds.indexOf("notes"))}>
                      {notes ? <span className="block whitespace-pre-line">{notes}</span> : null}
                      {files.length ? <span className="block text-muted-foreground">{t.attachedCount(files.length)}</span> : null}
                    </ReviewRow>
                  ) : null}
                  <ReviewRow label={t.payment} edit={t.edit} onEdit={() => go(stepIds.indexOf("payment"))}>
                    {payment === "online" ? t.payNow : t.payLater}
                  </ReviewRow>
                </dl>
                <Totals t={t} money={money} totals={totals} showTax={taxRate > 0} />
                <p className="text-caption text-muted-foreground">{t.cancelPolicy}</p>
                {submitError ? <Alert tone="danger">{submitError}</Alert> : null}
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === 0 || submitting}>
              <Backward aria-hidden />
              {t.back}
            </Button>
            {step === "review" ? (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
                {submitting ? t.confirming : t.confirm}
              </Button>
            ) : (
              <Button onClick={next} disabled={!valid[step] && step !== "details"}>
                {t.next}
                <Forward aria-hidden />
              </Button>
            )}
          </CardFooter>
        </Card>

        <aside aria-label={t.summary} className="order-last rounded-card border border-border bg-card p-4 lg:sticky lg:top-4">
          <h3 className="mb-3 text-label font-semibold">{t.summary}</h3>
          {service ? (
            <dl className="m-0 grid gap-3 text-body-sm">
              {rows.map((r) => (
                <div key={r.id} className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-0.5 text-muted-foreground [&_svg]:size-4">{r.icon}</span>
                  <div className="min-w-0">
                    <dt className="text-caption text-muted-foreground">{r.label}</dt>
                    <dd className="m-0">{r.value ?? <span className="text-muted-foreground">-</span>}</dd>
                  </div>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between border-t border-nq-line pt-3">
                <dt className="text-label">{t.total}</dt>
                <dd className="m-0 text-label"><bdi>{totals.total > 0 ? money(totals.total) : "-"}</bdi></dd>
              </div>
            </dl>
          ) : (
            <p className="text-body-sm text-muted-foreground">{t.empty}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ReviewRow({ label, edit, onEdit, children }: { label: string; edit: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-nq-line pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <dt className="text-caption text-muted-foreground">{label}</dt>
        <dd className="m-0 text-body-sm">{children}</dd>
      </div>
      <Button variant="link" size="sm" onClick={onEdit}>
        <Pencil aria-hidden />
        {edit}
      </Button>
    </div>
  );
}

function Totals({ t, money, totals, showTax }: { t: BookingFlowLabels; money: (n: number) => string; totals: ReturnType<typeof bookingTotals>; showTax: boolean }) {
  if (totals.total === 0 && totals.subtotal === 0) return null;
  return (
    <dl className="m-0 grid gap-1 rounded-control bg-secondary p-3 text-body-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t.subtotal}</dt>
        <dd className="m-0"><bdi>{money(totals.subtotal)}</bdi></dd>
      </div>
      {showTax ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.tax}</dt>
          <dd className="m-0"><bdi>{money(totals.tax)}</bdi></dd>
        </div>
      ) : null}
      <div className="flex justify-between text-label">
        <dt>{t.total}</dt>
        <dd className="m-0"><bdi>{money(totals.total)}</bdi></dd>
      </div>
    </dl>
  );
}

