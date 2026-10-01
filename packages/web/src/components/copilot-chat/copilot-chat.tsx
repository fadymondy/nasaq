"use client";

import { Check, ChevronDown, Copy, FileText, History, Loader2, Paperclip, Plus, RefreshCw, Send, Share2, Slash, Sparkles, Square, ThumbsDown, ThumbsUp, Trash2, TriangleAlert, X } from "lucide-react";
import { Children, type ComponentProps, type DragEvent, isValidElement, type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiModelSelect } from "../ai-model-picker";
import { type ArtifactListProps, ArtifactList } from "../artifact-renderer";
import { Badge } from "../badge";
import { Button } from "../button";
import { ChatMessage, ChatThread } from "../chat";
import { CodeBlockAI } from "../code-block-variants";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "../collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { Markdown } from "../markdown";
import { type Mention, MentionTextarea, type MentionOption } from "../mention-textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  availableContext,
  type CopilotAttachment,
  type CopilotCommand,
  type CopilotContextItem,
  type CopilotMessage,
  type CopilotModel,
  type CopilotSessionSummary,
  type CopilotSource,
  type CopilotStep,
  type CopilotToggle,
  filterCommands,
  formatBytes,
  hostOf,
  isPreviewUrl,
  isSafeUrl,
  slashQuery,
  stepCounts,
  transcriptToMarkdown,
  visibleMessages,
  withoutContext,
  withoutSlash,
} from "./copilot-chat-format";

export {
  availableContext,
  filterCommands,
  hostOf,
  isPreviewUrl,
  isSafeUrl,
  slashQuery,
  stepCounts,
  transcriptToMarkdown,
  visibleMessages,
  withoutContext,
  withoutSlash,
  type CopilotAttachment,
  type CopilotCommand,
  type CopilotContextItem,
  type CopilotMessage,
  type CopilotModel,
  type CopilotSessionSummary,
  type CopilotSource,
  type CopilotStep,
  type CopilotStepStatus,
  type CopilotToggle,
} from "./copilot-chat-format";

const STRINGS = {
  en: {
    title: "Copilot",
    assistant: "Copilot",
    you: "You",
    conversation: "Copilot conversation",
    placeholder: "Ask anything. Type @ to mention.",
    send: "Send",
    stop: "Stop",
    close: "Close",
    newChat: "New chat",
    copyChat: "Copy conversation",
    copied: "Copied",
    copy: "Copy answer",
    regenerate: "Try again",
    good: "Good answer",
    bad: "Not helpful",
    sources: "Sources",
    usedSteps: (n: number) => (n === 1 ? "Used 1 tool" : `Used ${n} tools`),
    working: "Working",
    stepFailed: "A step failed",
    context: "Context",
    addContext: "Add context",
    removeContext: (l: string) => `Remove ${l}`,
    model: "Model",
    emptyTitle: "How can I help?",
    emptyBody: "Ask about your data, or start from one of these.",
    followUps: "Suggested follow-ups",
    starters: "Suggestions",
    message: "Message",
    mentions: "Mentions",
    attach: "Attach files",
    dropFiles: "Drop files to attach",
    removeAttachment: (n: string) => `Remove ${n}`,
    attachments: "Attachments",
    commands: "Tools and skills",
    commandHint: "Type / for tools and skills",
    noCommands: "No matching tools",
    removeCommand: (n: string) => `Stop using ${n}`,
    options: "Options",
    history: "History",
    noHistory: "No saved conversations yet.",
    deleteSession: (n: string) => `Delete ${n}`,
    share: "Share answer",
    streamError: "The answer stopped before it finished.",
    retry: "Retry",
  },
  ar: {
    title: "المساعد",
    assistant: "المساعد",
    you: "أنت",
    conversation: "محادثة المساعد",
    placeholder: "اسأل أي شيء. اكتب @ للإشارة.",
    send: "إرسال",
    stop: "إيقاف",
    close: "إغلاق",
    newChat: "محادثة جديدة",
    copyChat: "نسخ المحادثة",
    copied: "تم النسخ",
    copy: "نسخ الإجابة",
    regenerate: "حاول مرة أخرى",
    good: "إجابة جيدة",
    bad: "غير مفيدة",
    sources: "المصادر",
    usedSteps: (n: number) => (n === 1 ? "استخدم أداة واحدة" : n === 2 ? "استخدم أداتين" : `استخدم ${n} أدوات`),
    working: "جارٍ العمل",
    stepFailed: "فشلت إحدى الخطوات",
    context: "السياق",
    addContext: "إضافة سياق",
    removeContext: (l: string) => `إزالة ${l}`,
    model: "النموذج",
    emptyTitle: "كيف أساعدك؟",
    emptyBody: "اسأل عن بياناتك، أو ابدأ من أحد هذه الاقتراحات.",
    followUps: "أسئلة مقترحة للمتابعة",
    starters: "اقتراحات",
    message: "الرسالة",
    mentions: "الإشارات",
    attach: "إرفاق ملفات",
    dropFiles: "أفلت الملفات لإرفاقها",
    removeAttachment: (n: string) => `إزالة ${n}`,
    attachments: "المرفقات",
    commands: "الأدوات والمهارات",
    commandHint: "اكتب / للأدوات والمهارات",
    noCommands: "لا توجد أدوات مطابقة",
    removeCommand: (n: string) => `إيقاف استخدام ${n}`,
    options: "الخيارات",
    history: "السجل",
    noHistory: "لا توجد محادثات محفوظة بعد.",
    deleteSession: (n: string) => `حذف ${n}`,
    share: "مشاركة الإجابة",
    streamError: "توقفت الإجابة قبل أن تكتمل.",
    retry: "إعادة المحاولة",
  },
};

