---
name: project-list
title: ProjectList
category: workflow
status: beta
summary: A list of projects as a table or cards with status, progress, members, lead, due date and tags, plus search, status and client and member and tag filters, bulk select, loading skeletons and an empty state.
exports: [ProjectListLabels, ProjectStatus, Project, ProjectListProps, ProjectList]
related: [entity-list, kanban-board, progress, export-action]
story: components-workflow-project-list
keywords: [projects, portfolio, status, progress, members, due date, list, cards, workflow]
---

# ProjectList

A portfolio of projects: status, progress, who works on it, the lead, when it is due and its tags. It is
`EntityList` with the columns, cards and filters set up, plus an overdue highlight on the due date.

## When to use

- A projects overview, portfolio or client project list.

## When not to use

- Tasks on a board: use [`KanbanBoard`](../kanban-board/README.md).
- Other records: build on [`EntityList`](../entity-list/README.md).

## Import

```tsx
import { ProjectList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProjectList, type Project } from "@fadymondy/nasaq/web";

const projects: Project[] = [
  { id: "1", name: "Website redesign", key: "WEB", client: "Acme", status: "active", progress: 62, dueDate: "2026-12-01", members: [{ name: "Sara Ali" }, { name: "Omar Nasser" }] },
];

export function Projects() {
  return <ProjectList projects={projects} />;
}
```

## Anatomy

`ProjectList` renders `EntityList`. Columns: name (logo, name, key and client), status, progress, members, lead
(hidden by default), due, tags (hidden by default), last activity. Facets: status, client, member, tag.

## API

`ProjectListProps` extends the `EntityList` props (`view`, `pageSize`, `selectable`, `toolbar`, `bulkActions`,
`rowActions`, `onRowClick`, `loading`, `error`, `onRetry`, `empty`, `defaultSort`, `className`).

| Prop | Type | Description |
| --- | --- | --- |
| `projects` | `Project[]` | `{ id, name, key?, logo?, client?, status, progress (0 to 100), members?, owner?, dueDate?, tags?, lastActivity? }`. |
| `label` | `string` | Accessible name. Default "Projects" / "المشاريع". |
| `labels` | `Partial<ProjectListLabels>` | Override any string, including `statuses`. |

`ProjectStatus` is `"planning" | "active" | "on-hold" | "completed" | "archived"`.

## Examples

**Cards only**

```tsx
<ProjectList projects={projects} defaultView="cards" views={["cards"]} />
```

## Accessibility

Inherited from `EntityList`. Each progress bar is named ("Progress: Website redesign") and reads its value; status is
text plus an icon, never colour alone. Overdue dates say "Overdue" in text.

## RTL & i18n

- English and Arabic strings ship, including status names. Percentages and dates follow the locale; project keys are set left-to-right.
- Progress bars fill from the inline start, so they run right to left in Arabic.

## Styling & tokens

- Status tones and progress tones come from `Status` and `Progress`. Overdue uses `text-nq-danger-text`.

## Do / Don't

- Do keep `progress` between 0 and 100.
- Don't use colour alone to tell statuses apart in your own cells; reuse `Status`.

## Related

- [`EntityList`](../entity-list/README.md)
- [`KanbanBoard`](../kanban-board/README.md)
- [`ExportButton`](../export-action/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-project-list--docs
