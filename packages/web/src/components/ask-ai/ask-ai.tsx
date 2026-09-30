"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import { BookOpen, Languages, PenLine, RefreshCw, Send, Sparkles, TextQuote, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useShortcutKeys } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiConfidenceMeter, AiFeedback, AiGeneratedLabel, AiShimmer, AiStreamingText, AiSuggestionChips, AiThinking, type AiAction } from "../ai-states";
import { AiSourceChips, type AiCitationSource } from "../ai-citations";
import { Alert } from "../alert";
import { Button } from "../button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../card";
import { CopyButton } from "../copy-button";
import { Textarea } from "../field";
import { Markdown } from "../markdown";
import { type FormatNumberOptions, Num } from "../numeric";
import { Kbd } from "../text";
import { type AskAiOutcome, deltaTone, isIgnoredTarget, normalizeSelection, readOutcome, shortenMiddle } from "./ask-ai-logic";

export { deltaTone, isIgnoredTarget, normalizeSelection, readOutcome, shortenMiddle, type AskAiOutcome, type NormalizedSelection } from "./ask-ai-logic";

const STRINGS = {
  en: {
    ask: "Ask AI",
    title: "Ask AI about this text",
    close: "Close",
    selected: "Selected text",
    truncated: "Only the first part of a long selection is sent.",
    quick: "Quick actions",
    inputLabel: "Your question",
    placeholder: "Ask anything about the selection",
    send: "Ask",
    thinking: "Reading the selection",
    failed: "The AI could not answer. Try again.",
    retry: "Try again",
    copy: "Copy answer",
    replace: "Replace selection",
    another: "Ask something else",
    explain: "Explain",
    summarize: "Summarize",
    translate: "Translate",
    improve: "Improve writing",
    define: "Define terms",
    // insight
    insight: "AI insight",
    dismiss: "Dismiss insight",
    askMore: "Ask AI about this",
    sources: "Based on",
    loading: "Analyzing",
    tone: { info: "Insight", success: "Good news", warning: "Worth a look", danger: "Needs attention", neutral: "Insight" },
    good: "Helpful insight",
    bad: "Not helpful",
  },
  ar: {
    ask: "اسأل الذكاء الاصطناعي",
    title: "اسأل الذكاء الاصطناعي عن هذا النص",
    close: "إغلاق",
    selected: "النص المحدد",
    truncated: "يُرسل الجزء الأول فقط من التحديد الطويل.",
    quick: "إجراءات سريعة",
    inputLabel: "سؤالك",
    placeholder: "اسأل أي شيء عن النص المحدد",
    send: "اسأل",
    thinking: "جارٍ قراءة النص المحدد",
    failed: "تعذّر على الذكاء الاصطناعي الإجابة. حاول مرة أخرى.",
    retry: "حاول مرة أخرى",
    copy: "نسخ الإجابة",
    replace: "استبدال النص المحدد",
    another: "اسأل شيئًا آخر",
    explain: "اشرح",
    summarize: "لخّص",
    translate: "ترجم",
    improve: "حسّن الصياغة",
    define: "عرّف المصطلحات",
    insight: "رؤية من الذكاء الاصطناعي",
    dismiss: "تجاهل الرؤية",
    askMore: "اسأل الذكاء الاصطناعي عن هذا",
    sources: "مبنية على",
    loading: "جارٍ التحليل",
    tone: { info: "رؤية", success: "خبر جيد", warning: "تستحق النظر", danger: "تحتاج انتباهًا", neutral: "رؤية" },
    good: "رؤية مفيدة",
    bad: "غير مفيدة",
  },
};

export type AskAiLabels = Omit<(typeof STRINGS)["en"], "tone"> & { tone: Record<"info" | "success" | "warning" | "danger" | "neutral", string> };

function useLabels(labels?: Partial<AskAiLabels>): AskAiLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

/* ------------------------------------------------------------------ ask on selection */

export interface AskAiRequest {
  /** What to ask: the quick action's label, or what the visitor typed. */
  prompt: string;
  /** The selected text, whitespace collapsed and cut to `maxLength`. */
  selection: string;
  /** Set when a quick action ran: `explain`, `summarize`, or your own id. */
  actionId?: string;
}

