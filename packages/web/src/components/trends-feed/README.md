---
name: trends-feed
title: TrendsFeed
category: analytics
status: beta
summary: A feed of trending news topics with state tabs, day groups, score and reasons, outlets and expandable articles, plus a sources catalogue in three tiers that falls back to the next tier when one has nothing working.
exports: [TrendsFeedLabels, TrendOutlet, TrendItem, TrendTopic, TrendsFeedProps, TrendsFeed, TrendSource, SourcesCatalogueProps, SourcesCatalogue]
related: [entity-list, tabs, collapsible, report-filter-bar, context-menu]
story: pages-analytics-trends
base-ui: [tabs, collapsible, switch, context-menu]
keywords: [trends, topics, news, sources, tier, fallback, editorial, feed, review, dismiss, save]
---

# TrendsFeed

Two pieces for an editorial "what is trending" tool:

- `TrendsFeed` lists the topics found in the news. Tabs split them into New, Saved, Reviewed and Dismissed, each with a count. Topics are grouped by the day they were detected, highest score first.
- `SourcesCatalogue` lists where the topics come from, in three tiers, and shows which tier is feeding the trends right now.

## When to use

- Curating machine found topics: save the good ones, mark the rest reviewed, dismiss the noise.
- Showing the health of the feeds behind an automated pipeline.

## When not to use

- A general activity list: use [`EntityList`](../entity-list/README.md).
- Numbers over time: use [`TimeSeriesPanel`](../time-series-panel/README.md).

## Import

```tsx
import { TrendsFeed, SourcesCatalogue } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { TrendsFeed, type TrendTopic } from "@fadymondy/nasaq/web";
import { useState } from "react";

const next = { save: "saved", review: "reviewed", dismiss: "dismissed", restore: "new" } as const;

export function Trends({ initial }: { initial: TrendTopic[] }) {
  const [topics, setTopics] = useState(initial);
  return (
    <TrendsFeed
      topics={topics}
      timeZone="Asia/Riyadh"
      onAction={async (topic, action) => {
        await api.setTopicState(topic.id, next[action]);
        setTopics((all) => all.map((t) => (t.id === topic.id ? { ...t, state: next[action] } : t)));
      }}
    />
  );
}
```

## Anatomy

```
TrendsFeed            data-slot="trends-feed"
├─ Tabs               New / Saved / Reviewed / Dismissed, each with a count
└─ day group          "Today", "Yesterday" or the date
   └─ topic card      title, summary, Hot and score, reasons, outlets, articles (collapsible), actions
SourcesCatalogue      data-slot="sources-catalogue"
├─ tier notice        fallback or "nothing working" (a status message)
└─ tier               heading, Active badge, list of sources: switch, name, last fetched, health, "..." menu
```

## API

### TrendsFeed

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `topics` | `TrendTopic[]` | required | `{ id, title, summary?, score (0-100), reasons?, outlets, items, detectedAt, state }`. |
| `state` `defaultState` `onStateChange` | `TrendState` | `"new"` | The selected tab. |
| `onAction` | `(topic, "save" \| "review" \| "dismiss" \| "restore") => void \| Promise<void>` | none | Without it the topics are read only. Buttons wait for the promise; a rejection shows an error on the topic. Update `topics` when it resolves. |
| `extraActions` | `(topic) => ContextMenuAction[]` | none | More menu items, for example "Open in editor". |
| `timeZone` | `string` | browser | Zone for the day groups. |
| `now` | `Date` | current time | For Today, Yesterday and relative times. |
| `hotAt` | `number` | `80` | Scores from here get the Hot badge. |
| `loading` `error` `onRetry` | | | States. |
| `labels` | `Partial<TrendsFeedLabels>` | en / ar | Text overrides. |

Which actions a topic offers depends on its state: New offers save, review and dismiss; Saved and Reviewed can be moved on or restored; Dismissed can only be restored.

### SourcesCatalogue

| Prop | Type | Description |
| --- | --- | --- |
| `sources` | `{ id, name, url?, tier: 1 \| 2 \| 3, enabled, health: "ok" \| "degraded" \| "down", lastFetchedAt?, perDay? }[]` | The sources. |
| `onEnabledChange` | `(source, enabled) => void \| Promise<void>` | The switch. Async: it waits, and a rejection shows an error. |
| `onRetry` | `(source) => void \| Promise<void>` | "Retry now", offered for enabled sources that are slow or down. |
| `now` | `Date` | For "last fetched". |

**Tier fallback.** Tier 1 feeds the trends while it has a source that is switched on and not down (slow still counts). When none is, tier 2 takes over, then tier 3; the catalogue marks the active tier and says which tiers were skipped. If nothing works anywhere it says so. `resolveActiveTier(sources)` gives the same answer as data.

### Helpers

`resolveActiveTier`, `isSourceUsable`, `trendActionsFor`, `trendStateAfter`, `countTrendsByState`, `groupTrendTopicsByDay`. All pure.

## Examples

Reading the active tier for your own logic:

```tsx
import { resolveActiveTier } from "@fadymondy/nasaq/web";

const { tier, fellBack } = resolveActiveTier([
  { tier: 1, enabled: true, health: "down" },
  { tier: 2, enabled: true, health: "ok" },
]);
// tier === 2, fellBack === true
```

## Accessibility

The states are a labelled tab list; the list inside is the tab panel. Each topic is a list item with a heading. Hot and health are words with icons, never colour alone. The articles open with a disclosure button that says how many there are. Every topic and source has its menu on context-click, long press, Shift+F10, the Menu key and a "..." button. Failures are announced with `role="alert"`, and the tier notice is a status message.

## RTL & i18n

Layout, the article link arrow and the tab order follow the reading direction. English and Arabic text ship built in; override with `labels`. Titles, summaries and reasons come from you, in the reader's language. Dates and numbers use Western digits.

## Styling & tokens

Uses Card, Badge, Button, Tabs, Switch and status tokens (`--nq-success`, `--nq-warning`, `--nq-danger`). Target `[data-slot="trends-feed"]` and `[data-slot="sources-catalogue"]`; extend with `className`.

## Do / Don't

- Do pass `timeZone`, so "Today" means the reader's day.
- Do keep `reasons` short and factual; they are why a topic scored.
- Do put fallback tiers behind primary ones, not beside them.
- Don't update `topics` before the server accepted the action.
- Don't hide a dismissed topic for good; the Dismissed tab is the way back.

## Related

- [`EntityList`](../entity-list/README.md)
- [`Tabs`](../tabs/README.md)
- [`Collapsible`](../collapsible/README.md)
- [`ContextMenu`](../context-menu/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/pages-analytics-trends--docs
