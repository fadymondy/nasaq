"use client";

import { CornerUpLeft, FileText, Image as ImageIcon, Lock, Smile } from "lucide-react";
import { type ComponentProps, Fragment, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { ChatMessage } from "../chat";
import { DateTime, useFormatNumber } from "../numeric";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "../popover";
import { RichTextEditor } from "../rich-text-editor";
import { formatBytes, type InboxAttachment, type InboxChannel, type InboxMessage, type InboxReaction, messageText, splitByQuery } from "./inbox-format";
import { LinkPreviewCard, LocationCard, VoicePlayer } from "./inbox-media";
import { type InboxLabels, useInboxLabels } from "./inbox-strings";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏", "🎉"] as const;

// ---------------------------------------------------------------------------------------------
// Reactions and the reply quote
// ---------------------------------------------------------------------------------------------

export interface MessageReactionsProps extends Omit<ComponentProps<"div">, "children" | "onToggle"> {
  reactions: readonly InboxReaction[];
  /** Id of the current person. Chips they reacted with are pressed. */
  me: string;
  onToggle: (emoji: string) => void;
  labels?: Partial<InboxLabels>;
}

/** Emoji chips under a message with a count. Press a chip to add or remove your own reaction. */
export function MessageReactions({ reactions, me, onToggle, labels, className, ...props }: MessageReactionsProps) {
  const t = useInboxLabels(labels);
  const fmt = useFormatNumber();
  if (reactions.length === 0) return null;
  return (
    <div data-slot="message-reactions" role="group" aria-label={t.reactions} className={cn("flex flex-wrap gap-1", className)} {...props}>
      {reactions.map((r) => {
        const mine = r.by.includes(me);
        return (
          <button
            key={r.emoji}
            type="button"
            aria-pressed={mine}
            aria-label={t.reactedWith(r.emoji, fmt(r.by.length))}
            onClick={() => onToggle(r.emoji)}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption tabular-nums outline-none",
              "transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus",
              mine ? "border-nq-accent bg-nq-accent/15 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-nq-hover",
            )}
          >
            <span aria-hidden>{r.emoji}</span>
            {fmt(r.by.length)}
          </button>
        );
      })}
    </div>
  );
}

export interface ReactionPickerProps {
  onPick: (emoji: string) => void;
  labels?: Partial<InboxLabels>;
  className?: string;
}

