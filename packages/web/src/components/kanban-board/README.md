---
name: kanban-board
title: KanbanBoard
category: collaboration
status: beta
summary: Controlled board of columns and draggable cards (dnd-kit sortable) with keyboard moves, localised announcements and RTL column flow.
exports: [KanbanBoard, KanbanCard, KanbanBoardProps, KanbanColumnData, KanbanCardData, KanbanLabel, KanbanCardRenderState]
related: [card, badge, avatar, data-table]
story: components-collaboration-kanban-board
base-ui: []
keywords: [kanban, board, columns, cards, drag, drop, dnd, tasks, pipeline]
---

# KanbanBoard

Columns of cards the user drags between and within. It is controlled: you pass `columns` and `cards`, and get
`onMove(cardId, toColumn, toIndex)` when a card is dropped somewhere new. Built on `@dnd-kit/core` and `@dnd-kit/sortable`
with a drag overlay, pointer, touch and keyboard sensors and screen-reader announcements.

## When to use

- Work that moves through stages: tasks, deals, tickets, candidates.

## When not to use

- Reordering one flat list: use a sortable list (see `data-table` row ordering or `sidebar-layout`).
- Many attributes per row: use `data-table`.

## Import

```tsx
import { KanbanBoard, KanbanCard } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { KanbanBoard, type KanbanCardData } from "@fadymondy/nasaq/web";
import { useState } from "react";

const columns = [
  { id: "todo", title: "To do" },
  { id: "done", title: "Done" },
];

export function Board() {
  const [cards, setCards] = useState<KanbanCardData[]>([
    { id: "a", columnId: "todo", title: "Write the brief", labels: [{ label: "Docs", hue: "blue" }], assignee: { name: "Sara Ali" } },
    { id: "b", columnId: "todo", title: "Review copy" },
  ]);
  return (
    <KanbanBoard
      columns={columns}
      cards={cards}
      onMove={(id, toColumn, toIndex) =>
        setCards((prev) => {
          const card = prev.find((c) => c.id === id);
          if (!card) return prev;
          const rest = prev.filter((c) => c.id !== id);
          const inColumn = rest.filter((c) => c.columnId === toColumn);
          inColumn.splice(toIndex, 0, { ...card, columnId: toColumn });
          return [...rest.filter((c) => c.columnId !== toColumn), ...inColumn];
        })
      }
    />
  );
}
```

## Anatomy

```
KanbanBoard            data-slot="kanban-board"   (role="group")
  section              data-slot="kanban-column"  (data-over while a card is over it)
    header             data-slot="kanban-column-header"  title (h3) + count Badge
    ul                 data-slot="kanban-list"
      li               data-slot="kanban-item"    (drag handle, data-dragging)
        KanbanCard     data-slot="kanban-card"
      li               data-slot="kanban-empty"   (placeholder when the column has no cards)
```

## API

### KanbanBoard

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `KanbanColumnData[]` | required | `{ id, title }`, in display order. |
| `cards` | `T extends KanbanCardData` | required | Flat list. Cards keep the array order inside their column. |
| `onMove` | `(cardId, toColumn, toIndex) => void` | required | Fired once on drop, only when the card ended somewhere new. `toIndex` is the index in the destination column after the card is removed from its old place. |
| `renderCard` | `(card, { overlay, dragging }) => ReactNode` | `KanbanCard` | The card slot. The board supplies the drag handle. |
| `emptyLabel` | `string` | "No cards" / "لا توجد بطاقات" | Placeholder of an empty column. |
| `label` | `string` | "Kanban board" / "لوحة كانبان" | Group name. |
| `announcements` | `{ pickedUp?, movedOver?, dropped?, cancelled? }` | localised | Functions `(card, column, position, total) => string` (`cancelled` takes the card). |
| `instructions` | `string` | localised | Read when a card gets focus. |
| `columnClassName` | `string` | `w-72` | Applied to each column. |

### Types

`KanbanColumnData = { id: string; title: string }`.
`KanbanCardData = { id: string; columnId: string; title: string; labels?: { label: string; hue?: TagHue }[]; assignee?: { name: string; src?: string } }`.
Column and card ids share one namespace and must be unique. Extend `KanbanCardData` with your own fields and read them in `renderCard`.

### KanbanCard

`{ card: KanbanCardData }` plus `div` props. Title, tag Badges for labels, and the assignee's Avatar.

## Examples

Custom card body:

```tsx
import { KanbanBoard } from "@fadymondy/nasaq/web";

export function Compact({ columns, cards, onMove }: Parameters<typeof KanbanBoard>[0]) {
  return (
    <KanbanBoard
      columns={columns}
      cards={cards}
      onMove={onMove}
      emptyLabel="لا توجد بطاقات"
      renderCard={(card, { overlay }) => (
        <div className={overlay ? "rounded-control border border-border bg-card px-3 py-2 shadow-lg" : "rounded-control border border-border bg-card px-3 py-2"}>
          {card.title}
        </div>
      )}
    />
  );
}
```

## Context menu

`cardActions={(card) => ContextMenuAction[]}` opens a menu on right-click, Shift+F10 or the Menu key on a focused card (move to a column, delete…). Dragging is unchanged. `contextMenu={false}` opts out.

## Accessibility

Each card is focusable with `aria-roledescription` ("draggable card" / "بطاقة قابلة للسحب") and instructions.

| Key | Action |
| --- | --- |
| Tab | Moves focus between cards. |
| Space / Enter | Lifts the focused card; drops it while lifted. |
| Arrow Up / Down | Moves the lifted card within its column. |
| Arrow Left / Right | Moves the lifted card to the neighbouring column on that side (physical direction, also in RTL). |
| Escape | Cancels the move. |

Pick up, move, drop and cancel are announced through a live region, with the column title and 1-based position ("Dropped X in
Done, position 2 of 3"). Numbers use the locale's numerals. Override any string through `announcements` and `instructions`; the count badge
has an `aria-label` ("3 cards").

## RTL & i18n

The columns are a flex row, so they start from the right in RTL and the drag overlay follows the pointer. Built-in strings exist in
English and Arabic by the Nasaq locale. Card and column titles are your data, so localise them yourself.

## Styling & tokens

Uses `bg-secondary`, `bg-card`, `border-border`, `border-nq-focus` (a column that a card hovers over), `text-muted-foreground`.
Target `data-over` on columns and `data-dragging` on items. Extend with `className` and `columnClassName`.

## Do / Don't

- Do apply `onMove` to your own state; the board never reorders your data.
- Do keep ids unique across cards and columns.
- Don't put interactive controls that need a click inside a default card without stopping pointer events: the card is the drag handle.

## Related

- [card](../card/README.md)
- [badge](../badge/README.md)
- [avatar](../avatar/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-collaboration-kanban-board--docs