export type CopilotChatLabels = Omit<(typeof STRINGS)["en"], "usedSteps" | "removeContext" | "removeAttachment" | "removeCommand" | "deleteSession"> & {
  usedSteps: (n: number) => string;
  removeContext: (label: string) => string;
  removeAttachment: (name: string) => string;
  removeCommand: (label: string) => string;
  deleteSession: (title: string) => string;
};

export interface CopilotSendMeta {
  context: CopilotContextItem[];
  model: string | undefined;
  mentions: Mention[];
  /** Files in the composer when it was sent. */
  attachments: CopilotAttachment[];
  /** Ids of the "/" commands chosen for this prompt. */
  commands: string[];
  /** Ids of the toggles that were on. */
  toggles: string[];
}

export interface CopilotChatProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  messages: readonly CopilotMessage[];
  /** A prompt from the box, a starter, or a follow-up. */
  onSend: (text: string, meta: CopilotSendMeta) => void | Promise<void>;
  /** Stops the answer that is streaming. */
  onStop?: () => void;
  /** Runs the last answer again. Shows Try again on it. */
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, value: "up" | "down") => void;
  /** `panel` is a narrow side sheet with a close button. `page` is a centred column. */
  mode?: "panel" | "page";
  title?: string;
  /** Called by the close button in panel mode. */
  onClose?: () => void;
  onNewChat?: () => void;
  /** Starter prompts on the empty screen. */
  starters?: readonly string[];
  /** Context chips sent with the next prompt. */
  context?: readonly CopilotContextItem[];
  onContextChange?: (items: CopilotContextItem[]) => void;
  /** Items the Add context menu can offer. */
  contextOptions?: readonly CopilotContextItem[];
  models?: readonly CopilotModel[];
  model?: string;
  onModelChange?: (id: string) => void;
  /** People or things the visitor can @mention. */
  mentions?: readonly MentionOption[];
  /** Assistants offered by the copy menu of code blocks. Default Claude, ChatGPT and Cursor. */
  copyTargets?: ComponentProps<typeof CodeBlockAI>["targets"];
  /** Controlled text of the box, for prefilling it from outside. */
  draft?: string;
  onDraftChange?: (text: string) => void;
  /** Files in the composer. You upload them in `onAttach` and keep the list. */
  attachments?: readonly CopilotAttachment[];
  /** Turns on the attach button, paste and drag and drop. */
  onAttach?: (files: File[]) => void;
  onAttachmentsChange?: (items: CopilotAttachment[]) => void;
  /** `accept` of the file input, such as "image/*,.pdf". */
  accept?: string;
  /** Tools, skills or agents offered by typing "/". */
  commands?: readonly CopilotCommand[];
  /** On/off options under the box, such as thinking or web search. */
  toggles?: readonly CopilotToggle[];
  /** Ids of the toggles that are on. Uncontrolled when left out. */
  activeToggles?: readonly string[];
  onTogglesChange?: (ids: string[]) => void;
  /** Saved conversations for the History menu. */
  sessions?: readonly CopilotSessionSummary[];
  activeSessionId?: string;
  onSessionSelect?: (id: string) => void;
  onSessionDelete?: (id: string) => void;
  /** Buttons or pressed artifacts in answers. */
  onArtifactAction?: ArtifactListProps["onAction"];
  onArtifactPick?: ArtifactListProps["onPick"];
  allowHtml?: boolean;
  /** Adds a Share button to answers where the Web Share API exists. */
  share?: boolean;
  /** Small print under the box, such as "AI can make mistakes". */
  disclaimer?: ReactNode;
  /** More buttons in the header, before close. */
  headerActions?: ReactNode;
  labels?: Partial<CopilotChatLabels>;
}