/** A small popover with six quick reactions. */
export function ReactionPicker({ onPick, labels, className }: ReactionPickerProps) {
  const t = useInboxLabels(labels);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.react} className={className}>
            <Smile aria-hidden />
          </Button>
        }
      />
      <PopoverContent side="top" align="center" className="flex w-auto gap-0.5 p-1">
        {QUICK_REACTIONS.map((e) => (
          <QuickEmoji key={e} emoji={e} onPick={onPick} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

function QuickEmoji({ emoji, onPick }: { emoji: string; onPick: (emoji: string) => void }) {
  return (
    <PopoverClose
      aria-label={emoji}
      onClick={() => onPick(emoji)}
      className="grid size-8 place-items-center rounded-control text-lg outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
    >
      {emoji}
    </PopoverClose>
  );
}

export interface ReplyQuoteProps extends Omit<ComponentProps<"div">, "children"> {
  author: string;
  excerpt: string;
  /** Makes the quote a button that jumps to the original. */
  onJump?: () => void;
  labels?: Partial<InboxLabels>;
}

/** The quoted message a reply answers: author and a two-line excerpt with an accent bar on the inline start. */
export function ReplyQuote({ author, excerpt, onJump, labels, className, ...props }: ReplyQuoteProps) {
  const t = useInboxLabels(labels);
  const body = (
    <>
      <span dir="auto" className="block truncate text-caption font-medium text-foreground">
        {author}
      </span>
      <span dir="auto" className="line-clamp-2 block text-caption text-muted-foreground">
        {excerpt}
      </span>
    </>
  );
  return (
    <div data-slot="reply-quote" className={cn("mb-1.5 rounded-[4px] border-s-2 border-nq-accent bg-background/60 ps-2 pe-2 py-1 text-start", className)} {...props}>
      {onJump ? (
        <button type="button" onClick={onJump} aria-label={`${t.quoteJump}: ${author}`} className="block w-full text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Text with highlights and links
// ---------------------------------------------------------------------------------------------

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/gi;

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 ? (
          <a
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            href={part.replace(/[.,;:!?؟،]+$/, "")}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current"
          >
            {part}
          </a>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export interface MessageTextProps extends Omit<ComponentProps<"p">, "children"> {
  text: string;
  /** Find-in-thread query: matches get a `<mark>`. */
  query?: string;
  /** Which match inside this message is the current one (0-based), or -1. */
  current?: number;
}

/** Message text with `dir="auto"`, clickable links and find-in-thread highlights. */
export function MessageText({ text, query, current = -1, className, ...props }: MessageTextProps) {
  let n = -1;
  return (
    <p dir="auto" className={cn("whitespace-pre-wrap text-start [overflow-wrap:anywhere]", className)} {...props}>
      {query?.trim() ? (
        splitByQuery(text, query).map((run, i) => {
          if (!run.match) {
            // eslint-disable-next-line react/no-array-index-key
            return <Fragment key={i}>{run.text}</Fragment>;
          }
          n += 1;
          return (
            <mark
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              data-find-current={n === current || undefined}
              className={cn("rounded-[2px] px-0.5 text-foreground", n === current ? "bg-nq-accent/60 outline outline-1 outline-nq-accent" : "bg-nq-accent/25")}
            >
              {run.text}
            </mark>
          );
        })
      ) : (
        <Linkified text={text} />
      )}
    </p>
  );
}

// ---------------------------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------------------------

export function AttachmentList({ items, className }: { items: readonly InboxAttachment[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((a) => (
        <li key={a.id}>
          {a.kind === "image" ? (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={a.name}
              className="block size-24 overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              {a.url ? (
                <img src={a.url} alt={a.name} loading="lazy" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center text-muted-foreground">
                  <ImageIcon aria-hidden className="size-6" />
                </span>
              )}
            </a>
          ) : (
            <a
              href={a.url}
              download={a.name}
              className="flex h-12 max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2.5 text-start no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <FileText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-col">
                <span dir="auto" className="truncate text-body-sm text-foreground">
                  {a.name}
                </span>
                {a.size ? (
                  <bdi dir="ltr" className="text-caption text-muted-foreground">
                    {formatBytes(a.size)}
                  </bdi>
                ) : null}
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// One message in the thread
// ---------------------------------------------------------------------------------------------

export interface InboxMessageViewProps extends Omit<ComponentProps<"div">, "children"> {
  message: InboxMessage;
  channel: InboxChannel;
  /** Name and avatar of the contact, for inbound messages. */
  contact: { name: string; avatar?: string };
  /** Id of the current agent (reaction state). */
  me: string;
  /** Find-in-thread query and the current match inside this message (0-based, or -1). */
  query?: string;
  current?: number;
  onReply?: (message: InboxMessage) => void;
  onReact?: (message: InboxMessage, emoji: string) => void;
  onRetry?: (message: InboxMessage) => void;
  /** Jump to the quoted message. */
  onJump?: (messageId: string) => void;
  labels?: Partial<InboxLabels>;
}

/**
 * Renders one message by kind: an event line, an internal note, an email card, or a chat bubble carrying text, a voice
 * note, a location, attachments, a link preview, a reply quote and reactions. Reply and react show on hover or focus.
 */
export function InboxMessageView({ message: m, channel, contact, me, query, current = -1, onReply, onReact, onRetry, onJump, labels, className, ...props }: InboxMessageViewProps) {
  const t = useInboxLabels(labels);
  const out = m.direction === "out";
  const who = m.author?.name ?? (out ? t.you : contact.name);
  const text = messageText(m);

  if (m.kind === "system") {
    return (
      <div data-slot="inbox-event" data-message-id={m.id} className={cn("flex items-center gap-3 text-caption text-muted-foreground", className)} {...props}>
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span dir="auto" className="text-center">
          {text}
        </span>
        <DateTime value={m.at} format={{ timeStyle: "short" }} />
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
    );
  }

  if (m.kind === "note") {
    return (
      <div
        data-slot="inbox-note"
        data-message-id={m.id}
        className={cn("flex flex-col gap-1 rounded-card border border-dashed border-nq-warning/50 bg-nq-warning-soft p-3", className)}
        {...props}
      >
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <Badge variant="warning">
            <Lock aria-hidden />
            {t.noteBadge}
          </Badge>
          <span className="text-label text-foreground">{who}</span>
          <DateTime value={m.at} format={{ timeStyle: "short" }} />
        </div>
        <MessageText text={text} query={query} current={current} className="text-body text-nq-fg-body" />
      </div>
    );
  }

  if (channel === "email") {
    const html = m.html && !query?.trim();
    return (
      <article data-slot="inbox-email" data-message-id={m.id} data-direction={m.direction} className={cn("flex flex-col gap-3 rounded-card border border-border bg-card p-4", className)} {...props}>
        <header className="flex items-start gap-3">
          <Avatar name={who} src={(out ? m.author?.avatar : contact.avatar) as string} size="md" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-center gap-x-2 text-label text-foreground">
              <span dir="auto">{who}</span>
              {out ? <Badge variant="outline">{t.reply}</Badge> : null}
            </span>
            {m.to?.length ? (
              <span className="truncate text-caption text-muted-foreground">
                {t.to}: <bdi dir="ltr">{m.to.join(", ")}</bdi>
                {m.cc?.length ? (
                  <>
                    {" · "}
                    {t.cc}: <bdi dir="ltr">{m.cc.join(", ")}</bdi>
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
          <DateTime value={m.at} format={{ dateStyle: "medium", timeStyle: "short" }} className="shrink-0 text-caption text-muted-foreground" />
        </header>
        {m.subject ? (
          <h3 dir="auto" className="text-h3 text-foreground">
            {m.subject}
          </h3>
        ) : null}
        {html ? (
          <RichTextEditor readOnly value={m.body} minHeight="0" aria-label={m.subject ?? t.email} className="border-0 bg-transparent p-0" />
        ) : (
          <MessageText text={text} query={query} current={current} className="text-body text-nq-fg-body" />
        )}
        {m.attachments?.length ? <AttachmentList items={m.attachments} /> : null}
        {m.linkPreview ? <LinkPreviewCard data={m.linkPreview} labels={labels} /> : null}
        {m.status === "sending" || m.status === "error" ? (
          <ChatStatusLine status={m.status} onRetry={onRetry ? () => onRetry(m) : undefined} labels={labels} />
        ) : null}
        {onReply ? (
          <footer>
            <Button type="button" variant="secondary" size="sm" onClick={() => onReply(m)}>
              <CornerUpLeft aria-hidden className="rtl:-scale-x-100" />
              {t.replyAction}
            </Button>
          </footer>
        ) : null}
      </article>
    );
  }

  // Chat and WhatsApp: a bubble with the message parts stacked inside it.
  const parts: ReactNode[] = [];
  if (m.replyTo) parts.push(<ReplyQuote key="q" author={m.replyTo.author} excerpt={m.replyTo.excerpt} onJump={onJump ? () => onJump(m.replyTo?.id as string) : undefined} labels={labels} />);
  if (m.kind === "voice" && m.voice) parts.push(<VoicePlayer key="v" src={m.voice.src} duration={m.voice.duration} waveform={m.voice.waveform} labels={labels} />);
  if (m.kind === "location" && m.location) parts.push(<LocationCard key="l" point={m.location} labels={labels} className="my-1" />);
  if (m.attachments?.length) parts.push(<AttachmentList key="a" items={m.attachments} className="my-1" />);
  if (text && m.kind !== "voice") parts.push(<MessageText key="t" text={text} query={query} current={current} />);
  const preview = m.linkPreview ?? undefined;
  if (preview) parts.push(<LinkPreviewCard key="p" data={preview} labels={labels} className="mt-2 w-60" />);

  const actions = onReply || onReact ? (
    <div
      data-slot="message-actions"
      className="flex shrink-0 items-center self-center opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
    >
      {onReact ? <ReactionPicker onPick={(emoji) => onReact(m, emoji)} labels={labels} /> : null}
      {onReply ? (
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t.replyAction} onClick={() => onReply(m)}>
          <CornerUpLeft aria-hidden className="rtl:-scale-x-100" />
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      data-slot="inbox-message"
      data-message-id={m.id}
      data-direction={m.direction}
      className={cn("group flex max-w-[88%] items-start gap-1", out ? "flex-row-reverse self-end" : "self-start", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <ChatMessage
          side={out ? "user" : "assistant"}
          name={who}
          avatarSrc={out ? m.author?.avatar : contact.avatar}
          time={m.at}
          status={m.status === "sending" || m.status === "error" ? m.status : undefined}
          onRetry={onRetry ? () => onRetry(m) : undefined}
          className="max-w-full"
        >
          {parts.length ? <div className="flex flex-col">{parts}</div> : null}
        </ChatMessage>
        {m.reactions?.length && onReact ? (
          <MessageReactions reactions={m.reactions} me={me} onToggle={(emoji) => onReact(m, emoji)} labels={labels} className={out ? "justify-end" : "ms-8 justify-start"} />
        ) : null}
      </div>
      {actions}
    </div>
  );
}

function ChatStatusLine({ status, onRetry, labels }: { status: "sending" | "error"; onRetry?: () => void; labels?: Partial<InboxLabels> }) {
  const t = useInboxLabels(labels);
  return status === "sending" ? (
    <span role="status" className="text-caption text-muted-foreground">
      {t.sending}
    </span>
  ) : (
    <span className="flex items-center gap-2 text-caption text-nq-danger-text">
      <span role="alert">{t.failed}</span>
      {onRetry ? (
        <Button type="button" variant="link" size="sm" onClick={onRetry}>
          {t.retry}
        </Button>
      ) : null}
    </span>
  );
}