export interface AskAiSelectionProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /** Answer a question about the selection. Return the Markdown text, `{ text }` or `{ error }`; a rejection shows the failure. */
  onAsk: (request: AskAiRequest) => Promise<AskAiOutcome>;
  /** Shows "Replace selection" under an answer. You change the text, the component never edits the page. */
  onReplace?: (answer: string, selection: string) => void;
  /** Quick actions in the popover. Default: explain, summarize, translate, improve, define. Pass `[]` for none. */
  actions?: readonly AiAction[];
  /** Selections shorter than this are ignored. Default 3. */
  minLength?: number;
  /** Longer selections are cut to this many characters. Default 2000. */
  maxLength?: number;
  /** Key that opens the panel from the keyboard while text is selected. Default `mod shift space`. Pass `null` to turn it off. */
  hotkey?: string | null;
  disabled?: boolean;
  labels?: Partial<AskAiLabels>;
}

interface Picked {
  text: string;
  truncated: boolean;
  range: Range;
}

type Phase = "pill" | "panel";
type Answer = { status: "idle" } | { status: "loading" } | { status: "done"; text: string } | { status: "error"; message: string };

const DEFAULT_ICONS = { explain: BookOpen, summarize: TextQuote, translate: Languages, improve: PenLine, define: BookOpen } as const;

/**
 * Wraps read-only content. Select some text inside it and a small "Ask AI" pill appears by the selection. Press it
 * (or the keyboard shortcut) for a panel with quick actions and a question box, then read the answer in place.
 * Selections inside inputs, editors and `data-ask-ai-ignore` areas are ignored. It calls `onAsk`, nothing else.
 */
