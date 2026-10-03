---
name: issue-board
title: Issue Board
category: work
status: beta
summary: A ready-made issue kanban. Issue cards with type, key, priority, labels, due date, votes, comments, attachments and assignee; search and assignee / reporter filters; a header with the count and New issue.
exports: [IssueBoardLabels, IssueBoardProps, IssueBoard, boardIndex, EMPTY_ISSUE_FILTER, filterIssues, IssueBoardFilter, IssueBoardItem, isIssueFilterActive]
related: [kanban-board, issue-view, project-view, status-label-manager]
story: components-projects-work-issue-board
base-ui: []
keywords: [issue, issues, board, kanban, tickets, bugs, feedback, vote, upvote, filter, assignee, reporter, search, backlog]
---

# Issue Board

`KanbanBoard` set up for issues. Each status is a column and each issue an `IssueCard`: type icon, key, priority,
title, labels, due date (red when overdue), votes, comments, attachments and the assignee. Above the board sit a
search box, assignee and reporter filters and a header with the count and **New issue**.

Filtering only hides cards. When a card is dropped into a filtered column, `onMove` gets its index among *all* the
column's issues, so the hidden ones keep their order.

## When to use

- A project's or a product's issue board, a feedback board with voting, a bug triage board.

## When not to use

- Cards that are not issues: use `KanbanBoard` with your own `renderCard`.
- A long list to sort and edit in bulk: use `ProjectView`'s list tab or `DataTable`.

## Import

```tsx
import { IssueBoard, IssueCard } from "@fadymondy/nasaq";
```

## Quick start

```tsx
<IssueBoard
  issues={issues}
  statuses={statuses}
  labels={labels}
  people={people}
  onMove={(id, statusId, index) => moveIssue(id, statusId, index)}
  onOpen={(issue) => router.push(`/issues/${issue.key}`)}
  onVote={(issue, voted) => vote(issue.id, voted)}
  onCreate={() => setCreating(true)}
/>
```

## Anatomy

- Header: title, "12 of 40 issues", **New issue** (with `onCreate`).
- Toolbar: search (key, title, label names), Assignee, Reporter (when issues have a `reporterId`), Clear filters,
  your `toolbar`.
- Board: one column per status; `IssueCard`s inside. Each card has a context menu: Open issue, Copy key, your
  `cardActions`.

## API

### `<IssueBoard>`

| Prop | Type | Notes |
| --- | --- | --- |
| `issues` | `IssueBoardItem[]` | An `Issue` plus `reporterId?`, `votes?`, `voted?`, `comments?`, `attachments?`. |
| `statuses` | `WorkStatus[]` | The columns, in order. Done and canceled stages are never shown as overdue. |
| `labels`, `people` | `WorkLabel[]`, `IssuePerson[]` | Names, colours and avatars. |
| `onMove` | `(issueId, statusId, index) => void` | `index` counts hidden issues too. Update `issues` in response. |
| `onOpen` | `(issue) => void` | Card click and "Open issue". |
| `onVote` | `(issue, voted) => void` | Adds a vote toggle to each card. |
| `onCreate` | `() => void` | Adds **New issue**. |
| `title` | `ReactNode \| null` | Default "Issues". `null` hides the header. |
| `reporterFilter` | `boolean` | Default: shown when any issue has a reporter. |
| `defaultFilter`, `onFilterChange` | `IssueBoardFilter` | `{ query, assigneeId, reporterId }`; `"none"` means nobody, `null` anyone. |
| `toolbar` | `ReactNode` | Extra controls at the end of the toolbar. |
| `cardActions` | `(issue) => ContextMenuAction[]` | More context-menu actions. |
| `text` | `IssueBoardLabels` | Override strings. |

### `IssueCard`

Exported from `issue-view`. `issue`, `labels`, `people`, `votes`, `voted`, `onVote(voted)`, `comments`,
`attachments`, `open` (default true; false never shows overdue), `now`, `text`. Use it on its own or in
`KanbanBoard`'s `renderCard`.

### Helpers

`filterIssues(issues, filter, labelName?)`, `isIssueFilterActive(filter)`, `EMPTY_ISSUE_FILTER` and
`boardIndex(all, visibleIds, movedId, toColumn, toIndex)`. Pure; use them to filter the same way on a server.

## Examples

**Feedback board.** Pass `votes`/`voted` and `onVote`, and sort each column by votes before passing `issues`.

**Server-side filtering.** Use `onFilterChange` to refetch; pass the results as `issues`.

## Accessibility

- The board is a labelled region; drag and drop works from the keyboard (Space to pick up, arrows, Space to drop)
  with spoken announcements from `KanbanBoard`.
- The vote button is a toggle (`aria-pressed`) named with the count. Its keys and presses do not start a drag.
- Priority, overdue and counts have text for screen readers, not only icons or colour.
- Keyboard users open an issue from the card's context menu (Shift+F10 or the Menu key), because Enter picks the
  card up.

## RTL & i18n

English and Arabic strings are built in; override with `text`. Columns flow right to left in Arabic. Issue keys
stay left to right. Search folds Arabic letter forms, so "مراجعه" finds "مراجعة".

## Styling & tokens

Cards use `bg-card`, `border-border` and `rounded-card`. A voted button uses `bg-nq-selected`; overdue dates use
`text-nq-danger-text`, today and soon `text-nq-warning-text`.

## Do / Don't

- Do pass the full list and let the board filter, or filter on the server and pass the results.
- Don't re-sort cards on every vote while someone is dragging; apply the order after the drop.

## Related

`kanban-board`, `issue-view`, `project-view`, `status-label-manager`.

## Lab

Projects & Work › Issue Board: Default, Feedback votes, Filtered, Arabic.
