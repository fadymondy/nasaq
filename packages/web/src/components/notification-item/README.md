---
name: notification-item
title: NotificationItem
category: feedback
status: stable
summary: One row of a notifications list, a full-width button with an actor avatar or icon, title, description, time and an unread marker.
exports: [NotificationItem, NotificationItemProps]
related: [avatar, sheet, badge, toast]
story: components-feedback-notification-item
base-ui: []
keywords: [notification, inbox, activity, unread, list item, mention, feed]
---

# NotificationItem

A single row for a notifications side-over. It is a `<button type="button">`, so the whole row is clickable
(open the item, mark it read). The leading slot shows an [`Avatar`](../avatar/README.md) for who acted, or a
custom icon. Unread rows have a stronger title and an accent dot, so unread is never shown by colour alone.

The component does not fetch, group, format times or manage read state. The host passes pre-formatted strings
and handles `onClick`.

## When to use

- Rows inside a notifications `Sheet` opened from the app header (see `NotificationsSheet` in the App Shell story).
- Any activity feed where each row is one action target.

## When not to use

- A transient message: use a toast.
- A row that needs several separate actions: it is a single button, so nest no other buttons inside.
- Static tables of data: use [`Table`](../table/README.md).

## Import

```tsx
import { NotificationItem, type NotificationItemProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { NotificationItem } from "@fadymondy/nasaq/web";

export function Mention() {
  return (
    <NotificationItem
      actor={{ name: "نور عادل" }}
      title="أشارت إليك نور عادل في MH-728"
      description="هل يمكننا إطلاق تلميحات الشريط اليوم؟"
      time="2m"
      unread
      unreadLabel="غير مقروء"
      onClick={() => console.log("open")}
    />
  );
}
```

## Anatomy

```
NotificationItem              data-slot="notification-item", data-unread when unread   <button type="button">
├─ leading                    `icon` in a 32px round tile, else <Avatar size="md"> from `actor`, else empty
├─ text column
│  ├─ title                   text-body-sm; font-medium + text-foreground when unread, else muted
│  └─ description             text-caption, clamped to 2 lines
└─ meta column (inline end)
   ├─ time                    text-caption, tabular-nums
   └─ unread dot              8px, bg-nq-accent, with sr-only `unreadLabel`
```

## API

### `NotificationItem`

`NotificationItemProps extends Omit<ComponentProps<"button">, "title" | "type">`. It renders a `<button type="button">`, or an `<a>` when `href` is set. Remaining props (`onClick`, `disabled`,
`aria-*`) go to that element.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | The headline. |
| `actor?` | `{ name: string; avatar?: string }` | none | Who acted. Renders an `Avatar` (`name`, `src=avatar`) unless `icon` is given. |
| `icon?` | `ReactNode` | none | Custom leading icon (for example a lucide icon). Wins over `actor`. |
| `description?` | `ReactNode` | none | Secondary line, clamped to two lines. |
| `time?` | `ReactNode` | none | Pre-formatted relative time (`"2m"`, `"منذ ساعة"`), rendered inside a `<time>` element. |
| `dateTime?` | `string` | none | ISO 8601 value for the `<time>` element's `dateTime` attribute. |
| `href?` | `string` | none | Renders an `<a>` instead of a `<button>`. |
| `target?` / `rel?` | `string` | none | Link attributes. `target="_blank"` adds `rel="noopener noreferrer"` unless you pass `rel`. |
| `unread?` | `boolean` | `false` | Shows the accent dot, a medium-weight title and `data-unread`. |
| `unreadLabel?` | `string` | `"Unread"` / `"غير مقروء"` by provider locale | Screen-reader text for the dot. |
| `className?` | `string` | none | Merged onto the button or link. |

## Examples

### Icon instead of an actor

```tsx
import { NotificationItem } from "@fadymondy/nasaq/web";
import { GitPullRequest } from "lucide-react";

export function ReviewRequested() {
  return (
    <NotificationItem
      icon={<GitPullRequest />}
      title="طُلبت مراجعتك: App shell v2"
      description="fadymondy/nasaq #12"
      time="18m"
      unread
      unreadLabel="غير مقروء"
    />
  );
}
```

