---
name: mobile-nav-kit
title: MobileNavKit
category: navigation
status: beta
summary: Mobile navigation, a bottom tab bar with badges, swipe-action list rows that also open a context menu, and a horizontally scrolling filter strip.
exports: [MobileNavLabels, BottomTabBarItem, BottomTabBarProps, BottomTabBar, FilterStripItem, FilterStripSingleProps, FilterStripMultiProps, FilterStripProps, FilterStrip, SwipeAction, SwipeActionRowProps, SwipeActionRow]
related: [context-menu, tabs, badge, chip]
story: pages-app-mobile-nav-kit
base-ui: [context-menu]
keywords: [mobile, tab bar, bottom navigation, swipe, swipe actions, filter, chips, scroll, list row]
---

# MobileNavKit

Three touch-first pieces. `BottomTabBar` is the thumb-reach navigation with badges. `SwipeActionRow` reveals actions
when a row is dragged toward either inline edge. `FilterStrip` is a row of chips that scrolls sideways and keeps the
active chip in view.

## When to use

- Phone layouts with three to five top-level destinations.
- Lists where each row has quick actions (archive, delete, star).

## When not to use

- Desktop navigation: use the sidebar or tabs.
- Actions that must be discoverable without a gesture: also show a button. Swipe rows already offer the same actions
  through a context-click menu.

## Import

```tsx
import { BottomTabBar, FilterStrip, SwipeActionRow } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ArchiveIcon } from "lucide-react";
import { SwipeActionRow } from "@fadymondy/nasaq/web";

export function Row() {
  return (
    <SwipeActionRow endActions={[{ id: "archive", label: "Archive", icon: ArchiveIcon, tone: "info", onSelect: () => {} }]}>
      <div className="p-4">Design review moved to 3 PM</div>
    </SwipeActionRow>
  );
}
```

## Anatomy

```
BottomTabBar        nav data-slot="bottom-tab-bar"   items with icon, label, badge
FilterStrip         data-slot="filter-strip"         aria-pressed chips, edge fade mask
SwipeActionRow      data-slot="swipe-action-row"     start and end action panels, sliding content
```

## API

### `BottomTabBar`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `BottomTabBarItem[]` | required | value, label, icon, badge, href. |
| `value` / `onValueChange` | `string` / `(value) => void` | required | Active tab. |
| `position?` | `"sticky" \| "fixed" \| "static"` | `"sticky"` | Placement. |

### `FilterStrip`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `FilterStripItem[]` | required | value, label, icon, count. |
| `multiple?` | `boolean` | `false` | Single or multi select. |
| `value` / `onValueChange` | string or string[] | required | Selection. |

### `SwipeActionRow`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `startActions?` / `endActions?` | `SwipeAction[]` | `[]` | id, label, icon, tone, onSelect. |
| `contextMenu?` | `boolean` | `true` | Also offer the actions on context-click. |
| `disabled?` | `boolean` | `false` | Turns the gesture off. |
| `onOpenChange?` | `(state) => void` | none | Fires when a panel opens or closes. |

The pure gesture maths (`clampSwipe`, `settleSwipe`, `nextTabIndex`) is in `mobile-nav-math.ts` with node tests.

## Examples

The lab page combines all three over an inbox list.

## Accessibility

Tabs use arrow keys, Home and End. Chips are `aria-pressed` buttons. Swipe actions are reachable from the
context-click menu, so keyboard and mouse users are not left out. The gesture handles touch and pen only.

## RTL & i18n

Swipe offsets are inline: "start" reveals from the inline start edge in either direction, and the pointer delta is
flipped in RTL. The filter strip scrolls with RTL-aware maths. Strings via `useOptionalNasaq()`.

## Styling & tokens

Only `--nq-*` tokens. Action tones use the status colours.

## Do / Don't

- Do limit swipe actions to two per side.
- Don't use a destructive action as the only way to do something.

## Related

[`ContextMenu`](../context-menu/README.md), [`Tabs`](../tabs/README.md), [`Badge`](../badge/README.md).

## Lab

`Pages / App / Mobile Nav Kit` in the lab: Default, Arabic, Mobile.
