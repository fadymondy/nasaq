---
name: timeline
title: Timeline
category: data-display
status: beta
summary: Vertical list of events with a rail on the inline-start side, an icon or avatar marker, title, description and relative time.
exports: [Timeline, TimelineItem, TimelineProps, TimelineItemProps]
related: [notification-item, avatar, stepper, numeric]
story: components-data-display-timeline
base-ui: []
keywords: [timeline, activity, feed, history, audit, events, log]
---

# Timeline

A vertical history of things that happened: an activity feed, an order's tracking, an audit trail. Each item has a marker (an icon or the actor's avatar) on a rail, a title, an optional description and a relative time.

## When to use

- A chronological list where the order and the "when" matter.
- Activity on a record (issue, invoice, order).

## When not to use

- Rows the user acts on (open, mark read): use [`NotificationItem`](../notification-item/README.md).
- A sequence the user moves through: use [`Stepper`](../stepper/README.md).
- Tabular history with many columns: use [`Table`](../table/README.md).

## Import

```tsx
import { Timeline, TimelineItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Timeline, TimelineItem } from "@fadymondy/nasaq/web";
import { GitPullRequest } from "lucide-react";

export function Activity() {
  return (
    <Timeline>
      <TimelineItem actor={{ name: "Sara Alharbi" }} title="Assigned MH-142 to Khaled" time={new Date(Date.now() - 300_000)} />
      <TimelineItem icon={<GitPullRequest />} title="Pull request #48 opened" description="Post-login redirect" time="2026-09-27T10:00:00Z" />
    </Timeline>
  );
}
```

## Anatomy

```
Timeline                      data-slot="timeline"            <ol>
└─ TimelineItem               data-slot="timeline-item"       <li>
   ├─ marker                  data-slot="timeline-marker"     `icon` tile, else <Avatar> from `actor`, else a dot
   ├─ rail                    data-slot="timeline-rail"       hidden on the last item
   └─ content                 data-slot="timeline-content"
      ├─ title + time         time is <DateTime relative>
      ├─ description
      └─ children
```

## API

### `Timeline`

`TimelineProps extends ComponentProps<"ol">`. No own props.

### `TimelineItem`

`TimelineItemProps extends Omit<ComponentProps<"li">, "title">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | What happened. |
| `description?` | `ReactNode` | none | Detail line. |
| `time?` | `Date \| number \| string` | none | When. Shown relative ("3 hours ago" / "قبل 3 ساعات"); the absolute date is the `title` tooltip and `<time dateTime>` carries ISO. |
| `icon?` | `ReactNode` | none | Marker glyph. Wins over `actor`. |
| `actor?` | `{ name: string; avatar?: string }` | none | Avatar marker. |
| `children?` | `ReactNode` | none | Extra content below the description. |

## Examples

### Arabic feed

```tsx
import { Timeline, TimelineItem } from "@fadymondy/nasaq/web";

export function Feed() {
  return (
    <Timeline>
      <TimelineItem actor={{ name: "سارة الحربي" }} title="أسندت MH-142 إلى خالد" time={new Date(Date.now() - 300_000)} />
      <TimelineItem title="أُنشئ المشروع" time="2026-08-01T09:00:00Z" />
    </Timeline>
  );
}
```

## Accessibility

- It is an ordered list; items are read in DOM order, so put the newest first (or oldest first) consistently.
- The rail and the plain dot are decorative (`aria-hidden`). An icon marker is decorative too, so the title must carry the meaning.
- Times are `<time dateTime>` elements.
- The list is not interactive; there is no keyboard behaviour.

## RTL & i18n

- The rail and markers sit on the inline start: the left in English, the right in Arabic. No physical classes are used.
- Relative times use the provider locale and Latin digits by default (`DateTime`).
- Identifiers in Arabic titles (issue keys) should be wrapped in `<bdi>` or `Ltr`.

## Styling & tokens

- Rail `bg-border`; icon tile `bg-secondary` with `border-border`; text `text-foreground` and `text-muted-foreground`.
- Target `[data-slot=timeline-item]`. Extend with `className`; never use raw hex.

## Do / Don't

- **Do** keep titles to one sentence and let the description carry detail.
- **Do** pass real dates, not pre-formatted strings.
- **Don't** put buttons in a marker or title; use `children` for actions.

## Related

- [NotificationItem](../notification-item/README.md) · [Avatar](../avatar/README.md) · [Stepper](../stepper/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-timeline--docs
