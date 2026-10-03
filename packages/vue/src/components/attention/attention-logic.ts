import { Circle, CircleAlert, CircleDot, CircleX } from "lucide-vue-next";
import type { Component } from "vue";

/** How urgent an item is. Same shapes as Status, so urgency never depends on colour. */
export type AttentionTone = "danger" | "warning" | "info" | "neutral";

export interface AttentionItem {
  /** Stable id (v-for key). */
  id: string;
  /** What needs doing, as a short sentence: "3 deployments failed", "Approve MH-721". */
  title: string;
  /** One line of context. Clamped to one line. */
  description?: string;
  tone?: AttentionTone;
  /** A lucide-vue-next icon that replaces the tone shape. */
  icon?: Component;
  /** How many things this row stands for (unread messages, failed runs). */
  count?: number;
  /** Pre-formatted relative time ("2h", "منذ ساعتين"). */
  time?: string;
  /** Machine-readable time for `<time dateTime>`. */
  dateTime?: string;
  /** Makes the whole row a link. */
  href?: string;
  /** Makes the whole row a button (ignored when `href` is set). */
  onSelect?: () => void;
  /** An explicit action at the inline end, e.g. "Review" or "Retry". */
  action?: { label: string; href?: string; onClick?: () => void };
  /** Setup-checklist rows: true when the step is complete. Leave undefined for ordinary items. */
  done?: boolean;
  /** Shows a dismiss button; the host removes the item from `items`. */
  onDismiss?: () => void;
}

export const attentionToneIcon: Record<AttentionTone, Component> = { danger: CircleX, warning: CircleAlert, info: CircleDot, neutral: Circle };
export const attentionToneText: Record<AttentionTone, string> = {
  danger: "text-nq-danger-text",
  warning: "text-nq-warning-text",
  info: "text-nq-info-text",
  neutral: "text-muted-foreground",
};
export const attentionToneRank: Record<AttentionTone, number> = { danger: 0, warning: 1, info: 2, neutral: 3 };

export const attentionStrings = {
  en: {
    title: "Needs your attention",
    showMore: (n: number) => `Show ${n} more`,
    showLess: "Show less",
    viewAll: "View all",
    dismiss: "Dismiss",
    done: "Done",
    progress: (done: number, total: number) => `${done} of ${total} done`,
    loading: "Loading…",
  },
  ar: {
    title: "يحتاج انتباهك",
    showMore: (n: number) => `عرض ${n} أخرى`,
    showLess: "عرض أقل",
    viewAll: "عرض الكل",
    dismiss: "تجاهل",
    done: "تم",
    progress: (done: number, total: number) => `${done} من ${total} مكتملة`,
    loading: "جارٍ التحميل…",
  },
};

export type AttentionLabels = Partial<Omit<(typeof attentionStrings)["en"], "showMore" | "progress">> & {
  showMore?: (hidden: number) => string;
  progress?: (done: number, total: number) => string;
};

/** Done rows last; then by tone (danger first) when `sort` is on and it is not a checklist; the host's order otherwise. */
export function orderAttention(items: AttentionItem[], sort = true): AttentionItem[] {
  const checklist = items.length > 0 && items.every((i) => i.done !== undefined);
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const done = Number(!!a.item.done) - Number(!!b.item.done);
      if (done !== 0) return done;
      if (!sort || checklist) return a.index - b.index;
      return attentionToneRank[a.item.tone ?? "neutral"] - attentionToneRank[b.item.tone ?? "neutral"] || a.index - b.index;
    })
    .map(({ item }) => item);
}
