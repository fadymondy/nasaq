"use client";

import { ArrowDown, Check, CircleAlert, Send, Square } from "lucide-react";
import {
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Textarea } from "../field";
import { Markdown } from "../markdown";
import { DateTime } from "../numeric";
import { Spinner } from "../spinner";

const STRINGS = {
  en: {
    thread: "Conversation",
    latest: "Jump to latest",
    sending: "Sending…",
    sent: "Sent",
    failed: "Failed to send",
    retry: "Retry",
    typing: "Assistant is typing",
    send: "Send",
    stop: "Stop",
    message: "Message",
    placeholder: "Write a message…",
  },
  ar: {
    thread: "المحادثة",
    latest: "الانتقال إلى الأحدث",
    sending: "جارٍ الإرسال…",
    sent: "تم الإرسال",
    failed: "تعذر الإرسال",
    retry: "إعادة المحاولة",
    typing: "المساعد يكتب",
    send: "إرسال",
    stop: "إيقاف",
    message: "الرسالة",
    placeholder: "اكتب رسالة…",
  },
};

function useStrings() {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return STRINGS[ar ? "ar" : "en"];
}

/** How close to the end, in px, still counts as "at the bottom". */
const STICK_THRESHOLD = 48;

export interface ChatThreadProps extends ComponentProps<"div"> {
  /** Accessible name of the log. Default "Conversation" / "المحادثة". */
  label?: string;
  /** Accessible name of the jump button shown when the reader has scrolled up. */
  jumpLabel?: string;
  /** Classes for the inner column that holds the messages. */
  contentClassName?: string;
}

/**
 * The scrolling message list. It follows new content (also a message that grows while streaming) as long as the
 * reader is at the bottom; once they scroll up it stops, and a "Jump to latest" button appears.
 */
export function ChatThread({ label, jumpLabel, contentClassName, className, children, ...props }: ChatThreadProps) {
  const t = useStrings();
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const [away, setAway] = useState(false);

  const toBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, []);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD;
    stuck.current = near;
    setAway(!near);
  }, []);

  useLayoutEffect(() => toBottom(), [toBottom]);

  useEffect(() => {
    const inner = content.current;
    if (!inner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stuck.current) toBottom();
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [toBottom]);

  return (
    <div data-slot="chat-thread" className={cn("relative flex min-h-0 flex-col", className)} {...props}>
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={label ?? t.thread}
        tabIndex={0}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
      >
        <div ref={content} className={cn("flex flex-col gap-4 p-4", contentClassName)}>
          {children}
        </div>
      </div>
      {away ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label={jumpLabel ?? t.latest}
          data-slot="chat-jump"
          className="absolute end-4 bottom-3 rounded-full shadow-sm"
          onClick={() => {
            stuck.current = true;
            toBottom(true);
          }}
        >
          <ArrowDown aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

export interface TypingIndicatorProps extends ComponentProps<"span"> {
  /** Announced text. Default "Assistant is typing" / "المساعد يكتب". */
  label?: string;
}

/** Three pulsing dots. The pulse stops under reduced motion; the label is read by screen readers. */
export function TypingIndicator({ label, className, ...props }: TypingIndicatorProps) {
  const t = useStrings();
  return (
    <span data-slot="typing-indicator" role="status" className={cn("inline-flex items-center gap-1 py-1", className)} {...props}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ animationDelay: `${i * 150}ms` }}
          className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse"
        />
      ))}
      <span className="sr-only">{label ?? t.typing}</span>
    </span>
  );
}

export type ChatSide = "user" | "assistant";
export type ChatStatus = "sending" | "sent" | "error";

export interface ChatMessageProps extends Omit<ComponentProps<"div">, "content"> {
  /** `user` sits on the inline-end edge, `assistant` on the inline-start edge (mirrors in RTL). Default "assistant". */
  side?: ChatSide;
  /** Sender name: the avatar's initials and the visible byline. */
  name?: string;
  avatarSrc?: string;
  /** Replaces the default Avatar. */
  avatar?: ReactNode;
  /** When it was sent. Shown as a localised time with `<time>`. */
  time?: Date | number | string;
  /** Delivery state. `error` shows a retry button when `onRetry` is set. */
  status?: ChatStatus;
  onRetry?: () => void;
  /** Plain text keeps whitespace; `markdown` renders through Markdown (safe, no raw HTML). Default "text". */
  format?: "text" | "markdown";
  /** The message is still being produced: shows the typing indicator after the text. */
  streaming?: boolean;
  /** Message body. Strings are rendered according to `format`; nodes are rendered as is. */
  children?: ReactNode;
}

