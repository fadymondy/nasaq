"use client";

import { BellRing, DoorOpen, Stethoscope, Volume2, VolumeX } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { formatDate, Num } from "../numeric";
import { isQueueActive, nowServing, type QueueEntry, recentCalls, roomBoard, waitingOrder } from "../waiting-screen/queue-math";
import { QueueLiveIndicator, type QueueConnection } from "../waiting-screen";
import { useQueueNow } from "../waiting-screen/use-now";

const STRINGS = {
  en: {
    nowServing: "Now serving",
    room: (r: string) => `Room ${r}`,
    free: "Available",
    called: "Please come in",
    inVisit: "In visit",
    recent: "Recently called",
    upNext: "Up next",
    waiting: "Waiting",
    none: "No calls yet.",
    nobodyWaiting: "Nobody is waiting.",
    soundOn: "Sound on",
    soundOff: "Turn sound on",
    announce: (ticket: string, room: string) => (room ? `Ticket ${ticket}, please go to ${room}.` : `Ticket ${ticket}, please come to the desk.`),
    board: "Queue board",
    toRoom: "to",
    more: (n: number) => `+${n} more`,
  },
  ar: {
    nowServing: "يُخدم الآن",
    room: (r: string) => `الغرفة ${r}`,
    free: "متاحة",
    called: "تفضّل بالدخول",
    inVisit: "في الزيارة",
    recent: "آخر النداءات",
    upNext: "التالي",
    waiting: "في الانتظار",
    none: "لا نداءات بعد.",
    nobodyWaiting: "لا أحد في الانتظار.",
    soundOn: "الصوت يعمل",
    soundOff: "تشغيل الصوت",
    announce: (ticket: string, room: string) => (room ? `التذكرة ${ticket}، تفضّل إلى ${room}.` : `التذكرة ${ticket}، تفضّل إلى المكتب.`),
    board: "شاشة الدور",
    toRoom: "إلى",
    more: (n: number) => `+${n} أخرى`,
  },
};

export type LobbyDisplayLabels = (typeof STRINGS)["en"];

/** Two soft notes, high then low. Created on demand and only after the operator turned sound on (browsers block audio before a click). */
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes: [number, number][] = [
      [880, 0],
      [660, 0.35],
    ];
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.65);
    }
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // No audio device or blocked: the visual call still shows.
  }
}

export interface LobbyDisplayProps extends Omit<ComponentProps<"div">, "children"> {
  /** The whole queue. The board shows only ticket numbers, never names. */
  entries: readonly QueueEntry[];
  /** Room or desk names, in the order they appear on the board. */
  rooms: readonly string[];
  clinic?: string;
  /** Live connection state for the small indicator. */
  connection?: QueueConnection;
  /** Play the chime for a new call. The operator turns it on once (browsers need a click). Controlled. */
  sound?: boolean;
  defaultSound?: boolean;
  onSoundChange?: (on: boolean) => void;
  /** How long a fresh call keeps its highlight, in milliseconds. Default 10000. */
  highlightMs?: number;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  /** Tickets listed under "Up next". Default 5. */
  upNext?: number;
  labels?: Partial<LobbyDisplayLabels>;
}

/**
 * A big-screen board for a waiting room: one card per room with the ticket it is calling, a list of recent calls,
 * the next tickets in line and a clock. A new call flashes, plays a chime (when sound is on) and is announced to
 * screen readers. Sizes scale with the board's own width, so it reads from across the room on a TV and still fits a phone.
 */
