"use client";

import { Gauge, History, OctagonX, Plus, Power, RotateCcw, Shapes, Target } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { EmptyState } from "../states";
import { Timeline, TimelineItem } from "../timeline";

const STRINGS = {
  en: {
    title: "History",
    empty: "No changes recorded yet",
    created: "Created the flag",
    toggledOn: (env: string) => `Turned on in ${env}`,
    toggledOff: (env: string) => `Turned off in ${env}`,
    rollout: (env: string, from: string, to: string) => `Changed rollout in ${env} from ${from}% to ${to}%`,
    rules: "Updated targeting rules",
    variants: "Updated variants",
    killed: "Killed the flag",
    restored: "Restored the flag",
    reason: (r: string) => `Reason: ${r}`,
    list: "Audit history of this flag",
  },
  ar: {
    title: "السجل",
    empty: "لا تغييرات مسجّلة بعد",
    created: "أنشأ المفتاح",
    toggledOn: (env: string) => `شغّله في ${env}`,
    toggledOff: (env: string) => `أوقفه في ${env}`,
    rollout: (env: string, from: string, to: string) => `غيّر الإطلاق في ${env} من ${from}% إلى ${to}%`,
    rules: "حدّث قواعد الاستهداف",
    variants: "حدّث المتغيّرات",
    killed: "أوقف المفتاح طارئًا",
    restored: "أعاد تشغيل المفتاح",
    reason: (r: string) => `السبب: ${r}`,
    list: "سجل تدقيق هذا المفتاح",
  },
};

export type FlagAuditLabels = typeof STRINGS.en;

export type FlagAuditAction = "created" | "toggled" | "rollout" | "rules" | "variants" | "killed" | "restored";

export interface FlagAuditEntry {
  id: string;
  action: FlagAuditAction;
  /** Who did it. */
  actor: string;
  /** ISO date. */
  at: string;
  /** Localised environment name, for toggled and rollout. */
  environment?: string;
  /** For toggled: "on" or "off". For rollout: the old percentage. */
  from?: string;
  /** For toggled: "on" or "off". For rollout: the new percentage. */
  to?: string;
  /** Why, for kills. */
  reason?: string;
}

export interface FlagAuditHistoryProps {
  entries: readonly FlagAuditEntry[];
  className?: string;
  labels?: Partial<FlagAuditLabels>;
}

const ICON: Record<FlagAuditAction, ReactNode> = {
  created: <Plus aria-hidden />,
  toggled: <Power aria-hidden />,
  rollout: <Gauge aria-hidden />,
  rules: <Target aria-hidden />,
  variants: <Shapes aria-hidden />,
  killed: <OctagonX aria-hidden />,
  restored: <RotateCcw aria-hidden />,
};

/** Who changed what and when on a flag, newest first: toggles, rollout changes, rule and variant edits, kills and restores. */
export function FlagAuditHistory({ entries, className, labels }: FlagAuditHistoryProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const sorted = [...entries].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const text = (e: FlagAuditEntry): string => {
    switch (e.action) {
      case "created":
        return t.created;
      case "toggled":
        return e.to === "on" ? t.toggledOn(e.environment ?? "") : t.toggledOff(e.environment ?? "");
      case "rollout":
        return t.rollout(e.environment ?? "", e.from ?? "0", e.to ?? "0");
      case "rules":
        return t.rules;
      case "variants":
        return t.variants;
      case "killed":
        return t.killed;
      case "restored":
        return t.restored;
    }
  };

  if (sorted.length === 0) return <EmptyState icon={History} title={t.empty} className={className} />;

  return (
    <Timeline data-slot="flag-audit-history" aria-label={t.list} className={cn(className)}>
      {sorted.map((e) => (
        <TimelineItem key={e.id} icon={ICON[e.action]} title={text(e)} description={e.reason ? t.reason(e.reason) : undefined} time={e.at}>
          <span dir="auto" className="text-caption text-muted-foreground">
            {e.actor}
          </span>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
