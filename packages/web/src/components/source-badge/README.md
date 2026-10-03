---
name: source-badge
title: SourceBadge
category: data-display
status: beta
summary: Where a record came from (a plugin, an integration, a feed) as a small icon-and-name chip, with an icon-only compact form, a brand-coloured icon and an optional external link.
exports: [SourceBadge, SourceBadgeProps, SourceBadgeSize]
related: [badge, status, avatar]
story: components-data-display-source-badge
base-ui: []
keywords: [source, origin, integration, plugin, provider, feed, connector, chip, badge, imported]
---

# SourceBadge

A chip that says where something came from: "GitHub", "Google Drive", "RSS". The icon can carry the
source's brand colour; the label stays in text colour.

## When to use

- Rows, search results and cards that mix records from several sources.
- Imported items, so people know which system owns them.

## When not to use

- A state ("Paid", "Failed"): use [`Badge`](../badge/README.md) or [`Status`](../status/README.md).
- A person: use [`Avatar`](../avatar/README.md).

## Import

```tsx
import { SourceBadge } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { SourceBadge } from "@fadymondy/nasaq/web";
import { Database, Rss } from "lucide-react";

export function Sources() {
  return (
    <div className="flex gap-2">
      <SourceBadge label="Postgres" icon={Database} />
      <SourceBadge label="Blog feed" icon={Rss} color="var(--nq-accent-brand)" />
      <SourceBadge compact label="Postgres" icon={Database} />
    </div>
  );
}
```

## Anatomy

```
SourceBadge                     data-slot="source-badge"  (span, or a when href is set)
├─ icon                         data-slot="source-badge-icon", coloured by `color`
└─ label                        hidden when compact
```

## API

**SourceBadge**: every `span` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | required | The source's name, already localised. In compact mode it is the accessible name and tooltip. |
| `icon` | `LucideIcon \| ReactNode` | | A lucide icon, or any node (an `<svg>` mark, an `<img>`). |
| `color` | `string` | | Colour of the icon only. |
| `compact` | `boolean` | `false` | Icon only. |
| `size` | `"sm" \| "md"` | `"sm"` | |
| `href` | `string` | | Opens the source in a new tab. |

## Accessibility

- Compact badges are `role="img"` with the label as `aria-label` and `title`.
- With `href`, it is a real link with a focus ring and `rel="noopener noreferrer"`.
- The icon is decorative; the label carries the meaning, so colour is never the only cue.

## RTL & i18n

- Icon at the inline start; the chip mirrors with the layout. Pass a localised `label`.

## Styling & tokens

- `bg-secondary`, `border-border`, `rounded-control`, `text-caption` / `text-label`. Target `[data-slot="source-badge"]`.

## Do / Don't

- Do keep the label short: the product name, not "Imported from…".
- Don't colour the label; brand colours rarely have enough contrast as text.

## Related

- [`Badge`](../badge/README.md)
- [`Status`](../status/README.md)
- [`Avatar`](../avatar/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-source-badge--docs
