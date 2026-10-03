---
name: checklist
title: Checklist
category: work
status: beta
summary: A checklist with one level of subtasks, a progress bar, attachments and a row menu. A parent follows its subtasks and ticking a parent ticks them all.
exports: [Checklist, ChecklistProps, ChecklistLabels, ChecklistItem, ChecklistAttachment, ChecklistProgress, isItemDone, subtaskState, checklistProgress, toggleItem, attachmentSize]
related: [approval-queue, progress, checkbox, context-menu]
story: components-projects-work-checklist
base-ui: [checkbox, context-menu]
keywords: [checklist, subtasks, todo, progress, attachments, tasks]
---

# Checklist

Small pieces of work inside a task. Each change awaits your callback, so a failure shows instead of being hidden.

## When to use

- Steps inside one task, with progress and optional attachments.

## When not to use

- A board of tasks with owners: use a board or `EntityList`.

## Import

```tsx
import { Checklist } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<Checklist items={items} onToggle={async (id, done) => setItems((l) => toggleItem(l, id, done))} onAdd={add} onRemove={remove} />
```

## Anatomy

```
Checklist            data-slot="checklist"
├─ Progress          done of total leaf tasks
├─ item rows         Checkbox (indeterminate when some subtasks are done), text, meta, attachments
│  └─ subtasks       one level
└─ add row           text field, adds an item or a subtask
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `ChecklistItem[]` | required | `{ id, text, done, meta?, subtasks?, attachments? }`. |
| `onToggle` | `(id, done) => Promise<...>` | required | Tick or untick. Cascade with the `toggleItem` helper. |
| `onAdd` | `(text, parentId?) => Promise<...>` | none | Omit to hide the add row. |
| `onRemove` | `(id) => Promise<...>` | none | Omit to hide delete. |
| `onAttach` | `(id, files) => Promise<...>` | none | Omit to hide attach. |
| `onRemoveAttachment` | `(itemId, attachmentId) => Promise<...>` | none | Remove a file. |
| `showProgress` | `boolean` | `true` | The progress bar. |
| `readOnly` | `boolean` | `false` | No changes. |
| `labels` | `ChecklistLabels` | en / ar | Every string. |

## Examples

- **Read only**: show a finished task's checklist with `readOnly`.

## Accessibility

Real checkboxes with labels; a parent with mixed subtasks is shown as mixed. The row menu opens
with right-click, Shift+F10 or the Menu key, and every action is also a button.

## RTL & i18n

English and Arabic built in. Subtasks are indented with logical padding so they mirror in RTL.

## Styling & tokens

Semantic tokens only.

## Do / Don't

- Do keep it to one level of subtasks.
- Do not use it for hundreds of items; paginate.

## Related

- [ApprovalQueue](../approval-queue/README.md)
- [Progress](../progress/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-projects-work-checklist--docs
