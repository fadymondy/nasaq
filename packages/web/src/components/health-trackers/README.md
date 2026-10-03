---
name: health-trackers
title: CupTracker
category: wellness
status: beta
summary: Daily health trackers. A unit-count cup row, pinned quick-log strip, classified food catalogue, item builder with an entry-completeness ring and a flagged entries disclosure.
exports: [CupTracker, QuickLogStrip, FoodCatalogue, FoodItemBuilder, FlaggedEntries, CupTrackerProps, QuickLogStripProps, FoodCatalogueProps, FoodItemBuilderProps, FlaggedEntriesProps, HealthTrackersLabels, HealthTrackerResult, QuickLogItem, QuickLogResult, FoodCatalogueItem, FoodFamily, FlaggedEntry]
related: [entity-list, timer-ring, text-utilities, empty-state]
story: components-wellness-health-trackers
base-ui: [collapsible, alert-dialog]
keywords: [health, hydration, water, cups, quick log, catalogue, food, trigger, safe, flagged]
---

# Health trackers

Five parts for logging and classifying what a person consumes. They show what the server decided and never work out
health rules themselves: the number of cups, whether an entry is flagged and whether a log is refused all come from
your callbacks.

## When to use

- A day of countable units (cups of water): `CupTracker`.
- The few items logged every day: `QuickLogStrip`.
- Managing the catalogue with verdicts, families and notes: `FoodCatalogue` and `FoodItemBuilder`.
- Explaining flagged entries for the day: `FlaggedEntries`.

## When not to use

- Timers, streaks and focus state already exist elsewhere: use the pomodoro, focus-status, countdown and gamification parts.

## Import

```tsx
import { CupTracker, QuickLogStrip, FoodCatalogue, FoodItemBuilder, FlaggedEntries } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { CupTracker } from "@fadymondy/nasaq/web";

export function Water({ filled, total }: { filled: number; total: number }) {
  return <CupTracker filled={filled} total={total} unitLabel="250 ml" onLog={async () => { await api.logCup(); }} />;
}
```

## API

| Component | Prop | Description |
| --- | --- | --- |
| `CupTracker` | `filled`, `total`, `onLog`, `disabled`, `waitLabel`, `unitLabel` | Only the next cup is a button. One intent, "log one". Counts are clamped to 60. |
| `QuickLogStrip` | `items`, `onLog(item, { override })`, `onUnpin`, `catalogueHref`, `loading`, `title` | `onLog` resolves `{ flagged, message }` (a warning, it was recorded) or `{ error, canOverride }` (refused, offers "Log anyway"). |
| `FoodCatalogue` | `items`, `families`, `onPin`, `onEdit`, `onDelete`, `onAdd`, plus `EntityList` options | Table or cards, search, verdict, type and family filters. Delete asks first. Row actions also open from the context menu. |
| `FoodItemBuilder` | `initial`, `families`, `onSave`, `onCancel`, `editing` | The ring measures how complete the entry is, not the food. No calorie or portion fields. |
| `FlaggedEntries` | `count`, `entries`, `onLoad`, `defaultOpen` | `onLoad` runs the first time it opens, and again on retry. |

Every callback that can fail resolves `{ error?: string }`. Every part takes `labels` (`HealthTrackersLabels`).
Pure helpers: `cupState`, `cupCounts`, `verdictCounts`, `verdictTone`, `foodDraftCompleteness`, `foodDraftValid`.

## Accessibility

- The cup row has one name ("7 of 20 cups logged today") and each state has a shape, not only a colour.
- Verdicts always show an icon and a word. Unreviewed is neutral and never looks safe.
- Results and errors are announced through polite status regions.

## RTL & i18n

Items carry `name` and `nameAr`, and the Arabic name shows when the app is Arabic. Strings are en and ar.

## Styling & tokens

`--nq-success`, `--nq-danger`, `--nq-line-strong` and the primary token. Extend with `className`.

## Do / Don't

- Do let the server decide flags and refusals.
- Do not style an unreviewed item as safe.
- Do not add health scoring to the builder ring.

## Related

- [EntityList](../entity-list/README.md)
- [TimerRing](../timer-ring/README.md)
- [Text utilities](../text-utilities/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-wellness-health-trackers--docs
