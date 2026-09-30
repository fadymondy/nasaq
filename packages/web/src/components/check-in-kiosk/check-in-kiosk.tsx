"use client";

import { CheckCircle2, Delete, Hourglass, Phone, QrCode as QrIcon, Search, UserRoundPlus } from "lucide-react";
import { type ComponentProps, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Input } from "../field";
import { formatDate } from "../numeric";
import { QrCode } from "../qr-code";
import { findBookingForCheckIn, type KioskBooking, phoneDigits, type QueueEntry } from "../waiting-screen/queue-math";

const STRINGS = {
  en: {
    title: "Check in",
    subtitle: "Scan your booking code or type your phone number.",
    modeScan: "Scan code",
    modePhone: "Phone number",
    scanLabel: "Booking code",
    scanHint: "Hold your ticket's QR code to the scanner, or type the code, such as BK-7F3Q9K.",
    scanPlaceholder: "Scan or type the code",
    phoneLabel: "Mobile number",
    keypad: "Number pad",
    backspace: "Delete last digit",
    clear: "Clear",
    find: "Find my booking",
    finding: "Looking",
    checkingIn: "Checking you in",
    multiple: "We found more than one booking. Which one is yours?",
    none: "We could not find a booking for that.",
    noneWalkIn: "You can still join the line without a booking.",
    walkIn: "Join the line without a booking",
    tooEarly: (time: string, opens: string) => `Your visit is at ${time}. You can check in from ${opens}.`,
    back: "Try again",
    ticketTitle: "You are checked in",
    ticketNumber: "Your ticket",
    ahead: (n: number) => (n <= 0 ? "You are next." : `${n} ${n === 1 ? "person is" : "people are"} ahead of you.`),
    wait: (n: number) => (n <= 0 ? "You will be called any moment." : `Estimated wait: about ${n} min.`),
    watch: "Watch the screen for your number. We will call you.",
    done: "Done",
    autoReset: (s: number) => `This screen resets in ${s} s`,
    failed: "We could not check you in. Please ask reception.",
    bookingLine: (name: string, time: string) => `${name}, ${time}`,
    invalidPhone: "Enter at least 9 digits.",
    walkInName: "Your name (optional)",
    qrLabel: "QR code of your ticket",
  },
  ar: {
    title: "تسجيل الوصول",
    subtitle: "امسح رمز حجزك أو اكتب رقم هاتفك.",
    modeScan: "مسح الرمز",
    modePhone: "رقم الهاتف",
    scanLabel: "رمز الحجز",
    scanHint: "قرّب رمز QR من قارئ الباركود، أو اكتب الرمز مثل BK-7F3Q9K.",
    scanPlaceholder: "امسح الرمز أو اكتبه",
    phoneLabel: "رقم الجوال",
    keypad: "لوحة الأرقام",
    backspace: "حذف آخر رقم",
    clear: "مسح",
    find: "ابحث عن حجزي",
    finding: "جارٍ البحث",
    checkingIn: "جارٍ تسجيل وصولك",
    multiple: "وجدنا أكثر من حجز. أيها حجزك؟",
    none: "لم نجد حجزًا بهذه البيانات.",
    noneWalkIn: "يمكنك الانضمام إلى الصف بدون حجز.",
    walkIn: "الانضمام إلى الصف بدون حجز",
    tooEarly: (time: string, opens: string) => `موعدك الساعة ${time}. يمكنك تسجيل الوصول من الساعة ${opens}.`,
    back: "حاول مجددًا",
    ticketTitle: "تم تسجيل وصولك",
    ticketNumber: "تذكرتك",
    ahead: (n: number) => (n <= 0 ? "أنت التالي." : n === 1 ? "شخص واحد قبلك." : n === 2 ? "شخصان قبلك." : `${n} أشخاص قبلك.`),
    wait: (n: number) => (n <= 0 ? "سننادي عليك في أي لحظة." : `وقت الانتظار المتوقع: حوالي ${n} دقيقة.`),
    watch: "تابع الشاشة لرؤية رقمك. سننادي عليك.",
    done: "تم",
    autoReset: (s: number) => `تُعاد الشاشة خلال ${s} ثانية`,
    failed: "تعذّر تسجيل وصولك. اسأل الاستقبال.",
    bookingLine: (name: string, time: string) => `${name}، ${time}`,
    invalidPhone: "أدخل 9 أرقام على الأقل.",
    walkInName: "اسمك (اختياري)",
    qrLabel: "رمز QR لتذكرتك",
  },
};

export type CheckInKioskLabels = (typeof STRINGS)["en"];

export interface CheckInRequest {
  /** The matched booking, when there is one. */
  booking?: KioskBooking;
  /** The phone number typed, for a walk-in. */
  phone?: string;
}

export interface CheckInResult {
  entry: QueueEntry;
  /** Place in line (1 = next). */
  position?: number;
  /** Estimated minutes to be called. */
  waitMinutes?: number;
}

