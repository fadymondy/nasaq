"use client";

import { Archive, ArchiveRestore, BellOff, Bell, Check, Clock, Mail, MailOpen, MoreHorizontal, Palette, Pin, PinOff, Zap } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  openContextMenuAt,
} from "../context-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Input } from "../field";
import { useFormatDate } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import {
  applySnippet,
  type CannedSnippet,
  type ConversationPatch,
  type DateLike,
  filterSnippets,
  INBOX_COLORS,
  type InboxColor,
  type InboxConversation,
  type SnoozePresetId,
  snoozePresets,
  toTime,
} from "./inbox-format";
import { type InboxLabels, useInboxLabels } from "./inbox-strings";

const PRESET_LABEL: Record<SnoozePresetId, "snoozeLater" | "snoozeTomorrow" | "snoozeWeekend" | "snoozeNextWeek"> = {
  later: "snoozeLater",
  tomorrow: "snoozeTomorrow",
  weekend: "snoozeWeekend",
  nextWeek: "snoozeNextWeek",
};

/** The dot shown for a colour label. Uses the tag palette, so it follows the theme. */
export function ColorDot({ color, className }: { color: InboxColor; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: `var(--nq-tag-${color})` }} />;
}

// ---------------------------------------------------------------------------------------------
// Snooze
// ---------------------------------------------------------------------------------------------

/** The menu parts a list of choices is built from, so the ⋯ menu and the context menu share one definition. */
interface MenuKit {
  Item: typeof DropdownMenuItem;
  Separator: typeof DropdownMenuSeparator;
  Sub: typeof DropdownMenuSub;
  SubTrigger: typeof DropdownMenuSubTrigger;
  SubContent: typeof DropdownMenuSubContent;
}
const DROPDOWN_KIT: MenuKit = { Item: DropdownMenuItem, Separator: DropdownMenuSeparator, Sub: DropdownMenuSub, SubTrigger: DropdownMenuSubTrigger, SubContent: DropdownMenuSubContent };
const CONTEXT_KIT = {
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
} as unknown as MenuKit;

