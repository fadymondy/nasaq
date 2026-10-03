"use client";

import { CalendarDays, ChevronUp, MessageSquare, Paperclip } from "lucide-react";
import type { ComponentProps, KeyboardEvent, PointerEvent } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { DateTime, formatNumber } from "../numeric";
import type { WorkLabel } from "../status-label-manager/status-label-logic";
import { dueState, type Issue, type IssuePerson } from "./issue-logic";
import { PriorityIcon, TypeIcon, useIssueText } from "./issue-marks";

const STRINGS = {
  en: {
    vote: (n: string) => `Upvote, ${n} votes`,
    voted: (n: string) => `Remove your vote, ${n} votes`,
    comments: (n: string) => `${n} comments`,
    attachments: (n: string) => `${n} attachments`,
    assignee: (name: string) => `Assigned to ${name}`,
    due: "Due",
  },
  ar: {
    vote: (n: string) => `تصويت، ${n} أصوات`,
    voted: (n: string) => `إلغاء تصويتك، ${n} أصوات`,
    comments: (n: string) => `${n} تعليقات`,
    attachments: (n: string) => `${n} مرفقات`,
    assignee: (name: string) => `مسندة إلى ${name}`,
    due: "الاستحقاق",
  },
};

export type IssueCardLabels = Partial<typeof STRINGS.en>;

export interface IssueCardProps extends Omit<ComponentProps<"div">, "children"> {
  issue: Pick<Issue, "key" | "title" | "type" | "priority" | "labelIds" | "assigneeId" | "dueDate">;
  /** Label definitions, to show names and colours for `issue.labelIds`. */
  labels?: readonly WorkLabel[];
  /** People, to show the assignee's avatar. */
  people?: readonly IssuePerson[];
  votes?: number;
  /** The viewer has voted: the vote button shows pressed. */
  voted?: boolean;
  /** Adds a vote button. Called with the new state. */
  onVote?: (voted: boolean) => void;
  comments?: number;
  attachments?: number;
  /** A finished issue is never shown as overdue. Default true. */
  open?: boolean;
  /** For the due-date colour. Default `Date.now()`. */
  now?: number;
  text?: IssueCardLabels;
}

const DUE_TEXT = { overdue: "text-nq-danger-text", today: "text-nq-warning-text", soon: "text-nq-warning-text", later: "text-muted-foreground", none: "text-muted-foreground" };

// Keys and pointer presses on a control inside a draggable card must not start a drag.
const keep = (e: KeyboardEvent | PointerEvent) => e.stopPropagation();

/**
 * One issue as a board card: type, key and priority, the title, labels, due date, counts (votes, comments,
 * attachments) and the assignee. Votes are a toggle button; the rest is read-only. Use inside `KanbanBoard`
 * (`IssueBoard` does) or on its own.
 */
export function IssueCard({
  issue,
  labels = [],
  people = [],
  votes,
  voted = false,
  onVote,
  comments,
  attachments,
  open = true,
  now,
  text,
  className,
  ...props
}: IssueCardProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const locale = ar ? "ar" : "en";
  const t = { ...STRINGS[locale], ...text };
  const { t: it } = useIssueText();
  const n = (v: number) => formatNumber(v, locale);
  const tags = issue.labelIds.flatMap((id) => labels.filter((l) => l.id === id));
  const assignee = issue.assigneeId ? people.find((p) => p.id === issue.assigneeId) : undefined;
  const due = dueState(issue.dueDate, now ?? Date.now(), open);
  const hasCounts = votes !== undefined || onVote || comments || attachments;
  return (
    <div
      data-slot="issue-card"
      className={cn("flex w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-start text-card-foreground", className)}
      {...props}
    >
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <TypeIcon type={issue.type} aria-label={it.types[issue.type]} />
        <bdi dir="ltr" className="font-mono">
          {issue.key}
        </bdi>
        <span className="ms-auto inline-flex items-center gap-1" title={it.priorities[issue.priority]}>
          <PriorityIcon priority={issue.priority} />
          <span className="sr-only">{it.priorities[issue.priority]}</span>
        </span>
      </div>
      <div className="text-label text-foreground">{issue.title}</div>
      {tags.length ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((l) => (
            <Badge key={l.id} variant="tag" hue={l.hue}>
              {l.name}
            </Badge>
          ))}
        </div>
      ) : null}
      {issue.dueDate || hasCounts || assignee ? (
        <div className="flex items-center gap-3 text-caption text-muted-foreground">
          {onVote ? (
            <button
              type="button"
              data-slot="issue-card-vote"
              aria-pressed={voted}
              aria-label={(voted ? t.voted : t.vote)(n(votes ?? 0))}
              onClick={(e) => {
                e.stopPropagation();
                onVote(!voted);
              }}
              onKeyDown={keep}
              onPointerDown={keep}
              className={cn(
                "-ms-1 inline-flex h-6 items-center gap-0.5 rounded-control border px-1.5 tabular-nums outline-none transition-colors duration-150 ease-nq",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                voted ? "border-nq-accent/40 bg-nq-selected text-foreground" : "border-border hover:bg-nq-hover",
              )}
            >
              <ChevronUp aria-hidden className="size-3.5" />
              {n(votes ?? 0)}
            </button>
          ) : votes !== undefined ? (
            <span className="inline-flex items-center gap-0.5 tabular-nums" aria-label={t.vote(n(votes))}>
              <ChevronUp aria-hidden className="size-3.5" />
              {n(votes)}
            </span>
          ) : null}
          {comments ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageSquare aria-hidden className="size-3.5" />
              <span aria-hidden>{n(comments)}</span>
              <span className="sr-only">{t.comments(n(comments))}</span>
            </span>
          ) : null}
          {attachments ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Paperclip aria-hidden className="size-3.5" />
              <span aria-hidden>{n(attachments)}</span>
              <span className="sr-only">{t.attachments(n(attachments))}</span>
            </span>
          ) : null}
          {issue.dueDate ? (
            <span data-due={due} className={cn("inline-flex items-center gap-1", DUE_TEXT[due])}>
              <CalendarDays aria-hidden className="size-3.5" />
              <span className="sr-only">{t.due}</span>
              <DateTime value={new Date(`${issue.dueDate}T00:00:00`)} format={{ day: "numeric", month: "short" }} />
              {due === "overdue" ? <span className="sr-only">({it.overdue})</span> : null}
            </span>
          ) : null}
          {assignee ? <Avatar name={assignee.name} src={assignee.avatar} size="xs" className="ms-auto" aria-label={t.assignee(assignee.name)} /> : null}
        </div>
      ) : null}
    </div>
  );
}
