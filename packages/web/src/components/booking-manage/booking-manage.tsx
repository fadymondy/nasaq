"use client";

import { CalendarPlus, CalendarClock, Download, MapPin, User, Stethoscope, Phone, Wallet } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { type BookingSlot, type BookingPolicy, bookingTicketValue, buildIcs, evaluatePolicy, googleCalendarUrl } from "../booking-flow/booking-math";
import type { BookingRecord } from "../booking-flow/booking-types";
import { BookingSlots } from "../booking-slots";
import { BookingStatusBadge } from "../booking-pipeline";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { formatDate, useFormatNumber } from "../numeric";
import { QrCode } from "../qr-code";

const STRINGS = {
  en: {
    ticket: "Booking ticket",
    scan: "Show this code at reception.",
    code: "Booking code",
    when: "When",
    who: "Patient",
    provider: "With",
    where: "Where",
    phone: "Phone",
    payment: "Payment",
    payOnline: "Paid online",
    payOnlinePending: "To pay online",
    payVisit: "Pay at the visit",
    addToCalendar: "Add to calendar",
    downloadIcs: "Download .ics",
    google: "Google Calendar",
    qrLabel: (code: string) => `QR code for booking ${code}`,
    reschedule: "Reschedule",
    cancel: "Cancel booking",
    rescheduleTitle: "Choose a new time",
    rescheduleText: "Your booking moves to the time you pick. The old time is released.",
    confirmMove: "Move my booking",
    close: "Keep current time",
    cancelTitle: "Cancel this booking?",
    freeCancel: (hours: number) => `You can cancel for free up to ${hours} hours before the visit.`,
    lateFee: (pct: number) => `Cancelling now is late: ${pct}% of the price is charged.`,
    lateNoFee: "Cancelling now is late, but it is not charged.",
    tooLate: "This booking can no longer be changed online. Call the clinic.",
    noReschedule: (hours: number) => `Rescheduling closes ${hours} hours before the visit.`,
    cancelConfirm: "Yes, cancel it",
    cancelledNote: "This booking was cancelled.",
    failed: "That did not work. Try again.",
    loading: "Loading times",
  },
  ar: {
    ticket: "تذكرة الحجز",
    scan: "أظهر هذا الرمز عند الاستقبال.",
    code: "رمز الحجز",
    when: "الموعد",
    who: "المريض",
    provider: "مع",
    where: "المكان",
    phone: "الهاتف",
    payment: "الدفع",
    payOnline: "تم الدفع إلكترونيًا",
    payOnlinePending: "الدفع إلكترونيًا",
    payVisit: "الدفع عند الزيارة",
    addToCalendar: "أضف إلى التقويم",
    downloadIcs: "تنزيل ملف ‎.ics",
    google: "تقويم Google",
    qrLabel: (code: string) => `رمز QR للحجز ${code}`,
    reschedule: "تغيير الموعد",
    cancel: "إلغاء الحجز",
    rescheduleTitle: "اختر موعدًا جديدًا",
    rescheduleText: "سينتقل حجزك إلى الموعد الذي تختاره، ويُحرَّر الموعد القديم.",
    confirmMove: "انقل حجزي",
    close: "إبقاء الموعد الحالي",
    cancelTitle: "إلغاء هذا الحجز؟",
    freeCancel: (hours: number) => `يمكنك الإلغاء مجانًا حتى ${hours} ساعة قبل الزيارة.`,
    lateFee: (pct: number) => `الإلغاء الآن متأخر: تُحتسب ${pct}% من السعر.`,
    lateNoFee: "الإلغاء الآن متأخر، لكن لا رسوم عليه.",
    tooLate: "لم يعد ممكنًا تعديل هذا الحجز عبر الإنترنت. تواصل مع العيادة.",
    noReschedule: (hours: number) => `يُغلق تغيير الموعد قبل الزيارة بـ ${hours} ساعة.`,
    cancelConfirm: "نعم، ألغِ الحجز",
    cancelledNote: "تم إلغاء هذا الحجز.",
    failed: "لم تنجح العملية. حاول مجددًا.",
    loading: "جارٍ تحميل المواعيد",
  },
};

