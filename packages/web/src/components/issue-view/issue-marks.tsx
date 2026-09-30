"use client";

import { Bug, CircleDashed, Flag, Sparkles, SquareCheck, TrendingUp, Wrench, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import type { StatusHue } from "../status-label-manager/status-label-logic";
import type { IssuePriority, IssueType } from "./issue-logic";

const STRINGS = {
  en: {
    priorities: { urgent: "Urgent", high: "High", medium: "Medium", low: "Low", none: "No priority" } satisfies Record<IssuePriority, string>,
    types: { bug: "Bug", feature: "Feature", improvement: "Improvement", task: "Task", chore: "Chore" } satisfies Record<IssueType, string>,
    none: "None",
    unassigned: "Unassigned",
    noParent: "No parent",
    noDue: "No due date",
    noEstimate: "No estimate",
    noLabels: "No labels",
    overdue: "Overdue",
    dueToday: "Due today",
    dueSoon: "Due soon",
  },
  ar: {
    priorities: { urgent: "عاجلة", high: "عالية", medium: "متوسطة", low: "منخفضة", none: "بلا أولوية" } satisfies Record<IssuePriority, string>,
    types: { bug: "خطأ", feature: "ميزة", improvement: "تحسين", task: "مهمة", chore: "صيانة" } satisfies Record<IssueType, string>,
    none: "لا شيء",
    unassigned: "غير مسند",
    noParent: "بلا أصل",
    noDue: "بلا موعد",
    noEstimate: "بلا تقدير",
    noLabels: "بلا وسوم",
    overdue: "متأخرة",
    dueToday: "تستحق اليوم",
    dueSoon: "تستحق قريبًا",
  },
};

export type IssueTextLabels = Partial<typeof STRINGS.en>;

/** The names of priorities and types, and the empty-value words, in the active locale. */
export function useIssueText(labels?: IssueTextLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, ar: locale.startsWith("ar"), t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

const PRIORITY_COLOR: Record<IssuePriority, string> = {
  urgent: "var(--nq-danger)",
  high: "var(--nq-tag-orange)",
  medium: "var(--nq-tag-amber)",
  low: "var(--nq-tag-blue)",
  none: "var(--nq-fg-muted)",
};

/** A flag in the priority's colour. The name is always shown next to it (or given as `label`). */
export function PriorityIcon({ priority, className, ...props }: { priority: IssuePriority } & Omit<ComponentProps<"svg">, "ref">) {
  return <Flag aria-hidden className={cn("size-4 shrink-0", className)} style={{ color: PRIORITY_COLOR[priority] }} {...props} />;
}

export const TYPE_ICONS: Record<IssueType, LucideIcon> = { bug: Bug, feature: Sparkles, improvement: TrendingUp, task: SquareCheck, chore: Wrench };

export function TypeIcon({ type, className, ...props }: { type: IssueType } & Omit<ComponentProps<"svg">, "ref">) {
  const Glyph = TYPE_ICONS[type];
  return <Glyph aria-hidden className={cn("size-4 shrink-0 text-muted-foreground", className)} {...props} />;
}

/** The round marker of a status in its hue. */
export function StatusDot({ hue, className }: { hue?: StatusHue | undefined; className?: string }) {
  if (!hue) return <CircleDashed aria-hidden className={cn("size-3.5 shrink-0 text-muted-foreground", className)} />;
  return <span aria-hidden data-slot="status-dot" className={cn("size-2.5 shrink-0 rounded-full", className)} style={{ background: `var(--nq-tag-${hue})` }} />;
}
