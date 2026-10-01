"use client";

import { RotateCcw } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { AnsiText } from "../terminal";
import { stripAnsi } from "../terminal/terminal-ansi";

const STRINGS = {
  en: { title: "Terminal", replay: "Replay", transcript: "Terminal session" },
  ar: { title: "الطرفية", replay: "إعادة التشغيل", transcript: "جلسة الطرفية" },
};

export type TypingTerminalLabels = Partial<(typeof STRINGS)["en"]>;

export interface TypingTerminalStep {
  /** The command typed at the prompt, without the prompt. */
  cmd: string;
  /** Lines printed after it. May contain ANSI colour codes. */
  out?: readonly string[];
}

export interface TypingTerminalProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  steps: readonly TypingTerminalStep[];
  /** Shown under the transcript when the playback ends: a screenshot of the result, a call to action. */
  endSlot?: ReactNode;
  title?: ReactNode;
  prompt?: string;
  /** Milliseconds per typed character. Default 28. */
  typeMs?: number;
  /** Milliseconds between printed lines. Default 110. */
  lineMs?: number;
  /** Start again after a pause instead of stopping with a Replay button. */
  loop?: boolean;
  /** Fixed height of the body in pixels, so the page does not move while it types. Default 320. */
  height?: number;
  /** Start playing. Set it from an in-view observer to play when scrolled to. Default true. */
  play?: boolean;
  /** Called when the playback ends, or at once when motion is reduced. */
  onComplete?: () => void;
  labels?: TypingTerminalLabels;
}

interface Progress {
  step: number;
  typed: number;
  lines: number;
  end: boolean;
}

const fullProgress = (steps: readonly TypingTerminalStep[]): Progress => ({ step: steps.length, typed: 0, lines: 0, end: true });

const staticFrame = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || navigator.webdriver === true);

/**
 * A terminal that types commands and prints their output, step by step, for hero sections and docs.
 * The first render is the finished transcript, so servers, crawlers and reduced motion get all of it.
 */
export function TypingTerminal({
  steps,
  endSlot,
  title,
  prompt = "❯",
  typeMs = 28,
  lineMs = 110,
  loop = false,
  height = 320,
  play = true,
  onComplete,
  labels,
  className,
  ...props
}: TypingTerminalProps) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [progress, setProgress] = useState<Progress>(() => fullProgress(steps));
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    if (!play) return;
    if (staticFrame()) {
      setProgress(fullProgress(steps));
      done.current?.();
      return;
    }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));
    (async () => {
      setPlaying(true);
      do {
        for (let s = 0; s < steps.length && alive; s++) {
          const step = steps[s];
          if (!step) continue;
          for (let c = 0; c <= step.cmd.length && alive; c++) {
            setProgress({ step: s, typed: c, lines: 0, end: false });
            await wait(typeMs);
          }
          await wait(240);
          for (let l = 1; l <= (step.out?.length ?? 0) && alive; l++) {
            setProgress({ step: s, typed: step.cmd.length, lines: l, end: false });
            await wait(lineMs);
          }
        }
        if (!alive) return;
        setProgress(fullProgress(steps));
        if (!loop) break;
        await wait(4000);
      } while (alive);
      if (!alive) return;
      setPlaying(false);
      done.current?.();
    })();
    return () => {
      alive = false;
      for (const id of timers) clearTimeout(id);
    };
  }, [steps, typeMs, lineMs, loop, play, run]);

  // Follow the newest line.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every frame
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [progress]);

  const rows: ReactNode[] = [];
  steps.forEach((step, s) => {
    if (s > progress.step) return;
    const current = s === progress.step && !progress.end;
    const cmd = current ? step.cmd.slice(0, progress.typed) : step.cmd;
    const typing = current && progress.typed <= step.cmd.length && progress.lines === 0;
    rows.push(
      <div key={`c${s}`} data-kind="command" className="whitespace-pre-wrap break-words">
        <span className="text-primary">{prompt} </span>
        <span className="text-foreground">{cmd}</span>
        {typing ? <span aria-hidden className="ms-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-primary" /> : null}
      </div>,
    );
    const out = step.out ?? [];
    const count = current ? progress.lines : out.length;
    out.slice(0, count).forEach((line, l) => {
      rows.push(
        <div key={`o${s}-${l}`} data-kind="output" className="whitespace-pre-wrap break-words text-muted-foreground">
          <AnsiText text={line} />
        </div>,
      );
    });
  });

  const transcript = stripAnsi(steps.map((s) => [`${prompt} ${s.cmd}`, ...(s.out ?? [])].join("\n")).join("\n"));

  return (
    <div
      data-slot="typing-terminal"
      data-playing={playing || undefined}
      dir="ltr"
      className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start", className)}
      {...props}
    >
      <div data-slot="typing-terminal-header" className="flex h-row shrink-0 items-center gap-2 border-b border-border ps-3 pe-1.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">{title ?? t.title}</span>
        {!loop && !playing && play ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setRun((n) => n + 1)}>
            <RotateCcw aria-hidden />
            {t.replay}
          </Button>
        ) : null}
      </div>
      <pre className="sr-only" aria-label={t.transcript}>
        {transcript}
      </pre>
      <div
        ref={body}
        data-slot="typing-terminal-body"
        style={{ height }}
        className="min-h-0 overflow-auto px-4 py-3 font-mono text-code leading-relaxed"
      >
        <div aria-hidden>{rows}</div>
        {progress.end && endSlot ? (
          <div data-slot="typing-terminal-end" className="mt-4 border-t border-border pt-4 font-sans">
            {endSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}
