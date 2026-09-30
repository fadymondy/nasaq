"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { ActionsMenu } from "../comment-thread/actions-menu";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import type { Issue } from "../issue-view/issue-logic";
import { StatusDot } from "../issue-view/issue-marks";
import { formatDate } from "../numeric";
import { EmptyState } from "../states";
import type { WorkStatus } from "../status-label-manager/status-label-logic";
import { addDays, rulerTicks, timelineBars, timelineRange } from "./project-logic";

export interface ScheduleText {
  label: string;
  empty: string;
  emptyHint: string;
  unscheduled: string;
  open: string;
  copyKey: string;
  actions: string;
  today: string;
}

export interface ProjectScheduleProps {
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  /** Civil "today", drawn as a line. */
  today: string;
  onOpenIssue?: (issue: Issue) => void;
  t: ScheduleText;
}

/** A light timeline: one bar per scheduled issue between its start and due date, a week ruler and a today line. */
export function ProjectSchedule({ issues, statuses, today, onOpenIssue, t }: ProjectScheduleProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const range = useMemo(() => timelineRange(issues), [issues]);
  const bars = useMemo(() => (range ? new Map(timelineBars(issues, range, statuses).map((b) => [b.id, b])) : new Map()), [issues, range, statuses]);
  const scheduled = issues.filter((i) => bars.has(i.id));
  const loose = issues.filter((i) => !bars.has(i.id));
  const ticks = range ? rulerTicks(range) : [];
  const todayAt = range && today >= range.start && today <= range.end ? ((Date.parse(today) - Date.parse(range.start)) / (Date.parse(addDays(range.end, 1)) - Date.parse(range.start))) * 100 : null;
  const dateText = (key: string) => formatDate(new Date(`${key}T00:00:00`), locale, { day: "numeric", month: "short" });
  const statusOf = new Map(statuses.map((s) => [s.id, s]));

  if (!range || scheduled.length === 0) return <EmptyState title={t.empty} description={t.emptyHint} />;

  const actionsFor = (issue: Issue): ContextMenuAction[] => [
    ...(onOpenIssue ? [{ id: "open", label: t.open, icon: ExternalLink, onSelect: () => onOpenIssue(issue) }] : []),
    { id: "copy", label: t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(issue.key) },
  ];

  return (
    <div data-slot="project-schedule" className="flex min-w-0 flex-col gap-4">
      <div role="group" aria-label={t.label} className="min-w-0 overflow-x-auto rounded-card border border-border">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-[13rem_minmax(0,1fr)] border-b border-border bg-muted/40 text-caption text-muted-foreground">
            <div className="px-3 py-2" />
            <div className="relative h-8">
              {ticks.map((tick) => (
                <span key={tick.date} className="absolute top-2 whitespace-nowrap ps-1.5" style={{ insetInlineStart: `${tick.offset}%` }}>
                  {dateText(tick.date)}
                </span>
              ))}
            </div>
          </div>
          <ul className="m-0 list-none p-0">
            {scheduled.map((issue) => {
              const bar = bars.get(issue.id)!;
              const s = statusOf.get(issue.statusId);
              const actions = actionsFor(issue);
              return (
                <ContextMenuActions
                  key={issue.id}
                  actions={actions}
                  focusTarget={(el) => el.querySelector<HTMLElement>("button")}
                  render={
                    <li className="grid grid-cols-[13rem_minmax(0,1fr)] items-center border-b border-border last:border-b-0">
                      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                        <StatusDot hue={s?.hue} />
                        <bdi dir="ltr" className="shrink-0 font-mono text-caption text-muted-foreground">
                          {issue.key}
                        </bdi>
                        <button type="button" onClick={() => onOpenIssue?.(issue)} className="min-w-0 flex-1 truncate text-start text-body-sm outline-none hover:underline focus-visible:underline">
                          {issue.title}
                        </button>
                        <ActionsMenu actions={actions} label={`${t.actions}: ${issue.key}`} />
                      </div>
                      <div className="relative h-9">
                        {todayAt !== null ? <span aria-hidden className="absolute inset-y-0 w-px bg-nq-danger" style={{ insetInlineStart: `${todayAt}%` }} /> : null}
                        <span
                          role="img"
                          aria-label={`${issue.key}: ${dateText(bar.start)} - ${dateText(bar.end)}`}
                          className={cn("absolute top-2.5 h-4 rounded-full", bar.done && "opacity-60")}
                          style={{ insetInlineStart: `${bar.offset}%`, inlineSize: `${bar.width}%`, background: `var(--nq-tag-${s?.hue ?? "gray"})` }}
                        />
                      </div>
                    </li>
                  }
                />
              );
            })}
          </ul>
        </div>
      </div>
      {todayAt !== null ? (
        <p className="m-0 flex items-center gap-2 text-caption text-muted-foreground">
          <span aria-hidden className="inline-block h-3 w-px bg-nq-danger" />
          {t.today}
        </p>
      ) : null}
      {loose.length > 0 ? (
        <p className="m-0 text-body-sm text-muted-foreground">
          {t.unscheduled}: <bdi dir="ltr">{loose.map((i) => i.key).join(", ")}</bdi>
        </p>
      ) : null}
    </div>
  );
}
