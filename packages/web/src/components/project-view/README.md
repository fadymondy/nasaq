---
name: project-view
title: Project View
category: work
status: beta
summary: A project page with a header, progress and members, and tabs for overview, board, list, timeline, activity, time, AI cost, files, memory, vault, GitHub and settings.
exports: [ProjectView, ProjectViewLabels, ProjectDetails, ProjectPatch, ProjectFile, NewIssueInput, ProjectTab, ProjectGithub, ProjectVault, ProjectSettingsExtras, ProjectViewProps]
related: [issue-view, kanban-board, data-table, timeline, time-tracker, ai-usage-cost, project-list, vault, env-list, github-activity, repository-picker, members-manager, settings-sections, status-label-manager]
story: components-projects-work-project-view
base-ui: [tabs, dialog, select, switch]
keywords: [project, board, backlog, burndown, budget, kanban, project management]
---

# Project View

One project end to end. It is presentational: you own the issues and every change awaits your callback.

## When to use

- The page for a project, with the work shown as an overview, a board, a list and a schedule.

## When not to use

- A list of projects: use `ProjectList`.

## Import

```tsx
import { ProjectView } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ProjectView
  project={project}
  issues={issues}
  statuses={statuses}
  labels={labels}
  people={people}
  onUpdateIssue={update}
  onMoveIssue={move}
  onOpenIssue={(issue) => open(issue.id)}
/>
```

## Anatomy

```
ProjectView            data-slot="project-view"
├─ header              name, key, client, status, dates, members, progress, New issue
└─ tabs                each shown only when its data is given
   ├─ overview         open issues by status, burndown, recent activity, budget against spend
   ├─ board            KanbanBoard, drag to change status
   ├─ list             DataTable with in-cell edit
   ├─ timeline         schedule bars and notes
   ├─ activity         the full feed, filtered by type and person, grouped by day
   ├─ time             TimeTracker and TimeEntryList
   ├─ ai               AiUsageCost
   ├─ files            upload, download, delete
   ├─ memory           remembered facts and decisions: search, tags, add, edit, forget
   ├─ vault            Vault for secrets and EnvList for variables
   ├─ github           RepositoryPicker and GithubActivity
   └─ settings         SettingsSections: general, budget, members, labels and statuses, integrations, danger zone
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `project` | `ProjectDetails` | required | Name, key, client, status, dates, members, budget. |
| `issues` / `statuses` / `labels` / `people` | arrays | required | The work. |
| `onUpdateIssue` | `(id, patch) => Promise<...>` | none | In-cell edit. Return `{ error }` to roll back. |
| `onMoveIssue` | `(id, statusId, index) => Promise<...>` | none | Board drop. Defaults to `onUpdateIssue({ statusId })`. |
| `onCreateIssue` / `onDeleteIssue` | | none | Omit to hide. |
| `onOpenIssue` | `(issue) => void` | none | Open the quick view or the page. |
| `activity` / `budget` | | none | Overview widgets. `activity` also shows the Activity tab; give each item a `kind` to filter by type. |
| `notes` / `time` / `ai` / `files` | | none | Each shows its tab. |
| `memory` | `{ items, onSave, onForget }` | none | Shows Memory. Items are `{ id, kind, text, tags, source, at }`. |
| `vault` | `VaultProps & { env? }` | none | Shows Vault. `env` takes `EnvListProps`. |
| `github` | `ProjectGithub` | none | Shows GitHub: `repo` (or null), `picker`, and the GithubActivity feeds. |
| `onSaveProject` / `workflow` | | none | Settings: general and budget pages, labels and statuses. |
| `settings` | `ProjectSettingsExtras` | none | Settings: `members` (MembersManager props), `integrations`, `onArchive`, `onDelete`. |
| `defaultTab` / `tab` / `onTabChange` / `tabs` | | overview | Tab control. |
| `labelsText` | `ProjectViewLabels` | en / ar | Every string. |

## Examples

- **With a quick view**: `onOpenIssue` opens `IssueQuickView`.

## Accessibility

Tabs are a real tab list. A board card opens on click, and Open is also in its context menu (context-click, Shift+F10 or the Menu key) for keyboard use. Charts have text labels.

## RTL & i18n

English and Arabic built in. Board columns, the schedule and the header mirror; keys and numbers stay left-to-right.

## Styling & tokens

Semantic tokens only. The tab list scrolls sideways on narrow screens; the settings pages switch to a select. Charts take colours from the tag tokens.

## Do / Don't

- Do return `{ error }` so a failed drop rolls back.
- Do not put thousands of issues on the board; filter first.

## Related

- [IssueView](../issue-view/README.md)
- [KanbanBoard](../kanban-board/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-projects-work-project-view--docs