function SnoozePresetItems({ onPick, now, labels, kit = DROPDOWN_KIT }: { onPick: (at: number) => void; now?: DateLike; labels?: Partial<InboxLabels>; kit?: MenuKit }) {
  const t = useInboxLabels(labels);
  const fmt = useFormatDate();
  const Item = kit.Item;
  return (
    <>
      {snoozePresets(now).map((p) => (
        <Item key={p.id} onClick={() => onPick(p.at)}>
          <span className="flex-1">{t[PRESET_LABEL[p.id]]}</span>
          <span className="text-caption text-muted-foreground">{fmt.date(p.at, p.id === "later" ? { timeStyle: "short" } : { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
        </Item>
      ))}
    </>
  );
}

export interface SnoozeMenuProps {
  /** Called with a wake-up time (ms since epoch), or `null` to unsnooze. */
  onSnooze: (until: number | null) => void;
  /** Set when the conversation is already snoozed: adds an Unsnooze item. */
  snoozedUntil?: DateLike | null;
  /** Replaces the default icon button. Give it an accessible name. */
  trigger?: ReactElement;
  /** Anchor for the presets. Default now. */
  now?: DateLike;
  labels?: Partial<InboxLabels>;
}

/** Snooze presets (later today, tomorrow morning, this weekend, next week) plus a custom date and time. */
export function SnoozeMenu({ onSnooze, snoozedUntil, trigger, now, labels }: SnoozeMenuProps) {
  const t = useInboxLabels(labels);
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState("");
  const min = useMemo(() => {
    const d = new Date(toTime(now ?? Date.now()));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, [now]);
  const at = value ? new Date(value).getTime() : Number.NaN;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            trigger ?? (
              <Button type="button" variant="ghost" size="icon" aria-label={t.snooze}>
                <Clock aria-hidden />
              </Button>
            )
          }
        />
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>{t.snooze}</DropdownMenuLabel>
          <SnoozePresetItems onPick={onSnooze} now={now} labels={labels} />
          <DropdownMenuItem onClick={() => setCustom(true)}>{t.snoozeCustom}</DropdownMenuItem>
          {snoozedUntil ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSnooze(null)}>{t.unsnooze}</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={custom} onOpenChange={setCustom}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.snoozeCustom}</DialogTitle>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-label text-foreground">
            {t.snoozeCustomLabel}
            <Input ltr type="datetime-local" min={min} value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCustom(false)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!Number.isFinite(at)}
              onClick={() => {
                setCustom(false);
                onSnooze(at);
              }}
            >
              {t.snoozeConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Conversation row menu
// ---------------------------------------------------------------------------------------------

export interface ConversationRowMenuProps {
  conversation: Pick<InboxConversation, "id" | "pinned" | "archived" | "muted" | "color" | "unread" | "contact" | "status">;
  onUpdate: (patch: ConversationPatch) => void;
  /** Replaces the default "more" icon button. Give it an accessible name. */
  trigger?: ReactElement;
  now?: DateLike;
  labels?: Partial<InboxLabels>;
}

/** The menu of a conversation row: pin, mark unread, mute, colour, snooze and archive. Every choice calls `onUpdate` with a patch. */
export function ConversationRowMenu({ conversation: c, onUpdate, trigger, now, labels }: ConversationRowMenuProps) {
  const t = useInboxLabels(labels);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.rowActions(c.contact.name)}>
              <MoreHorizontal aria-hidden />
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        <ConversationMenuItems kit={DROPDOWN_KIT} conversation={c} onUpdate={onUpdate} now={now} labels={labels} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MenuConversation = ConversationRowMenuProps["conversation"];

function ConversationMenuItems({ kit, conversation: c, onUpdate, now, labels }: { kit: MenuKit; conversation: MenuConversation; onUpdate: (patch: ConversationPatch) => void; now?: DateLike; labels?: Partial<InboxLabels> }) {
  const t = useInboxLabels(labels);
  const { Item, Separator, Sub, SubTrigger, SubContent } = kit;
  return (
    <>
        <Item onClick={() => onUpdate({ pinned: !c.pinned })}>
          {c.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
          {c.pinned ? t.unpin : t.pin}
        </Item>
        <Item onClick={() => onUpdate({ unread: !((c.unread ?? 0) > 0) })}>
          {(c.unread ?? 0) > 0 ? <MailOpen aria-hidden /> : <Mail aria-hidden />}
          {(c.unread ?? 0) > 0 ? t.markRead : t.markUnread}
        </Item>
        <Item onClick={() => onUpdate({ muted: !c.muted })}>
          {c.muted ? <Bell aria-hidden /> : <BellOff aria-hidden />}
          {c.muted ? t.unmute : t.mute}
        </Item>
        <Sub>
          <SubTrigger>
            <Palette aria-hidden />
            {t.color}
          </SubTrigger>
          <SubContent className="min-w-40">
            <Item onClick={() => onUpdate({ color: null })}>
              <span aria-hidden className="inline-block size-2.5 rounded-full border border-border" />
              <span className="flex-1">{t.noColor}</span>
              {!c.color ? <Check aria-hidden /> : null}
            </Item>
            {INBOX_COLORS.map((hue) => (
              <Item key={hue} onClick={() => onUpdate({ color: hue })}>
                <ColorDot color={hue} />
                <span className="flex-1">{t.colors[hue]}</span>
                {c.color === hue ? <Check aria-hidden /> : null}
              </Item>
            ))}
          </SubContent>
        </Sub>
        <Sub>
          <SubTrigger>
            <Clock aria-hidden />
            {t.snooze}
          </SubTrigger>
          <SubContent className="min-w-56">
            <SnoozePresetItems now={now} labels={labels} kit={kit} onPick={(at) => onUpdate({ status: "snoozed", snoozedUntil: at })} />
            {c.status === "snoozed" ? <Item onClick={() => onUpdate({ status: "open", snoozedUntil: null })}>{t.unsnooze}</Item> : null}
          </SubContent>
        </Sub>
        <Separator />
        <Item onClick={() => onUpdate({ archived: !c.archived })}>
          {c.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          {c.archived ? t.unarchive : t.archive}
        </Item>
    </>
  );
}

export interface ConversationContextMenuProps {
  conversation: MenuConversation;
  onUpdate: (patch: ConversationPatch) => void;
  /** The row element that opens the menu (an `<li>`). It keeps its own props and children. */
  render: ReactElement;
  /** The focusable element inside the row that gets focus back when the menu closes. */
  focusTarget?: (row: HTMLElement) => HTMLElement | null;
  now?: DateLike;
  disabled?: boolean;
  labels?: Partial<InboxLabels>;
}

/**
 * The same choices as ConversationRowMenu, opened by context-click, long-press, Shift+F10 or the Menu key on the row.
 * Right-clicks on links and inputs inside the row keep the browser's menu.
 */
export function ConversationContextMenu({ conversation, onUpdate, render, focusTarget, now, disabled, labels }: ConversationContextMenuProps) {
  const rowRef = useRef<HTMLElement | null>(null);
  if (disabled) return render;
  const props = render.props as { children?: ReactNode; className?: string; onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void };
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={render}
        ref={rowRef as never}
        className={cn("data-popup-open:bg-nq-hover", props.className)}
        onContextMenu={(e: MouseEvent<HTMLElement>) => {
          if (e.shiftKey || (e.target as HTMLElement).closest("input,textarea,select,a[href],[contenteditable=true]")) {
            (e as unknown as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
            e.nativeEvent.stopPropagation();
          }
        }}
        onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
          props.onKeyDown?.(e);
          if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") {
            if (openContextMenuAt(e.target as HTMLElement)) e.preventDefault();
          }
        }}
      >
        {props.children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="min-w-52"
        finalFocus={() => (rowRef.current && focusTarget ? focusTarget(rowRef.current) : null) ?? true}
      >
        <ConversationMenuItems kit={CONTEXT_KIT} conversation={conversation} onUpdate={onUpdate} now={now} labels={labels} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ---------------------------------------------------------------------------------------------
// Canned snippets
// ---------------------------------------------------------------------------------------------

export interface CannedPickerProps {
  snippets: readonly CannedSnippet[];
  /** Called with the snippet body after the variables are filled. */
  onPick: (text: string, snippet: CannedSnippet) => void;
  /** Values for `{{name}}` style variables in snippet bodies. */
  variables?: Record<string, string | undefined>;
  /** Replaces the default zap icon button. Give it an accessible name. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: ComponentProps<typeof PopoverContent>["side"];
  labels?: Partial<InboxLabels>;
  /** Extra content under the list. */
  footer?: ReactNode;
}

/** Saved replies in a popover: search by shortcut, title or text, arrow keys and Enter to insert. */
export function CannedPicker({ snippets, onPick, variables = {}, trigger, open, onOpenChange, side = "top", labels, footer }: CannedPickerProps) {
  const t = useInboxLabels(labels);
  const id = useId();
  const [inner, setInner] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const isOpen = open ?? inner;
  const list = useMemo(() => filterSnippets(snippets, query), [snippets, query]);
  const setOpen = (next: boolean) => {
    setInner(next);
    onOpenChange?.(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  };
  const pick = (s: CannedSnippet) => {
    onPick(applySnippet(s.body, variables), s);
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(list.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      pick(list[active] as CannedSnippet);
    }
  };
  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          trigger ?? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.snippets}>
              <Zap aria-hidden />
            </Button>
          )
        }
      />
      <PopoverContent side={side} align="start" className="flex w-80 flex-col gap-2 p-2">
        <Input
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={list[active] ? `${id}-${list[active]?.id}` : undefined}
          aria-label={t.snippetSearch}
          placeholder={t.snippetSearch}
          value={query}
          autoFocus
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
        />
        <ul id={`${id}-list`} role="listbox" aria-label={t.snippets} className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {list.length === 0 ? (
            <li role="presentation" className="px-2 py-3 text-center text-body-sm text-muted-foreground">
              {t.snippetsEmpty}
            </li>
          ) : (
            list.map((s, i) => (
              <li
                key={s.id}
                id={`${id}-${s.id}`}
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(s)}
                onKeyDown={(e) => e.key === "Enter" && pick(s)}
                className={cn("flex cursor-pointer flex-col gap-0.5 rounded-control px-2 py-1.5 text-start", i === active && "bg-nq-hover")}
              >
                <span className="flex items-center gap-2">
                  <span dir="auto" className="flex-1 truncate text-label text-foreground">
                    {s.title}
                  </span>
                  <kbd dir="ltr" className="rounded-[4px] border border-border bg-secondary px-1 font-mono text-caption text-muted-foreground">
                    /{s.shortcut}
                  </kbd>
                </span>
                <span dir="auto" className="line-clamp-2 text-caption text-muted-foreground">
                  {applySnippet(s.body, variables)}
                </span>
              </li>
            ))
          )}
        </ul>
        {footer}
      </PopoverContent>
    </Popover>
  );
}
