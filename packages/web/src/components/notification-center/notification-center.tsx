"use client";

import { Bell, BellOff, CheckCheck } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NotificationItem } from "../notification-item";
import { formatRelativeTime, Num } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { EmptyState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";

export interface NotificationCenterItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  actor?: { name: string; avatar?: string };
  icon?: ReactNode;
  /** When it happened. Shown as a relative time in the active locale. */
  time?: Date | number | string;
  unread?: boolean;
  href?: string;
}

export interface NotificationCenterLabels {
  title: string;
  all: string;
  unread: string;
  markAllRead: string;
  emptyAll: string;
  emptyAllDescription: string;
  emptyUnread: string;
  emptyUnreadDescription: string;
  /** Accessible name of the bell. Receives the unread count. */
  trigger: (unread: number) => string;
}

const STRINGS: Record<"en" | "ar", NotificationCenterLabels> = {
  en: {
    title: "Notifications",
    all: "All",
    unread: "Unread",
    markAllRead: "Mark all read",
    emptyAll: "No notifications",
    emptyAllDescription: "Mentions, reviews and activity show up here.",
    emptyUnread: "You're all caught up",
    emptyUnreadDescription: "There is nothing new to read.",
    trigger: (n) => (n > 0 ? `Notifications, ${n} unread` : "Notifications"),
  },
  ar: {
    title: "الإشعارات",
    all: "الكل",
    unread: "غير المقروءة",
    markAllRead: "تعليم الكل كمقروء",
    emptyAll: "لا توجد إشعارات",
    emptyAllDescription: "تظهر هنا الإشارات والمراجعات والنشاط.",
    emptyUnread: "لا جديد",
    emptyUnreadDescription: "لا شيء جديد للقراءة.",
    trigger: (n) => (n > 0 ? `الإشعارات، ${n} غير مقروء` : "الإشعارات"),
  },
};

export interface NotificationCenterProps extends Omit<ComponentProps<"div">, "children" | "title" | "contextMenu"> {
  items: readonly NotificationCenterItem[];
  /** Called when a row is pressed. Mark it read in your state here. */
  onItemClick?: (item: NotificationCenterItem) => void;
  /** Actions for a row ("Mark as read", "Mute"…). They open as a context menu on context-click, Shift+F10 or the Menu key. */
  itemActions?: (item: NotificationCenterItem) => ContextMenuAction[];
  /** Open `itemActions` as a context menu. Default true; false keeps the browser's menu. */
  contextMenu?: boolean;
  /** Called by "Mark all read". The button is disabled while nothing is unread. */
  onMarkAllRead?: () => void;
  /** Total unread when it is more than the loaded `items` (server count). Defaults to the count in `items`. */
  unreadCount?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Override any built-in string. Defaults come from the Nasaq locale ("en" / "ar"). */
  labels?: Partial<NotificationCenterLabels>;
  side?: ComponentProps<typeof PopoverContent>["side"];
  align?: ComponentProps<typeof PopoverContent>["align"];
}

const CAP = 99;

/**
 * A bell button with an unread badge that opens a popover of notifications, with All / Unread tabs and
 * "Mark all read". Controlled: you own the items and the read state.
 */
export function NotificationCenter({
  items,
  onItemClick,
  onMarkAllRead,
  itemActions,
  contextMenu = true,
  unreadCount,
  open,
  defaultOpen,
  onOpenChange,
  labels,
  side = "bottom",
  align = "end",
  className,
  ...props
}: NotificationCenterProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const [tab, setTab] = useState<string>("all");
  const unreadItems = items.filter((i) => i.unread);
  const count = unreadCount ?? unreadItems.length;

  const list = (rows: readonly NotificationCenterItem[], empty: boolean) =>
    rows.length === 0 ? (
      <EmptyState
        icon={BellOff}
        className="border-0 py-10"
        title={empty ? t.emptyUnread : t.emptyAll}
        description={empty ? t.emptyUnreadDescription : t.emptyAllDescription}
      />
    ) : (
      <ul className="m-0 max-h-96 list-none divide-y divide-border overflow-y-auto overscroll-contain p-0">
        {rows.map((item) => (
          <ContextMenuActions
            key={item.id}
            actions={itemActions?.(item) ?? []}
            disabled={!contextMenu}
            focusTarget={(li) => li.querySelector<HTMLElement>("button, a")}
            render={<li />}
          >
            <NotificationItem
              actor={item.actor}
              icon={item.icon}
              title={item.title}
              description={item.description}
              href={item.href}
              unread={item.unread}
              unreadLabel={locale.startsWith("ar") ? "غير مقروء" : "Unread"}
              time={item.time !== undefined ? formatRelativeTime(item.time, locale, { style: "narrow" }) : undefined}
              dateTime={item.time !== undefined ? new Date(item.time).toISOString() : undefined}
              onClick={() => onItemClick?.(item)}
            />
          </ContextMenuActions>
        ))}
      </ul>
    );

  return (
    <div data-slot="notification-center" className={cn("inline-flex", className)} {...props}>
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon" aria-label={t.trigger(count)} className="relative" />}
        >
          <Bell />
          {count > 0 ? (
            <Badge
              variant="accent"
              data-slot="notification-center-badge"
              aria-hidden
              className="pointer-events-none absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {count > CAP ? (
                <>
                  <Num value={CAP} />+
                </>
              ) : (
                <Num value={count} />
              )}
            </Badge>
          ) : null}
        </PopoverTrigger>
        <PopoverContent side={side} align={align} className="w-[min(24rem,calc(100vw-1rem))] p-0">
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="gap-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 pt-3">
              <p className="text-label text-foreground">{t.title}</p>
              <Button variant="ghost" size="sm" disabled={count === 0} onClick={() => onMarkAllRead?.()} className="-mt-1">
                <CheckCheck />
                {t.markAllRead}
              </Button>
            </div>
            <TabsList variant="underline" className="border-border px-4">
              <TabsTab value="all">{t.all}</TabsTab>
              <TabsTab value="unread">
                {t.unread}
                {count > 0 ? <Num value={count} className="text-caption text-muted-foreground" /> : null}
              </TabsTab>
              <TabsIndicator />
            </TabsList>
            <TabsPanel value="all">{list(items, false)}</TabsPanel>
            <TabsPanel value="unread">{list(unreadItems, true)}</TabsPanel>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
