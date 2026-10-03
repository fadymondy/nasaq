---
name: time-tracker
title: TimeTracker
category: productivity
status: beta
summary: A running timer with project and task picker, manual time entries, an entries list grouped by day, and a day or week timesheet grid with totals.
exports: [TimeTrackerLabels, TimeTask, TimeProject, TimeEntry, TimerSelection, RunningTimer, StoppedTimer, TimeEntryInput, TimeTrackerProps, TimeTracker, TimeEntryDialogProps, TimeEntryDialog, TimeEntryListProps, TimeEntryList, TimesheetView, TimesheetProps, Timesheet]
related: [stat-card, data-table, date-picker, scheduler]
story: components-productivity-timetracker
base-ui: [select, dialog, toggle-group]
keywords: [time, timer, timesheet, tracking, hours, entries, project, task]
---

# TimeTracker

Three pieces for logging work time. `TimeTracker` is the running timer: pick a project and task, add a note, start and
stop. `TimeEntryList` lists entries by day with a manual entry dialog. `Timesheet` shows hours per project and task across a
day or a week with row and column totals. Durations are whole seconds; the components are presentational and your callbacks
save the data.

## When to use

- Freelancers, agencies and teams that log hours against projects and tasks.

## When not to use

- Scheduling events on a calendar: use [`Scheduler`](../scheduler/README.md).
- Showing a generic table: use [`DataTable`](../data-table/README.md).

## Import

```tsx
import { TimeTracker, TimeEntryList, Timesheet } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { TimeTracker, type TimeProject } from "@fadymondy/nasaq/web";

const projects: TimeProject[] = [{ id: "web", name: "Website", tasks: [{ id: "ui", name: "UI polish" }] }];

export function Timer() {
  return <TimeTracker projects={projects} onStart={async (s) => api.start(s)} onStop={async (s) => api.stop(s)} />;
}
```

## Anatomy

```
TimeTracker                     data-slot="time-tracker"
├─ timer readout                role="timer", h:mm:ss, project / task
├─ Start / Stop button
└─ project, task, note fields
TimeEntryList                   data-slot="time-entry-list"
├─ day cards                    total per day, entry rows with edit and delete
└─ TimeEntryDialog              date, project, task, duration, note
Timesheet                       data-slot="timesheet"
├─ view toggle and period navigation
└─ table                        rows by project and task, columns by day, totals
```

## API

### `TimeTracker`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `projects` | `readonly TimeProject[]` | required | `id`, `name`, `tasks?: { id, name }[]`. |
| `running?` | `RunningTimer \| null` | uncontrolled | Controlled running timer. |
| `defaultRunning?` | `RunningTimer \| null` | `null` | Initial running timer (for example restored from your server). |
| `onStart?` | `(selection: TimerSelection & { startedAt: number }) => Promise<Result> \| Result` | none | Resolve `{ error }` to stay stopped. |
| `onStop?` | `(stopped: StoppedTimer) => Promise<Result> \| Result` | none | Receives elapsed `seconds`. Resolve `{ error }` to keep running. |
| `onRunningChange?` | `(running: RunningTimer \| null) => void` | none | Every change of the running timer. |
| `labels?` | `TimeTrackerLabels` | built-in en/ar | String overrides. |
| `className?` | `string` | none | Merged onto the card. |

The clock is derived from `startedAt`, so it stays right after a remount or a page reload.

### `TimeEntryList`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `readonly TimeEntry[]` | required | `id`, `date` (`YYYY-MM-DD`), `seconds`, `projectId`, `taskId?`, `note?`. |
| `projects` | `readonly TimeProject[]` | required | For names and pickers. |
| `onAdd?` | `(input: TimeEntryInput) => Promise<Result> \| Result` | none | Shows Add time and the manual entry dialog. |
| `onEdit?` | `(entry, input) => Promise<Result> \| Result` | none | Shows an edit button per entry. |
| `onDelete?` | `(entry: TimeEntry) => Promise<Result> \| Result` | none | Shows a delete button per entry. |
| `labels?` | `TimeTrackerLabels` | built-in | String overrides. |

### `TimeEntryDialog`

Props: `open`, `onOpenChange`, `projects`, `entry?`, `defaultDate?`, `onSubmit(input, entry?)`, `labels?`. Duration accepts
`1:30`, `1.5h`, `90m`, `2h 15m` and Arabic-Indic digits, up to 24 hours.

### `Timesheet`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `readonly TimeEntry[]` | required | Entries to total. |
| `projects` | `readonly TimeProject[]` | required | Row names. |
| `view?` / `defaultView?` | `TimesheetView` (`"day" \| "week"`) | `"week"` | Controlled or initial view. |
| `onViewChange?` | `(view: TimesheetView) => void` | none | View change. |
| `date?` / `defaultDate?` | `Date` | today | Any date inside the shown period. |
| `onDateChange?` | `(date: Date) => void` | none | Period navigation. |
| `weekStartsOn?` | `number` | `1`, or `6` in Arabic | 0 Sunday to 6 Saturday. |
| `labels?` | `TimeTrackerLabels` | built-in | String overrides. |

## Examples

### Restore a running timer

```tsx
<TimeTracker projects={projects} defaultRunning={{ projectId: "web", startedAt: Date.now() - 40 * 60 * 1000 }} />
```

### Entries with manual add

```tsx
<TimeEntryList entries={entries} projects={projects} onAdd={async (input) => api.create(input)} onDelete={async (e) => api.remove(e.id)} />
```

### Weekly timesheet in Arabic

```tsx
<NasaqProvider locale="ar">
  <Timesheet entries={entries} projects={projects} />
</NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through fields and buttons. |
| Enter | Start, stop or save. |
| Arrow keys | Change the timesheet view and pick options. |
| Escape | Close the entry dialog. |

- The clock has `role="timer"` and does not announce each second; starting and stopping are announced through a status region.
- The timesheet is a real table inside a labelled, focusable scroll region.
- Localise `labels` for any custom copy.

## RTL & i18n

Built-in English and Arabic. Clock and hour figures are isolated left to right. Dates use `Intl`. The week starts on Saturday by
default in Arabic and previous and next arrows mirror.

## Styling & tokens

Uses card, border, text and danger tokens. Target `[data-slot="time-tracker"]`, `[data-slot="time-entry-list"]` and
`[data-slot="timesheet"]`; extend with `className`. No raw hex.

## Do / Don't

- Do persist `startedAt` so the timer survives reloads.
- Do keep entries in whole seconds.
- Don't rely on colour alone for the running state; the button changes to Stop.

## Related

- [`stat-card`](../stat-card/README.md)
- [`data-table`](../data-table/README.md)
- [`date-picker`](../date-picker/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-productivity-timetracker--docs