/** One message row: avatar, byline with time and status, and a bubble. */
export function ChatMessage({
  side = "assistant",
  name,
  avatarSrc,
  avatar,
  time,
  status,
  onRetry,
  format = "text",
  streaming = false,
  className,
  children,
  ...props
}: ChatMessageProps) {
  const t = useStrings();
  const user = side === "user";
  const empty = children === undefined || children === null || children === "";
  return (
    <div
      data-slot="chat-message"
      data-side={side}
      data-status={status}
      data-streaming={streaming || undefined}
      className={cn("flex max-w-[85%] items-start gap-2", user ? "flex-row-reverse self-end" : "self-start", className)}
      {...props}
    >
      {avatar ?? (name ? <Avatar name={name} src={avatarSrc as string} size="sm" className="mt-0.5" /> : null)}
      <div className={cn("flex min-w-0 flex-col gap-1", user ? "items-end" : "items-start")}>
        {name || time ? (
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            {name ? <span className="text-label text-foreground">{name}</span> : null}
            {time ? <DateTime value={time} format={{ timeStyle: "short" }} /> : null}
          </div>
        ) : null}
        <div
          data-slot="chat-bubble"
          aria-busy={streaming || undefined}
          className={cn(
            "min-w-0 rounded-card px-3 py-2 text-body",
            user ? "bg-secondary text-secondary-foreground" : "border border-border bg-card text-nq-fg-body",
            status === "error" && "border border-nq-danger",
          )}
        >
          {empty ? null : typeof children === "string" && format === "markdown" ? (
            <Markdown>{children}</Markdown>
          ) : typeof children === "string" ? (
            <p dir="auto" className="whitespace-pre-wrap text-start [overflow-wrap:anywhere]">
              {children}
            </p>
          ) : (
            children
          )}
          {streaming ? <TypingIndicator className={empty ? undefined : "mt-1 block"} /> : null}
        </div>
        {status ? (
          <div data-slot="chat-status" className="flex items-center gap-1.5 text-caption text-muted-foreground">
            {status === "sending" ? (
              <>
                <Spinner className="size-3" />
                <span role="status">{t.sending}</span>
              </>
            ) : status === "sent" ? (
              <>
                <Check aria-hidden className="size-3" />
                <span>{t.sent}</span>
              </>
            ) : (
              <>
                <CircleAlert aria-hidden className="size-3 text-nq-danger-text" />
                <span role="alert" className="text-nq-danger-text">
                  {t.failed}
                </span>
                {onRetry ? (
                  <Button type="button" variant="link" size="sm" onClick={onRetry}>
                    {t.retry}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ChatComposerProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue" | "onSubmit"> {
  /** Controlled text. Omit to let the composer own it. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text on Enter or the send button. The composer clears itself afterwards when uncontrolled. */
  onSend?: (text: string) => void;
  /** While `streaming`, the send button becomes a stop button that calls this. */
  onStop?: () => void;
  /** A reply is being produced. Sending is blocked; the stop button shows when `onStop` is set. */
  streaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Accessible name of the text field. Default "Message" / "الرسالة". */
  label?: string;
  sendLabel?: string;
  stopLabel?: string;
  /** The field grows to this many lines, then scrolls. Default 8. */
  maxRows?: number;
  /** Slot above the field for attachment chips or previews. */
  attachments?: ReactNode;
  /** Slot before the send button, for an attach button or other tools. */
  actions?: ReactNode;
}

/**
 * The message box. Enter sends, Shift+Enter adds a new line, and the field grows with its text. Enter is ignored while
 * an input method (IME) composition is open, so Arabic and CJK candidates can be confirmed without sending.
 */
export function ChatComposer({
  value,
  defaultValue = "",
  onValueChange,
  onSend,
  onStop,
  streaming = false,
  disabled = false,
  placeholder,
  label,
  sendLabel,
  stopLabel,
  maxRows = 8,
  attachments,
  actions,
  className,
  ...props
}: ChatComposerProps) {
  const t = useStrings();
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const field = useRef<HTMLTextAreaElement>(null);

  const set = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  // Autosize: reset, then grow to the content, capped at maxRows lines.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    const chrome = el.offsetHeight - el.clientHeight;
    const max = line * maxRows + Number.parseFloat(getComputedStyle(el).paddingBlock || "0") * 2;
    el.style.height = `${Math.min(el.scrollHeight + chrome, max)}px`;
    el.style.overflowY = el.scrollHeight + chrome > max ? "auto" : "hidden";
  }, [text, maxRows]);

  const trimmed = text.trim();
  const canSend = !disabled && !streaming && trimmed.length > 0;

  const send = () => {
    if (!canSend) return;
    onSend?.(trimmed);
    if (value === undefined) setInner("");
    onValueChange?.("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    send();
  };

  const stopping = streaming && onStop;
  return (
    <div
      data-slot="chat-composer"
      data-disabled={disabled || undefined}
      className={cn(
        "flex flex-col gap-2 rounded-card border border-input bg-card p-2 transition-colors duration-150 ease-nq",
        "focus-within:border-nq-focus data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {attachments ? (
        <div data-slot="chat-attachments" className="flex flex-wrap gap-2">
          {attachments}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          ref={field}
          rows={1}
          dir="auto"
          value={text}
          disabled={disabled}
          placeholder={placeholder ?? t.placeholder}
          aria-label={label ?? t.message}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set(e.target.value)}
          onKeyDown={onKeyDown}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 focus-visible:outline-0"
        />
        {actions}
        {stopping ? (
          <Button type="button" variant="secondary" size="icon" aria-label={stopLabel ?? t.stop} onClick={onStop}>
            <Square aria-hidden className="fill-current" />
          </Button>
        ) : (
          <Button type="button" variant="primary" size="icon" aria-label={sendLabel ?? t.send} disabled={!canSend} onClick={send}>
            <Send aria-hidden className="rtl:-scale-x-100" />
          </Button>
        )}
      </div>
    </div>
  );
}