export interface CheckInKioskProps extends Omit<ComponentProps<"div">, "children"> {
  /** Today's bookings for this desk, for the lookup. */
  bookings: readonly KioskBooking[];
  /**
   * Put the person in the queue. Resolve with the ticket, or `{ error }` to show a message.
   * The kiosk never fetches by itself.
   */
  onCheckIn: (request: CheckInRequest) => Promise<CheckInResult | { error: string }>;
  /** Let people without a booking join the line. Default true. */
  allowWalkIn?: boolean;
  /** How early before the booking someone may check in, in minutes. Default 60. */
  earlyMinutes?: number;
  /** Bookings further than this from now are ignored, in minutes. Default 240. */
  windowMinutes?: number;
  /** Seconds the ticket stays before the kiosk resets for the next person. 0 keeps it. Default 20. */
  resetSeconds?: number;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  /** Start on the phone tab instead of the scan tab. */
  defaultMode?: "scan" | "phone";
  labels?: Partial<CheckInKioskLabels>;
}

type View = { kind: "input" } | { kind: "busy"; text: "finding" | "checkingIn" } | { kind: "choose"; bookings: KioskBooking[] } | { kind: "message"; text: string; walkIn?: boolean } | { kind: "ticket"; result: CheckInResult };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * A self-service check-in screen for the waiting room. A person scans the QR on their booking ticket (a handheld
 * scanner types the code and presses Enter, so the field is always focused) or types a phone number on a big number pad.
 * A match becomes a queue ticket. It handles more than one booking, no booking, and coming too early, and resets itself after each person.
 */
