"use client";

import { ChevronDown, ChevronUp, ExternalLink, FileText, Image as ImageIcon, Link2, MessagesSquare, Minus, Search, X } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { ChatComposer, ChatThread } from "../chat";
import { CopyButton } from "../copy-button";
import { Dialog, DialogContent, DialogTitle } from "../dialog";
import { Input } from "../field";
import { NotificationItem } from "../notification-item";
import { DateTime, formatRelativeTime, useFormatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  collectMedia,
  formatBytes,
  hostOf,
  type InboxAgent,
  type InboxContact,
  type InboxConversation,
  type InboxDraft,
  type InboxMessage,
  type InboxResult,
  lastMessage,
  previewOf,
  type MediaItem,
} from "./inbox-format";
import { InboxMessageView } from "./inbox-message";
import { type InboxLabels, useInboxLabels } from "./inbox-strings";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

// ---------------------------------------------------------------------------------------------
// Find in thread
// ---------------------------------------------------------------------------------------------

export interface ThreadSearchBarProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  query: string;
  onQueryChange: (query: string) => void;
  /** Number of matches in the thread. */
  total: number;
  /** Current match, 0-based. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  labels?: Partial<InboxLabels>;
}

/** The find bar of a thread: a field, "3 of 12", previous and next (Enter, Shift+Enter) and close (Escape). */
export function ThreadSearchBar({ query, onQueryChange, total, index, onIndexChange, onClose, labels, className, ...props }: ThreadSearchBarProps) {
  const t = useInboxLabels(labels);
  const fmt = useFormatNumber();
  const go = (delta: number) => total > 0 && onIndexChange((index + delta + total) % total);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      go(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };
  return (
    <div data-slot="thread-search" role="search" aria-label={t.find} className={cn("flex items-center gap-2 border-b border-border bg-card px-3 py-2", className)} {...props}>
      <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <Input
        autoFocus
        type="search"
        value={query}
        placeholder={t.findPlaceholder}
        aria-label={t.findPlaceholder}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKey}
        className="h-8 flex-1"
      />
      <span role="status" className="min-w-16 text-center text-caption tabular-nums text-muted-foreground">
        {query.trim() ? (total > 0 ? t.findCount(fmt(index + 1), fmt(total)) : t.findNone) : ""}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.findPrev} disabled={total === 0} onClick={() => go(-1)}>
        <ChevronUp aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.findNext} disabled={total === 0} onClick={() => go(1)}>
        <ChevronDown aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.findClose} onClick={onClose}>
        <X aria-hidden />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Contact info panel with the media gallery
// ---------------------------------------------------------------------------------------------

export interface ContactInfoPanelProps extends Omit<ComponentProps<"aside">, "children"> {
  contact: InboxContact;
  /** The thread, used for the media gallery (images, files and links people shared). */
  messages?: readonly InboxMessage[];
  assignee?: InboxAgent | null;
  /** Shown as a badge under the name, e.g. the channel. */
  channelLabel?: string;
  onClose?: () => void;
  labels?: Partial<InboxLabels>;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 text-body-sm text-foreground">{children}</dd>
    </div>
  );
}

