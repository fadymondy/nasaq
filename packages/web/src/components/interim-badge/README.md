---
name: interim-badge
title: InterimBadge
category: data-display
status: beta
summary: "Marks content that is partial and still arriving: a streamed answer, a total before every source has reported, a draft figure. An outlined badge with a spinner and a word."
exports: [InterimBadge, InterimBadgeProps]
related: [badge, spinner, states, stat-card]
story: components-data-display-interim-badge
base-ui: []
keywords: [interim, partial, pending, streaming, provisional, draft, preliminary, live, updating]
---

# InterimBadge

A small outlined badge that says a value is not final yet. It pairs a spinner with a word ("Interim" /
"مبدئي"), so the state never depends on motion alone. Stop the spinner with `pending={false}` when nothing more
is coming but the figure is still provisional.

## When to use

- A number or answer shown before all of its data has arrived (streamed AI output, partial aggregates).
- A figure that may still change: preliminary results, an unaudited month.

## When not to use

- A region that has nothing to show yet: use `LoadingState`.
- A status that is final (draft, archived): use `Badge` with a variant.

## Import

```tsx
import { InterimBadge } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<h3 className="flex items-center gap-2">
  Revenue this month <InterimBadge />
</h3>
```

## Anatomy

```
InterimBadge     data-slot="interim-badge" data-pending   (a Badge, variant="outline")
├─ Spinner       aria-hidden, only while pending
└─ label
```

## API

`InterimBadgeProps extends Omit<ComponentProps<"span">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `ReactNode` | `"Interim"` / `"مبدئي"` by provider locale | The word shown. |
| `pending?` | `boolean` | `true` | Shows the spinner. Turn it off when no more data is coming. |
| `className?` | `string` | none | Merged onto the badge. |

## Accessibility

- The label is real text, so the state is read with the value next to it. The spinner is decorative.
- If the value updates while someone reads it, announce the final value from a `role="status"` region; the badge
  itself is not a live region.

## RTL & i18n

The default label follows the Nasaq locale. The spinner and gap sit on the inline-start side in both directions.

## Styling & tokens

An outline badge with a `--nq-brand` tinted border. Extend with `className`.

## Do / Don't

- Do remove the badge once the value is final.
- Don't put it on every row of a table; mark the column header or the total instead.

## Related

- [Badge](../badge/README.md)
- [Spinner](../spinner/README.md)
- [States](../states/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-interim-badge--docs
