---
name: status-label-manager
title: StatusLabelManager
category: workflow
status: beta
summary: An admin screen to manage workflow statuses grouped by stage and flat labels, with colour, reorder, edit and delete that warns when in use.
exports: [StatusLabelManager, StatusLabelManagerProps, StatusLabelManagerLabels, StatusDraft, LabelDraft, WorkStatus, WorkLabel, StatusHue, StatusStage, NameError, STATUS_STAGES, STATUS_HUES, NAME_MAX, validateName, groupByStage, moveWithinStage, sortByStage, hasDoneStage]
related: [color-picker, badge, tabs, alert-dialog]
story: components-workflow-status-label-manager
base-ui: [tabs, dialog, alert-dialog, select, context-menu]
keywords: [status, label, tag, workflow, stage, color, reorder, settings]
---

# StatusLabelManager

Where a workspace shapes its vocabulary: the statuses work moves through and the labels it can carry.

## When to use

- Settings screens for statuses (with stages) and labels.

## When not to use

- Picking a status on a task: use a `Select`.

## Import

```tsx
import { StatusLabelManager } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<StatusLabelManager statuses={statuses} labels={labels} onSaveStatus={save} onDeleteStatus={del} onReorderStatuses={reorder} onSaveLabel={saveLabel} onDeleteLabel={delLabel} />
```

## Anatomy

```
StatusLabelManager   data-slot="status-label-manager"
├─ Tabs              Statuses / Labels
├─ stage groups      backlog, todo, active, review, done, canceled, each a Card of rows
│  └─ row            colour Badge, name, usage count, move up / down, edit, delete
└─ EditDialog        name, ColorPicker (--nq-tag-* swatches), stage Select
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `statuses` | `WorkStatus[]` | required | `{ id, name, hue, stage, usage? }`. |
| `labels` | `WorkLabel[]` | required | `{ id, name, hue, usage? }`. |
| `onSaveStatus` | `(draft) => Promise<...>` | required | No `id` means create. |
| `onDeleteStatus` | `(id) => Promise<...>` | required | Deleting an in-use item asks first. |
| `onReorderStatuses` | `(ids) => Promise<...>` | required | Full new order after a move inside a stage. |
| `onSaveLabel` | `(draft) => Promise<...>` | required | Create or update a label. |
| `onDeleteLabel` | `(id) => Promise<...>` | required | Delete a label. |
| `defaultTab` | `"statuses" \| "labels"` | `"statuses"` | First tab. |
| `copy` | `StatusLabelManagerLabels` | en / ar | Every string. The `labels` prop is the label list. |

## Examples

- **Validation**: names must be non empty, at most 32 characters and unique within their list.

## Accessibility

Reordering is by buttons, not drag alone. Colour is always paired with the name. Dialogs trap focus and the
row menu opens with right-click, Shift+F10 or the Menu key.

## RTL & i18n

English and Arabic built in; move icons mirror in RTL.

## Styling & tokens

Hues map to `--nq-tag-*`. Cards fill their cell.

## Do / Don't

- Do keep at least one status in the done stage.
- Do not reuse names across statuses.

## Related

- [ColorPicker](../color-picker/README.md)
- [Badge](../badge/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-status-label-manager--docs
