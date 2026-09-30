"use client";

import { BellRing, CheckCircle2, DoorOpen, Hourglass, LogOut, Stethoscope, Users, WifiOff } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { Num } from "../numeric";
import { estimateWaitMinutes, nowServing, positionInQueue, type QueueEntry } from "./queue-math";
import { useQueueNow } from "./use-now";

export type QueueConnection = "live" | "reconnecting" | "offline";

const STRINGS = {
  en: {
    yourTicket: "Your ticket",
    position: "Your place in line",
    peopleAhead: (n: number) => (n === 0 ? "You are next" : `${n} ${n === 1 ? "person" : "people"} ahead of you`),
    wait: "Estimated wait",
    minutes: (n: number) => (n === 0 ? "Any moment" : `About ${n} min`),
    nowServing: "Now serving",
    nobody: "Nobody is being served right now.",
    room: (r: string) => `Room ${r}`,
    waiting: "Waiting",
    called: "It is your turn",
    calledText: (room: string) => `Please go to ${room} now.`,
    calledNoRoom: "Please go to the desk now.",
    serving: "In your visit",
    servingText: (room: string) => `You are with the doctor in ${room}.`,
    done: "Visit finished",
    doneText: "Thank you for coming. Take care.",
    skipped: "We called you and could not find you",
    skippedText: "Please see reception and they will put you back in line.",
    left: "You left the line",
    leftText: "Check in again at the kiosk if you still need to be seen.",
    leave: "Leave the line",
    leaveTitle: "Leave the line?",
    leaveText: "You lose your place. You can check in again, but you go to the back.",
    leaveConfirm: "Yes, leave",
    live: "Live",
    reconnecting: "Reconnecting",
    offline: "Offline",
    updated: (s: number) => (s < 5 ? "Updated just now" : `Updated ${s} s ago`),
    offlineText: "You are offline. The numbers below may be out of date.",
    connection: "Connection",
  },
  ar: {
    yourTicket: "تذكرتك",
    position: "دورك في الصف",
    peopleAhead: (n: number) => (n === 0 ? "أنت التالي" : n === 1 ? "شخص واحد قبلك" : n === 2 ? "شخصان قبلك" : `${n} أشخاص قبلك`),
    wait: "وقت الانتظار المتوقع",
    minutes: (n: number) => (n === 0 ? "في أي لحظة" : `حوالي ${n} دقيقة`),
    nowServing: "يُخدم الآن",
    nobody: "لا أحد يُخدم الآن.",
    room: (r: string) => `الغرفة ${r}`,
    waiting: "في الانتظار",
    called: "حان دورك",
    calledText: (room: string) => `تفضّل إلى ${room} الآن.`,
    calledNoRoom: "تفضّل إلى المكتب الآن.",
    serving: "أنت في الزيارة",
    servingText: (room: string) => `أنت مع الطبيب في ${room}.`,
    done: "انتهت الزيارة",
    doneText: "شكرًا لزيارتك. سلامتك.",
    skipped: "ناديناك ولم نجدك",
    skippedText: "توجّه إلى الاستقبال وسيعيدونك إلى الصف.",
    left: "غادرت الصف",
    leftText: "سجّل الوصول مجددًا من الكشك إن كنت ما زلت تريد الكشف.",
    leave: "مغادرة الصف",
    leaveTitle: "مغادرة الصف؟",
    leaveText: "ستفقد دورك. يمكنك تسجيل الوصول مجددًا لكن في آخر الصف.",
    leaveConfirm: "نعم، غادر",
    live: "مباشر",
    reconnecting: "جارٍ إعادة الاتصال",
    offline: "غير متصل",
    updated: (s: number) => (s < 5 ? "تم التحديث الآن" : `تم التحديث قبل ${s} ثانية`),
    offlineText: "أنت غير متصل. قد تكون الأرقام أدناه قديمة.",
    connection: "الاتصال",
  },
};

export type WaitingScreenLabels = (typeof STRINGS)["en"];

function useT(labels?: Partial<WaitingScreenLabels>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels } as WaitingScreenLabels;
}

export interface QueueLiveIndicatorProps extends Omit<ComponentProps<"span">, "children"> {
  connection?: QueueConnection;
  /** When the data last arrived (epoch ms). Shows "Updated 12 s ago". */
  updatedAt?: number;
  /** Overrides the clock (for stories and tests). */
  now?: number;
  labels?: Partial<WaitingScreenLabels>;
}

/** A small "Live" dot with the connection state in words and, when given, how old the data is. Never colour alone. */
export function QueueLiveIndicator({ connection = "live", updatedAt, now: nowProp, labels, className, ...rest }: QueueLiveIndicatorProps) {
  const t = useT(labels);
  const now = useQueueNow(1000, nowProp);
  const text = connection === "live" ? t.live : connection === "reconnecting" ? t.reconnecting : t.offline;
  const seconds = updatedAt === undefined ? null : Math.max(0, Math.round((now - updatedAt) / 1000));
  return (
    <span data-slot="queue-live" data-connection={connection} role="status" aria-label={`${t.connection}: ${text}`} className={cn("inline-flex items-center gap-1.5 text-caption text-muted-foreground", className)} {...rest}>
      {connection === "offline" ? (
        <WifiOff aria-hidden className="size-3.5 text-nq-danger-text" />
      ) : (
        <span aria-hidden className="relative flex size-2">
          <span className={cn("absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping", connection === "live" ? "bg-nq-success-text" : "bg-nq-warning-text")} />
          <span className={cn("relative inline-flex size-2 rounded-full", connection === "live" ? "bg-nq-success-text" : "bg-nq-warning-text")} />
        </span>
      )}
      <span className="font-medium text-foreground">{text}</span>
      {seconds !== null ? <span>· {t.updated(seconds)}</span> : null}
    </span>
  );
}