export function AskAiSelection({
  children,
  onAsk,
  onReplace,
  actions,
  minLength = 3,
  maxLength = 2000,
  hotkey = "mod shift space",
  disabled,
  labels,
  className,
  ...props
}: AskAiSelectionProps) {
  const t = useLabels(labels);
  const ref = useRef<HTMLDivElement>(null);
  const pointerDown = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<Phase>("pill");
  const [answer, setAnswer] = useState<Answer>({ status: "idle" });
  const [question, setQuestion] = useState("");
  const [lastPrompt, setLastPrompt] = useState<AskAiRequest | null>(null);
  const keys = useShortcutKeys(hotkey ?? undefined);
  const phaseRef = useRef<Phase>("pill");
  phaseRef.current = phase;

  const quick = useMemo<readonly AiAction[]>(
    () =>
      actions ??
      (["explain", "summarize", "translate", "improve", "define"] as const).map((id) => ({ id, label: t[id], icon: DEFAULT_ICONS[id] })),
    [actions, t],
  );

  const reset = useCallback(() => {
    requestId.current++;
    setPicked(null);
    setPhase("pill");
    setAnswer({ status: "idle" });
    setQuestion("");
    setLastPrompt(null);
  }, []);

  const evaluate = useCallback(() => {
    if (phaseRef.current === "panel") return;
    const root = ref.current;
    const sel = typeof window === "undefined" ? null : window.getSelection();
    if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setPicked(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const anchor = range.commonAncestorContainer;
    const el = anchor instanceof Element ? anchor : anchor.parentElement;
    if (!root.contains(anchor) || isIgnoredTarget(el)) {
      setPicked(null);
      return;
    }
    const n = normalizeSelection(sel.toString(), minLength, maxLength);
    if (n.text === "") {
      setPicked(null);
      return;
    }
    setPicked((cur) => (cur && cur.text === n.text ? cur : { text: n.text, truncated: n.truncated, range: range.cloneRange() }));
  }, [minLength, maxLength]);

  useEffect(() => {
    if (disabled) return;
    const onChange = () => {
      if (timer.current) clearTimeout(timer.current);
      // Wait for the pointer to lift, and for keyboard selection to settle, before showing the pill.
      timer.current = setTimeout(() => {
        if (!pointerDown.current) evaluate();
      }, 220);
    };
    const onUp = () => {
      if (!pointerDown.current) return;
      pointerDown.current = false;
      setTimeout(evaluate, 0);
    };
    document.addEventListener("selectionchange", onChange);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("selectionchange", onChange);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [evaluate, disabled]);

  useEffect(() => {
    if (disabled || !hotkey || !picked) return;
    const want = hotkey.toLowerCase().split(/\s+/);
    const onKey = (e: KeyboardEvent) => {
      const mod = want.includes("mod") ? e.ctrlKey || e.metaKey : true;
      const shift = want.includes("shift") === e.shiftKey;
      const last = want[want.length - 1] as string;
      const keyOk = last === "space" ? e.code === "Space" : e.key.toLowerCase() === last;
      if (mod && shift && keyOk && phaseRef.current === "pill") {
        e.preventDefault();
        setPhase("panel");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey, picked, disabled]);

  const ask = async (req: AskAiRequest) => {
    const id = ++requestId.current;
    setLastPrompt(req);
    setAnswer({ status: "loading" });
    let result: { text: string } | { error: string };
    try {
      result = readOutcome(await onAsk(req));
    } catch (e) {
      result = { error: e instanceof Error ? e.message : "" };
    }
    if (id !== requestId.current) return;
    setAnswer("text" in result ? { status: "done", text: result.text } : { status: "error", message: result.error || t.failed });
  };

  const submit = () => {
    const prompt = question.trim();
    if (!picked || prompt === "" || answer.status === "loading") return;
    void ask({ prompt, selection: picked.text });
  };

  const virtualAnchor = useMemo(() => (picked ? { getBoundingClientRect: () => picked.range.getBoundingClientRect() } : undefined), [picked]);
  const open = Boolean(picked) && !disabled;

  return (
    <div
      ref={ref}
      data-slot="ask-ai-selection"
      className={className}
      onPointerDown={() => {
        pointerDown.current = true;
      }}
      {...props}
    >
      {children}
      <BasePopover.Root
        open={open}
        onOpenChange={(next, details) => {
          if (next) return;
          // A press elsewhere collapses the selection, which hides the pill. Only the open panel needs to close itself.
          if (phaseRef.current === "panel" || details.reason === "escape-key") {
            reset();
            window.getSelection()?.removeAllRanges();
          }
        }}
      >
        <BasePopover.Portal>
          <BasePopover.Positioner anchor={virtualAnchor} side={phase === "pill" ? "top" : "bottom"} align="center" sideOffset={8} collisionPadding={8} className="z-50 outline-none">
            <BasePopover.Popup
              data-slot="ask-ai-popup"
              data-phase={phase}
              initialFocus={false}
              finalFocus={false}
              aria-label={t.title}
              className={cn(
                "max-w-[var(--available-width)] rounded-floating border border-border bg-popover text-body-sm text-popover-foreground shadow-floating outline-none",
                "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
                phase === "pill" ? "p-1" : "w-[22rem] p-3",
              )}
            >
              {picked && phase === "pill" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  // Keep the selection: a press on the pill must not collapse it.
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setPhase("panel")}
                  className="gap-1.5"
                >
                  <Sparkles aria-hidden className="text-nq-accent-text" />
                  {t.ask}
                  {keys.length > 0 ? (
                    <span dir="ltr" className="ms-1 hidden items-center gap-0.5 sm:inline-flex">
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  ) : null}
                </Button>
              ) : null}
              {picked && phase === "panel" ? (
                <Panel
                  t={t}
                  picked={picked}
                  quick={quick}
                  answer={answer}
                  question={question}
                  setQuestion={setQuestion}
                  onSubmit={submit}
                  onQuick={(id) => {
                    const a = quick.find((x) => x.id === id);
                    if (a) void ask({ prompt: a.label, selection: picked.text, actionId: a.id });
                  }}
                  onRetry={() => lastPrompt && void ask(lastPrompt)}
                  onAnother={() => {
                    requestId.current++;
                    setAnswer({ status: "idle" });
                    setLastPrompt(null);
                  }}
                  onReplace={onReplace}
                  onClose={() => {
                    reset();
                    window.getSelection()?.removeAllRanges();
                  }}
                />
              ) : null}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    </div>
  );
}

function Panel({
  t,
  picked,
  quick,
  answer,
  question,
  setQuestion,
  onSubmit,
  onQuick,
  onRetry,
  onAnother,
  onReplace,
  onClose,
}: {
  t: AskAiLabels;
  picked: Picked;
  quick: readonly AiAction[];
  answer: Answer;
  question: string;
  setQuestion: (v: string) => void;
  onSubmit: () => void;
  onQuick: (id: string) => void;
  onRetry: () => void;
  onAnother: () => void;
  onReplace?: (answer: string, selection: string) => void;
  onClose: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  const busy = answer.status === "loading";
  return (
    <div data-slot="ask-ai-panel" className="flex flex-col gap-3" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
          <Sparkles aria-hidden className="size-4 text-nq-accent-text" />
          {t.ask}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={t.close} onClick={onClose}>
          <X aria-hidden />
        </Button>
      </div>
      <figure className="flex flex-col gap-1">
        <figcaption className="sr-only">{t.selected}</figcaption>
        <blockquote dir="auto" className="line-clamp-3 border-s-2 border-nq-line-strong ps-3 text-caption text-muted-foreground">
          {shortenMiddle(picked.text, 220)}
        </blockquote>
        {picked.truncated ? <span className="text-caption text-muted-foreground">{t.truncated}</span> : null}
      </figure>
      {answer.status === "idle" || answer.status === "error" ? (
        <>
          {answer.status === "error" ? (
            <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={onRetry}>{t.retry}</Button>}>
              {answer.message}
            </Alert>
          ) : null}
          {quick.length > 0 ? <AiSuggestionChips suggestions={quick} onPick={onQuick} label={t.quick} /> : null}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <Textarea
              ref={input}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              rows={1}
              aria-label={t.inputLabel}
              placeholder={t.placeholder}
              dir="auto"
              className="min-h-control flex-1 resize-none"
            />
            <Button type="submit" variant="primary" size="icon" aria-label={t.send} disabled={question.trim() === ""}>
              <Send aria-hidden className="rtl:-scale-x-100" />
            </Button>
          </form>
        </>
      ) : null}
      {busy ? <AiThinking compact label={t.thinking} /> : null}
      {answer.status === "done" ? (
        <div className="flex flex-col gap-2">
          <div className="max-h-64 overflow-y-auto">
            <AiStreamingText text={answer.text} />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <AiGeneratedLabel />
            <span className="flex-1" />
            <CopyButton value={answer.text} variant="ghost" size="icon-sm" label={t.copy} />
            {onReplace ? (
              <Button variant="ghost" size="sm" onClick={() => onReplace(answer.text, picked.text)}>
                <RefreshCw aria-hidden />
                {t.replace}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onAnother}>
              {t.another}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ insight card */

type InsightTone = "info" | "success" | "warning" | "danger" | "neutral";

const TONE_BORDER: Record<InsightTone, string> = {
  neutral: "border-s-nq-accent",
  info: "border-s-nq-info",
  success: "border-s-nq-success",
  warning: "border-s-nq-warning",
  danger: "border-s-nq-danger",
};
const TONE_TEXT: Record<InsightTone, string> = {
  neutral: "text-nq-accent-text",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};

export interface AiInsightAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}

export interface AiInsightMetric {
  label: ReactNode;
  value: number | string;
  format?: FormatNumberOptions;
  /** Change as a fraction: 0.124 is +12.4%. */
  delta?: number;
  /** Down is good, for costs and errors. */
  invert?: boolean;
}

export interface AiInsightCardProps extends Omit<ComponentProps<"section">, "title" | "children"> {
  /** The finding in one line: "Signups dropped 18% on mobile". */
  title: ReactNode;
  /** Markdown with the detail: why it matters and what to do. */
  body?: string;
  /** Colours the edge and the small label. Default `neutral` (the AI accent). */
  tone?: InsightTone;
  metric?: AiInsightMetric;
  /** 0 to 1. */
  confidence?: number;
  /** What the insight is based on. */
  sources?: readonly AiCitationSource[];
  model?: string;
  actions?: readonly AiInsightAction[];
  onAction?: (id: string) => void;
  /** Adds an "Ask AI about this" button that starts a follow-up. */
  onAsk?: () => void;
  /** Adds a dismiss button. */
  onDismiss?: () => void;
  feedback?: "up" | "down" | null;
  onFeedback?: (value: "up" | "down") => void;
  /** Show a shimmer while the insight is being worked out. */
  loading?: boolean;
  /** The body is still arriving. */
  streaming?: boolean;
  /** `inline` drops the card chrome: a tinted strip that sits inside a page or a chart. Default `card`. */
  variant?: "card" | "inline";
  labels?: Partial<AskAiLabels>;
}

/**
 * An insight the AI found, placed where it applies: a labelled card with the finding, a metric, the reasoning, the
 * sources it used, how sure it is, and what to do next. Always marked as AI output. It holds no model logic.
 */
export function AiInsightCard({
  title,
  body,
  tone = "neutral",
  metric,
  confidence,
  sources,
  model,
  actions,
  onAction,
  onAsk,
  onDismiss,
  feedback,
  onFeedback,
  loading,
  streaming,
  variant = "card",
  labels,
  className,
  ...props
}: AiInsightCardProps) {
  const t = useLabels(labels);
  const inline = variant === "inline";
  const dTone = metric?.delta === undefined ? "neutral" : deltaTone(metric.delta, metric.invert);
  const content = (
    <>
      <div className="flex items-start gap-2">
        <Sparkles aria-hidden className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[tone])} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("text-caption font-medium", TONE_TEXT[tone])}>
            {t.insight}
            <span aria-hidden> · </span>
            {t.tone[tone]}
          </span>
          <div dir="auto" className="text-body-sm font-semibold text-foreground">
            {title}
          </div>
        </div>
        {model ? (
          <bdi dir="ltr" className="hidden shrink-0 text-caption text-muted-foreground sm:inline">
            {model}
          </bdi>
        ) : null}
        {onDismiss ? (
          <Button variant="ghost" size="icon-sm" aria-label={t.dismiss} onClick={onDismiss} className="-my-1 -me-1">
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      {loading ? (
        <AiShimmer lines={2} label={t.loading} />
      ) : (
        <>
          {metric ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-caption text-muted-foreground">{metric.label}</span>
              <span className="text-h3 tabular-nums text-foreground">{typeof metric.value === "number" ? <Num value={metric.value} format={metric.format} /> : metric.value}</span>
              {metric.delta !== undefined ? (
                <span className={cn("text-caption tabular-nums", dTone === "positive" && "text-nq-success-text", dTone === "negative" && "text-nq-danger-text", dTone === "neutral" && "text-muted-foreground")}>
                  <Num value={metric.delta} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} />
                </span>
              ) : null}
            </div>
          ) : null}
          {body ? (streaming ? <AiStreamingText text={body} streaming /> : <Markdown className="text-body-sm">{body}</Markdown>) : null}
          {confidence !== undefined ? <AiConfidenceMeter value={confidence} /> : null}
          {sources && sources.length > 0 ? <AiSourceChips sources={sources} label={t.sources} /> : null}
        </>
      )}
      {!loading && (actions?.length || onAsk || onFeedback) ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions?.map((a) => (
            <Button key={a.id} size="sm" variant={a.variant ?? "secondary"} onClick={() => onAction?.(a.id)}>
              {a.label}
            </Button>
          ))}
          {onAsk ? (
            <Button size="sm" variant="ghost" onClick={onAsk}>
              <Sparkles aria-hidden className="text-nq-accent-text" />
              {t.askMore}
            </Button>
          ) : null}
          <span className="flex-1" />
          {onFeedback ? <AiFeedback value={feedback} onChange={onFeedback} labels={{ good: t.good, bad: t.bad }} /> : null}
        </div>
      ) : null}
    </>
  );
  if (inline) {
    return (
      <section data-slot="ai-insight-card" data-variant="inline" data-tone={tone} aria-busy={loading || streaming || undefined} className={cn("flex min-w-0 flex-col gap-2 rounded-control border-s-4 bg-secondary p-3", TONE_BORDER[tone], className)} {...props}>
        {content}
      </section>
    );
  }
  return (
    <Card data-slot="ai-insight-card" data-variant="card" data-tone={tone} className={cn("min-w-0 border-s-4", TONE_BORDER[tone], className)} {...(props as ComponentProps<typeof Card>)}>
      <CardContent className="flex flex-col gap-3">{content}</CardContent>
    </Card>
  );
}
