"use client";

import { Bot, Captions, Mic, MicOff, PhoneOff, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiThinking, usePrefersReducedMotion } from "../ai-states";
import { Button } from "../button";
import { Spinner } from "../spinner";
import { barHeights, clampLevel, formatCallTime, pushLevel, quantizeLevel, type VoiceCallState } from "./voice-call-math";

export { levelFromSamples as voiceLevelFromSamples, formatCallTime as formatVoiceCallTime, type VoiceCallState } from "./voice-call-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Voice call",
    states: { connecting: "Connecting", listening: "Listening", thinking: "Thinking", speaking: "Speaking", error: "Connection lost" } as Record<VoiceCallState, string>,
    muted: "Muted. The agent cannot hear you.",
    mute: "Mute microphone",
    unmute: "Unmute microphone",
    captionsOn: "Show captions",
    captionsOff: "Hide captions",
    end: "End call",
    ending: "Ending call",
    retry: "Reconnect",
    you: "You",
    duration: "Call length",
    level: "Voice level",
    captions: "Captions",
    noCaptions: "Captions appear here as you talk.",
    interrupt: "Interrupt",
  },
  ar: {
    label: "مكالمة صوتية",
    states: { connecting: "جارٍ الاتصال", listening: "يستمع", thinking: "يفكّر", speaking: "يتحدث", error: "انقطع الاتصال" } as Record<VoiceCallState, string>,
    muted: "الميكروفون مكتوم. لا يسمعك الوكيل.",
    mute: "كتم الميكروفون",
    unmute: "إلغاء كتم الميكروفون",
    captionsOn: "إظهار الترجمة النصية",
    captionsOff: "إخفاء الترجمة النصية",
    end: "إنهاء المكالمة",
    ending: "جارٍ إنهاء المكالمة",
    retry: "إعادة الاتصال",
    you: "أنت",
    duration: "مدة المكالمة",
    level: "مستوى الصوت",
    captions: "الترجمة النصية",
    noCaptions: "تظهر الترجمة النصية هنا أثناء حديثك.",
    interrupt: "مقاطعة",
  },
};

export type VoiceCallLabels = Omit<typeof STRINGS.en, "states"> & { states: Record<VoiceCallState, string> };
type LabelOverrides = Partial<Omit<VoiceCallLabels, "states">> & { states?: Partial<VoiceCallLabels["states"]> };

function useStrings(labels?: LabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { locale, t: { ...base, ...labels, states: { ...base.states, ...labels?.states } } as VoiceCallLabels };
}

/* ------------------------------------------------------------------ visualiser */

export interface VoiceVisualizerProps extends Omit<ComponentProps<"div">, "children"> {
  state: VoiceCallState;
  /** Loudness of whoever is talking right now, 0 to 1. Drive it from an analyser or, in a demo, a timer. */
  level?: number;
  /** Number of bars. Default 31. */
  bars?: number;
  /** Flat and dim: the microphone is muted. */
  muted?: boolean;
  labels?: LabelOverrides;
}

/**
 * A row of bars shaped by the last moments of the voice. Listening uses the ink colour, speaking the accent. While the
 * agent is thinking the bars breathe on their own. Under reduced motion nothing animates and the level moves in coarse
 * steps. It never asks for the microphone: it only draws the `level` it is given.
 */