export type BookingManageLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<BookingManageLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } as BookingManageLabels, locale };
}

function saveText(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-caption text-muted-foreground">{label}</dt>
        <dd className="m-0 text-body-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}

export interface BookingTicketProps extends Omit<ComponentProps<"div">, "children"> {
  booking: BookingRecord;
  /** Extra content under the details, such as the manage buttons. */
  children?: ReactNode;
  /** Hide the add-to-calendar buttons. */
  hideCalendar?: boolean;
  labels?: Partial<BookingManageLabels>;
}

/**
 * The confirmed booking as a ticket: what, when, who and where, a QR code that the kiosk and reception can scan
 * (it holds `booking:<code>`), the code in text for people without a camera, and add-to-calendar
 * (an .ics file, or Google Calendar in a new tab).
 */
export function BookingTicket({ booking, children, hideCalendar = false, labels, className, ...rest }: BookingTicketProps) {
  const { t, locale } = useLabels(labels);
  const fmt = useFormatNumber();
  const day = formatDate(booking.start, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = `${formatDate(booking.start, locale, { hour: "numeric", minute: "2-digit" })} – ${formatDate(booking.end, locale, { hour: "numeric", minute: "2-digit" })}`;
  const event = useMemo(
    () => ({ uid: `${booking.id}@nasaq`, title: `${booking.service} – ${booking.provider}`, start: booking.start, end: booking.end, location: [booking.location, booking.address].filter(Boolean).join(", ") || undefined, description: booking.code }),
    [booking],
  );
  const price = booking.price > 0 ? fmt(booking.price, { style: "currency", currency: booking.currency ?? "EGP", maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(booking.price) ? 0 : 2 }) : null;
  const payLabel = booking.payment === "visit" ? t.payVisit : booking.paid ? t.payOnline : t.payOnlinePending;

  return (
    <Card data-slot="booking-ticket" data-status={booking.status} className={cn("w-full", className)} {...rest}>
      <CardHeader>
        <CardTitle as="h3">{booking.service}</CardTitle>
        <CardDescription>
          <BookingStatusBadge status={booking.status} />
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <dl className="m-0 grid gap-3">
          <Row icon={<CalendarClock />} label={t.when}>
            <bdi>{day}</bdi>
            <br />
            <bdi className="tabular-nums">{time}</bdi>
          </Row>
          <Row icon={<Stethoscope />} label={t.provider}>
            {booking.provider}
          </Row>
          {booking.location ? (
            <Row icon={<MapPin />} label={t.where}>
              {booking.location}
              {booking.address ? <span className="block text-muted-foreground">{booking.address}</span> : null}
            </Row>
          ) : null}
          <Row icon={<User />} label={t.who}>
            {booking.patient}
          </Row>
          {booking.phone ? (
            <Row icon={<Phone />} label={t.phone}>
              <bdi dir="ltr">{booking.phone}</bdi>
            </Row>
          ) : null}
          <Row icon={<Wallet />} label={t.payment}>
            {payLabel}
            {price ? (
              <>
                {" · "}
                <bdi>{price}</bdi>
              </>
            ) : null}
          </Row>
        </dl>
        <div className="flex flex-col items-center gap-2 rounded-card border border-nq-line p-3">
          <QrCode value={bookingTicketValue(booking.code)} size={132} label={t.qrLabel(booking.code)} />
          <div className="flex flex-col items-center">
            <span className="text-caption text-muted-foreground">{t.code}</span>
            <bdi dir="ltr" className="font-mono text-label tracking-wider">
              {booking.code}
            </bdi>
          </div>
          <p className="max-w-40 text-center text-caption text-muted-foreground">{t.scan}</p>
        </div>
      </CardContent>
      {hideCalendar && !children ? null : (
        <CardFooter className="flex-wrap">
          {hideCalendar ? null : (
            <>
              <Button variant="secondary" size="sm" onClick={() => saveText(`${booking.code}.ics`, "text/calendar", buildIcs(event))}>
                <Download aria-hidden />
                {t.downloadIcs}
              </Button>
              <Button variant="secondary" size="sm" nativeButton={false} render={<a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" />}>
                <CalendarPlus aria-hidden />
                {t.google}
              </Button>
            </>
          )}
          {children}
        </CardFooter>
      )}
    </Card>
  );
}

export interface BookingManageProps extends Omit<ComponentProps<"div">, "children"> {
  booking: BookingRecord;
  /** Cancel and reschedule limits. */
  policy: BookingPolicy;
  /** The times the patient can move to. Called when the reschedule dialog opens. */
  getSlots: (booking: BookingRecord) => Promise<readonly BookingSlot[]>;
  /** Move the booking. Return `{ error }` to show a message and keep the dialog open. */
  onReschedule: (start: Date) => Promise<void | { error?: string }>;
  /** Cancel the booking. Return `{ error }` to show a message. */
  onCancel: () => Promise<void | { error?: string }>;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  labels?: Partial<BookingManageLabels>;
}

/**
 * A patient's own booking page: the ticket plus reschedule and cancel. The buttons follow the policy: reschedule
 * closes some hours before the visit, cancelling late may cost a fee and the dialog says how much before the patient confirms.
 */
export function BookingManage({ booking, policy, getSlots, onReschedule, onCancel, now: nowProp, labels, className, ...rest }: BookingManageProps) {
  const { t } = useLabels(labels);
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);
  const rule = evaluatePolicy(booking.start, now, policy, booking.status);
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<readonly BookingSlot[] | null>(null);
  const [pick, setPick] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDialog = async () => {
    setOpen(true);
    setPick(null);
    setError(null);
    if (!slots) setSlots(await getSlots(booking));
  };
  const move = async () => {
    if (!pick) return;
    setSaving(true);
    setError(null);
    try {
      const r = await onReschedule(pick);
      if (r && r.error) setError(r.error);
      else setOpen(false);
    } catch {
      setError(t.failed);
    } finally {
      setSaving(false);
    }
  };
  const cancel = async () => {
    const r = await onCancel();
    if (r && r.error) {
      setError(r.error);
      throw new Error(r.error);
    }
  };

  const policyText = rule.canCancel ? (rule.freeCancel ? t.freeCancel(policy.cancelHours) : rule.feePercent > 0 ? t.lateFee(rule.feePercent) : t.lateNoFee) : booking.status === "cancelled" ? t.cancelledNote : t.tooLate;

  return (
    <div data-slot="booking-manage" className={cn("flex flex-col gap-4", className)} {...rest}>
      {booking.status === "cancelled" ? <Alert tone="danger">{t.cancelledNote}</Alert> : null}
      <BookingTicket booking={booking} labels={labels} hideCalendar={booking.status === "cancelled"}>
        {rule.canReschedule ? (
          <Button variant="secondary" size="sm" onClick={openDialog}>
            <CalendarClock aria-hidden />
            {t.reschedule}
          </Button>
        ) : null}
        {rule.canCancel ? (
          <ConfirmButton size="sm" variant="danger" title={t.cancelTitle} description={policyText} confirmLabel={t.cancelConfirm} onConfirm={cancel}>
            {t.cancel}
          </ConfirmButton>
        ) : null}
      </BookingTicket>
      <p className="text-caption text-muted-foreground" data-slot="booking-policy">
        {policyText}
        {rule.canCancel && !rule.canReschedule ? ` ${t.noReschedule(policy.rescheduleHours ?? policy.cancelHours)}` : ""}
      </p>
      {error && !open ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.rescheduleTitle}</DialogTitle>
            <DialogDescription>{t.rescheduleText}</DialogDescription>
          </DialogHeader>
          <BookingSlots slots={slots ?? []} loading={slots === null} now={now} value={pick} onValueChange={setPick} defaultDay={booking.start} />
          {error ? (
            <p role="alert" className="text-caption text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {t.close}
            </Button>
            <Button onClick={move} disabled={!pick || saving}>
              {t.confirmMove}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
