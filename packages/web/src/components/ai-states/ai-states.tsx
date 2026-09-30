"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Check, ChevronDown, CornerDownLeft, type LucideIcon, RefreshCw, Sparkles, Square, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";
import { useModHotkey, useShortcutKeys } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button, type ButtonProps } from "../button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { CopilotSources, type CopilotSource } from "../copilot-chat";
import { CopyButton } from "../copy-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { Icon } from "../icon";
import { Markdown } from "../markdown";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { Spinner } from "../spinner";
import { Kbd } from "../text";
import {
  type AiActionLike,
  type AiConfidence,
  confidenceLevel,
  confidencePercent,
  cycleIndex,
  groupAiActions,
  nextRevealLength,
  safePartialMarkdown,
  stepState,
  summaryToText,
} from "./ai-states-logic";

export {
  confidenceLevel,
  confidencePercent,
  cycleIndex,
  groupAiActions,
  nextRevealLength,
  safePartialMarkdown,
  scoreAction,
  stepState,
  summaryToText,
  type AiActionGroups,
  type AiActionLike,
  type AiConfidence,
  type AiStepState,
} from "./ai-states-logic";
export type { CopilotSource } from "../copilot-chat";

const STRINGS = {
  en: {
    ask: "Ask AI",
    generating: "Generating",
    moreActions: "More AI actions",
    actionsTitle: "AI actions",
    actionsPlaceholder: "What should AI do?",
    recommended: "Recommended",
    allActions: "All actions",
    noActions: "No matching actions",
    navigate: "Navigate",
    run: "Run",
    close: "Close",
    suggestions: "AI suggestions",
    dismiss: (label: string) => `Dismiss ${label}`,
    thinking: "Thinking",
    stepDone: "Done",
    stepActive: "In progress",
    stepPending: "Waiting",
    ready: "Response ready",
    stop: "Stop",
    stopped: "Stopped",
    regenerate: "Regenerate",
    streaming: "Writing",
    failed: "Something went wrong",
    aiGenerated: "AI generated",
    summary: "Summary",
    tldr: "TL;DR",
    keyPoints: "Key points",
    sources: "Sources",
    confidence: "Confidence",
    high: "High",
    medium: "Medium",
    low: "Low",
    showFull: "Show full summary",
    hideFull: "Hide full summary",
    copy: "Copy summary",
    good: "Good summary",
    bad: "Not helpful",
    thanks: "Thanks for the feedback",
    disclaimer: "AI can make mistakes. Check important details.",
    loading: "Summarizing",
  },
  ar: {
    ask: "اسأل الذكاء الاصطناعي",
    generating: "جارٍ التوليد",
    moreActions: "المزيد من إجراءات الذكاء الاصطناعي",
    actionsTitle: "إجراءات الذكاء الاصطناعي",
    actionsPlaceholder: "ماذا تريد أن ينفّذ الذكاء الاصطناعي؟",
    recommended: "موصى بها",
    allActions: "كل الإجراءات",
    noActions: "لا توجد إجراءات مطابقة",
    navigate: "تنقّل",
    run: "تنفيذ",
    close: "إغلاق",
    suggestions: "اقتراحات الذكاء الاصطناعي",
    dismiss: (label: string) => `تجاهل ${label}`,
    thinking: "جارٍ التفكير",
    stepDone: "تمّت",
    stepActive: "قيد التنفيذ",
    stepPending: "بالانتظار",
    ready: "الرد جاهز",
    stop: "إيقاف",
    stopped: "تم الإيقاف",
    regenerate: "إعادة التوليد",
    streaming: "جارٍ الكتابة",
    failed: "حدث خطأ ما",
    aiGenerated: "مُولَّد بالذكاء الاصطناعي",
    summary: "الملخص",
    tldr: "باختصار",
    keyPoints: "النقاط الرئيسية",
    sources: "المصادر",
    confidence: "درجة الثقة",
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
    showFull: "عرض الملخص الكامل",
    hideFull: "إخفاء الملخص الكامل",
    copy: "نسخ الملخص",
    good: "ملخص جيد",
    bad: "غير مفيد",
    thanks: "شكرًا على ملاحظتك",
    disclaimer: "قد يخطئ الذكاء الاصطناعي. تحقق من التفاصيل المهمة.",
    loading: "جارٍ التلخيص",
  },
};

export type AiStatesLabels = Omit<(typeof STRINGS)["en"], "dismiss"> & { dismiss: (label: string) => string };