export function VoiceVisualizer({ state, level, bars = 31, muted, labels, className, ...props }: VoiceVisualizerProps) {
  const { t } = useStrings(labels);
  const reduced = usePrefersReducedMotion();
  const quiet = muted && state === "listening";
  const live = (state === "listening" && !quiet) || state === "speaking";
  const target = live ? (reduced ? quantizeLevel(level ?? 0) : clampLevel(level)) : 0;
  const [history, setHistory] = useState<number[]>(() => pushLevel([], 0, Math.ceil(bars / 2)));
  useEffect(() => {
    setHistory((h) => pushLevel(h, target, Math.ceil(bars / 2)));
  }, [target, bars]);
  const heights = barHeights(history, bars, state === "thinking" ? 0.16 : 0.06);
  const breathing = state === "thinking" && !reduced;
  return (
    <div
      data-slot="voice-visualizer"
      data-state={state}
      role="meter"
      aria-label={t.level}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(target * 100)}
      className={cn("flex h-28 items-center justify-center gap-1", className)}
      {...props}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "w-1.5 rounded-full",
            state === "speaking" ? "bg-nq-accent" : state === "error" ? "bg-nq-danger" : quiet ? "bg-nq-line-strong" : "bg-foreground",
            state === "connecting" && "opacity-40",
            !reduced && "transition-[height] duration-100 ease-out",
            breathing && "animate-pulse",
          )}
          style={{ height: `${h * 100}%`, animationDelay: breathing ? `${Math.abs(i - bars / 2) * 70}ms` : undefined }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ overlay */

export interface VoiceCaption {
  id: string;
  role: "agent" | "user";
  text: string;
}

export interface VoiceAgent {
  name: string;
  /** An emoji or an image URL. Falls back to a bot icon. */
  avatar?: string;
  /** For example the agent's role. */
  subtitle?: string;
}

export interface VoiceCallOverlayProps extends Omit<ComponentProps<"div">, "children"> {
  state: VoiceCallState;
  agent: VoiceAgent;
  /** Loudness of the current speaker, 0 to 1. */
  level?: number;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** Hang up. */
  onEnd: () => void | Promise<void>;
  /** Seconds since the call was answered. */
  elapsed?: number;
  /** The last lines of the conversation. Only the last `captionLines` are shown. */
  captions?: readonly VoiceCaption[];
  captionLines?: number;
  /** Captions shown or hidden (controlled). */
  showCaptions?: boolean;
  defaultShowCaptions?: boolean;
  onShowCaptionsChange?: (show: boolean) => void;
  /** Cut in while the agent is speaking. Adds a button in that state. */
  onInterrupt?: () => void;
  /** Shown with the `error` state, with a Reconnect button when `onRetry` is set. */
  error?: string;
  onRetry?: () => void;
  /** Render inside the nearest positioned parent instead of covering the whole window. For embedding and stories. */
  contained?: boolean;
  /** Extra controls beside mute and captions. */
  extraControls?: ReactNode;
  labels?: LabelOverrides;
}

function AgentMark({ agent, state }: { agent: VoiceAgent; state: VoiceCallState }) {
  const image = agent.avatar?.startsWith("http") || agent.avatar?.startsWith("/") || agent.avatar?.startsWith("data:");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-body",
        state === "speaking" ? "border-nq-accent" : "border-border",
      )}
    >
      {image ? <img src={agent.avatar} alt="" className="size-full object-cover" /> : (agent.avatar ?? <Bot className="size-4" />)}
    </span>
  );
}

/**
 * A full-screen voice call with an AI agent: who you are talking to, how long, a voice visualiser, what state the
 * agent is in (listening, thinking, speaking), live captions, and mute, captions and hang-up controls. It holds no
 * audio. You connect the call, feed `state` and `level`, and act on `onEnd` and `onMutedChange`.
 */
