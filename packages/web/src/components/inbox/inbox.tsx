"use client";

import { ArrowLeft, Check, CircleUser, Mail, MessageCircle, MoreHorizontal, PanelRight, Pin, Search, BellOff, SquareArrowOutUpRight, Undo2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { TypingIndicator } from "../chat";
import { ChatThread } from "../chat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../dropdown-menu";
import { Input } from "../field";
import { formatRelativeTime, useFormatNumber } from "../numeric";
import { Sheet, SheetContent, SheetTitle } from "../sheet";
import { EmptyState } from "../states";
import { Tabs, TabsList, TabsTab } from "../tabs";
import { InboxComposer } from "./inbox-composer";
import {
  type CannedSnippet,
  type ConversationPatch,
  countViews,
  filterConversations,
  findMatches,
  type InboxAgent,
  type InboxChannel,
  type InboxConversation,
  type InboxDraft,
  type InboxMessage,
  type InboxResult,
  lastMessage,
  previewOf,
  toTime,
} from "./inbox-format";
import { ColorDot, ConversationContextMenu, ConversationRowMenu, SnoozeMenu } from "./inbox-menus";
import { InboxMessageView } from "./inbox-message";
import { ContactInfoPanel, NewMessageToast, ThreadSearchBar } from "./inbox-panels";
import { type InboxLabels, useInboxLabels } from "./inbox-strings";

export { ColorDot, ConversationContextMenu, ConversationRowMenu, SnoozeMenu, CannedPicker, type ConversationContextMenuProps, type ConversationRowMenuProps, type SnoozeMenuProps, type CannedPickerProps } from "./inbox-menus";
export { InboxComposer, type InboxComposerProps } from "./inbox-composer";
export {
  VoicePlayer,
  VoiceRecorder,
  LocationPicker,
  LocationCard,
  LinkPreviewCard,
  type VoicePlayerProps,
  type VoiceRecorderProps,
  type VoiceRecording,
  type LocationPickerProps,
  type LocationCardProps,
  type LinkPreviewCardProps,
} from "./inbox-media";
export {
  QUICK_REACTIONS,
  MessageReactions,
  ReactionPicker,
  ReplyQuote,
  MessageText,
  AttachmentList,
  InboxMessageView,
  type MessageReactionsProps,
  type ReactionPickerProps,
  type ReplyQuoteProps,
  type MessageTextProps,
  type InboxMessageViewProps,
} from "./inbox-message";
export { ThreadSearchBar, ContactInfoPanel, NewMessageToast, InboxDock, type ThreadSearchBarProps, type ContactInfoPanelProps, type NewMessageToastProps, type InboxDockProps } from "./inbox-panels";
export {
  applySnippet,
  filterConversations,
  countViews,
  findMatches,
  snoozePresets,
  INBOX_COLORS,
  type InboxAgent,
  type InboxAttachment,
  type InboxChannel,
  type InboxColor,
  type InboxContact,
  type InboxConversation,
  type InboxDraft,
  type InboxMessage,
  type InboxResult,
  type InboxStatus,
  type ConversationPatch,
  type CannedSnippet,
  type GeoPoint,
  type LinkPreviewData,
  type InboxReaction,
  type VoiceNote,
} from "./inbox-format";
export { type InboxLabels } from "./inbox-strings";

type Scope = "all" | "mine" | "unassigned";
type View = "active" | "unread" | "snoozed" | "closed" | "archived";

export interface InboxProps extends Omit<ComponentProps<"div">, "children" | "onSelect" | "contextMenu"> {
  conversations: readonly InboxConversation[];
  agents: readonly InboxAgent[];
  /** Id of the signed-in agent. */
  currentAgentId: string;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Sends a reply, note, voice message or location. Resolve with `{ error }` to keep the draft. */
  onSend: (draft: InboxDraft) => Promise<InboxResult>;
  /** Pin, archive, mute, colour, status, assignment, snooze, mark unread. */
  onUpdate: (conversationId: string, patch: ConversationPatch) => void | Promise<void>;
  onReact?: (conversationId: string, messageId: string, emoji: string) => void | Promise<void>;
  onRetry?: (conversationId: string, message: InboxMessage) => void | Promise<void>;
  /** Adds a pop-out button to the thread that hands the conversation to a docked window. */
  onPopOut?: (conversationId: string) => void;
  snippets?: readonly CannedSnippet[];
  loading?: boolean;
  /** Show a toast when a message arrives in a conversation you are not reading. Default true. */
  toasts?: boolean;
  /** Voice recorder never touches the microphone (demos and tests). */
  simulateVoice?: boolean;
  /** Below this width (px) one pane shows at a time. Default 820. */
  compactBelow?: number;
  /** Open a conversation's row menu (pin, mute, colour, snooze, archive) on context-click, long-press or Shift+F10. Default true. */
  contextMenu?: boolean;
  labels?: Partial<InboxLabels>;
}

const CHANNELS: InboxChannel[] = ["chat", "email", "whatsapp"];

function ChannelBadge({ channel, label }: { channel: InboxChannel; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
      {channel === "chat" ? <MessageCircle aria-hidden className="size-3" /> : channel === "email" ? <Mail aria-hidden className="size-3" /> : null}
      {label}
    </span>
  );
}

/**
 * The unified inbox for chat, email and WhatsApp: a filterable conversation list, the thread with its composer, and a
 * contact panel. Every change goes through your callbacks; nothing is stored here. Under 820px wide it shows one pane
 * at a time.
 */
export function Inbox({
  conversations,
  agents,
  currentAgentId,
  selectedId,
  defaultSelectedId = null,
  onSelectedChange,
  onSend,
  onUpdate,
  onReact,
  onRetry,
  onPopOut,
  snippets,
  loading = false,
  toasts = true,
  simulateVoice,
  compactBelow = 820,
  contextMenu = true,
  labels,
  className,
  ...props
}: InboxProps) {
  const t = useInboxLabels(labels);
  const fmt = useFormatNumber();
  const locale = useOptionalNasaq()?.locale ?? "en";
  const root = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [inner, setInner] = useState<string | null>(defaultSelectedId);
  const current = selectedId === undefined ? inner : selectedId;
  const select = useCallback(
    (id: string | null) => {
      setInner(id);
      onSelectedChange?.(id);
    },
    [onSelectedChange],
  );
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<InboxChannel | "all">("all");
  const [scope, setScope] = useState<Scope>("all");
  const [view, setView] = useState<View>("active");
  const [contactOpen, setContactOpen] = useState(false);
  const [finding, setFinding] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null);
  const me = agents.find((a) => a.id === currentAgentId) ?? { id: currentAgentId, name: t.you };

  useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => setCompact((entries[0]?.contentRect.width ?? 9999) < compactBelow));
    ro.observe(el);
    return () => ro.disconnect();
  }, [compactBelow]);

  const list = useMemo(() => {
    const base = filterConversations(conversations, {
      channel,
      scope,
      query,
      me: currentAgentId,
      view: view === "unread" ? "active" : view,
    });
    return view === "unread" ? base.filter((c) => (c.unread ?? 0) > 0 && !c.muted) : base;
  }, [conversations, channel, scope, query, view, currentAgentId]);
  const counts = useMemo(() => countViews(conversations), [conversations]);
  const conv = conversations.find((c) => c.id === current) ?? null;
  const words = { voice: t.voiceMessage, location: t.locationMessage, attachment: t.attachmentMessage };
  const assignee = conv?.assigneeId ? (agents.find((a) => a.id === conv.assigneeId) ?? null) : null;

  // Reset thread-local state when the conversation changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on id change
  useEffect(() => {
    setReplyTo(null);
    setFinding(false);
    setFindQuery("");
    setFindIndex(0);
  }, [current]);

  // Mark as read when opened.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const unreadOfCurrent = conv?.unread ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: run when the open thread gets unread again
  useEffect(() => {
    if (current && unreadOfCurrent > 0 && (!compact || true)) void onUpdateRef.current(current, { unread: false });
  }, [current, unreadOfCurrent]);

  // ---- New message toasts --------------------------------------------------------------------------------------
  const seen = useRef<Map<string, string | undefined> | null>(null);
  const [incoming, setIncoming] = useState<{ key: string; conversationId: string; message: InboxMessage }[]>([]);
  useEffect(() => {
    const prev = seen.current;
    const next = new Map<string, string | undefined>();
    const fresh: { key: string; conversationId: string; message: InboxMessage }[] = [];
    for (const c of conversations) {
      const m = lastMessage(c);
      next.set(c.id, m?.id);
      if (prev && m && prev.get(c.id) !== m.id && m.direction === "in" && m.kind !== "system" && m.kind !== "note" && c.id !== current && !c.muted && !c.archived) {
        fresh.push({ key: `${c.id}:${m.id}`, conversationId: c.id, message: m });
      }
    }
    seen.current = next;
    if (toasts && fresh.length) setIncoming((all) => [...fresh, ...all].slice(0, 3));
  }, [conversations, current, toasts]);

  // ---- Find in thread ------------------------------------------------------------------------------------------
  const matches = useMemo(() => (conv && finding && findQuery ? findMatches(conv.messages, findQuery) : []), [conv, finding, findQuery]);
  const safeIndex = matches.length ? Math.min(findIndex, matches.length - 1) : 0;
  const currentMatch = matches[safeIndex];
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on match change
  useEffect(() => {
    if (!currentMatch) return;
    const el = root.current?.querySelector<HTMLElement>("[data-find-current]");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentMatch?.messageId, currentMatch?.nth, safeIndex]);

  const jump = (messageId: string) => {
    const el = root.current?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const patch = (id: string, p: ConversationPatch) => void onUpdate(id, p);
  const showList = !compact || !conv;
  const showThread = !compact || !!conv;

  const views: { id: View; label: string; n: number }[] = [
    { id: "active", label: t.viewActive, n: counts.active },
    { id: "unread", label: t.viewUnread, n: counts.unread },
    { id: "snoozed", label: t.viewSnoozed, n: counts.snoozed },
    { id: "closed", label: t.viewClosed, n: counts.closed },
    { id: "archived", label: t.viewArchived, n: counts.archived },
  ];
  const channelLabel = (c: InboxChannel) => (c === "chat" ? t.channelChat : c === "email" ? t.channelEmail : t.channelWhatsapp);

  const listPane = (
    <section aria-label={t.conversations} className={cn("flex min-h-0 flex-col border-border bg-card", compact ? "flex-1" : "w-80 shrink-0 border-e xl:w-96")}>
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" dir="auto" aria-label={t.search} placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className="ps-9" />
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="gap-0">
          <TabsList aria-label={t.views} className="w-full overflow-x-auto">
            {views.map((v) => (
              <TabsTab key={v.id} value={v.id} className="gap-1.5">
                {v.label}
                <span className="text-caption tabular-nums text-muted-foreground">{fmt(v.n)}</span>
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label={t.channels} className="flex flex-wrap gap-1">
            {(["all", ...CHANNELS] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={channel === c}
                onClick={() => setChannel(c)}
                className="h-7 rounded-full border border-border px-2.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:border-transparent aria-pressed:bg-secondary aria-pressed:text-foreground"
              >
                {c === "all" ? t.channelAll : channelLabel(c)}
              </button>
            ))}
          </div>
          <span className="flex-1" />
          <div role="group" aria-label={t.scope} className="flex gap-1">
            {(["all", "mine", "unassigned"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className="h-7 rounded-full px-2.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-secondary aria-pressed:text-foreground"
              >
                {s === "all" ? t.scopeAll : s === "mine" ? t.scopeMine : t.scopeUnassigned}
              </button>
            ))}
          </div>
        </div>
      </div>
      {loading ? (
        <ul aria-busy="true" aria-label={t.loading} className="flex flex-col gap-1 p-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-control p-2">
              <span className="size-10 rounded-full bg-secondary motion-safe:animate-pulse" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="h-3 w-1/2 rounded bg-secondary motion-safe:animate-pulse" />
                <span className="h-3 w-4/5 rounded bg-secondary motion-safe:animate-pulse" />
              </span>
            </li>
          ))}
        </ul>
      ) : list.length === 0 ? (
        <EmptyState title={t.empty} description={t.emptyHint} className="m-3 flex-1 border-0" />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
          {list.map((c) => {
            const last = lastMessage(c);
            const active = c.id === current;
            const unread = c.unread ?? 0;
            const row = (
              <li className="group/row relative">
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  data-unread={unread > 0 || undefined}
                  onClick={() => select(c.id)}
                  className="flex w-full items-start gap-3 rounded-control p-2.5 pe-10 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus aria-[current=true]:bg-secondary"
                >
                  <Avatar name={c.contact.name} src={c.contact.avatar as string} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      {c.color ? <ColorDot color={c.color} /> : null}
                      <span dir="auto" className={cn("min-w-0 flex-1 truncate text-body-sm text-foreground", unread > 0 ? "font-semibold" : "font-medium")}>
                        {c.contact.name}
                      </span>
                      {c.pinned ? <Pin aria-label={t.pinned} className="size-3 shrink-0 text-muted-foreground" /> : null}
                      {c.muted ? <BellOff aria-label={t.muted} className="size-3 shrink-0 text-muted-foreground" /> : null}
                      {last ? <span className="shrink-0 text-caption text-muted-foreground">{formatRelativeTime(last.at, locale)}</span> : null}
                    </span>
                    {c.subject ? (
                      <span dir="auto" className="truncate text-caption text-foreground">
                        {c.subject}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5">
                      <span dir="auto" className={cn("min-w-0 flex-1 truncate text-caption", unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                        {c.typing ? t.typing : previewOf(last, words)}
                      </span>
                      {unread > 0 ? (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-nq-accent px-1 text-caption tabular-nums text-foreground">
                          <span aria-hidden>{fmt(unread)}</span>
                          <span className="sr-only">{t.unreadCount(fmt(unread))}</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <ChannelBadge channel={c.channel} label={channelLabel(c.channel)} />
                      {c.status === "snoozed" && c.snoozedUntil ? (
                        <span className="text-caption text-muted-foreground">{t.snoozedUntil(new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(toTime(c.snoozedUntil)))}</span>
                      ) : null}
                    </span>
                  </span>
                </button>
                <div className="absolute end-1.5 top-1.5">
                  <ConversationRowMenu
                    conversation={c}
                    onUpdate={(p) => patch(c.id, p)}
                    labels={labels}
                    trigger={
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t.rowActions(c.contact.name)} className="opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100 max-md:opacity-100">
                        <MoreHorizontal aria-hidden />
                      </Button>
                    }
                  />
                </div>
              </li>
            );
            return (
              <ConversationContextMenu
                key={c.id}
                conversation={c}
                onUpdate={(p) => patch(c.id, p)}
                labels={labels}
                disabled={!contextMenu}
                render={row}
                focusTarget={(li) => li.querySelector<HTMLElement>("button")}
              />
            );
          })}
        </ul>
      )}
    </section>
  );

  const threadPane = conv ? (
    <section aria-label={conv.contact.name} className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        {compact ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.back} onClick={() => select(null)}>
            <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
          </Button>
        ) : null}
        <Avatar name={conv.contact.name} src={conv.contact.avatar as string} size="md" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 dir="auto" className="truncate text-label text-foreground">
            {conv.contact.name}
          </h2>
          <span className="flex items-center gap-2 truncate text-caption text-muted-foreground">
            <ChannelBadge channel={conv.channel} label={channelLabel(conv.channel)} />
            {conv.status === "closed" ? <span>{t.closed}</span> : null}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="ghost" size="sm" aria-label={t.assignTo}>
                {assignee ? <Avatar name={assignee.name} src={assignee.avatar as string} size="xs" /> : <CircleUser aria-hidden />}
                <span className="hidden max-w-24 truncate sm:inline">{assignee ? assignee.name : t.unassigned}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuLabel>{t.assignTo}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => patch(conv.id, { assigneeId: currentAgentId })}>{t.assignToMe}</DropdownMenuItem>
            {agents.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => patch(conv.id, { assigneeId: a.id })}>
                <Avatar name={a.name} src={a.avatar as string} size="xs" />
                <span className="flex-1 truncate">{a.name}</span>
                {a.id === conv.assigneeId ? <Check aria-hidden className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => patch(conv.id, { assigneeId: null })}>{t.unassigned}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SnoozeMenu snoozedUntil={conv.status === "snoozed" ? conv.snoozedUntil : null} labels={labels} onSnooze={(until) => patch(conv.id, until === null ? { status: "open", snoozedUntil: null } : { status: "snoozed", snoozedUntil: until })} />
        {conv.status === "closed" ? (
          <Button type="button" variant="ghost" size="icon" aria-label={t.reopen} onClick={() => patch(conv.id, { status: "open" })}>
            <Undo2 aria-hidden />
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon" aria-label={t.close} onClick={() => patch(conv.id, { status: "closed" })}>
            <Check aria-hidden />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" aria-label={t.find} aria-pressed={finding} onClick={() => setFinding((v) => !v)}>
          <Search aria-hidden />
        </Button>
        {onPopOut ? (
          <Button type="button" variant="ghost" size="icon" aria-label={t.popOut} onClick={() => onPopOut(conv.id)}>
            <SquareArrowOutUpRight aria-hidden />
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="icon" aria-label={contactOpen ? t.hideContact : t.openContact} aria-pressed={contactOpen} onClick={() => setContactOpen((v) => !v)}>
          <PanelRight aria-hidden className="rtl:-scale-x-100" />
        </Button>
      </header>
      {finding ? (
        <ThreadSearchBar query={findQuery} onQueryChange={(q) => (setFindQuery(q), setFindIndex(0))} total={matches.length} index={safeIndex} onIndexChange={setFindIndex} onClose={() => (setFinding(false), setFindQuery(""))} labels={labels} />
      ) : null}
      <ChatThread label={t.thread} className="flex-1" contentClassName="gap-3 p-4">
        {conv.messages.map((m, i) => {
          const prev = conv.messages[i - 1];
          const newDay = !prev || new Date(toTime(prev.at)).toDateString() !== new Date(toTime(m.at)).toDateString();
          return (
            <div key={m.id} data-message-id={m.id} className="flex flex-col gap-3">
              {newDay ? (
                <div className="flex items-center gap-3 text-caption text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(toTime(m.at))}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              ) : null}
              <InboxMessageView
                message={m}
                channel={conv.channel}
                contact={conv.contact}
                me={currentAgentId}
                query={finding ? findQuery : undefined}
                current={currentMatch?.messageId === m.id ? currentMatch.nth : -1}
                onReply={setReplyTo}
                onReact={(msg, emoji) => void onReact?.(conv.id, msg.id, emoji)}
                onRetry={(msg) => void onRetry?.(conv.id, msg)}
                onJump={jump}
                labels={labels}
              />
            </div>
          );
        })}
        {conv.typing ? (
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <TypingIndicator label={`${conv.contact.name} ${t.typing}`} />
          </div>
        ) : null}
      </ChatThread>
      <InboxComposer
        key={conv.id}
        conversation={conv}
        me={me}
        agents={agents}
        snippets={snippets}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={onSend}
        simulateVoice={simulateVoice}
        labels={labels}
      />
    </section>
  ) : (
    <div className="flex min-w-0 flex-1 items-center justify-center bg-background p-6">
      <EmptyState title={t.noSelection} description={t.noSelectionHint} className="max-w-sm border-0" />
    </div>
  );

  const contact: ReactNode =
    conv && contactOpen ? (
      compact ? (
        <Sheet open onOpenChange={(o) => !o && setContactOpen(false)}>
          <SheetContent side="end" className="w-[min(24rem,100vw)] p-0" showClose={false}>
            <SheetTitle className="sr-only">{t.openContact}</SheetTitle>
            <ContactInfoPanel contact={conv.contact} messages={conv.messages} assignee={assignee} channelLabel={channelLabel(conv.channel)} onClose={() => setContactOpen(false)} labels={labels} className="h-full border-0" />
          </SheetContent>
        </Sheet>
      ) : (
        <ContactInfoPanel contact={conv.contact} messages={conv.messages} assignee={assignee} channelLabel={channelLabel(conv.channel)} onClose={() => setContactOpen(false)} labels={labels} className="w-80 shrink-0 border-s" />
      )
    ) : null;

  return (
    <div
      ref={root}
      data-slot="inbox"
      data-compact={compact || undefined}
      className={cn("relative flex h-[40rem] min-h-0 w-full overflow-hidden rounded-card border border-border bg-card", className)}
      {...props}
    >
      {showList ? listPane : null}
      {showThread ? threadPane : null}
      {contact}
      {incoming.length ? (
        <div className="pointer-events-none absolute bottom-4 end-4 z-30 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2">
          {incoming.map((n) => {
            const c = conversations.find((x) => x.id === n.conversationId);
            if (!c) return null;
            return (
              <NewMessageToast
                key={n.key}
                className="pointer-events-auto"
                conversation={c}
                message={n.message}
                labels={labels}
                onOpen={() => {
                  select(c.id);
                  setIncoming((all) => all.filter((x) => x.key !== n.key));
                }}
                onDismiss={() => setIncoming((all) => all.filter((x) => x.key !== n.key))}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