function useLabels(labels?: Partial<AiStatesLabels>): AiStatesLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

const subscribeMotion = (onChange: () => void) => {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

/** True when the visitor asked for less motion. Streaming shows at once and shimmer holds still. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** An action offered by the split button, the menu and the chips. */
export interface AiAction extends AiActionLike {
  icon?: LucideIcon;
  /** Key sequence shown at the inline end, e.g. "Mod Shift S". Display only. */
  shortcut?: string;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ smart actions */

export interface AiSparkleButtonProps extends ButtonProps {
  /** Work is running: the button shows the spinner and stays focusable. */
  generating?: boolean;
  /** Draws the Cmd/Ctrl+J hint after the label. */
  showShortcut?: boolean;
  labels?: Partial<AiStatesLabels>;
}

/** The one entry point to an AI feature: a button with the sparkle. */
export function AiSparkleButton({ generating, showShortcut, labels, children, className, ...props }: AiSparkleButtonProps) {
  const t = useLabels(labels);
  const keys = useShortcutKeys("Mod J");
  return (
    <Button data-slot="ai-sparkle-button" loading={generating} className={cn(className as string)} {...props}>
      {generating ? null : <Sparkles aria-hidden className="text-nq-accent-text" />}
      {children ?? (generating ? t.generating : t.ask)}
      {showShortcut && !generating ? (
        <span aria-hidden className="ms-1 hidden gap-0.5 sm:inline-flex">
          {keys.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </span>
      ) : null}
    </Button>
  );
}

export interface AiSplitButtonProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  /** The main action on the left half. Default "Ask AI". */
  label?: ReactNode;
  /** Runs the main action. */
  onRun?: () => void;
  /** Other actions in the menu on the other half. */
  actions: readonly AiAction[];
  onAction: (id: string) => void;
  generating?: boolean;
  disabled?: boolean;
  variant?: ButtonProps["variant"];
  labels?: Partial<AiStatesLabels>;
}

/** The main AI action with a menu of alternatives, e.g. "Summarize" plus Translate, Rewrite, Fix grammar. */
export function AiSplitButton({ label, onRun, actions, onAction, generating, disabled, variant = "secondary", labels, className, ...props }: AiSplitButtonProps) {
  const t = useLabels(labels);
  return (
    <div data-slot="ai-split-button" role="group" className={cn("inline-flex items-stretch", className)} {...props}>
      <AiSparkleButton variant={variant} generating={generating} disabled={disabled} onClick={onRun} labels={labels} className="rounded-e-none border-e-0">
        {label}
      </AiSparkleButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant={variant} size="icon" aria-label={t.moreActions} disabled={disabled || generating} className="rounded-s-none" />}
        >
          <ChevronDown aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          {actions.map((a) => (
            <DropdownMenuItem key={a.id} disabled={a.disabled} onClick={() => onAction(a.id)} shortcut={a.shortcut ? <ShortcutText shortcut={a.shortcut} /> : undefined}>
              {a.icon ? <a.icon aria-hidden /> : <Sparkles aria-hidden />}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ShortcutText({ shortcut }: { shortcut: string }) {
  const keys = useShortcutKeys(shortcut);
  return (
    <span dir="ltr" className="inline-flex gap-0.5">
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </span>
  );
}

export interface AiSuggestionChipsProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  suggestions: readonly Pick<AiAction, "id" | "label" | "icon">[];
  onPick: (id: string) => void;
  /** Shows a dismiss button on each chip. */
  onDismiss?: (id: string) => void;
  /** Accessible name of the group. Default "AI suggestions". */
  label?: string;
  labels?: Partial<AiStatesLabels>;
}

/** Inline suggestions next to a field or under an answer. One tap runs one. */
export function AiSuggestionChips({ suggestions, onPick, onDismiss, label, labels, className, ...props }: AiSuggestionChipsProps) {
  const t = useLabels(labels);
  if (suggestions.length === 0) return null;
  return (
    <div role="group" aria-label={label ?? t.suggestions} data-slot="ai-suggestion-chips" className={cn("flex flex-wrap gap-1.5", className)} {...props}>
      {suggestions.map((s) => (
        <span key={s.id} className="inline-flex max-w-full items-center rounded-full border border-border bg-card text-caption text-foreground transition-colors duration-150 ease-nq focus-within:outline-2 focus-within:outline-nq-focus hover:bg-nq-hover">
          <button
            type="button"
            onClick={() => onPick(s.id)}
            className={cn("inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-full ps-2.5 outline-none", onDismiss ? "pe-1.5" : "pe-2.5")}
          >
            {s.icon ? <s.icon aria-hidden className="size-3.5 shrink-0 text-nq-accent-text" /> : <Sparkles aria-hidden className="size-3.5 shrink-0 text-nq-accent-text" />}
            <span dir="auto" className="truncate">
              {s.label}
            </span>
          </button>
          {onDismiss ? (
            <button
              type="button"
              aria-label={t.dismiss(s.label)}
              onClick={() => onDismiss(s.id)}
              className="me-1 grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <X aria-hidden className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export interface AiActionMenuProps {
  actions: readonly AiAction[];
  /** Runs the chosen action. The menu closes first. */
  onAction: (id: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Registers Cmd+J / Ctrl+J. Default true. */
  hotkey?: boolean;
  /** Placeholder of the search box. */
  placeholder?: string;
  labels?: Partial<AiStatesLabels>;
}

interface ActionSection {
  id: string;
  label: string;
  items: AiAction[];
}

/**
 * The Cmd+J (Ctrl+J) menu: search the AI actions, with the ones that fit the current context listed first
 * under Recommended. Keyboard and screen reader friendly through Base UI Autocomplete inside a Dialog.
 */
export function AiActionMenu({ actions, onAction, open: controlledOpen, onOpenChange, hotkey = true, placeholder, labels }: AiActionMenuProps) {
  const t = useLabels(labels);
  const [local, setLocal] = useState(false);
  const open = controlledOpen ?? local;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setLocal(next);
    onOpenChange?.(next);
  };
  const [query, setQuery] = useState("");
  const hintId = useId();
  useModHotkey("j", () => setOpen(!open), hotkey);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const sections = useMemo<ActionSection[]>(() => {
    const g = groupAiActions(actions, query);
    const out: ActionSection[] = [];
    if (g.recommended.length) out.push({ id: "recommended", label: t.recommended, items: g.recommended });
    if (g.others.length) out.push({ id: "all", label: g.recommended.length ? t.allActions : query.trim() ? t.actionsTitle : t.allActions, items: g.others });
    return out;
  }, [actions, query, t.recommended, t.allActions, t.actionsTitle]);

  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60" />
        <BaseDialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12dvh]">
          <BaseDialog.Popup
            data-slot="ai-action-menu"
            aria-label={t.actionsTitle}
            className="flex max-h-[min(30rem,76dvh)] w-full max-w-lg flex-col overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0"
          >
            <Autocomplete.Root
              open
              inline
              items={sections}
              filteredItems={sections}
              value={query}
              onValueChange={(v) => setQuery(v)}
              itemToStringValue={(item: unknown) => (item as AiAction).label}
              autoHighlight="always"
              keepHighlight
            >
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Sparkles aria-hidden className="size-4 shrink-0 text-nq-accent-text" />
                <Autocomplete.Input
                  aria-describedby={hintId}
                  placeholder={placeholder ?? t.actionsPlaceholder}
                  className="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
                />
                <BaseDialog.Close className="shrink-0 rounded-[3px] outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                  <Kbd>Esc</Kbd>
                  <span className="sr-only">{t.close}</span>
                </BaseDialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                <Autocomplete.Empty className="flex min-h-20 items-center justify-center text-body-sm text-muted-foreground empty:hidden">{t.noActions}</Autocomplete.Empty>
                <Autocomplete.List>
                  {(section: ActionSection) => (
                    <Autocomplete.Group key={section.id} items={section.items} className="not-last:mb-1.5">
                      <Autocomplete.GroupLabel className="px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground">{section.label}</Autocomplete.GroupLabel>
                      <Autocomplete.Collection>
                        {(item: AiAction) => (
                          <Autocomplete.Item
                            key={item.id}
                            value={item}
                            disabled={item.disabled}
                            onClick={() => {
                              setOpen(false);
                              onAction(item.id);
                            }}
                            className="flex min-h-10 cursor-default select-none items-center gap-3 rounded-control px-2.5 py-1.5 text-body-sm text-foreground outline-none data-highlighted:bg-nq-selected data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
                          >
                            {item.icon ? <item.icon aria-hidden /> : <Sparkles aria-hidden />}
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span dir="auto" className="truncate">
                                {item.label}
                              </span>
                              {item.description ? (
                                <span dir="auto" className="truncate text-caption text-muted-foreground">
                                  {item.description}
                                </span>
                              ) : null}
                            </span>
                            {item.shortcut ? <ShortcutText shortcut={item.shortcut} /> : null}
                          </Autocomplete.Item>
                        )}
                      </Autocomplete.Collection>
                    </Autocomplete.Group>
                  )}
                </Autocomplete.List>
              </div>
              <div id={hintId} className="flex items-center gap-4 border-t border-border bg-nq-surface-soft px-4 py-2 text-caption text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> {t.navigate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>
                    <CornerDownLeft aria-hidden className="size-3" />
                  </Kbd>{" "}
                  {t.run}
                </span>
              </div>
            </Autocomplete.Root>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/* ------------------------------------------------------------------ loading */

export interface AiThinkingProps extends Omit<ComponentProps<"div">, "children"> {
  /** Text of the indicator when there are no steps. Default "Thinking". */
  label?: string;
  /** Named stages, e.g. "Reading the document", "Finding key points", "Writing". */
  steps?: readonly string[];
  /** Index of the running step. Omit to let the labels rotate on their own. */
  current?: number;
  /** One line that shows only the running step, instead of the whole list. */
  compact?: boolean;
  /** How often the labels rotate when `current` is not set, in ms. Default 1800. */
  interval?: number;
  labels?: Partial<AiStatesLabels>;
}

/** Three pulsing dots, the sparkle, and the stage the AI is in. Static (no pulse) under reduced motion. */
export function AiThinking({ label, steps, current, compact, interval = 1800, labels, className, ...props }: AiThinkingProps) {
  const t = useLabels(labels);
  const list = steps ?? [];
  const [auto, setAuto] = useState(0);
  useEffect(() => {
    if (current !== undefined || list.length < 2) return;
    const id = setInterval(() => setAuto((i) => cycleIndex(i, list.length)), interval);
    return () => clearInterval(id);
  }, [current, list.length, interval]);
  const active = current ?? auto;
  const dots = (
    <span aria-hidden className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-nq-accent motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </span>
  );
  const running = list[Math.min(active, list.length - 1)];
  return (
    <div
      data-slot="ai-thinking"
      role="status"
      aria-live="polite"
      className={cn("flex flex-col gap-2 text-body-sm text-muted-foreground", className)}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        <Sparkles aria-hidden className="size-4 text-nq-accent-text motion-safe:animate-pulse" />
        <span>{compact && running ? running : (label ?? t.thinking)}</span>
        {dots}
      </span>
      {!compact && list.length > 0 ? (
        <ol className="flex flex-col gap-1.5 ps-1">
          {list.map((s, i) => {
            const st = stepState(i, active);
            return (
              <li key={s} data-state={st} className={cn("flex items-center gap-2 text-caption", st === "pending" && "opacity-60", st === "active" && "text-foreground")}>
                <span aria-hidden className="grid size-4 shrink-0 place-items-center">
                  {st === "done" ? <Check className="size-3.5 text-nq-success-text" /> : st === "active" ? <Spinner className="size-3.5" /> : <span className="size-1.5 rounded-full bg-nq-line-strong" />}
                </span>
                <span dir="auto">{s}</span>
                <span className="sr-only">{st === "done" ? t.stepDone : st === "active" ? t.stepActive : t.stepPending}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

export interface AiShimmerProps extends Omit<ComponentProps<"div">, "children"> {
  /** Placeholder lines. Default 3. */
  lines?: number;
  /** Announced to screen readers. Default "Thinking". */
  label?: string;
  labels?: Partial<AiStatesLabels>;
}

const LINE_WIDTHS = [96, 88, 92, 64, 78];

/**
 * Text placeholder with one light sweep across all lines, for an answer that has not started yet.
 * The sweep follows the reading direction and does not run under reduced motion.
 */
export function AiShimmer({ lines = 3, label, labels, className, ...props }: AiShimmerProps) {
  const t = useLabels(labels);
  const sweep = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = sweep.current;
    if (!el || reduced || typeof el.animate !== "function") return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const anim = el.animate(
      { transform: rtl ? ["translateX(100%)", "translateX(-100%)"] : ["translateX(-100%)", "translateX(100%)"] },
      { duration: 1500, iterations: Number.POSITIVE_INFINITY, easing: "ease-in-out" },
    );
    return () => anim.cancel();
  }, [reduced]);
  return (
    <div
      data-slot="ai-shimmer"
      role="status"
      aria-busy="true"
      className={cn("relative flex flex-col gap-2.5 overflow-hidden rounded-control", className)}
      {...props}
    >
      <span className="sr-only">{label ?? t.thinking}</span>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} aria-hidden className="block h-3 rounded-[4px] bg-secondary" style={{ inlineSize: `${LINE_WIDTHS[i % LINE_WIDTHS.length]}%` }} />
      ))}
      {reduced ? null : (
        <span
          ref={sweep}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--nq-bg)_65%,transparent),transparent)]"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ generating */

export interface AiStreamingTextProps extends Omit<ComponentProps<"div">, "children"> {
  /** The text so far. Append tokens to it as they arrive. */
  text: string;
  /** More text is still coming. Shows the caret and keeps the display safe for half-written Markdown. */
  streaming?: boolean;
  /** Types the text out smoothly instead of showing each chunk as it lands. Default true. */
  reveal?: boolean;
  /** Reveal speed in characters a second. It speeds up on its own when the stream runs ahead. Default 90. */
  cps?: number;
  /** Render as Markdown (safe while partial). Default true. Off keeps the text plain. */
  markdown?: boolean;
  /** Draw the caret while streaming. Default true. */
  caret?: boolean;
  /** Fires once the whole text is on screen and streaming has stopped. */
  onRevealed?: () => void;
  labels?: Partial<AiStatesLabels>;
}

const CARET =
  "after:ms-0.5 after:inline-block after:h-[1.05em] after:w-[2px] after:translate-y-[0.2em] after:rounded-[1px] after:bg-nq-accent after:content-[''] motion-safe:after:animate-pulse";
/** The same caret on the last block of the rendered Markdown (Tailwind needs the classes written out). */
const MARKDOWN_CARET =
  "[&_[data-slot=markdown]>:last-child]:after:ms-0.5 [&_[data-slot=markdown]>:last-child]:after:inline-block [&_[data-slot=markdown]>:last-child]:after:h-[1.05em] [&_[data-slot=markdown]>:last-child]:after:w-[2px] [&_[data-slot=markdown]>:last-child]:after:translate-y-[0.2em] [&_[data-slot=markdown]>:last-child]:after:rounded-[1px] [&_[data-slot=markdown]>:last-child]:after:bg-nq-accent [&_[data-slot=markdown]>:last-child]:after:content-[''] motion-safe:[&_[data-slot=markdown]>:last-child]:after:animate-pulse";

/**
 * Streaming answer text: a caret at the end, a progressive reveal, and Markdown that stays valid while it is
 * half written (open code fences and bold are closed for display, dangling links lose their syntax).
 * Under reduced motion the text appears at once and the caret does not pulse. Screen readers are told once
 * the answer is ready, not on every token.
 */
export function AiStreamingText({ text, streaming = false, reveal = true, cps = 90, markdown = true, caret = true, onRevealed, labels, className, ...props }: AiStreamingTextProps) {
  const t = useLabels(labels);
  const reduced = usePrefersReducedMotion();
  const smooth = reveal && !reduced;
  const [shown, setShown] = useState(smooth ? 0 : text.length);
  const textRef = useRef(text);
  textRef.current = text;
  const done = useRef(onRevealed);
  done.current = onRevealed;
  const announced = useRef(false);

  // A shorter text (regenerate, new answer) starts over.
  useEffect(() => {
    setShown((s) => (s > text.length ? (smooth ? 0 : text.length) : s));
    if (streaming) announced.current = false;
  }, [text, smooth, streaming]);

  useEffect(() => {
    if (!smooth) {
      setShown(text.length);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const target = textRef.current;
      setShown((s) => nextRevealLength(Math.min(s, target.length), target.length, now - last, target, cps));
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [smooth, cps, text.length]);

  const visible = smooth ? text.slice(0, Math.min(shown, text.length)) : text;
  const caughtUp = visible.length >= text.length;
  const finished = !streaming && caughtUp;
  useEffect(() => {
    if (finished && text && !announced.current) {
      announced.current = true;
      done.current?.();
    }
  }, [finished, text]);

  const showCaret = caret && !finished;
  return (
    <div
      data-slot="ai-streaming-text"
      data-streaming={!finished || undefined}
      aria-busy={!finished}
      className={cn("min-w-0", className)}
      {...props}
    >
      <div aria-live="off" className={cn(showCaret && MARKDOWN_CARET)}>
        {markdown ? (
          <Markdown>{finished ? text : safePartialMarkdown(visible)}</Markdown>
        ) : (
          <p dir="auto" data-slot="ai-plain" className={cn("whitespace-pre-wrap text-start text-body text-nq-fg-body", showCaret && CARET)}>
            {visible}
          </p>
        )}
      </div>
      <span role="status" className="sr-only">
        {finished && text ? t.ready : ""}
      </span>
    </div>
  );
}

export type AiStreamState = "idle" | "streaming" | "stopped" | "done" | "error";

export interface AiStreamControlsProps extends Omit<ComponentProps<"div">, "children"> {
  state: AiStreamState;
  onStop?: () => void;
  onRegenerate?: () => void;
  labels?: Partial<AiStatesLabels>;
}

/** Stop while it writes, Regenerate once it is done, stopped or failed. */
export function AiStreamControls({ state, onStop, onRegenerate, labels, className, ...props }: AiStreamControlsProps) {
  const t = useLabels(labels);
  return (
    <div data-slot="ai-stream-controls" data-state={state} className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
      {state === "streaming" ? (
        <Button size="sm" variant="secondary" onClick={onStop}>
          <Square aria-hidden className="fill-current" />
          {t.stop}
        </Button>
      ) : state !== "idle" && onRegenerate ? (
        <Button size="sm" variant="secondary" onClick={onRegenerate}>
          <Icon icon={RefreshCw} />
          {t.regenerate}
        </Button>
      ) : null}
      <span role="status" className="text-caption text-muted-foreground">
        {state === "streaming" ? t.streaming : state === "stopped" ? t.stopped : state === "error" ? t.failed : ""}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ summarized */

export interface AiGeneratedLabelProps extends ComponentProps<"span"> {
  /** Model or feature name after the label, e.g. "Claude". Kept left to right. */
  model?: string;
  labels?: Partial<AiStatesLabels>;
}

/** The "AI generated" mark that goes on anything a model wrote. */
export function AiGeneratedLabel({ model, labels, className, ...props }: AiGeneratedLabelProps) {
  const t = useLabels(labels);
  return (
    <Badge data-slot="ai-generated-label" variant="accent" className={cn("gap-1", className)} {...props}>
      <Sparkles aria-hidden />
      {t.aiGenerated}
      {model ? (
        <bdi dir="ltr" className="font-normal opacity-80">
          {model}
        </bdi>
      ) : null}
    </Badge>
  );
}

export interface AiConfidenceMeterProps extends Omit<ComponentProps<"div">, "children"> {
  /** 0 to 1. */
  value: number;
  labels?: Partial<AiStatesLabels>;
}

const CONFIDENCE_TONE = { high: "success", medium: "warning", low: "danger" } as const;

/** How sure the model is: a small bar, the level as a word and the percentage. Never colour alone. */
export function AiConfidenceMeter({ value, labels, className, ...props }: AiConfidenceMeterProps) {
  const t = useLabels(labels);
  const level: AiConfidence = confidenceLevel(value);
  const pct = confidencePercent(value);
  return (
    <div data-slot="ai-confidence" data-level={level} className={cn("flex items-center gap-2 text-caption text-muted-foreground", className)} {...props}>
      <span>{t.confidence}</span>
      <Progress value={pct} size="sm" tone={CONFIDENCE_TONE[level]} aria-label={t.confidence} className="w-16" />
      <span className="text-foreground">
        {t[level]} <Num value={pct / 100} format={{ style: "percent" }} />
      </span>
    </div>
  );
}

export interface AiFeedbackProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  value?: "up" | "down" | null;
  onChange?: (value: "up" | "down") => void;
  labels?: Partial<AiStatesLabels>;
}

/** Thumbs up and down. The chosen one is pressed; the rest of the summary stays as it is. */
export function AiFeedback({ value, onChange, labels, className, ...props }: AiFeedbackProps) {
  const t = useLabels(labels);
  return (
    <div data-slot="ai-feedback" role="group" className={cn("inline-flex items-center", className)} {...props}>
      <Button variant="ghost" size="icon-sm" aria-label={t.good} aria-pressed={value === "up"} onClick={() => onChange?.("up")} className="aria-pressed:text-nq-success-text">
        <ThumbsUp aria-hidden />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={t.bad} aria-pressed={value === "down"} onClick={() => onChange?.("down")} className="aria-pressed:text-nq-danger-text">
        <ThumbsDown aria-hidden />
      </Button>
      <span role="status" className="sr-only">
        {value ? t.thanks : ""}
      </span>
    </div>
  );
}

export interface AiSummaryProps extends Omit<ComponentProps<"div">, "children" | "title" | "onCopy"> {
  /** One or two sentences. */
  tldr: string;
  /** Key points, one short sentence each. */
  points?: readonly string[];
  /** The long version, as Markdown. Shown when expanded. */
  full?: string;
  sources?: readonly CopilotSource[];
  /** 0 to 1. Shows the confidence meter. */
  confidence?: number;
  /** Model name shown next to the AI generated label. */
  model?: string;
  /** Heading. Default "Summary". */
  title?: ReactNode;
  /** No result yet: shows the shimmer and the label. */
  loading?: boolean;
  /** The summary is still being written: streams the TL;DR with a caret. */
  streaming?: boolean;
  defaultExpanded?: boolean;
  feedback?: "up" | "down" | null;
  onFeedback?: (value: "up" | "down") => void;
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  labels?: Partial<AiStatesLabels>;
}

/**
 * A finished AI summary: TL;DR first, key points, the long version behind a toggle, the sources it came from,
 * how confident the model is, and the controls people expect (copy, thumbs, regenerate). Always labelled
 * "AI generated" and says to check important details.
 */
export function AiSummary({
  tldr,
  points,
  full,
  sources,
  confidence,
  model,
  title,
  loading,
  streaming,
  defaultExpanded = false,
  feedback,
  onFeedback,
  onCopy,
  onRegenerate,
  labels,
  className,
  ...props
}: AiSummaryProps) {
  const t = useLabels(labels);
  const [open, setOpen] = useState(defaultExpanded);
  const headingId = useId();
  const busy = loading || streaming;
  return (
    <Card role="region" data-slot="ai-summary" aria-labelledby={headingId} aria-busy={busy || undefined} className={cn("min-w-0", className)} {...props}>
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle as="h3" className="flex items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-nq-accent-text" />
          <span id={headingId}>{title ?? t.summary}</span>
        </CardTitle>
        <AiGeneratedLabel model={model} labels={labels} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <AiShimmer lines={4} label={t.loading} />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-eyebrow text-muted-foreground">{t.tldr}</span>
              <AiStreamingText text={tldr} streaming={streaming} reveal={streaming} markdown={false} labels={labels} className="[&_p]:text-body [&_p]:text-foreground" />
            </div>
            {points?.length && !streaming ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-eyebrow text-muted-foreground">{t.keyPoints}</span>
                <ul className="flex flex-col gap-1.5">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-body-sm text-nq-fg-body">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-nq-accent" />
                      <span dir="auto" className="min-w-0 text-start">
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {full && !streaming ? (
              <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger className="inline-flex min-h-control-sm items-center gap-1.5 rounded-control text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                  {open ? t.hideFull : t.showFull}
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-150 ease-nq motion-reduce:transition-none", open && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsiblePanel>
                  <div className="border-t border-border pt-3">
                    <Markdown>{full}</Markdown>
                  </div>
                </CollapsiblePanel>
              </Collapsible>
            ) : null}
            {sources?.length && !streaming ? <CopilotSources sources={sources} labels={{ sources: t.sources }} /> : null}
          </>
        )}
      </CardContent>
      {loading ? null : (
        <CardFooter className="flex-col items-stretch gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {confidence !== undefined ? <AiConfidenceMeter value={confidence} labels={labels} /> : null}
            <span className="ms-auto inline-flex items-center gap-0.5">
              <CopyButton value={() => summaryToText({ tldr, points, full }, { includeFull: open })} label={t.copy} onCopy={onCopy} disabled={streaming} />
              {onRegenerate ? (
                <Button variant="ghost" size="icon-sm" aria-label={t.regenerate} onClick={onRegenerate} disabled={streaming}>
                  <Icon icon={RefreshCw} />
                </Button>
              ) : null}
              {onFeedback ? <AiFeedback value={feedback} onChange={onFeedback} labels={labels} /> : null}
            </span>
          </div>
          <p className="text-caption text-muted-foreground">{t.disclaimer}</p>
        </CardFooter>
      )}
    </Card>
  );
}
