---
name: notification-center
title: NotificationCenter
category: collaboration
status: beta
summary: Bell button with an unread badge that opens a popover of notifications, with All and Unread tabs, mark all read and an empty state. Controlled.
exports: [NotificationCenter, NotificationCenterProps, NotificationCenterItem, NotificationCenterLabels]
related: [notification-item, popover, tabs, states, badge, sheet]
story: components-collaboration-notification-center
base-ui: [popover, tabs]
keywords: [notifications, bell, inbox, unread, badge, mark all read, popover]
---

# NotificationCenter

The header bell. It shows an unread count, and opens a popover with a list of [`NotificationItem`](../notification-item/README.md) rows, All and Unread tabs, and a "Mark all read" action. It is controlled: it fetches nothing and keeps no read state. You pass `items` and handle `onItemClick` and `onMarkAllRead`.

## When to use

- The notifications entry in an app header, for a short list of recent items.

## When not to use

- A full inbox page or a long, paged history: use a page with [`Timeline`](../timeline/README.md) or a table.
- A side-over with room for settings: use `Sheet` with `NotificationItem` rows.
- A transient message: use a toast.

## Import

```tsx
import { NotificationCenter, type NotificationCenterItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { NotificationCenter, type NotificationCenterItem } from "@fadymondy/nasaq/web";
import { useState } from "react";

const initial: NotificationCenterItem[] = [
  { id: "1", actor: { name: "Sara Alharbi" }, title: "Sara mentioned you in MH-142", time: new Date(Date.now() - 300_000), unread: true },
  { id: "2", title: "Invoice INV-031 was paid", time: "2026-09-28T09:00:00Z" },
];

export function HeaderBell() {
  const [items, setItems] = useState(initial);
  return (
    <NotificationCenter
      items={items}
      onItemClick={(item) => setItems((all) => all.map((i) => (i.id === item.id ? { ...i, unread: false } : i)))}
      onMarkAllRead={() => setItems((all) => all.map((i) => ({ ...i, unread: false })))}
    />
  );
}
```

## Anatomy

```
NotificationCenter                 data-slot="notification-center"
├─ Popover trigger                 ghost icon Button, aria-label "Notifications, N unread"
│  └─ badge                        data-slot="notification-center-badge"   Num, "99+" above 99
└─ PopoverContent
   ├─ header                       title + "Mark all read" Button
   ├─ Tabs (underline)             All | Unread (with count)
   └─ panel                        <ul> of NotificationItem, or EmptyState
```

## API

### `NotificationCenter`

`NotificationCenterProps extends Omit<ComponentProps<"div">, "children" | "title">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `readonly NotificationCenterItem[]` | required | The notifications, newest first. |
| `onItemClick?` | `(item) => void` | none | A row was pressed. Mark it read here. |
| `onMarkAllRead?` | `() => void` | none | "Mark all read" was pressed. The button is disabled with no unread. |
| `unreadCount?` | `number` | count of `items` with `unread` | Use when the server total exceeds the loaded items. |
| `open?` / `defaultOpen?` / `onOpenChange?` | `boolean` / `boolean` / `(open: boolean) => void` | uncontrolled | Popover state. |
| `labels?` | `Partial<NotificationCenterLabels>` | locale strings | Overrides `title`, `all`, `unread`, `markAllRead`, `emptyAll`, `emptyAllDescription`, `emptyUnread`, `emptyUnreadDescription`, `trigger(unread)`. |
| `side?` / `align?` | Popover side / align | `"bottom"` / `"end"` | Placement. Prefer logical sides. |

### `NotificationCenterItem`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable key. |
| `title` | `ReactNode` | Headline. |
| `description?` | `ReactNode` | Secondary line. |
| `actor?` / `icon?` | `{ name; avatar? }` / `ReactNode` | Leading avatar or icon. |
| `time?` | `Date \| number \| string` | Shown as a relative time in the active locale (Latin digits, narrow). |
| `unread?` | `boolean` | Accent dot and stronger title. |
| `href?` | `string` | Renders the row as a link. |

## Examples

### Server-side count

```tsx
import { NotificationCenter, type NotificationCenterItem } from "@fadymondy/nasaq/web";

export function Bell({ page, total }: { page: NotificationCenterItem[]; total: number }) {
  return <NotificationCenter items={page} unreadCount={total} />;
}
```

### Overriding a label

```tsx
import { NotificationCenter } from "@fadymondy/nasaq/web";

export function Bell() {
  return <NotificationCenter items={[]} labels={{ title: "التنبيهات" }} />;
}
```

## Context menu

`itemActions={(item) => ContextMenuAction[]}` opens a menu on a row on right-click, Shift+F10 or the Menu key (mark read/unread, remove…). The popover stays open. `contextMenu={false}` opts out.

## Accessibility

| Key | Action |
| --- | --- |
| `Enter` / `Space` on the bell | Opens the popover. |
| `Esc` | Closes it. |
| `Tab` | Moves through the tabs, the action and the rows. |
| `Left` / `Right` on a tab | Switches tab (follows reading direction). |

- The bell's accessible name includes the unread count; the visual badge is `aria-hidden`.
- Unread rows have an sr-only "Unread" label, localised by the provider locale.
- Rows are native buttons or links; the empty state is plain text.

## RTL & i18n

- The badge sits on the inline end of the bell, the popover aligns to the inline end, and rows use logical layout.
- Counts go through `Num`; the cap renders as `99+`.
- Built-in English and Arabic strings, chosen by the provider locale.

## Styling & tokens

- Badge uses the `accent` variant; rows use `hover` and `border` tokens.
- Target `[data-slot=notification-center]` and `[data-slot=notification-center-badge]`; extend with `className`. Never use raw hex.

## Do / Don't

- **Do** load a recent page and link to a full inbox.
- **Do** update `unread` in your state in `onItemClick`.
- **Don't** fetch inside the component; it is presentational.

## Related

- [NotificationItem](../notification-item/README.md) · [Popover](../popover/README.md) · [Tabs](../tabs/README.md) · [States](../states/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-collaboration-notification-center--docs
