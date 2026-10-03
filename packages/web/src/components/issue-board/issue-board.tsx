"use client";

import { ExternalLink, Link2, Plus, Search, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import type { ContextMenuAction } from "../context-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { IssueCard } from "../issue-view/issue-card";
import type { IssuePerson } from "../issue-view/issue-logic";
import { KanbanBoard, type KanbanCardData } from "../kanban-board";
import { NativeSelect } from "../native-select";
import { formatNumber } from "../numeric";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import { boardIndex, EMPTY_ISSUE_FILTER, filterIssues, type IssueBoardFilter, type IssueBoardItem, isIssueFilterActive } from "./issue-board-logic";

export { boardIndex, EMPTY_ISSUE_FILTER, filterIssues, type IssueBoardFilter, type IssueBoardItem, isIssueFilterActive } from "./issue-board-logic";

const STRINGS = {
  en: {
    title: "Issues",
    board: "Issue board",
    empty: "No issues",
    search: "Search issues",
    searchPlaceholder: "Search by key, title or label",
    assignee: "Assignee",
    reporter: "Reporter",
    anyone: "Anyone",
    nobody: "Unassigned",
    noReporter: "No reporter",
    newIssue: "New issue",
    clear: "Clear filters",
    count: (shown: string, total: string) => (shown === total ? `${total} issues` : `${shown} of ${total} issues`),
    open: "Open issue",
    copyKey: "Copy key",
  },
  ar: {
    title: "المهام",
    board: "لوحة المهام",
    empty: "لا توجد مهام",
    search: "بحث في المهام",
    searchPlaceholder: "ابحث بالمعرّف أو العنوان أو الوسم",
    assignee: "المسؤول",
    reporter: "المُبلّغ",
    anyone: "الجميع",
    nobody: "غير مسندة",
    noReporter: "بلا مُبلّغ",
    newIssue: "مهمة جديدة",
    clear: "مسح عوامل التصفية",
    count: (shown: string, total: string) => (shown === total ? `${total} مهام` : `${shown} من ${total} مهام`),
    open: "فتح المهمة",
    copyKey: "نسخ المعرّف",
  },
};

export type IssueBoardLabels = Partial<typeof STRINGS.en>;

interface Card<T> extends KanbanCardData {
  issue: T;
}

export interface IssueBoardProps<T extends IssueBoardItem = IssueBoardItem> extends Omit<ComponentProps<"section">, "children" | "title" | "onChange"> {
  issues: readonly T[];
  /** The columns, in order. */
  statuses: readonly WorkStatus[];
  labels?: readonly WorkLabel[];
  /** Assignees and reporters. */
  people?: readonly IssuePerson[];
  /** An issue was dropped. `index` is its position among *all* the column's issues, hidden ones included. */
  onMove: (issueId: string, statusId: string, index: number) => void;
  /** Click or Enter on a card, and "Open issue" in its menu. */
  onOpen?: (issue: T) => void;
  /** Adds a vote button to each card. */
  onVote?: (issue: T, voted: boolean) => void;
  /** Adds a "New issue" button to the header. */
  onCreate?: () => void;
  /** Header title. Default "Issues". `null` hides the header row. */
  title?: ReactNode;
  /** Show the reporter filter. Default: when any issue has a `reporterId`. */
  reporterFilter?: boolean;
  /** Initial filter. */
  defaultFilter?: Partial<IssueBoardFilter>;
  /** Called when the reader changes the search or a filter. */
  onFilterChange?: (filter: IssueBoardFilter) => void;
  /** Extra controls at the end of the toolbar. */
  toolbar?: ReactNode;
  /** More actions for a card's context menu, after Open and Copy key. */
  cardActions?: (issue: T) => ContextMenuAction[];
  /** Done or canceled issues are never shown as overdue. Default: the status stage decides. */
  now?: number;
  text?: IssueBoardLabels;
}

/**
 * A ready-made issue board: `KanbanBoard` with issue cards (type, key, priority, labels, due date, votes,
 * comments, attachments, assignee), a toolbar with search and assignee / reporter filters, and a header with the
 * count and "New issue". Filtering hides cards but keeps drops in the right place among hidden ones.
 */
export function IssueBoard<T extends IssueBoardItem = IssueBoardItem>({
  issues,
  statuses,
  labels = [],
  people = [],
  onMove,
  onOpen,
  onVote,
  onCreate,
  title,
  reporterFilter,
  defaultFilter,
  onFilterChange,
  toolbar,
  cardActions,
  now,
  text,
  className,
  ...props
}: IssueBoardProps<T>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const locale = ar ? "ar" : "en";
  const t = { ...STRINGS[locale], ...text };
  const [filter, setFilterState] = useState<IssueBoardFilter>({ ...EMPTY_ISSUE_FILTER, ...defaultFilter });
  const setFilter = (patch: Partial<IssueBoardFilter>) => {
    const next = { ...filter, ...patch };
    setFilterState(next);
    onFilterChange?.(next);
  };
  const labelName = useMemo(() => {
    const byId = new Map(labels.map((l) => [l.id, l.name]));
    return (id: string) => byId.get(id);
  }, [labels]);
  const visible = useMemo(() => filterIssues(issues, filter, labelName), [issues, filter, labelName]);
  const visibleIds = useMemo(() => new Set(visible.map((i) => i.id)), [visible]);
  const stageOf = useMemo(() => new Map(statuses.map((s) => [s.id, s.stage])), [statuses]);
  const withReporter = reporterFilter ?? issues.some((i) => i.reporterId);
  const active = isIssueFilterActive(filter);
  const n = (v: number) => formatNumber(v, locale);

  const cards: Card<T>[] = visible.map((i) => ({ id: i.id, columnId: i.statusId, title: `${i.key} ${i.title}`, issue: i }));
  const personOptions = (none: string) => [
    { value: "", label: t.anyone },
    { value: "none", label: none },
    ...people.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <section data-slot="issue-board" aria-label={typeof title === "string" ? title : t.board} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      {title !== null ? (
        <header className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-heading-sm text-foreground">{title ?? t.title}</h2>
          <span className="text-caption tabular-nums text-muted-foreground" aria-live="polite">
            {t.count(n(visible.length), n(issues.length))}
          </span>
          {onCreate ? (
            <Button type="button" size="sm" variant="primary" className="ms-auto" onClick={onCreate}>
              <Plus aria-hidden />
              {t.newIssue}
            </Button>
          ) : null}
        </header>
      ) : null}
      <div data-slot="issue-board-toolbar" className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-48 flex-1 basis-60 sm:max-w-80">
          <InputGroupAddon align="start">
            <Search aria-hidden className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape" && filter.query) {
                e.preventDefault();
                setFilter({ query: "" });
              }
            }}
            placeholder={t.searchPlaceholder}
            aria-label={t.search}
          />
        </InputGroup>
        <NativeSelect
          size="sm"
          aria-label={t.assignee}
          data-slot="issue-board-assignee"
          value={filter.assigneeId ?? ""}
          onChange={(e) => setFilter({ assigneeId: e.currentTarget.value || null })}
          options={personOptions(t.nobody).map((o) => (o.value === "" ? { ...o, label: `${t.assignee}: ${t.anyone}` } : o))}
          className="w-auto"
        />
        {withReporter ? (
          <NativeSelect
            size="sm"
            aria-label={t.reporter}
            data-slot="issue-board-reporter"
            value={filter.reporterId ?? ""}
            onChange={(e) => setFilter({ reporterId: e.currentTarget.value || null })}
            options={personOptions(t.noReporter).map((o) => (o.value === "" ? { ...o, label: `${t.reporter}: ${t.anyone}` } : o))}
            className="w-auto"
          />
        ) : null}
        {active ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setFilter(EMPTY_ISSUE_FILTER)}>
            <X aria-hidden />
            {t.clear}
          </Button>
        ) : null}
        {toolbar ? <div className="ms-auto flex items-center gap-2">{toolbar}</div> : null}
      </div>
      <KanbanBoard<Card<T>>
        label={t.board}
        emptyLabel={t.empty}
        columns={statuses.map((s) => ({ id: s.id, title: s.name }))}
        cards={cards}
        onMove={(id, statusId, index) => onMove(id, statusId, boardIndex(issues, visibleIds, id, statusId, index))}
        className="pb-2"
        cardActions={(card) => [
          ...(onOpen ? [{ id: "open", label: t.open, icon: ExternalLink, onSelect: () => onOpen(card.issue) }] : []),
          { id: "copy", label: t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(card.issue.key) },
          ...(cardActions?.(card.issue) ?? []),
        ]}
        renderCard={(card) => {
          const i = card.issue;
          const stage = stageOf.get(i.statusId);
          return (
            <IssueCard
              issue={i}
              labels={labels}
              people={people}
              votes={onVote || i.votes !== undefined ? (i.votes ?? 0) : undefined}
              voted={i.voted}
              onVote={onVote ? (v) => onVote(i, v) : undefined}
              comments={i.comments}
              attachments={i.attachments}
              open={stage !== "done" && stage !== "canceled"}
              now={now}
              onClick={onOpen ? () => onOpen(i) : undefined}
              className={onOpen ? "cursor-pointer" : undefined}
            />
          );
        }}
      />
    </section>
  );
}