### List in a sheet, marking read on click

```tsx
import {
  NotificationItem, Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Button,
} from "@fadymondy/nasaq/web";
import { Bell } from "lucide-react";
import { useState } from "react";

const items = [
  { id: 1, name: "Nour Adel", title: "أشارت إليك نور عادل في MH-728", time: "2m" },
  { id: 2, name: "Omar Samy", title: "نقل عمر سامي MH-722 إلى قيد التنفيذ", time: "1h" },
];

export function Notifications() {
  const [unread, setUnread] = useState(new Set([1, 2]));
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="الإشعارات" />}>
        <Bell />
      </SheetTrigger>
      <SheetContent closeLabel="إغلاق">
        <SheetHeader>
          <SheetTitle>الإشعارات</SheetTitle>
          <SheetDescription>الإشارات والمراجعات ونشاط المشاريع.</SheetDescription>
        </SheetHeader>
        <SheetBody className="divide-y divide-border">
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              actor={{ name: n.name }}
              title={n.title}
              time={n.time}
              unread={unread.has(n.id)}
              unreadLabel="غير مقروء"
              onClick={() => setUnread((prev) => new Set([...prev].filter((id) => id !== n.id)))}
            />
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
```

### Formatting the time

Pass a formatted string. Use Latin numerals for compact relative times, as the App Shell story does:

```tsx
import { NotificationItem } from "@fadymondy/nasaq/web";

const rtf = new Intl.RelativeTimeFormat("ar", { style: "narrow", numeric: "always", numberingSystem: "latn" } as Intl.RelativeTimeFormatOptions);

export function Row() {
  return <NotificationItem actor={{ name: "Mona Hany" }} title="علّقت منى هاني على خطة السجل" time={rtf.format(-1, "day")} />;
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Moves between rows. |
| `Enter` / `Space` | Activates the row (`onClick`). With `href`, `Enter` follows the link. |

- The row is a native `<button>`, so it is focusable and announced as a button. A focus ring (`--nq-focus`) shows on `:focus-visible`, drawn inside the row.
- Unread is shown by the dot, a stronger title and `data-unread`. The dot carries an `sr-only` `unreadLabel`; pass a localised value.
- The `title` and `description` are read as the button's text. Keep titles self-contained ("Nour Adel mentioned you on MH-728").
- Put no interactive elements inside; they would be nested in a button or link.
- Pass `dateTime` so the `<time>` element carries a machine-readable value.
- Give the surrounding list a name (for example through the `SheetTitle`).

## RTL & i18n

- Layout is logical: the avatar sits on the inline start, the time and dot on the inline end; text is `text-start`.
- The `time` uses `tabular-nums`. Pass Latin numerals or localised ones consistently with the rest of the UI.
- Identifiers (issue keys, repo names) inside Arabic titles: wrap in `<bdi>` or use `dir="ltr"` spans.
- Built-in string: `unreadLabel` defaults to `"Unread"`, or `"غير مقروء"` when the provider locale starts with `ar`.

## Styling & tokens

- Hover `bg-nq-hover`; unread dot `bg-nq-accent`; icon tile `bg-secondary` with `border-border`; focus `--nq-focus`.
- State attribute: `data-unread` on the button when unread.
- Target with `[data-slot=notification-item]` and `[data-unread]`.
- Separate rows with `divide-y divide-border` on the parent. Extend with `className`; never use raw hex.

## Do / Don't

- **Do** pass pre-formatted, localised `time` and `unreadLabel`.
- **Do** keep title to one line of meaning and the description short (it clamps at two lines).
- **Do** use the accent dot for unread only, as it is the "attention" colour.
- **Don't** use the accent dot or unread colour for status; use `Status` or `Badge`.
- **Don't** put buttons or links inside a row.
- **Don't** wrap each row in a card.

## Related

- [Avatar](../avatar/README.md) · [Badge](../badge/README.md) · [Table](../table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-feedback-notification-item--docs

The item has no story of its own; it is demoed by `NotificationsSheet` in `apps/lab/stories/_notifications.tsx`,
used by the Patterns/App Shell story.