function useLabels(labels?: Partial<CopilotChatLabels>): { t: CopilotChatLabels; ar: boolean } {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, ar };
}

/** Markdown that hands fenced code to the copy-for-AI code block. */
function codeOf(children: ReactNode): { language: string; code: string } | null {
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return null;
  const code = Children.toArray(child.props.children).join("");
  const language = /language-([\w+-]+)/.exec(child.props.className ?? "")?.[1] ?? "text";
  return { language, code };
}

function useFlash() {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback(() => {
    setOn(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), 1500);
  }, []);
  return [on, flash] as const;
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ steps */

export function CopilotSteps({ steps, streaming, labels }: { steps: readonly CopilotStep[]; streaming?: boolean; labels?: Partial<CopilotChatLabels> }) {
  const { t } = useLabels(labels);
  const c = stepCounts(steps);
  const [open, setOpen] = useState(false);
  if (c.total === 0) return null;
  const current = steps.find((s) => s.status === "running");
  const summary = current ? current.label : c.error > 0 ? t.stepFailed : t.usedSteps(c.total);
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-slot="copilot-steps" className="rounded-control border border-border bg-secondary">
      <CollapsibleTrigger className="flex min-h-control-sm w-full items-center gap-2 px-3 py-1.5 text-start text-caption text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
        {current && streaming !== false ? (
          <Loader2 aria-hidden className="size-3.5 shrink-0 motion-safe:animate-spin" />
        ) : c.error > 0 ? (
          <TriangleAlert aria-hidden className="size-3.5 shrink-0 text-nq-danger-text" />
        ) : (
          <Check aria-hidden className="size-3.5 shrink-0 text-nq-success-text" />
        )}
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 transition-transform duration-150 ease-nq", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ol className="flex flex-col gap-2 border-t border-border px-3 py-2">
          {steps.map((s) => (
            <li key={s.id} data-status={s.status} className="flex items-start gap-2 text-caption">
              <span className="mt-0.5 shrink-0" aria-hidden>
                {s.status === "running" ? (
                  <Loader2 className="size-3.5 motion-safe:animate-spin" />
                ) : s.status === "error" ? (
                  <TriangleAlert className="size-3.5 text-nq-danger-text" />
                ) : (
                  <Check className="size-3.5 text-nq-success-text" />
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-foreground">
                  {s.label}
                  {s.tool ? (
                    <code dir="ltr" className="ms-2 rounded-sm bg-card px-1 font-mono text-[0.85em] text-muted-foreground">
                      {s.tool}
                    </code>
                  ) : null}
                </span>
                {s.detail ? (
                  <span dir="auto" className="truncate font-mono text-muted-foreground">
                    {s.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </CollapsiblePanel>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ sources */

export function CopilotSources({ sources, labels }: { sources: readonly CopilotSource[]; labels?: Partial<CopilotChatLabels> }) {
  const { t } = useLabels(labels);
  if (sources.length === 0) return null;
  return (
    <div data-slot="copilot-sources" className="flex flex-col gap-1.5">
      <span className="text-caption text-muted-foreground">{t.sources}</span>
      <ol className="flex flex-wrap gap-2">
        {sources.map((s, i) => {
          const body = (
            <>
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="flex min-w-0 flex-col">
                <span dir="auto" className="truncate text-caption text-foreground">
                  {s.title}
                </span>
                {hostOf(s.url) ? (
                  <span dir="ltr" className="truncate text-[11px] text-muted-foreground">
                    {hostOf(s.url)}
                  </span>
                ) : null}
              </span>
            </>
          );
          const cls = "flex max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5";
          return (
            <li key={s.id} className="min-w-0">
              {isSafeUrl(s.url) ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.snippet}
                  className={cn(cls, "outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus")}
                >
                  {body}
                </a>
              ) : (
                <span title={s.snippet} className={cls}>
                  {s.snippet ? <FileText aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ context chips */

export interface CopilotContextBarProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  items: readonly CopilotContextItem[];
  onChange?: (items: CopilotContextItem[]) => void;
  options?: readonly CopilotContextItem[];
  labels?: Partial<CopilotChatLabels>;
}

/** The chips row above the box: what the next prompt will see. */
export function CopilotContextBar({ items, onChange, options = [], labels, className, ...props }: CopilotContextBarProps) {
  const { t } = useLabels(labels);
  const more = availableContext(options, items);
  if (items.length === 0 && more.length === 0) return null;
  return (
    <div role="group" aria-label={t.context} data-slot="copilot-context" className={cn("flex flex-wrap items-center gap-1.5", className)} {...props}>
      {items.map((i) => (
        <span key={i.id} className="inline-flex max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
          {i.kind ? <span className="text-muted-foreground">{i.kind}</span> : null}
          <span dir="auto" className="truncate">
            {i.label}
          </span>
          {onChange ? (
            <button
              type="button"
              aria-label={t.removeContext(i.label)}
              onClick={() => onChange(withoutContext(items, i.id))}
              className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <X aria-hidden className="size-3" />
            </button>
          ) : null}
        </span>
      ))}
      {onChange && more.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t.addContext}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-border px-2 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          >
            <Plus aria-hidden className="size-3" />
            {t.addContext}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {more.map((o) => (
              <DropdownMenuItem key={o.id} onClick={() => onChange([...items, o])}>
                {o.kind ? <span className="text-muted-foreground">{o.kind}</span> : null}
                <span dir="auto">{o.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ attachments */

export interface CopilotAttachmentChipProps extends Omit<ComponentProps<"span">, "children"> {
  attachment: CopilotAttachment;
  /** Shows a remove button. */
  onRemove?: () => void;
  labels?: Partial<CopilotChatLabels>;
}

/** One file in the composer or on a sent message: a thumbnail or an icon, the name, the size or upload progress. */
export function CopilotAttachmentChip({ attachment: a, onRemove, labels, className, ...props }: CopilotAttachmentChipProps) {
  const { t } = useLabels(labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const image = !!a.type?.startsWith("image/") && isPreviewUrl(a.url);
  const busy = a.progress !== undefined && a.progress < 1 && !a.error;
  return (
    <span
      data-slot="copilot-attachment"
      data-error={a.error ? "" : undefined}
      title={a.error ?? a.name}
      className={cn("inline-flex max-w-56 items-center gap-2 rounded-control border bg-card p-1 pe-1.5 text-caption", a.error ? "border-nq-danger" : "border-border", className)}
      {...props}
    >
      {image ? (
        <img src={a.url} alt="" className="size-8 shrink-0 rounded-sm object-cover" />
      ) : (
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-sm bg-secondary text-muted-foreground">
          <FileText className="size-4" />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span dir="auto" className="truncate text-foreground">
          {a.name}
        </span>
        <span className={cn("truncate text-[11px] tabular-nums", a.error ? "text-nq-danger-text" : "text-muted-foreground")}>
          {a.error ?? (busy ? `${Math.round((a.progress ?? 0) * 100)}%` : formatBytes(a.size, locale))}
        </span>
      </span>
      {busy ? <Loader2 aria-hidden className="size-3.5 shrink-0 text-muted-foreground motion-safe:animate-spin" /> : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={t.removeAttachment(a.name)}
          onClick={onRemove}
          className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
        >
          <X aria-hidden className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ one answer */

export interface CopilotAnswerProps {
  message: CopilotMessage;
  last?: boolean;
  onRegenerate?: (id: string) => void;
  onFeedback?: (id: string, value: "up" | "down") => void;
  onFollowUp?: (text: string) => void;
  copyTargets?: CopilotChatProps["copyTargets"];
  onArtifactAction?: CopilotChatProps["onArtifactAction"];
  onArtifactPick?: CopilotChatProps["onArtifactPick"];
  allowHtml?: boolean;
  /** Adds a Share button where the Web Share API exists. */
  share?: boolean;
  labels?: Partial<CopilotChatLabels>;
}

function useCanShare(on: boolean | undefined) {
  const [can, setCan] = useState(false);
  // navigator only exists in the browser; check after mount so server and client markup match.
  useEffect(() => {
    setCan(!!on && typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [on]);
  return can;
}

/** The assistant side of one turn: tool steps, streamed Markdown, artifacts, sources, actions and follow-ups. */
export function CopilotAnswer({ message, last, onRegenerate, onFeedback, onFollowUp, copyTargets, onArtifactAction, onArtifactPick, allowHtml, share, labels }: CopilotAnswerProps) {
  const { t } = useLabels(labels);
  const [copied, flash] = useFlash();
  const canShare = useCanShare(share);
  const components = useMemo(
    () => ({
      pre: ({ children }: { children?: ReactNode }) => {
        const block = codeOf(children);
        return block ? <CodeBlockAI code={block.code} language={block.language} targets={copyTargets} /> : <pre>{children}</pre>;
      },
    }),
    [copyTargets],
  );
  const busy = !!message.streaming;
  return (
    <ChatMessage
      side="assistant"
      className="w-full min-w-0 [&>div:last-child]:flex-1 [&_[data-slot=chat-bubble]]:w-full"
      name={t.assistant}
      time={message.at}
      streaming={busy && message.text === "" && !message.steps?.length}
      avatar={
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
      }
    >
      <div className="flex min-w-0 flex-col gap-3">
        {message.steps?.length ? <CopilotSteps steps={message.steps} streaming={busy} labels={labels} /> : null}
        {message.text ? <Markdown components={components} className="text-body">{message.text}</Markdown> : null}
        {busy && message.text ? <span aria-hidden className="inline-block h-4 w-1.5 rounded-sm bg-nq-accent motion-safe:animate-pulse" /> : null}
        {message.artifacts?.length ? <ArtifactList artifacts={message.artifacts} onAction={onArtifactAction} onPick={onArtifactPick} allowHtml={allowHtml} /> : null}
        {message.error !== undefined ? (
          <div role="alert" data-slot="copilot-stream-error" className="flex flex-wrap items-center gap-2 rounded-control border border-nq-danger bg-nq-danger-soft px-3 py-2 text-caption text-nq-danger-text">
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{message.error || t.streamError}</span>
            {last && onRegenerate ? (
              <Button variant="secondary" size="sm" onClick={() => onRegenerate(message.id)}>
                <RefreshCw aria-hidden />
                {t.retry}
              </Button>
            ) : null}
          </div>
        ) : null}
        {!busy && message.sources?.length ? <CopilotSources sources={message.sources} labels={labels} /> : null}
        {!busy && message.text ? (
          <div className="flex items-center gap-0.5 text-muted-foreground" data-slot="copilot-actions">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={copied ? t.copied : t.copy}
              title={copied ? t.copied : t.copy}
              onClick={async () => {
                if (await writeClipboard(message.text)) flash();
              }}
            >
              {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
            </Button>
            {canShare ? (
              <Button variant="ghost" size="icon-sm" aria-label={t.share} title={t.share} onClick={() => navigator.share({ text: message.text }).catch(() => {})}>
                <Share2 aria-hidden className="size-3.5" />
              </Button>
            ) : null}
            {onFeedback ? (
              <>
                <Button variant="ghost" size="icon-sm" aria-label={t.good} aria-pressed={message.feedback === "up"} title={t.good} onClick={() => onFeedback(message.id, "up")}>
                  <ThumbsUp aria-hidden className={cn("size-3.5", message.feedback === "up" && "text-nq-accent")} />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={t.bad} aria-pressed={message.feedback === "down"} title={t.bad} onClick={() => onFeedback(message.id, "down")}>
                  <ThumbsDown aria-hidden className={cn("size-3.5", message.feedback === "down" && "text-nq-danger-text")} />
                </Button>
              </>
            ) : null}
            {last && onRegenerate && message.error === undefined ? (
              <Button variant="ghost" size="icon-sm" aria-label={t.regenerate} title={t.regenerate} onClick={() => onRegenerate(message.id)}>
                <RefreshCw aria-hidden className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {!busy && last && message.followUps?.length && onFollowUp ? (
          <div role="group" aria-label={t.followUps} className="flex flex-wrap gap-2">
            {message.followUps.map((f) => (
              <button
                key={f}
                type="button"
                dir="auto"
                onClick={() => onFollowUp(f)}
                className="rounded-full border border-border bg-card px-3 py-1 text-start text-caption text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </ChatMessage>
  );
}

/* ------------------------------------------------------------------ history */

function HistoryMenu({
  sessions,
  activeId,
  onSelect,
  onDelete,
  t,
}: {
  sessions: readonly CopilotSessionSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  t: CopilotChatLabels;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.history} title={t.history} />}>
        <History aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        {sessions.length === 0 ? (
          <p className="px-3 py-4 text-center text-caption text-muted-foreground">{t.noHistory}</p>
        ) : (
          <ul aria-label={t.history} data-slot="copilot-history" className="flex max-h-80 flex-col overflow-y-auto">
            {sessions.map((s) => (
              <li key={s.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  aria-current={s.id === activeId ? "true" : undefined}
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 flex-col rounded-control px-2.5 py-1.5 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-[current]:bg-nq-selected"
                >
                  <span dir="auto" className="truncate text-body-sm text-foreground">
                    {s.title}
                  </span>
                  {s.at !== undefined ? <DateLine at={s.at} /> : null}
                </button>
                {onDelete ? (
                  <Button variant="ghost" size="icon-sm" aria-label={t.deleteSession(s.title)} title={t.deleteSession(s.title)} onClick={() => onDelete(s.id)}>
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DateLine({ at }: { at: number | Date | string }) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <span className="text-[11px] text-muted-foreground">
      {new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-EG-u-nu-latn" : locale, { dateStyle: "medium", timeStyle: "short" }).format(d)}
    </span>
  );
}

/* ------------------------------------------------------------------ main */

/**
 * An AI assistant chat: streamed Markdown answers with tool-call steps, artifacts and sources, starter prompts and
 * follow-ups, context chips, attachments, "/" commands, toggles, history, a model picker, and copy-for-AI code blocks.
 * Works as a side panel or a full page. You own `messages` and stream into them; `CopilotProvider` does that for you.
 */
export function CopilotChat({
  messages: allMessages,
  onSend,
  onStop,
  onRegenerate,
  onFeedback,
  mode = "panel",
  title,
  onClose,
  onNewChat,
  starters,
  context = [],
  onContextChange,
  contextOptions,
  models,
  model,
  onModelChange,
  mentions = [],
  copyTargets,
  draft,
  onDraftChange,
  attachments = [],
  onAttach,
  onAttachmentsChange,
  accept,
  commands,
  toggles,
  activeToggles,
  onTogglesChange,
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionDelete,
  onArtifactAction,
  onArtifactPick,
  allowHtml,
  share,
  disclaimer,
  headerActions,
  labels,
  className,
  ...props
}: CopilotChatProps) {
  const { t } = useLabels(labels);
  const page = mode === "page";
  const messages = useMemo(() => visibleMessages(allMessages), [allMessages]);
  const [innerText, setInnerText] = useState("");
  const text = draft ?? innerText;
  const setText = (v: string) => {
    setInnerText(v);
    onDraftChange?.(v);
  };
  const [found, setFound] = useState<Mention[]>([]);
  const [copiedAll, flashAll] = useFlash();
  const [chosen, setChosen] = useState<string[]>([]);
  const [innerToggles, setInnerToggles] = useState<string[]>([]);
  const onToggles = activeToggles ?? innerToggles;
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const streaming = allMessages.some((m) => m.streaming);
  const lastId = messages[messages.length - 1]?.id;
  const currentModel = model ?? models?.[0]?.id;
  const uploading = attachments.some((a) => a.progress !== undefined && a.progress < 1 && !a.error);

  // "/" menu: the word at the caret, the matches, the highlighted one, and a dismissed position.
  const [caret, setCaret] = useState(0);
  const [slashIndex, setSlashIndex] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const slash = commands?.length ? slashQuery(text, Math.min(caret, text.length)) : null;
  const slashOpen = !!slash && dismissed !== slash.start;
  const matches = slashOpen && commands ? filterCommands(commands, slash.query, chosen) : [];
  const active = matches.length ? Math.min(slashIndex, matches.length - 1) : -1;

  const choose = (c: CopilotCommand) => {
    setChosen((prev) => [...prev, c.id]);
    setText(withoutSlash(text, Math.min(caret, text.length)));
    setSlashIndex(0);
  };

  const flip = (id: string) => {
    const next = onToggles.includes(id) ? onToggles.filter((x) => x !== id) : [...onToggles, id];
    setInnerToggles(next);
    onTogglesChange?.(next);
  };

  const send = (value: string, m: Mention[] = []) => {
    const v = value.trim();
    if ((!v && attachments.length === 0) || streaming || uploading) return;
    void onSend(v, { context: [...context], model: currentModel, mentions: m, attachments: [...attachments], commands: chosen, toggles: [...onToggles] });
    setText("");
    setFound([]);
    setChosen([]);
    setDismissed(null);
    if (attachments.length) onAttachmentsChange?.([]);
  };

  const take = (files: FileList | File[] | null | undefined) => {
    const list = Array.from(files ?? []);
    if (list.length && onAttach) onAttach(list);
  };

  const dragProps = onAttach
    ? {
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: (e: DragEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        },
      }
    : {};

  const chosenCommands = chosen.map((id) => commands?.find((c) => c.id === id)).filter((c): c is CopilotCommand => !!c);
  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <section
      aria-label={title ?? t.conversation}
      data-slot="copilot-chat"
      data-mode={mode}
      className={cn("flex min-h-0 flex-col bg-background text-foreground", page ? "h-full w-full" : "h-full w-full border-border", className)}
      {...props}
    >
      <header className={cn("flex items-center gap-2 border-b border-border px-4 py-2.5", page && "justify-center")}>
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-label">{title ?? t.title}</h2>
        {sessions && onSessionSelect ? <HistoryMenu sessions={sessions} activeId={activeSessionId} onSelect={onSessionSelect} onDelete={onSessionDelete} t={t} /> : null}
        {onNewChat ? (
          <Button variant="ghost" size="icon-sm" aria-label={t.newChat} title={t.newChat} onClick={onNewChat}>
            <Plus aria-hidden className="size-4" />
          </Button>
        ) : null}
        {messages.length > 0 ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={copiedAll ? t.copied : t.copyChat}
            title={copiedAll ? t.copied : t.copyChat}
            onClick={async () => {
              if (await writeClipboard(transcriptToMarkdown(messages, { user: t.you, assistant: t.assistant }))) flashAll();
            }}
          >
            {copiedAll ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          </Button>
        ) : null}
        {headerActions}
        {onClose ? (
          <Button variant="ghost" size="icon-sm" aria-label={t.close} title={t.close} onClick={onClose}>
            <X aria-hidden className="size-4" />
          </Button>
        ) : null}
      </header>

      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-h3">{t.emptyTitle}</h3>
            <p className="text-body-sm text-muted-foreground">{t.emptyBody}</p>
          </div>
          {starters?.length ? (
            <ul aria-label={t.starters} className={cn("grid w-full gap-2", page ? "max-w-2xl sm:grid-cols-2" : "max-w-sm")}>
              {starters.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    dir="auto"
                    onClick={() => send(s)}
                    className="w-full rounded-card border border-border bg-card px-4 py-3 text-start text-body-sm outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <ChatThread label={t.conversation} className="min-h-0 flex-1" contentClassName={cn("gap-5 p-4", page && "mx-auto w-full max-w-3xl")}>
          {messages.map((m) =>
            m.role === "user" ? (
              <ChatMessage key={m.id} side="user" name={t.you} time={m.at} format="text">
                {m.attachments?.length ? (
                  <span className="flex flex-col gap-2">
                    <span role="list" aria-label={t.attachments} className="flex flex-wrap gap-1.5">
                      {m.attachments.map((a) => (
                        <CopilotAttachmentChip key={a.id} role="listitem" attachment={a} labels={labels} />
                      ))}
                    </span>
                    {m.text ? <span className="whitespace-pre-wrap">{m.text}</span> : null}
                  </span>
                ) : (
                  m.text
                )}
              </ChatMessage>
            ) : (
              <CopilotAnswer
                key={m.id}
                message={m}
                last={m.id === lastId}
                onRegenerate={onRegenerate}
                onFeedback={onFeedback}
                onFollowUp={(f) => send(f)}
                copyTargets={copyTargets}
                onArtifactAction={onArtifactAction}
                onArtifactPick={onArtifactPick}
                allowHtml={allowHtml}
                share={share}
                labels={labels}
              />
            ),
          )}
        </ChatThread>
      )}

      <div className={cn("flex flex-col gap-2 border-t border-border p-3", page && "items-center")}>
        <div className={cn("relative flex w-full flex-col gap-2", page && "max-w-3xl")}>
          <CopilotContextBar items={context} onChange={onContextChange} options={contextOptions ?? []} labels={labels} />
          {slashOpen ? (
            <div data-slot="copilot-commands" className="absolute inset-x-0 bottom-full z-10 mb-2 overflow-hidden rounded-card border border-border bg-popover text-popover-foreground">
              <p className="border-b border-border px-3 py-1.5 text-caption text-muted-foreground">{t.commands}</p>
              {matches.length === 0 ? (
                <p className="px-3 py-3 text-caption text-muted-foreground">{t.noCommands}</p>
              ) : (
                <ul id={listId} role="listbox" aria-label={t.commands} className="max-h-60 overflow-y-auto p-1">
                  {matches.map((c, i) => (
                    <li
                      key={c.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(c)}
                      onMouseEnter={() => setSlashIndex(i)}
                      className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 aria-selected:bg-nq-selected"
                    >
                      <Slash aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span dir="auto" className="truncate text-body-sm text-foreground">
                          {c.label}
                        </span>
                        {c.description ? (
                          <span dir="auto" className="truncate text-caption text-muted-foreground">
                            {c.description}
                          </span>
                        ) : null}
                      </span>
                      {c.kind ? <Badge variant="neutral">{c.kind}</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          <span aria-live="polite" className="sr-only">
            {slashOpen ? `${t.commands}: ${matches.length}${matches[active] ? `. ${matches[active].label}` : ""}` : ""}
          </span>
          <div
            data-slot="copilot-composer"
            data-dragging={dragging || undefined}
            className="relative flex flex-col gap-2 rounded-card border border-border bg-card p-2 focus-within:outline-2 focus-within:outline-nq-focus data-[dragging]:border-dashed data-[dragging]:border-primary"
            {...dragProps}
          >
            {dragging ? (
              <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-card bg-card/90 text-body-sm text-foreground">
                {t.dropFiles}
              </div>
            ) : null}
            {attachments.length || chosenCommands.length ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {chosenCommands.map((c) => (
                  <span key={c.id} data-slot="copilot-command-chip" className="inline-flex max-w-48 items-center gap-1 rounded-full bg-nq-selected ps-2 pe-1 text-caption text-foreground">
                    <Slash aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                    <span dir="auto" className="truncate">
                      {c.label}
                    </span>
                    <button
                      type="button"
                      aria-label={t.removeCommand(c.label)}
                      onClick={() => setChosen((prev) => prev.filter((x) => x !== c.id))}
                      className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                    >
                      <X aria-hidden className="size-3" />
                    </button>
                  </span>
                ))}
                {attachments.map((a) => (
                  <CopilotAttachmentChip
                    key={a.id}
                    attachment={a}
                    labels={labels}
                    onRemove={onAttachmentsChange ? () => onAttachmentsChange(attachments.filter((x) => x.id !== a.id)) : undefined}
                  />
                ))}
              </div>
            ) : null}
            <MentionTextarea
              aria-label={t.message}
              listLabel={t.mentions}
              placeholder={commands?.length ? `${t.placeholder} ${t.commandHint}.` : t.placeholder}
              rows={2}
              value={text}
              suggestions={[...mentions]}
              wrapperClassName="w-full"
              className="max-h-40 min-h-12 w-full resize-none border-0 bg-transparent p-1 shadow-none outline-none focus-visible:outline-none"
              onValueChange={(v, m) => {
                setText(v);
                setFound(m);
              }}
              onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
              onClick={(e) => setCaret(e.currentTarget.selectionStart)}
              onPaste={(e) => {
                if (!onAttach || e.clipboardData.files.length === 0) return;
                if (!e.clipboardData.getData("text/plain")) e.preventDefault();
                take(e.clipboardData.files);
              }}
              onKeyDown={(e) => {
                if (slashOpen && !e.nativeEvent.isComposing) {
                  if (e.key === "ArrowDown" && matches.length) {
                    e.preventDefault();
                    setSlashIndex((active + 1) % matches.length);
                    return;
                  }
                  if (e.key === "ArrowUp" && matches.length) {
                    e.preventDefault();
                    setSlashIndex((active - 1 + matches.length) % matches.length);
                    return;
                  }
                  if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && matches[active]) {
                    e.preventDefault();
                    choose(matches[active]);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setDismissed(slash?.start ?? null);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !e.defaultPrevented) {
                  e.preventDefault();
                  send(text, found);
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-1">
              {onAttach ? (
                <>
                  <input ref={fileRef} type="file" multiple accept={accept} hidden onChange={(e) => (take(e.currentTarget.files), (e.currentTarget.value = ""))} />
                  <Button variant="ghost" size="icon-sm" aria-label={t.attach} title={t.attach} onClick={() => fileRef.current?.click()}>
                    <Paperclip aria-hidden className="size-4" />
                  </Button>
                </>
              ) : null}
              {toggles?.length ? (
                <div role="group" aria-label={t.options} className="flex flex-wrap items-center gap-1">
                  {toggles.map((g) => (
                    <Button
                      key={g.id}
                      variant="ghost"
                      size="sm"
                      aria-pressed={onToggles.includes(g.id)}
                      title={g.description}
                      onClick={() => flip(g.id)}
                      className="h-control-sm gap-1.5 px-2 text-caption text-muted-foreground aria-pressed:bg-nq-selected aria-pressed:text-foreground"
                    >
                      {g.icon}
                      {g.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              {models && models.length > 0 && onModelChange ? (
                <AiModelSelect models={models} value={currentModel} onValueChange={onModelChange} label={t.model} className="h-control-sm w-auto min-w-0 max-w-44 border-0 bg-transparent text-caption" />
              ) : null}
              <span className="flex-1" />
              {streaming && onStop ? (
                <Button variant="primary" size="icon-sm" aria-label={t.stop} title={t.stop} onClick={onStop}>
                  <Square aria-hidden className="size-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="icon-sm"
                  aria-label={t.send}
                  title={t.send}
                  disabled={streaming || uploading || (text.trim() === "" && attachments.length === 0)}
                  onClick={() => send(text, found)}
                >
                  <Send aria-hidden className="size-3.5 rtl:-scale-x-100" />
                </Button>
              )}
            </div>
          </div>
          {disclaimer ? <p className="text-center text-[11px] text-muted-foreground">{disclaimer}</p> : null}
        </div>
      </div>
    </section>
  );
}
