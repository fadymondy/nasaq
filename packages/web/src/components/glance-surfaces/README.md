---
name: glance-surfaces
title: GlanceSurfaces
category: platforms
status: beta
summary: Glanceable surfaces, a tray or menu-bar popover, watch rows, home and lock-screen widget tiles and a widget gallery with a size picker.
exports: [GlanceLabels, GlanceTone, GlanceRowProps, GlanceRow, TrayPopoverAction, TrayPopoverProps, TrayPopover, WatchGlanceProps, WatchGlance, WidgetSize, WidgetTileProps, WidgetTile, WidgetDefinition, WidgetGalleryProps, WidgetGallery]
related: [extension-popup, progress, badge, popover]
story: components-apps-platforms-glance-surfaces
base-ui: []
keywords: [glance, widget, tray, menu bar, popover, watch, lock screen, home screen, tile, gallery]
---

# GlanceSurfaces

Information you read in a second. `GlanceRow` is one icon, label, value line shared by every surface.
`TrayPopover` is a menu-bar popover with a caret and actions. `WatchGlance` is a round or square watch face of
rows. `WidgetTile` is a home or lock-screen tile in five sizes, and `WidgetGallery` lets people pick a size and add
or remove a widget.

## When to use

- A tray app, a status bar popover or a companion watch view.
- A widget picker for a customisable home screen.

## When not to use

- A browser extension popup: use [ExtensionPopup](../extension-popup/README.md).
- A full dashboard: use the dashboard board.

## Import

```tsx
import { GlanceRow, TrayPopover, WidgetGallery, WidgetTile } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ClockIcon } from "lucide-react";
import { GlanceRow, TrayPopover } from "@fadymondy/nasaq/web";

export function Tray() {
  return (
    <TrayPopover title="Today">
      <GlanceRow icon={ClockIcon} label="Timer running" value="00:42" tone="info" />
    </TrayPopover>
  );
}
```

## Anatomy

```
TrayPopover        data-slot="tray-popover"   caret, header, rows, actions with shortcuts
WatchGlance        data-slot="watch-glance"   round or square frame, rows
WidgetTile         data-slot="widget-tile"    size, surface, ring or bar progress
WidgetGallery      data-slot="widget-gallery" preview, size picker, add or remove
GlanceRow          icon, label, value, detail
```

## API

### `WidgetTile`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `size?` | `"circular" \| "inline" \| "small" \| "medium" \| "large"` | `"small"` | Tile size. |
| `surface?` | `"home" \| "lock"` | `"home"` | Lock tiles are translucent. |
| `title`, `icon`, `value`, `caption` | mixed | none | Content. |
| `progress?` | `number` | none | 0 to 100, a ring for circular, else a bar. |
| `tone?` | `GlanceTone` | `"neutral"` | Accent. |
| `onOpen?` | `() => void` | none | Makes the tile a button. |

### `TrayPopover`

`title`, `subtitle`, `headerEnd`, `caret` (`"start" | "end"`), `actions` (label, icon, shortcut, onSelect).

### `WatchGlance`

`title`, `headerEnd`, `shape` (`"round" | "square"`), children.

### `WidgetGallery`

`widgets` (`WidgetDefinition`: id, title, sizes, render), `added`, `onAdd`, `onRemove`, `labels`.

## Examples

The lab has Default, Arabic, Mobile plus Gallery and GalleryArabic stories.

## Accessibility

Tiles with `onOpen` are buttons. The size picker is a radio-style group. Progress carries a text value.

## RTL & i18n

The tray caret and progress ring mirror in RTL. Numbers keep their direction. Strings via `useOptionalNasaq()`.

## Styling & tokens

Only `--nq-*` tokens; tones map to the status colours.

## Do / Don't

- Do keep a tile to one number and one caption.
- Don't nest interactive controls inside a tile that has `onOpen`.

## Related

[ExtensionPopup](../extension-popup/README.md), [`Progress`](../progress/README.md).

## Lab

`Components / Layout / Glance Surfaces` in the lab.