export function LobbyDisplay({
  entries,
  rooms,
  clinic,
  connection = "live",
  sound: soundProp,
  defaultSound = false,
  onSoundChange,
  highlightMs = 10000,
  now: nowProp,
  upNext = 5,
  labels,
  className,
  ...rest
}: LobbyDisplayProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as LobbyDisplayLabels;
  const now = useQueueNow(1000, nowProp);
  const [soundInner, setSoundInner] = useState(defaultSound);
  const sound = soundProp ?? soundInner;
  const setSound = (v: boolean) => {
    setSoundInner(v);
    onSoundChange?.(v);
    if (v) playChime();
  };

  // Calls we have already shown, keyed by ticket and call time. The first render marks the current ones as seen, so opening the board is silent.
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<{ key: string; id: string; at: number }[]>([]);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const keyOf = (e: QueueEntry) => `${e.id}:${e.calledAt}`;
    const active = entries.filter((e) => isQueueActive(e) && e.calledAt !== undefined);
    if (seen.current === null) {
      seen.current = new Set(active.map(keyOf));
      return;
    }
    const added = active.filter((e) => !seen.current!.has(keyOf(e)));
    if (added.length === 0) return;
    for (const e of added) seen.current.add(keyOf(e));
    const stamp = Date.now();
    setFresh((f) => [...f, ...added.map((e) => ({ key: keyOf(e), id: e.id, at: stamp }))]);
    const newest = [...added].sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0))[0]!;
    setAnnouncement(t.announce(newest.ticket, newest.room ? t.room(newest.room) : ""));
    if (sound) playChime();
    setTimeout(() => setFresh((f) => f.filter((x) => x.at !== stamp)), highlightMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);
  const isFresh = (e: QueueEntry) => fresh.some((f) => f.id === e.id && f.key === `${e.id}:${e.calledAt}`);

  const board = useMemo(() => roomBoard(entries, rooms), [entries, rooms]);
  const recent = useMemo(() => recentCalls(entries, 6), [entries]);
  const waiting = useMemo(() => waitingOrder(entries), [entries]);
  const unassigned = nowServing(entries).filter((e) => !e.room || !rooms.includes(e.room));
  const clock = formatDate(now, locale, { hour: "numeric", minute: "2-digit" });
  const date = formatDate(now, locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div data-slot="lobby-display" aria-label={t.board} className={cn("@container flex w-full flex-col gap-[2cqi] bg-background p-[2cqi] text-foreground [container-type:inline-size]", className)} {...rest}>
      <div aria-live="assertive" aria-atomic className="sr-only">
        {announcement}
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {clinic ? <h1 className="truncate text-[clamp(1.25rem,3cqi,2.5rem)] font-semibold leading-tight">{clinic}</h1> : null}
          <p className="text-[clamp(0.8rem,1.6cqi,1.25rem)] text-muted-foreground">
            <bdi>{date}</bdi>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <QueueLiveIndicator connection={connection} now={nowProp} />
          <Button variant="secondary" size="sm" onClick={() => setSound(!sound)} aria-pressed={sound}>
            {sound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
            {sound ? t.soundOn : t.soundOff}
          </Button>
          <bdi dir="ltr" className="text-[clamp(1.5rem,4.5cqi,4rem)] font-semibold leading-none tabular-nums">
            {clock}
          </bdi>
        </div>
      </header>

      <div className="grid gap-[2cqi] @3xl:grid-cols-[2fr_1fr]">
        <section aria-label={t.nowServing} className="flex flex-col gap-[1.2cqi]">
          <h2 className="text-[clamp(1rem,2.2cqi,1.75rem)] font-medium text-muted-foreground">{t.nowServing}</h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-[1.5cqi] p-0">
            {board.map(({ room, entry }) => {
              const flash = entry ? isFresh(entry) : false;
              return (
                <li
                  key={room}
                  data-room={room}
                  data-state={entry ? entry.status : "free"}
                  data-fresh={flash || undefined}
                  className={cn(
                    "flex flex-col gap-2 rounded-card border p-[1.6cqi] transition-colors duration-300",
                    entry ? "border-nq-line bg-card" : "border-dashed border-nq-line bg-secondary/60 text-muted-foreground",
                    entry?.status === "called" && "border-primary bg-nq-selected",
                    flash && "ring-4 ring-primary motion-safe:animate-pulse",
                  )}
                >
                  <div className="flex items-center gap-2 text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium">
                    <DoorOpen aria-hidden className="size-[1.2em]" />
                    {t.room(room)}
                  </div>
                  {entry ? (
                    <>
                      <bdi dir="ltr" className="whitespace-nowrap text-center font-mono text-[clamp(2rem,5cqi,5.5rem)] font-semibold leading-none tracking-wider tabular-nums">
                        {entry.ticket}
                      </bdi>
                      <div className="flex items-center justify-center gap-2 text-[clamp(0.8rem,1.6cqi,1.4rem)]">
                        {entry.status === "called" ? <BellRing aria-hidden className="size-[1.2em]" /> : <Stethoscope aria-hidden className="size-[1.2em]" />}
                        {entry.status === "called" ? t.called : t.inVisit}
                      </div>
                    </>
                  ) : (
                    <p className="py-[2cqi] text-center text-[clamp(1rem,2.4cqi,2rem)]">{t.free}</p>
                  )}
                </li>
              );
            })}
            {unassigned.map((e) => (
              <li key={e.id} className="flex flex-col items-center gap-2 rounded-card border border-nq-line bg-card p-[1.6cqi]">
                <bdi dir="ltr" className="font-mono text-[clamp(2rem,5cqi,5rem)] font-semibold tabular-nums">
                  {e.ticket}
                </bdi>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-[2cqi]">
          <section aria-label={t.upNext} className="flex flex-col gap-2 rounded-card border border-nq-line p-[1.6cqi]">
            <h2 className="flex items-baseline justify-between text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium text-muted-foreground">
              {t.upNext}
              <span className="text-[0.8em]">
                {t.waiting}: <Num value={waiting.length} />
              </span>
            </h2>
            {waiting.length === 0 ? (
              <p className="text-[clamp(0.85rem,1.6cqi,1.3rem)] text-muted-foreground">{t.nobodyWaiting}</p>
            ) : (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {waiting.slice(0, upNext).map((e) => (
                  <li key={e.id} className="rounded-control bg-secondary px-3 py-1.5">
                    <bdi dir="ltr" className="font-mono text-[clamp(1.1rem,2.6cqi,2.25rem)] font-semibold tabular-nums">
                      {e.ticket}
                    </bdi>
                  </li>
                ))}
                {waiting.length > upNext ? <li className="self-center text-[clamp(0.8rem,1.5cqi,1.2rem)] text-muted-foreground">{t.more(waiting.length - upNext)}</li> : null}
              </ul>
            )}
          </section>

          <section aria-label={t.recent} className="flex flex-col gap-2 rounded-card border border-nq-line p-[1.6cqi]">
            <h2 className="text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium text-muted-foreground">{t.recent}</h2>
            {recent.length === 0 ? (
              <p className="text-[clamp(0.85rem,1.6cqi,1.3rem)] text-muted-foreground">{t.none}</p>
            ) : (
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {recent.map((e) => (
                  <li key={`${e.id}-${e.calledAt}`} className="flex items-center justify-between gap-3 text-[clamp(1rem,2cqi,1.75rem)]">
                    <bdi dir="ltr" className="font-mono font-semibold tabular-nums">
                      {e.ticket}
                    </bdi>
                    <span className="text-muted-foreground">{e.room ? t.room(e.room) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
