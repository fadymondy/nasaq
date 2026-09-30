---
name: activity-composer
title: Activity Composer
category: crm
status: beta
summary: Log a note, call, meeting or task, then read the history with open tasks first. Tasks tick off in place.
exports: [ActivityComposer, ActivityTimeline, ActivityLabels, ACTIVITY_ICONS, ActivityComposerProps, ActivityTimelineProps, ActivityActor, ActivityError, ActivityInput, LoggedActivityKind, ActivityRecord, COMPOSABLE_KINDS, ComposableKind, countByKind, fromLocalInput, isOpenTask, isOverdue, splitActivities, toLocalInput, validateActivity]
related: [timeline, issue-view, contact-list, checklist]
story: components-crm-activity-composer
base-ui: [tabs]
keywords: [activity, log, note, call, meeting, task, crm, history]
---

# Activity Composer

The place to write down what happened with a contact, a deal or an issue, and to see what is still to do.

## When to use

- Logging calls, meetings and notes on a record.
- Follow-up tasks with a due time that sit above the history until done.

## When not to use

- System events only: use `Timeline`.
- A long checklist inside one task: use `Checklist`.

## Import

```tsx
import { ActivityComposer, ActivityTimeline } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ActivityComposer onSubmit={async ({ kind, body, at, durationMinutes }) => save(...)} />
<ActivityTimeline activities={items} onToggleTask={toggle} onDelete={remove} />
```

## Anatomy

```
ActivityComposer       data-slot="activity-composer"
├─ kind tabs           note, call, meeting, task
├─ body                text
├─ when                date and time (due for a task)
├─ duration            calls and meetings
└─ submit
ActivityTimeline       data-slot="activity-timeline"
├─ open tasks          soonest due first, overdue flagged
└─ history             newest first
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(input) => Promise<...>` | required | `{ kind, body, at, durationMinutes? }`. Return `{ error }` to keep the text. |
| `kinds` | `ComposableKind[]` | all four | Which kinds can be logged. |
| `defaultKind` | `ComposableKind` | `note` | The kind shown first. |
| `activities` | `ActivityRecord[]` | required (timeline) | `{ id, kind, body, at, actor?, durationMinutes?, done? }`. |
| `onToggleTask` | `(id, done) => Promise<...>` | none | Omit for read-only tasks. |
| `onDelete` | `(id) => Promise<...>` | none | Omit to hide delete. |
| `now` | `number` | `Date.now()` | For overdue. |
| `loading` / `empty` | `boolean` / `ReactNode` | none | Skeleton and custom empty state. |
| `labels` | `ActivityLabels` | en / ar | Every string. |

## Examples

- **Task only**: `kinds={["task"]}`.

## Accessibility

The kind switch is a tab list; fields are labelled; validation errors use `role="alert"`. Row actions open from a button menu or a context-click.

## RTL & i18n

English and Arabic built in. Dates and durations use the locale; the datetime field stays left-to-right.

## Styling & tokens

Semantic tokens only.

## Do / Don't

- Do let a failed save keep the typed text.
- Do not use it as a general chat.

## Related

- [Timeline](../timeline/README.md)
- [IssueView](../issue-view/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-crm-activity-composer--docs
