---
name: issue-view
title: Issue View
category: work
status: beta
summary: One issue as a page or a quick-view drawer with an inline title, a rich description, a properties sidebar, checklist, sub-issues, linked pull requests, comments, activity, time and AI cost.
exports: [IssueView, IssueQuickView, IssueViewLabels, IssueActivityProps, IssueTimeProps, IssueAiProps, IssueViewProps, IssueQuickViewProps]
related: [project-view, comment-thread, activity-composer, checklist, time-tracker, ai-usage-cost, github-activity]
story: components-projects-work-issue-view
base-ui: [select, popover, sheet, tabs]
keywords: [issue, ticket, task, properties, drawer, quick view, project management]
---

# Issue View

Everything about one issue in one place. It is presentational: you own the data and every change awaits your callback.

## When to use

- The page for an issue, or the drawer opened from a board card or table row.

## When not to use

- A list of issues: use `ProjectView` or `DataTable`.

## Import

```tsx
import { IssueView, IssueQuickView } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<IssueView
  issue={issue}
  statuses={statuses}
  labels={labels}
  people={people}
  projects={projects}
  onUpdate={async (patch) => save(issue.id, patch)}
  thread={{ comments, onSubmit }}
/>
```

## Anatomy

```
IssueView              data-slot="issue-view", a container query
├─ header              key with copy, inline title, back button
├─ description         RichTextEditor, saved on blur
├─ checklist, sub-issues, linked pull requests and commits
├─ tabs                Comments, Activity, Time, AI cost (only the ones with data)
└─ properties          status, priority, type, assignee, labels, estimate, due, project, parent
IssueQuickView         a Sheet around IssueView variant="drawer"
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `issue` | `Issue` | required | The issue. |
| `statuses` / `labels` / `people` / `projects` | arrays | required | The choices for the properties. |
| `parentOptions` | `IssueRef[]` | none | The issue and its descendants are left out. |
| `onUpdate` | `(patch) => Promise<...>` | none | Save a property, the title or the description. Omit for read-only. |
| `checklist` | `{ items, onToggle, onAdd, onRemove }` | none | Shows the checklist. |
| `subIssues` / `onAddSubIssue` / `onOpenIssue` | | none | Sub-issues and opening one. |
| `development` | `{ repo, pulls, commits, runs }` | none | Linked pull requests. |
| `thread` | `CommentThreadProps` | none | Shows Comments. |
| `activity` | `{ items, onSubmit, onToggleTask, onDelete }` | none | Shows Activity. |
| `time` | `{ entries, running, onStart, onStop, ... }` | none | Shows Time. |
| `ai` | `{ days, byModel, byProduct, byRun, run? }` | none | Shows AI cost. |
| `variant` | `"page" \| "drawer"` | `page` | Sidebar beside the content, or stacked. |
| `onBack` | `() => void` | none | Back button. |
| `labelsText` | `IssueViewLabels` | en / ar | Every string. |
| `open` / `onOpenChange` / `onOpenFull` | | none | `IssueQuickView` only. |

`IssueCard` (also exported here) shows one issue as a board card: type, key, priority, title, labels, due date,
votes (a toggle with `onVote`), comments, attachments and the assignee. Props: `issue`, `labels`, `people`,
`votes`, `voted`, `onVote(voted)`, `comments`, `attachments`, `open`, `now`, `text`. `IssueBoard` and
`ProjectView`'s board use it.

## Examples

- **Drawer**: `IssueQuickView` opened from a board card.

## Accessibility

The title is a heading that becomes an input on click; Enter saves and Escape cancels. Property pickers are labelled selects; errors use `role="alert"`. The drawer traps focus and returns it on close.

## RTL & i18n

English and Arabic built in. Keys, dates and numbers stay left-to-right; the layout mirrors with logical classes.

## Styling & tokens

Semantic tokens only. Overdue dates use the danger tokens.

## Do / Don't

- Do return `{ error }` so a failed change shows next to the field.
- Do not pass tabs you cannot fill: leave the prop out and the tab is hidden.

## Related

- [ProjectView](../project-view/README.md)
- [CommentThread](../comment-thread/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-projects-work-issue-view--docs
