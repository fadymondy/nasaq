---
name: view-toggle
title: ViewToggle
category: actions
status: beta
summary: "Switches how a collection is shown (table, grid, board, list or calendar), with one view always pressed and optional persistence in localStorage."
exports: [ViewToggle, ViewToggleProps, ViewMode, ViewToggleLabels]
related: [toggle-group, data-table, kanban-board, page-header]
story: components-actions-view-toggle
base-ui: [toggle-group, toggle, tooltip]
keywords: [view toggle, view switcher, layout toggle, table view, grid view, board view, list view, calendar view, display mode]
---

# ViewToggle

A segmented control for picking how a collection is shown: a table, a grid of cards, a board, a list or a calendar. Exactly one view is pressed at a time. With `storageKey` the choice is remembered, so the page opens in the view the visitor left it in.

## When to use

- In a list page's toolbar, when the same records can be read as a table or as cards (or a board, a calendar).

## When not to use

- Switching between different content: use `Tabs`.
- Toggling formatting or filters: use [`ToggleGroup`](../toggle-group/README.md) directly.

## Import

```tsx
import { ViewToggle } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ViewToggle, type ViewMode } from "@fadymondy/nasaq/web";

const [view, setView] = useState<ViewMode>("table");

<ViewToggle views={["table", "grid"]} value={view} onValueChange={setView} storageKey="customers:view" />;
```

## Anatomy

```
div [data-slot=view-toggle]
└─ ToggleGroup (segmented, aria-label "View")
   └─ Toggle [data-view=table|grid|board|list|calendar] (icon; label when `showLabels`, tooltip otherwise)
```

## API

### `ViewToggle`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `views` | `ViewMode[]` | `["table", "grid"]` | The views offered, in order. |
| `value` | `ViewMode` | — | Controlled view. |
| `defaultValue` | `ViewMode` | first of `views` | Uncontrolled start. |
| `onValueChange` | `(view: ViewMode) => void` | — | Also called once after mount when a stored view is restored. |
| `storageKey` | `string` | — | Remembers the choice in `localStorage`. Read after mount, so SSR stays stable. |
| `showLabels` | `boolean` | `false` | Text beside each icon. Icon-only items get an `aria-label` and a tooltip. |
| `labels` | `Partial<ViewToggleLabels>` | — | Override the group name and view names. |

Plus any `<div>` prop. `ViewMode` is `"table" | "grid" | "board" | "list" | "calendar"`.

## Examples

### With labels

```tsx
<ViewToggle views={["table", "grid", "list"]} showLabels />
```

### Board and calendar for work items

```tsx
<ViewToggle views={["board", "list", "calendar"]} defaultValue="board" storageKey="issues:view" onValueChange={setView} />
```

## Accessibility

- A Base UI toggle group: arrow keys move between views, Space and Enter press.
- The group is named "View" / "طريقة العرض"; icon-only items carry an `aria-label` with the view's name.
- Pressing the pressed view does nothing, so the group never ends up with no view.

## RTL & i18n

View names ship in English and Arabic. Arrow keys follow the reading direction.

## Styling & tokens

- Inherits `ToggleGroup`'s segmented look: `bg-secondary` track, `bg-card` pressed item, `text-label`.
- Target a view with `[data-slot=view-toggle] [data-view=grid]`.

## Do / Don't

- Do put it at the inline end of the list toolbar, next to filters.
- Do use `storageKey` with a per-page key.
- Don't offer views the page can't render well; two or three is typical.

## Related

`toggle-group`, `data-table`, `kanban-board`, `page-header`.

## Lab

https://docs.nasaqui.com/?path=/docs/components-actions-view-toggle--docs
