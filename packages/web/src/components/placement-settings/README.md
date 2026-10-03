---
name: placement-settings
title: Placement Settings
category: integrations
status: beta
summary: Where a plugin or module appears in the app shell. Sidebar, header, side panel, floating widget or hidden, as radio cards with a small picture of the shell; its order; and whether the app opens on it. Keeps a draft, shows what is unsaved and saves only what changed.
exports: [PlacementSettingsLabels, PlacementSettingsProps, PlacementSettings]
related: [plugin-card, detail-layout, radio-group, settings-sections, app-shell]
story: components-integrations-placement-settings
base-ui: [radio, radio-group, switch]
keywords: [appearance, placement, plugin, module, sidebar, header, side panel, sideover, widget, hidden, nav order, landing page, start page, settings]
---

# Placement Settings

The "Appearance" tab of a plugin or module. Each place it could show up is a card with a small picture of the app
shell and that place filled in: a link in the sidebar, a button in the top bar, a panel sliding in from the edge, a
widget floating on every page, or nowhere. Under that, its order among its neighbours and, if allowed, a switch to
open the app on it.

Changes stay in a draft until **Save changes**; the footer says whether anything is unsaved, **Discard** goes back to
the saved value, and only the fields that changed are passed to `onSave`.

## When to use

- A plugin's or module's detail page, next to its other settings (for example as a `DetailLayout` tab).
- Any admin screen that decides where an item sits in the navigation.

## When not to use

- Reordering many items at once: use a sortable list.
- The look of the app (themes, text size): use `ThemeGallery` and `ReadingSettings` from `appearance-pickers`.

## Import

```tsx
import { PlacementSettings } from "@fadymondy/nasaq";
```

## Quick start

```tsx
<PlacementSettings
  value={{ mode: plugin.appearance_mode, order: plugin.nav_order, defaultPage: plugin.is_default_page }}
  allowOverlays={plugin.type === "capability"}
  allowDefaultPage={plugin.type === "capability"}
  onSave={(changes) => update.mutateAsync(changes)}
  error={update.isError && update.error.message}
/>
```

## Anatomy

- `data-slot="placement-settings"` (`data-dirty` while there are unsaved changes): a `section` named by its heading.
- Header: title and description (`title={null}` hides it).
- Placement: a `fieldset` of `RadioCard`s (`data-mode`), each with a `placement-diagram`.
- Order input and, with `allowDefaultPage`, `placement-default-page`.
- An error `Alert` when the last save failed.
- Footer: `placement-state` ("Unsaved changes" / "All changes saved"), **Discard**, **Save changes**.

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `PlacementValue` | `{ mode, order, defaultPage? }`, the saved value. The draft starts over when it changes. |
| `onSave` | `(changes) => void \| Promise` | Only the changed fields. A returned promise shows saving until it settles. |
| `saving` | `boolean` | Saving from outside. |
| `error` | `boolean \| ReactNode` | The last save failed; a node is shown as the reason. |
| `allowOverlays` | `boolean` | Enables the side panel and floating widget. Default `false`: they show, disabled, with why. |
| `allowDefaultPage` | `boolean` | Shows "Open on start". It is off and disabled for modes without a page. |
| `modes` | `PlacementMode[]` | Which modes to offer, in order. Default all five. |
| `title`, `description` | `ReactNode` | Replace the heading and text; `null` hides them. |
| `headingAs` | `ElementType` | Default `h2`. |
| `labels` | `Partial<PlacementSettingsLabels>` | `modes` and `modeHints` merge with the built-in ones. |

Modes: `sidebar`, `header`, `sideover`, `fixed`, `hidden`.

### Helpers

From `placement-settings-logic.ts`, pure: `PLACEMENT_MODES`, `OVERLAY_MODES`, `canBeDefaultPage(mode)`,
`isModeAvailable(mode, allowOverlays)`, `parseOrder(text)` (a whole number ≥ 0 or `null`), `withMode(value, mode)`
(switches the start page off when the mode has no page) and `placementChanges(saved, draft, allowDefaultPage?)`.
Types `PlacementMode`, `PlacementValue`.

## Accessibility

- The modes are a radio group named "Placement"; arrow keys move between them. Unavailable modes stay in the list,
  disabled, and say why in their own text, not only in a tooltip.
- The diagrams are decorative; each card's title and description say where the item goes.
- The order input explains itself and switches to an error message, with `aria-invalid`, while it is not a whole
  number. Save stays disabled until it is.
- The save state is a live `status`; a failed save is an `alert`.

## RTL & i18n

English and Arabic strings are built in. The diagrams use logical sides, so the sidebar and panels move to the right
in Arabic. The order stays left to right.

## Styling & tokens

`bg-card`, `border-border`, `rounded-card`. The picked card uses `border-primary` and `bg-nq-selected`; the filled
place in a diagram is `bg-primary`. The unsaved dot uses `--nq-tag-amber`.

## Do / Don't

- Do pass the server's value back after saving, so the draft resets and the footer says "All changes saved".
- Do keep unavailable modes visible so people learn they exist.
- Don't save on every click; this is a draft with a Save button.

## Related

`plugin-card`, `detail-layout`, `radio-group`, `settings-sections`, `app-shell`.

## Lab

Integrations › Placement Settings: Default, Capability, Saving and errors, Arabic.
