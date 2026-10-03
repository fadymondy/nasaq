import type { Component } from "vue";
import type { ContextMenuAction } from "../context-menu";

export interface NotificationCenterItem {
  id: string;
  title: string;
  description?: string;
  actor?: { name: string; avatar?: string };
  /** A lucide-vue-next icon component shown instead of the actor's avatar. */
  icon?: Component;
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

export const NOTIFICATION_CENTER_STRINGS: Record<"en" | "ar", NotificationCenterLabels> = {
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

export type NotificationItemActions = (item: NotificationCenterItem) => ContextMenuAction[];
