/** Pure timeline maths for `SessionPlayback`: when each scripted message starts, and how much of it is visible at a moment. */
import { countTextTokens, splitText } from "../text-effects/text-effects-model";

export type SessionRole = "user" | "assistant" | "tool" | "status";

export interface SessionEvent {
  role: SessionRole;
  /** The message. Assistant and user text types out word by word; tool and status lines appear whole. */
  text: string;
  /** Tool name for `role: "tool"` ("Read file"). */
  title?: string;
  /** Extra pause before this event, in milliseconds. */
  delay?: number;
}

export interface SessionTiming {
  /** Milliseconds per typed word. Default 90. */
  wordMs?: number;
  /** Pause between events. Default 500. */
  gapMs?: number;
  /** How long a tool or status line "runs" before the next event. Default 900. */
  holdMs?: number;
}

export interface SessionTimelineItem {
  index: number;
  start: number;
  /** When the text is fully shown. */
  end: number;
  words: number;
}

export interface SessionTimeline {
  items: SessionTimelineItem[];
  total: number;
}

export function sessionTimeline(events: readonly SessionEvent[], locale?: string, timing: SessionTiming = {}): SessionTimeline {
  const wordMs = timing.wordMs ?? 90;
  const gapMs = timing.gapMs ?? 500;
  const holdMs = timing.holdMs ?? 900;
  let clock = 0;
  const items = events.map((event, index) => {
    const start = clock + (index === 0 ? 0 : gapMs) + (event.delay ?? 0);
    const typed = event.role === "user" || event.role === "assistant";
    const words = typed ? countTextTokens(splitText(event.text, "word", locale).tokens) : 1;
    const end = start + (typed ? words * wordMs : holdMs);
    clock = end;
    return { index, start, end, words };
  });
  return { items, total: clock };
}

export interface SessionEventState {
  /** 0 not started, 1 finished; in between while typing. */
  progress: number;
  /** Whole words visible. */
  visibleWords: number;
  started: boolean;
  done: boolean;
}

/** What each event shows at `time` milliseconds into the session. */
export function sessionStateAt(timeline: SessionTimeline, time: number): SessionEventState[] {
  return timeline.items.map((item) => {
    if (time < item.start) return { progress: 0, visibleWords: 0, started: false, done: false };
    if (time >= item.end) return { progress: 1, visibleWords: item.words, started: true, done: true };
    const progress = (time - item.start) / Math.max(1, item.end - item.start);
    return { progress, visibleWords: Math.max(1, Math.ceil(progress * item.words)), started: true, done: false };
  });
}

/** Where a click on a 0 to 1 scrubber lands, clamped to the timeline. */
export function sessionTimeFromRatio(timeline: SessionTimeline, ratio: number): number {
  return Math.round(Math.max(0, Math.min(1, ratio)) * timeline.total);
}

/** "0:07" style clock for the playback bar. Always Latin digits. */
export function formatSessionClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