export interface WaitingScreenProps extends Omit<ComponentProps<"div">, "children"> {
  /** The whole queue, so position, wait time and "now serving" agree with what reception sees. */
  entries: readonly QueueEntry[];
  /** Which entry is this patient. */
  entryId: string;
  /** Average visit length in minutes, for the estimate. Default 10. */
  averageMinutes?: number;
  /** Rooms open now, for the estimate. Default 1. */
  rooms?: number;
  /** Clinic or department name in the header. */
  clinic?: string;
  /** Live connection state. Default "live". */
  connection?: QueueConnection;
  /** When the queue last updated (epoch ms). */
  updatedAt?: number;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  /** Leave the line. Omit to hide the button. */
  onLeave?: () => Promise<void | { error?: string }>;
  labels?: Partial<WaitingScreenLabels>;
}

/**
 * What a patient sees on their phone after checking in: the ticket number, how many people are ahead, the estimated
 * wait, who is being served now, and a loud banner (with a short vibration where supported) when it is their turn.
 * The estimate and position are computed from `entries` with the same rules reception uses.
 */
export function WaitingScreen({ entries, entryId, averageMinutes = 10, rooms = 1, clinic, connection = "live", updatedAt, now: nowProp, onLeave, labels, className, ...rest }: WaitingScreenProps) {
  const t = useT(labels);
  const entry = entries.find((e) => e.id === entryId);
  const position = entry ? positionInQueue(entries, entry.id) : 0;
  const wait = entry ? estimateWaitMinutes(entries, entry.id, { averageMinutes, rooms }) : 0;
  const serving = nowServing(entries);
  const [error, setError] = useState<string | null>(null);

  const status = entry?.status;
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current !== "called" && status === "called" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    prev.current = status;
  }, [status]);

  if (!entry) return null;
  const roomName = entry.room ? t.room(entry.room) : "";

  const banner =
    status === "called"
      ? { tone: "success" as const, icon: BellRing, title: t.called, text: roomName ? t.calledText(roomName) : t.calledNoRoom }
      : status === "serving"
        ? { tone: "info" as const, icon: Stethoscope, title: t.serving, text: roomName ? t.servingText(roomName) : "" }
        : status === "done"
          ? { tone: "success" as const, icon: CheckCircle2, title: t.done, text: t.doneText }
          : status === "skipped" || status === "no_show"
            ? { tone: "warning" as const, icon: Users, title: t.skipped, text: t.skippedText }
            : status === "left"
              ? { tone: "info" as const, icon: LogOut, title: t.left, text: t.leftText }
              : null;

  return (
    <div data-slot="waiting-screen" data-status={status} className={cn("mx-auto flex w-full max-w-md flex-col gap-4", className)} {...rest}>
      <div className="flex items-center justify-between gap-2">
        {clinic ? <h2 className="text-label font-semibold">{clinic}</h2> : <span />}
        <QueueLiveIndicator connection={connection} updatedAt={updatedAt} now={nowProp} labels={labels} />
      </div>
      {connection === "offline" ? <Alert tone="warning">{t.offlineText}</Alert> : null}

      {banner ? (
        <Alert tone={banner.tone} icon={banner.icon} title={banner.title} role={status === "called" ? "alert" : "status"} className={cn(status === "called" && "motion-safe:animate-pulse")}>
          {banner.text}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle as="h3">{t.yourTicket}</CardTitle>
          {status === "waiting" ? (
            <Badge variant="warning" className="justify-self-end">
              <Hourglass aria-hidden className="size-3" />
              {t.waiting}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <bdi dir="ltr" data-slot="waiting-ticket" className="text-center font-mono text-[3.5rem] font-semibold leading-none tracking-wider tabular-nums">
            {entry.ticket}
          </bdi>
          {status === "waiting" ? (
            <div className="grid grid-cols-2 gap-3 border-t border-nq-line pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-caption text-muted-foreground">{t.position}</span>
                <span className="text-h2 tabular-nums">
                  <Num value={position} />
                </span>
                <span className="text-caption text-muted-foreground">{t.peopleAhead(position - 1)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-caption text-muted-foreground">{t.wait}</span>
                <span className="text-h2">{t.minutes(wait)}</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section aria-label={t.nowServing} aria-live="polite" className="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
        <h3 className="text-label font-semibold">{t.nowServing}</h3>
        {serving.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t.nobody}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {serving.map((s) => (
              <li key={s.id} className={cn("flex items-center justify-between gap-3 rounded-control px-3 py-2", s.id === entry.id ? "bg-nq-selected" : "bg-secondary")}>
                <bdi dir="ltr" className="font-mono text-h3 tabular-nums">
                  {s.ticket}
                </bdi>
                {s.room ? (
                  <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
                    <DoorOpen aria-hidden className="size-4" />
                    {t.room(s.room)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {onLeave && status === "waiting" ? (
        <ConfirmButton
          variant="ghost"
          title={t.leaveTitle}
          description={t.leaveText}
          confirmLabel={t.leaveConfirm}
          onConfirm={async () => {
            const r = await onLeave();
            if (r && r.error) {
              setError(r.error);
              throw new Error(r.error);
            }
          }}
        >
          <LogOut aria-hidden />
          {t.leave}
        </ConfirmButton>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