export function VoiceCallOverlay({
  state,
  agent,
  level,
  muted = false,
  onMutedChange,
  onEnd,
  elapsed,
  captions = [],
  captionLines = 3,
  showCaptions: showProp,
  defaultShowCaptions = true,
  onShowCaptionsChange,
  onInterrupt,
  error,
  onRetry,
  contained = false,
  extraControls,
  labels,
  className,
  ...props
}: VoiceCallOverlayProps) {
  const { t } = useStrings(labels);
  const [innerShow, setInnerShow] = useState(defaultShowCaptions);
  const show = showProp ?? innerShow;
  const [ending, setEnding] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lines = captions.slice(-captionLines);

  useEffect(() => {
    if (!contained) rootRef.current?.focus();
  }, [contained]);

  async function end() {
    if (ending) return;
    setEnding(true);
    try {
      await onEnd();
    } finally {
      setEnding(false);
    }
  }

  const stateText = state === "listening" && muted ? t.muted : t.states[state];

  return (
    <div
      ref={rootRef}
      data-slot="voice-call-overlay"
      data-state={state}
      role="dialog"
      aria-modal={contained ? undefined : true}
      aria-label={`${t.label}: ${agent.name}`}
      tabIndex={-1}
      className={cn(
        "z-50 flex flex-col bg-background text-foreground outline-none",
        contained ? "absolute inset-0" : "fixed inset-0",
        className,
      )}
      {...props}
    >
      <header className="flex items-center gap-3 px-5 py-4">
        <AgentMark agent={agent} state={state} />
        <div className="min-w-0 flex-1">
          <p dir="auto" className="truncate text-label text-foreground">
            {agent.name}
          </p>
          {agent.subtitle ? (
            <p dir="auto" className="truncate text-caption text-muted-foreground">
              {agent.subtitle}
            </p>
          ) : null}
        </div>
        {elapsed !== undefined ? (
          <span className="tabular-nums text-body-sm text-muted-foreground" aria-label={t.duration}>
            <bdi dir="ltr">{formatCallTime(elapsed)}</bdi>
          </span>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6">
        <VoiceVisualizer state={state} level={level} muted={muted} labels={labels} className="w-full max-w-md" />
        <div role="status" aria-live="polite" className="flex min-h-14 flex-col items-center gap-2 text-center">
          {state === "thinking" ? (
            <AiThinking label={t.states.thinking} />
          ) : state === "connecting" ? (
            <span className="inline-flex items-center gap-2 text-body text-muted-foreground">
              <Spinner /> {t.states.connecting}
            </span>
          ) : state === "error" ? (
            <span className="inline-flex items-center gap-2 text-body text-nq-danger-text">
              <TriangleAlert aria-hidden className="size-4" /> {error ?? t.states.error}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-body text-foreground">
              {state === "listening" && muted ? <MicOff aria-hidden className="size-4 text-muted-foreground" /> : null}
              {stateText}
            </span>
          )}
          {state === "error" && onRetry ? (
            <Button onClick={onRetry} size="sm">
              {t.retry}
            </Button>
          ) : null}
          {state === "speaking" && onInterrupt ? (
            <Button onClick={onInterrupt} size="sm" variant="ghost">
              {t.interrupt}
            </Button>
          ) : null}
        </div>

        {show ? (
          <div role="log" aria-label={t.captions} aria-live="off" className="flex min-h-24 w-full max-w-xl flex-col justify-end gap-1.5 text-center">
            {lines.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t.noCaptions}</p>
            ) : (
              lines.map((line, i) => (
                <p
                  key={line.id}
                  dir="auto"
                  className={cn("text-body", line.role === "agent" ? "text-foreground" : "text-muted-foreground", i < lines.length - 1 && "opacity-70")}
                >
                  {line.role === "user" ? <span className="me-1.5 text-caption text-muted-foreground">{t.you}</span> : null}
                  {line.text}
                </p>
              ))
            )}
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-center gap-3 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Button
          size="icon"
          variant={muted ? "primary" : "secondary"}
          className="size-12 rounded-full"
          aria-pressed={muted}
          aria-label={muted ? t.unmute : t.mute}
          disabled={state === "connecting"}
          onClick={() => onMutedChange?.(!muted)}
        >
          {muted ? <MicOff aria-hidden /> : <Mic aria-hidden />}
        </Button>
        <Button
          size="icon"
          variant={show ? "primary" : "secondary"}
          className="size-12 rounded-full"
          aria-pressed={show}
          aria-label={show ? t.captionsOff : t.captionsOn}
          onClick={() => {
            setInnerShow(!show);
            onShowCaptionsChange?.(!show);
          }}
        >
          <Captions aria-hidden />
        </Button>
        {extraControls}
        <Button size="icon" variant="danger" className="size-14 rounded-full" aria-label={ending ? t.ending : t.end} loading={ending} onClick={() => void end()}>
          <PhoneOff aria-hidden />
        </Button>
      </footer>
    </div>
  );
}
