---
name: dashboard-board
title: DashboardBoard
status: beta
category: layout
summary: A customisable dashboard grid where people drag to reorder cards, resize them, pin favourites, add or remove widgets and change each widget's settings, with an edit mode that saves or cancels as one change.
exports: [DashboardBoardLabels, BoardSettingField, DashboardWidgetContext, DashboardWidgetDef, DashboardBoardProps, DashboardBoard]
related: [stat-card, time-series-panel, chart-extras, context-menu, dialog, repeater]
story: components-layout-pages-dashboard-board
base-ui: [dialog, context-menu, select, switch]
keywords: [dashboard, widgets, grid, drag, reorder, resize, pin, customise, layout, settings, edit mode, dnd-kit]
---

# DashboardBoard

A grid of widget cards the user can rearrange. Your app defines the widgets (what each one renders and which settings it has); the board owns the layout, the edit mode and the saving. Drag and resize use `@dnd-kit`.

## When to use

- A home or overview screen where different roles care about different numbers.
- Any page of independent cards that should remember how a person arranged them.

## When not to use

- A fixed page layout: use plain [`StatGrid`](../stat-card/README.md) and cards.
- Reordering one flat list: use [`Repeater`](../repeater/README.md).

## Import

```tsx
import { DashboardBoard, type BoardItem, type DashboardWidgetDef } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { DashboardBoard, StatCard, type BoardItem, type DashboardWidgetDef } from "@fadymondy/nasaq/web";
import { useState } from "react";

const widgets: DashboardWidgetDef[] = [
  { type: "revenue", title: "Revenue", unique: true, render: () => <StatCard label="This month" value={412500} /> },
  { type: "orders", title: "Orders", render: () => <StatCard label="Today" value={186} /> },
];

export function Home({ initial }: { initial: BoardItem[] }) {
  const [layout, setLayout] = useState(initial);
  return (
    <DashboardBoard
      title="Overview"
      widgets={widgets}
      layout={layout}
      onSave={async (next) => {
        await api.saveDashboard(next);
        setLayout(next);
      }}
    />
  );
}
```

## Anatomy

```
DashboardBoard       data-slot="dashboard-board"
├─ toolbar           Customise, or in edit mode: Add widget, Reset, Cancel, Save
├─ grid (ul)         4, 2 or 1 columns by the board's own width
│  └─ card (li)      data-slot="dashboard-board-card"
│     ├─ header      drag handle, title, pin, size, actions "..."
│     ├─ content     your widget (inert while editing)
│     └─ resize grip bottom inline-end corner (pointer only)
├─ add dialog        the widget catalogue
└─ settings dialog   generated from the widget's fields
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `widgets` | `DashboardWidgetDef[]` | required | The widget catalogue. |
| `layout` | `BoardItem[]` | required | The saved layout. Unknown types and repeated ids are dropped, spans are clamped, pinned cards come first. |
| `onSave` | `(layout) => void \| Promise<void>` | required | Called by Save and by a settings change made outside edit mode. Reject to keep the editor open with an error. Update `layout` when it resolves. |
| `defaultLayout` | `BoardItem[]` | none | What Reset to default returns to. Without it there is no Reset. |
| `editing` `defaultEditing` `onEditingChange` | `boolean` | `false` | Edit mode. |
| `rowHeight` | `number` | `200` | Pixel height of one grid row. |
| `title` | `ReactNode` | none | Heading above the toolbar. |
| `loading` `error` `onRetry` | | | States. |
| `labels` | `Partial<DashboardBoardLabels>` | en / ar | Text overrides. |

### BoardItem

`{ id, type, cols, rows, pinned?, settings? }`. `id` is unique on the board (you can have two "chart" widgets: `chart`, `chart-2`); `type` names the widget.

### DashboardWidgetDef

| Field | Description |
| --- | --- |
| `type`, `title`, `description?` | Identity and catalogue text. |
| `render(ctx)` | Returns the content. `ctx` is `{ id, settings, cols, rows, editing }`; `cols` is what fits now, so a widget can show less on a small card. |
| `minCols` `maxCols` `minRows` `maxRows` | Size limits, default 1 to 4. |
| `defaultCols` `defaultRows` | Size when added. |
| `unique` | Only one on the board. |
| `fields` | Settings: `select`, `number`, `toggle` or `text`, each with `key` and `label`. No fields means no Settings action. |
| `defaultSettings` | Values used until the user changes them. |

## Examples

A widget with a setting that changes what it shows:

```tsx
{
  type: "volume",
  title: "Ticket volume",
  minCols: 2,
  fields: [{ key: "days", label: "Period", type: "select", options: [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }] }],
  defaultSettings: { days: "7" },
  render: ({ settings }) => <VolumeChart days={Number(settings.days)} />,
}
```

## Accessibility

Every pointer gesture has a keyboard or menu equivalent. Focus a card's drag handle, press Space, move with the arrow keys and press Space again; each step is announced ("Orders is now at position 3 of 7"). The "..." button, context-click, long press, Shift+F10 and the Menu key open the same menu: wider, narrower, taller, shorter, move earlier, move later, pin, settings, remove. Size changes, pins, adds and removes are announced. The resize grip is a pointer shortcut only and is hidden from assistive technology. Widget content is `inert` in edit mode so it cannot be tabbed into while the layout moves. Save errors use `role="alert"`.

## RTL & i18n

The grid, the drag order and the resize grip follow the reading direction: in Arabic the grip sits at the left and dragging it leftwards widens the card. Sizes are shown as "columns×rows" in Western digits. English and Arabic text ship built in; override with `labels`. Widget titles and settings labels come from you.

## Styling & tokens

Cards are `Card`; the editing outline uses `border` and `ring` tokens. Target `[data-slot="dashboard-board"]` and `[data-slot="dashboard-board-card"]`; extend with `className`.

## Do / Don't

- Do give widgets sensible `minCols`, so a chart is never squeezed to one column.
- Do keep `id`s stable; they are what a saved layout refers to.
- Do update `layout` only after `onSave` resolves.
- Don't rely on the resize grip alone; the menu is the accessible path.
- Don't put a widget's own drag handlers inside a card; content is inert while editing.
- Widths only change on a four column board. On two or one columns a card keeps its saved width and only its height changes.

## Related

- [`StatCard`](../stat-card/README.md)
- [`TimeSeriesPanel`](../time-series-panel/README.md)
- [`ContextMenu`](../context-menu/README.md)
- [`Repeater`](../repeater/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-layout-pages-dashboard-board--docs