export function CheckInKiosk({ bookings, onCheckIn, allowWalkIn = true, earlyMinutes = 60, windowMinutes = 240, resetSeconds = 20, now: nowProp, defaultMode = "scan", labels, className, ...rest }: CheckInKioskProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as CheckInKioskLabels;
  const [mode, setMode] = useState<"scan" | "phone">(defaultMode);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<View>({ kind: "input" });
  const [left, setLeft] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setCode("");
    setPhone("");
    setView({ kind: "input" });
  }, []);

  // A ticket resets the kiosk after a countdown so the next person starts clean.
  useEffect(() => {
    if (view.kind !== "ticket" || resetSeconds <= 0) return;
    let s = resetSeconds;
    setLeft(s);
    const id = setInterval(() => {
      s -= 1;
      setLeft(s);
      if (s <= 0) {
        clearInterval(id);
        reset();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [view.kind, resetSeconds, reset]);
  useEffect(() => {
    if (view.kind === "input" && mode === "scan") codeRef.current?.focus();
  }, [view, mode]);

  const checkIn = async (request: CheckInRequest) => {
    setView({ kind: "busy", text: "checkingIn" });
    try {
      const result = await onCheckIn(request);
      if ("error" in result) setView({ kind: "message", text: result.error });
      else setView({ kind: "ticket", result });
    } catch {
      setView({ kind: "message", text: t.failed });
    }
  };

  const lookup = async (input: string) => {
    const now = nowProp ?? Date.now();
    const match = findBookingForCheckIn(bookings, input, { now, earlyMinutes, windowMinutes });
    if (match.kind === "found") return checkIn({ booking: match.booking });
    if (match.kind === "multiple") return setView({ kind: "choose", bookings: match.bookings });
    if (match.kind === "too-early") {
      const at = new Date(match.booking.startsAt);
      const from = new Date(match.booking.startsAt - earlyMinutes * 60000);
      const fmt = (d: Date) => formatDate(d, locale, { hour: "numeric", minute: "2-digit" });
      return setView({ kind: "message", text: t.tooEarly(fmt(at), fmt(from)) });
    }
    setView({ kind: "message", text: t.none, walkIn: mode === "phone" && allowWalkIn && phoneDigits(input).length >= 9 });
  };

  const submitScan = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) void lookup(code);
  };
  const phoneReady = phoneDigits(phone).length >= 9;

  const time = (ms: number) => formatDate(ms, locale, { hour: "numeric", minute: "2-digit" });

  return (
    <div data-slot="check-in-kiosk" data-view={view.kind} className={cn("mx-auto flex w-full max-w-xl flex-col gap-4", className)} {...rest}>
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-h1">{view.kind === "ticket" ? t.ticketTitle : t.title}</h2>
        {view.kind !== "ticket" ? <p className="text-body text-muted-foreground">{t.subtitle}</p> : null}
      </div>

      {view.kind === "input" || view.kind === "busy" ? (
        <Card aria-busy={view.kind === "busy" || undefined}>
          <CardHeader>
            <div role="group" aria-label={t.title} className="col-span-full grid grid-cols-2 gap-2">
              <Button variant={mode === "scan" ? "primary" : "secondary"} aria-pressed={mode === "scan"} onClick={() => setMode("scan")} disabled={view.kind === "busy"}>
                <QrIcon aria-hidden />
                {t.modeScan}
              </Button>
              <Button variant={mode === "phone" ? "primary" : "secondary"} aria-pressed={mode === "phone"} onClick={() => setMode("phone")} disabled={view.kind === "busy"}>
                <Phone aria-hidden />
                {t.modePhone}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mode === "scan" ? (
              <form onSubmit={submitScan} className="flex flex-col gap-3">
                <label htmlFor="kiosk-code" className="text-label">
                  {t.scanLabel}
                </label>
                <Input id="kiosk-code" ref={codeRef} ltr autoComplete="off" spellCheck={false} placeholder={t.scanPlaceholder} value={code} onChange={(e) => setCode(e.target.value)} className="h-14 text-center font-mono text-h3" disabled={view.kind === "busy"} />
                <p className="text-caption text-muted-foreground">{t.scanHint}</p>
                <Button type="submit" size="lg" disabled={!code.trim() || view.kind === "busy"}>
                  <Search aria-hidden />
                  {view.kind === "busy" ? t[view.text] : t.find}
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <span id="kiosk-phone-label" className="text-label">
                  {t.phoneLabel}
                </span>
                <output aria-labelledby="kiosk-phone-label" dir="ltr" className="flex h-14 items-center justify-center rounded-control border border-border bg-background font-mono text-h2 tabular-nums">
                  {phone || <span className="text-muted-foreground">01X XXXX XXXX</span>}
                </output>
                <div role="group" aria-label={t.keypad} className="grid grid-cols-3 gap-2" dir="ltr">
                  {KEYS.map((k) => (
                    <Button key={k} variant="secondary" size="lg" className="h-16 text-h2" onClick={() => setPhone((p) => (p.length < 15 ? p + k : p))} disabled={view.kind === "busy"}>
                      {k}
                    </Button>
                  ))}
                  <Button variant="ghost" size="lg" className="h-16" onClick={() => setPhone("")} disabled={!phone || view.kind === "busy"}>
                    {t.clear}
                  </Button>
                  <Button variant="secondary" size="lg" className="h-16 text-h2" onClick={() => setPhone((p) => (p.length < 15 ? p + "0" : p))} disabled={view.kind === "busy"}>
                    0
                  </Button>
                  <Button variant="ghost" size="lg" className="h-16" aria-label={t.backspace} onClick={() => setPhone((p) => p.slice(0, -1))} disabled={!phone || view.kind === "busy"}>
                    <Delete aria-hidden className="rtl:rotate-180" />
                  </Button>
                </div>
                <Button size="lg" onClick={() => lookup(phone)} disabled={!phoneReady || view.kind === "busy"}>
                  <Search aria-hidden />
                  {view.kind === "busy" ? t[view.text] : t.find}
                </Button>
                {phone && !phoneReady ? <p className="text-caption text-muted-foreground">{t.invalidPhone}</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view.kind === "choose" ? (
        <Card>
          <CardHeader>
            <CardTitle as="h3">{t.multiple}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {view.bookings.map((b) => (
              <Button key={b.id} variant="secondary" size="lg" className="h-auto justify-between py-3" onClick={() => checkIn({ booking: b })}>
                <span>{t.bookingLine(b.name, time(b.startsAt))}</span>
                <bdi dir="ltr" className="font-mono text-caption text-muted-foreground">
                  {b.code}
                </bdi>
              </Button>
            ))}
            <Button variant="ghost" onClick={reset}>
              {t.back}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view.kind === "message" ? (
        <div className="flex flex-col gap-3">
          <Alert tone="warning">
            {view.text}
            {view.walkIn ? ` ${t.noneWalkIn}` : ""}
          </Alert>
          {view.walkIn ? (
            <Button size="lg" onClick={() => checkIn({ phone })}>
              <UserRoundPlus aria-hidden />
              {t.walkIn}
            </Button>
          ) : null}
          <Button variant="secondary" size="lg" onClick={reset}>
            {t.back}
          </Button>
        </div>
      ) : null}

      {view.kind === "ticket" ? (
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-nq-success-text">
              <CheckCircle2 aria-hidden className="size-4" />
              {t.ticketNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4" role="status">
            <bdi dir="ltr" data-slot="kiosk-ticket" className="font-mono text-[5rem] font-semibold leading-none tracking-wider tabular-nums">
              {view.result.entry.ticket}
            </bdi>
            <div className="flex flex-col items-center gap-1 text-center text-body">
              {view.result.position !== undefined ? <p>{t.ahead(view.result.position - 1)}</p> : null}
              {view.result.waitMinutes !== undefined ? (
                <p className="inline-flex items-center gap-1.5">
                  <Hourglass aria-hidden className="size-4" />
                  {t.wait(view.result.waitMinutes)}
                </p>
              ) : null}
              <p className="text-muted-foreground">{t.watch}</p>
            </div>
            <QrCode value={`queue:${view.result.entry.ticket}`} size={120} label={t.qrLabel} />
            <Button size="lg" className="self-stretch" onClick={reset}>
              {t.done}
            </Button>
            {resetSeconds > 0 ? <p className="text-caption text-muted-foreground">{t.autoReset(Math.max(0, left))}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