/** Who the conversation is with: details with copy buttons, tags, notes and a Media, Files, Links gallery with a lightbox. */
export function ContactInfoPanel({ contact, messages = [], assignee, channelLabel, onClose, labels, className, ...props }: ContactInfoPanelProps) {
  const t = useInboxLabels(labels);
  const media = useMemo(() => collectMedia(messages), [messages]);
  const images = media.filter((m) => m.kind === "image");
  const files = media.filter((m) => m.kind === "file");
  const links = media.filter((m) => m.kind === "link");
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  return (
    <aside data-slot="contact-info" aria-label={t.contact} className={cn("flex min-h-0 flex-col overflow-y-auto bg-card", className)} {...props}>
      <div className="flex items-start justify-between gap-2 p-4 pb-0">
        <span className="text-label text-foreground">{t.contact}</span>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.hideContact} onClick={onClose}>
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <Avatar name={contact.name} src={contact.avatar as string} size="lg" className="size-16 text-h3" />
        <h2 dir="auto" className="text-h3 text-foreground">
          {contact.name}
        </h2>
        {channelLabel ? <Badge variant="outline">{channelLabel}</Badge> : null}
        {assignee ? <span className="text-caption text-muted-foreground">{t.assignedTo(assignee.name)}</span> : null}
      </div>
      <dl className="flex flex-col gap-3 border-t border-border p-4">
        {contact.email ? (
          <Detail label={t.contactEmail}>
            <bdi dir="ltr" className="min-w-0 flex-1 truncate">
              {contact.email}
            </bdi>
            <CopyButton value={contact.email} label={`${t.copy}: ${t.contactEmail}`} />
          </Detail>
        ) : null}
        {contact.phone ? (
          <Detail label={t.contactPhone}>
            <bdi dir="ltr" className="min-w-0 flex-1 truncate tabular-nums">
              {contact.phone}
            </bdi>
            <CopyButton value={contact.phone} label={`${t.copy}: ${t.contactPhone}`} />
          </Detail>
        ) : null}
        {contact.company ? <Detail label={t.contactCompany}><span dir="auto">{contact.company}</span></Detail> : null}
        {contact.location ? <Detail label={t.contactLocation}><span dir="auto">{contact.location}</span></Detail> : null}
        {contact.timezone ? <Detail label={t.contactTimezone}><bdi dir="ltr">{contact.timezone}</bdi></Detail> : null}
        {contact.firstSeen ? (
          <Detail label={t.contactSince}>
            <DateTime value={contact.firstSeen} format={{ dateStyle: "medium" }} />
          </Detail>
        ) : null}
        {contact.tags?.length ? (
          <div className="flex flex-col gap-1.5">
            <dt className="text-caption text-muted-foreground">{t.contactTags}</dt>
            <dd className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </dd>
          </div>
        ) : null}
        {contact.notes ? (
          <Detail label={t.contactNotes}>
            <span dir="auto" className="whitespace-pre-wrap text-nq-fg-body">
              {contact.notes}
            </span>
          </Detail>
        ) : null}
      </dl>
      <Tabs defaultValue="media" className="gap-3 border-t border-border p-4">
        <TabsList aria-label={t.mediaTabs} variant="underline">
          <TabsTab value="media">
            <ImageIcon aria-hidden />
            {t.media}
          </TabsTab>
          <TabsTab value="files">
            <FileText aria-hidden />
            {t.files}
          </TabsTab>
          <TabsTab value="links">
            <Link2 aria-hidden />
            {t.links}
          </TabsTab>
          <TabsIndicator />
        </TabsList>
        <TabsPanel value="media">
          {images.length === 0 ? (
            <p className="py-4 text-center text-caption text-muted-foreground">{t.mediaEmpty}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-1.5">
              {images.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={`${t.mediaOpen}: ${m.name}`}
                    onClick={() => setLightbox(m)}
                    className="block aspect-square w-full overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                  >
                    {m.url ? <img src={m.url} alt="" loading="lazy" className="size-full object-cover" /> : <ImageIcon aria-hidden className="m-auto size-5 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsPanel>
        <TabsPanel value="files">
          {files.length === 0 ? (
            <p className="py-4 text-center text-caption text-muted-foreground">{t.mediaEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {files.map((m) => (
                <li key={m.id}>
                  <a href={m.url} download={m.name} className="flex items-center gap-2 rounded-control p-1.5 no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span dir="auto" className="min-w-0 flex-1 truncate text-body-sm text-foreground">
                      {m.name}
                    </span>
                    {m.size ? <bdi dir="ltr" className="text-caption text-muted-foreground">{formatBytes(m.size)}</bdi> : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </TabsPanel>
        <TabsPanel value="links">
          {links.length === 0 ? (
            <p className="py-4 text-center text-caption text-muted-foreground">{t.mediaEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {links.map((m) => (
                <li key={m.id}>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-control p-1.5 no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <ExternalLink aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span dir="auto" className="truncate text-body-sm text-foreground">
                        {m.name}
                      </span>
                      <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                        {hostOf(m.url ?? "")}
                      </bdi>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </TabsPanel>
      </Tabs>
      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="truncate text-body-sm">{lightbox?.name}</DialogTitle>
          {lightbox?.url ? <img src={lightbox.url} alt={lightbox.name} className="max-h-[70dvh] w-full rounded-control object-contain" /> : null}
          {lightbox?.url ? (
            <a href={lightbox.url} download={lightbox.name} className="self-start text-body-sm text-foreground underline decoration-nq-line underline-offset-4">
              {t.download}
            </a>
          ) : null}
        </DialogContent>
      </Dialog>
    </aside>
  );
}

// ---------------------------------------------------------------------------------------------
// Live new-message toast
// ---------------------------------------------------------------------------------------------

export interface NewMessageToastProps extends Omit<ComponentProps<"div">, "children"> {
  conversation: Pick<InboxConversation, "id" | "contact" | "subject" | "channel">;
  message: InboxMessage;
  onOpen: () => void;
  onDismiss: () => void;
  /** Hides itself after this many milliseconds; hover and focus pause it. 0 keeps it. Default 7000. */
  autoHideMs?: number;
  labels?: Partial<InboxLabels>;
}

/** A toast for a message that just arrived in a conversation you are not looking at. Built on `NotificationItem`. */
export function NewMessageToast({ conversation, message, onOpen, onDismiss, autoHideMs = 7000, labels, className, ...props }: NewMessageToastProps) {
  const t = useInboxLabels(labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!autoHideMs || paused) return;
    const id = setTimeout(() => dismiss.current(), autoHideMs);
    return () => clearTimeout(id);
  }, [autoHideMs, paused]);
  const words = { voice: t.voiceMessage, location: t.locationMessage, attachment: t.attachmentMessage };
  return (
    // biome-ignore lint/a11y/useSemanticElements: role=status keeps it a polite live region
    <div
      role="status"
      data-slot="new-message-toast"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn("relative w-80 max-w-full overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating", className)}
      {...props}
    >
      <NotificationItem
        actor={{ name: conversation.contact.name, avatar: conversation.contact.avatar }}
        title={<span dir="auto">{conversation.contact.name}</span>}
        description={<span dir="auto">{previewOf(message, words)}</span>}
        time={formatRelativeTime(message.at, locale)}
        unread
        unreadLabel={t.newMessage}
        onClick={onOpen}
        aria-label={`${t.newMessage}: ${conversation.contact.name}. ${t.openConversation}`}
        className="pe-10"
      />
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.dismiss} onClick={onDismiss} className="absolute end-1.5 top-1.5">
        <X aria-hidden />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Docked chat launcher
// ---------------------------------------------------------------------------------------------

export interface InboxDockProps extends Omit<ComponentProps<"div">, "children" | "onSubmit"> {
  conversations: readonly InboxConversation[];
  /** Id of the current agent. */
  me: string;
  /** Open chat windows (controlled). Omit to let the dock own them. */
  openIds?: string[];
  defaultOpenIds?: string[];
  onOpenIdsChange?: (ids: string[]) => void;
  onSend: (draft: InboxDraft) => Promise<InboxResult>;
  /** Adds a "open in the inbox" button to each window. */
  onOpenInInbox?: (id: string) => void;
  /** `fixed` pins it to the viewport corner; `absolute` pins it inside a relative parent. Default "fixed". */
  position?: "fixed" | "absolute" | "static";
  /** Most windows open at once (the oldest closes). Default 2. */
  maxWindows?: number;
  labels?: Partial<InboxLabels>;
}

/**
 * A launcher pinned to a corner with the total unread count. It opens a short list of conversations; picking one opens
 * a small chat window next to it (minimise or close), so an agent can answer without leaving the page.
 */
export function InboxDock({
  conversations,
  me,
  openIds,
  defaultOpenIds = [],
  onOpenIdsChange,
  onSend,
  onOpenInInbox,
  position = "fixed",
  maxWindows = 2,
  labels,
  className,
  ...props
}: InboxDockProps) {
  const t = useInboxLabels(labels);
  const fmt = useFormatNumber();
  const [listOpen, setListOpen] = useState(false);
  const [inner, setInner] = useState(defaultOpenIds);
  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  const ids = openIds ?? inner;
  const setIds = (next: string[]) => {
    setInner(next);
    onOpenIdsChange?.(next);
  };
  const unread = conversations.reduce((n, c) => n + (c.muted ? 0 : (c.unread ?? 0)), 0);
  const words = { voice: t.voiceMessage, location: t.locationMessage, attachment: t.attachmentMessage };
  const recent = [...conversations].filter((c) => !c.archived).slice(0, 6);

  const open = (id: string) => {
    setMinimized((m) => ({ ...m, [id]: false }));
    if (!ids.includes(id)) setIds([...ids, id].slice(-maxWindows));
    setListOpen(false);
  };

  return (
    <div
      data-slot="inbox-dock"
      className={cn(
        "z-40 flex items-end gap-3",
        position === "fixed" && "fixed bottom-4 end-4",
        position === "absolute" && "absolute bottom-4 end-4",
        className,
      )}
      {...props}
    >
      {ids.map((id) => {
        const c = conversations.find((x) => x.id === id);
        if (!c) return null;
        const min = minimized[id];
        return (
          <section
            key={id}
            aria-label={c.contact.name}
            data-minimized={min || undefined}
            className="flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-floating border border-border bg-card shadow-floating"
          >
            <header className="flex items-center gap-2 border-b border-border bg-secondary px-3 py-2">
              <Avatar name={c.contact.name} src={c.contact.avatar as string} size="sm" />
              <span dir="auto" className="min-w-0 flex-1 truncate text-label text-foreground">
                {c.contact.name}
              </span>
              {onOpenInInbox ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.openConversation} onClick={() => onOpenInInbox(id)}>
                  <ExternalLink aria-hidden />
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.dockMinimize} aria-expanded={!min} onClick={() => setMinimized((m) => ({ ...m, [id]: !m[id] }))}>
                <Minus aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.dockCloseWindow} onClick={() => setIds(ids.filter((x) => x !== id))}>
                <X aria-hidden />
              </Button>
            </header>
            {min ? null : (
              <>
                <ChatThread className="h-72" label={c.contact.name} contentClassName="gap-3 p-3">
                  {c.messages.map((m) => (
                    <InboxMessageView key={m.id} message={m} channel="chat" contact={c.contact} me={me} labels={labels} />
                  ))}
                </ChatThread>
                <ChatComposer
                  className="m-2 mt-0"
                  placeholder={t.messagePlaceholder.split(".")[0]}
                  sendLabel={t.send}
                  label={t.message}
                  onSend={(text) => void onSend({ conversationId: id, channel: c.channel, mode: "reply", body: text, format: "text" })}
                />
              </>
            )}
          </section>
        );
      })}
      <div className="relative">
        {listOpen ? (
          <div
            role="dialog"
            aria-label={t.dockNew}
            className="absolute bottom-full end-0 mb-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-floating border border-border bg-popover shadow-floating"
          >
            <p className="border-b border-border px-4 py-2 text-label text-foreground">{t.dockNew}</p>
            {recent.length === 0 ? (
              <EmptyState title={t.dockEmpty} className="border-0" />
            ) : (
              <ul className="flex max-h-80 flex-col overflow-y-auto">
                {recent.map((c) => (
                  <li key={c.id}>
                    <NotificationItem
                      actor={{ name: c.contact.name, avatar: c.contact.avatar }}
                      title={<span dir="auto">{c.contact.name}</span>}
                      description={<span dir="auto">{previewOf(lastMessage(c), words)}</span>}
                      unread={(c.unread ?? 0) > 0}
                      unreadLabel={t.unreadCount(fmt(c.unread ?? 0))}
                      onClick={() => open(c.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="rounded-full shadow-floating"
          aria-expanded={listOpen}
          aria-label={listOpen ? t.dockClose : t.dockOpen}
          onClick={() => setListOpen((v) => !v)}
        >
          <MessagesSquare aria-hidden />
          {t.dock}
          {unread > 0 ? (
            <span className="ms-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-nq-accent px-1 text-caption tabular-nums text-foreground">
              <span aria-hidden>{fmt(unread)}</span>
              <span className="sr-only">{t.unreadCount(fmt(unread))}</span>
            </span>
          ) : null}
        </Button>
      </div>
    </div>
  );
}
