---
name: attention
title: Attention
category: data-display
status: beta
summary: A short, domain-independent list of things the user should act on now (unread conversations, failed deployments, approvals, setup steps), ordered by urgency.
exports: [Attention, AttentionProps, AttentionRow, AttentionRowProps, AttentionItem, AttentionTone]
related: [status, notification-item, button, product-mark]
story: components-data-display-attention
base-ui: []
keywords: [attention, inbox, todo, action items, needs attention, checklist, setup, onboarding, dashboard, overview, alerts]
---

# Attention

Answers one question on an overview page: **what needs me now?** Products supply the items: unread
conversations, deals that need a follow-up, failed deployments, issues waiting for approval, remaining setup
steps. Attention orders them by urgency, trims the list, and presents each as one calm row with an optional
action. It holds no business logic and knows nothing about any product.

## When to use

- At the top of a product's home or overview page, above metrics and activity.
- For a setup checklist on a new workspace (give every item `done`).
- Across products in a hub, marking each row with its `ProductMark`.

## When not to use

- A full notification feed or inbox: use `NotificationItem` rows in a sheet or page.
- Informational activity ("Sara commented"): if the user cannot act on it, it does not belong here.
- A system-wide banner (outage, billing lock): that is page-level, not a list row.
- Filler. With nothing to act on, the section disappears; don't add a placeholder card.

## Import

```tsx
import { Attention, type AttentionItem } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const items: AttentionItem[] = [
  { id: "deploy", tone: "danger", title: "Riyadh Storefront deployment failed", time: "12m", href: "/deploys/91",
    action: { label: "Retry", onClick: retry } },
  { id: "approve", tone: "warning", title: "MH-721 is waiting for your approval", href: "/issues/MH-721" },
  { id: "inbox", tone: "info", icon: MessageSquare, title: "Unread conversations", count: 4, href: "/inbox" },
];

<Attention items={items} viewAllHref="/inbox" />;
```

## Anatomy

```
section [data-slot=attention]
├─ header: h2 title · open count (or checklist progress) · "View all"
├─ ul (line-separated, no card)
│  └─ li [data-slot=attention-item, data-tone, data-done]
│     ├─ tone shape or custom icon
│     ├─ title (link/button stretched over the row) + one-line description
│     ├─ count · <time>
│     ├─ action button (secondary, sm)
│     └─ dismiss × (on hover / focus / touch)
└─ "Show N more" toggle (when no "View all" target)
```

## API

### `Attention`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `items` | `AttentionItem[]` | required | Supplied by the product. |
| `title` | `ReactNode` | "Needs your attention" / "يحتاج انتباهك" | Section heading. |
| `headingLevel` | `2 \| 3 \| 4` | `2` | Match the page outline. |
| `max` | `number` | `5` | Rows before "Show more" or "View all". |
| `sort` | `boolean` | `true` | Danger → warning → info → neutral, stable within a tone. Checklists keep host order. Done rows always last. |
| `viewAllHref` / `onViewAll` | `string` / `() => void` | — | Adds "View all" in the header and replaces the in-place "Show more". |
| `empty` | `ReactNode` | `null` | `null` removes the whole section when there are no items. |
| `loading` | `boolean` | `false` | Placeholder rows, `aria-busy`. |
| `labels` | `Partial<…>` | locale strings | `title`, `showMore(n)`, `showLess`, `viewAll`, `dismiss`, `done`, `progress(done, total)`, `loading`. |

Plus any `<section>` prop.

### `AttentionItem`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable key. |
| `title` | `ReactNode` | A short sentence of what needs doing. |
| `description` | `ReactNode` | One line of context, truncated. |
| `tone` | `"danger" \| "warning" \| "info" \| "neutral"` | Default `neutral`. Each tone has its own shape (CircleX, CircleAlert, CircleDot, Circle). |
| `icon` | `LucideIcon \| ReactElement` | Replaces the tone shape (e.g. `<ProductMark brand="mahaam" size={16} title="" />`). |
| `count` | `number` | How many things the row stands for. |
| `time` / `dateTime` | `ReactNode` / `string` | Pre-formatted relative time and its machine value. |
| `href` / `onSelect` | `string` / `() => void` | Makes the whole row a link or button. |
| `action` | `{ label, href?, onClick? }` | An explicit action at the inline end. Hidden once `done`. |
| `done` | `boolean` | Checklist step state. Set it on every item to switch on checklist mode. |
| `onDismiss` | `() => void` | Shows a dismiss button; the host removes the item. |

### `AttentionRow`

One row, for hosts that build their own list: `item`, `dismissLabel`, `doneLabel`, plus `<li>` props.

## Examples

**Setup checklist.** Every item has `done`, so the header shows "2 of 4 done" with a thin bar, rows keep
host order, and finished steps drop to the end with a check and muted text (no strike-through: it cuts through Arabic dots).

```tsx
<Attention
  title="Finish setting up"
  items={steps.map((s) => ({ ...s, done: completed.has(s.id), action: { label: "Start", href: s.href } }))}
/>
```

**Across products.** Mark each row with its product; urgency still sorts the list.

```tsx
<Attention max={3} items={[{ id: "a", icon: <ProductMark brand="zekra" size={16} title="" />, tone: "danger", title: "Data source sync failed", href: "…" }]} />
```

**Empty.** By default the section renders nothing. Pass `empty` only where absence would confuse:
`<Attention items={[]} empty="Nothing needs your attention right now." />`.

## Accessibility

- A `<section>` labelled by its heading. Rows are a `<ul>`.
- The row is clickable through a stretched title link or button (`::after` overlay), so there is no nested
  interactive content. The action and dismiss buttons are separate tab stops above the overlay.
- Urgency is never colour alone: each tone has its own icon shape. Done rows add a visually hidden "Done".
- Dismiss is hidden until hover, but visible on keyboard focus and always visible on touch (`pointer: coarse`).
- `aria-expanded` on "Show more"; `aria-busy` while loading.

## RTL & i18n

All default strings are English or Arabic by the provider locale; override any with `labels`. Layout uses
logical properties only, so rows mirror in RTL. Counts and times use tabular numerals. Pass times already
formatted for the locale.

## Styling & tokens

No card: a heading on the surface and `border-border` line separators (LAYOUT.md). Rows are `min-h-row`,
hover `bg-nq-hover`, focus ring `nq-focus`. Tone colours: `text-nq-{danger,warning,info}-text`. Progress bar:
`bg-nq-surface-soft` track, `bg-nq-success` fill. `className` merges onto the section.

## Do / Don't

- Do keep it to things the user can act on, phrased as what needs doing.
- Do keep `max` small (3–5); link to the full inbox with `viewAllHref`.
- Don't wrap it in a card or put it in a card grid.
- Don't show an "all clear" box by default; the empty section disappears.
- Don't use it for metrics; that is a KPI card.

## Related

`status` (same tone shapes), `notification-item` (full feeds), `button`, `product-mark`.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-attention--docs
