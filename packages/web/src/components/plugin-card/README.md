---
name: plugin-card
title: Plugin Card
category: integrations
status: beta
summary: A plugin in a catalogue or admin grid. Icon, name, version, kind, enabled state and last activity, a description, a headline count with a sparkline, and Page and Details actions; selectable as a checkbox card for bulk actions.
exports: [PluginCardLabels, PluginCardItem, PluginCardProps, PluginCard, PluginCardGrid]
related: [marketplace, integration-connector, engine-card, source-badge, checkbox, chart]
story: components-integrations-plugin-card
base-ui: [checkbox]
keywords: [plugin, extension, add-on, capability, source, connector, card, grid, select, bulk, sparkline, activity, admin]
---

# Plugin Card

One installed plugin, as a card: its icon on its own colour, name and version, what kind of plugin it is, whether it is
enabled and when it last did something. Below that a short description, a headline count (records, tokens,
invocations) with a sparkline of recent activity, and links to the plugin's page and its details.

With `selectable` it is a checkbox card: the checkbox, a click anywhere on the card, or a long press on touch selects
it, so an admin can enable, disable or remove many plugins at once.

## When to use

- The plugins page of an admin console; a grid of connected sources or AI providers; any list of add-ons with live
  activity.

## When not to use

- A store where people browse and install: use `Marketplace`.
- One integration's connect / disconnect flow: use `IntegrationConnector`.
- An engine's health in depth: use `EngineCard`.

## Import

```tsx
import { PluginCard, PluginCardGrid } from "@fadymondy/nasaq";
```

## Quick start

```tsx
<PluginCardGrid>
  {plugins.map((p) => (
    <PluginCard
      key={p.id}
      plugin={p}
      selectable
      selected={selected.includes(p.id)}
      onSelectedChange={(next) => setSelected((s) => toggleSelected(s, p.id, next))}
      detailHref={`/admin/plugins/${p.slug}`}
      pageHref={p.route}
    />
  ))}
</PluginCardGrid>
```

## Anatomy

- `data-slot="plugin-card"` (`data-selected`, `data-activity`): an `article` named by its heading.
- Top: checkbox (selectable), `plugin-card-icon` tile, name, version, `plugin-card-activity` badge, kind and
  enabled badges, your `badges`.
- Description, two lines at most.
- `plugin-card-metric`: count label, compact count, sparkline.
- Footer: slug, your `actions`, Page, Details.

## API

### `PluginCardItem`

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `name` | `string` | |
| `description`, `version`, `slug` | `string` | `slug` defaults to `id`. |
| `kind` | `string` | `source`, `capability`, `ai_provider`, `pipeline`, `enrichment`, `copilot`, `tool`, `skill`, `agent`, `mcp`, `memory`, `persona`, `core`, `system` are translated; others are spelled out. |
| `icon` | `ReactNode \| string` | A string goes through `IconByName` (names, `bx-` names, image URLs). Default a puzzle piece. |
| `hue` | `TagHue` | The icon tile and sparkline colour. Default `"gray"`. |
| `enabled` | `boolean` | Shows Enabled or Disabled; leave it out to show neither. |
| `lastActiveAt` | `number \| string \| Date \| null` | Green within the hour, amber within the day, grey after that or never. |
| `count`, `countLabel` | `number`, `string` | The headline figure, shown compact (12.4K) with the full number in the title. |
| `series` | `number[]` | Recent activity, oldest first. |

### `<PluginCard>`

| Prop | Type | Notes |
| --- | --- | --- |
| `plugin` | `PluginCardItem` | |
| `selectable`, `selected`, `onSelectedChange` | | A checkbox card. Clicks on links and buttons inside do not toggle it. |
| `detailHref` / `onOpen` | | Details as a link or a button. |
| `pageHref` / `onOpenPage` | | The plugin's own page. |
| `badges`, `actions` | `ReactNode` | More badges; more footer actions. |
| `headingAs` | `ElementType` | Default `h3`. |
| `now` | `number` | Fixes "now" for the activity colour (tests, stories). |
| `labels` | `Partial<PluginCardLabels>` | Strings; `kinds` merges with the built-in kind names. |

`PluginCardGrid` is a responsive grid (`minmax(18rem, 1fr)` columns).

### Helpers

Exported from `plugin-card-logic.ts`, all pure: `pluginActivity(lastActiveAt, now?, { liveMinutes, recentHours })`
gives `"live" | "recent" | "idle" | "never"`; `humanizeKind(kind)`; `toggleSelected(selected, id, next)` keeps the
order ids were picked in; `selectionState(selected, ids)` gives `"all" | "some" | "none"` for a select-all checkbox.

## Examples

**Bulk actions.** Keep the selected ids in state, show a bar with the count when any are selected, and a select-all
`Checkbox` with `checked={state === "all"}` and `indeterminate={state === "some"}`.

## Accessibility

- Each card is an `article` named by the plugin's name. The checkbox has its own name ("Select Postgres").
- Activity is a word ("5 minutes ago", "No activity") with a hidden "Last active:" prefix, not only a coloured dot.
- Page and Details are real links or buttons named with the plugin ("Open Postgres details").
- The sparkline is an image with a label; the count's full value is in its title.

## RTL & i18n

English and Arabic strings and kind names are built in. Versions, slugs and the count stay left to right; names and
descriptions follow their own direction. The sparkline runs right to left in Arabic.

## Styling & tokens

`bg-card`, `border-border`, `rounded-card`; a selected card uses `border-primary` and `bg-nq-selected`. The icon tile
and sparkline use the `--nq-tag-*` hue tokens.

## Do / Don't

- Do pass `series` with the same number of buckets for every plugin so the sparklines compare.
- Don't use the plugin's hue for its status: enabled and activity have their own badges.

## Related

`marketplace`, `integration-connector`, `engine-card`, `source-badge`, `checkbox`, `chart`.

## Lab

Integrations › Plugin Card: Default, Selectable, States, Arabic.
