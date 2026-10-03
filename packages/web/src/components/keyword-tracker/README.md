---
name: keyword-tracker
title: KeywordTracker
category: seo
status: beta
summary: "Rank tracking for a keyword list: position and change arrows, best position, URL, volume, difficulty, SERP features, history chart, top 3 / 10 / 100 buckets, add-keywords dialog and competitor comparison."
exports: [KeywordTrackerProps, KeywordTracker, AddKeywordsDialog, CompetitorComparison, RankChange, RankDistribution, KEYWORD_STRINGS, RANK_BUCKETS, averagePosition, bestPosition, competitorStats, ctrForPosition, difficultyBand, parseKeywordList, rankBucket, rankChange, rankDistribution, topMovers, visibilityShare]
related: [keyword-planner, seo-pages, search-performance-table, time-series-panel, data-table]
story: components-seo-keyword-tracker
base-ui: [dialog, tabs]
keywords: [keywords, rank tracking, serp, position, visibility, competitors, seo, sparkline]
---

# KeywordTracker

KeywordTracker follows where a site ranks for a list of keywords. The table shows the current position with an arrow for the change, the best ever position, the ranking URL (editable in the cell), search volume, difficulty and the SERP features the page owns, with a sparkline of each keyword's history. Above it sit summary tiles, an average-position line chart and the top 3 / 10 / 100 distribution. An Add keywords dialog takes a pasted list plus a location and device, and a Competitors tab compares positions side by side.

## When to use

- A rank tracking screen for a site or client.
- Weekly SEO reports that need movers and the distribution.

## When not to use

- Discovering new keywords and clustering them: use [`KeywordPlanner`](../keyword-planner/README.md).
- Search Console clicks and impressions: use [`SearchPerformanceTable`](../search-performance-table/README.md).

## Import

```tsx
import { KeywordTracker } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { KeywordTracker, type TrackedKeyword } from "@fadymondy/nasaq/web";

export function Ranks({ keywords }: { keywords: TrackedKeyword[] }) {
  return <KeywordTracker keywords={keywords} locations={[{ value: "sa", label: "Saudi Arabia" }]} onAddKeywords={async (input) => { await api.add(input); }} />;
}
```

## Anatomy

```
KeywordTracker            data-slot="keyword-tracker"
  tiles                   tracked, average position, top 10, visibility
  Tabs                    Keywords | Competitors
    RankDistribution      top 3 / top 10 / top 100 / beyond
    history chart         TimeSeriesPanel (average position and top 10 count)
    DataTable             keyword, RankChange, best, URL, volume, difficulty, features, sparkline
  AddKeywordsDialog       keywords, location, device
  CompetitorComparison    one column per keyword, one row per domain
```

## API

### KeywordTracker

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `keywords` | `TrackedKeyword[]` | required | `position` is `null` when the site is not in the top 100. |
| `positionHistory` | `TimeSeriesPoint[]` | none | Points with `date`, `position`, `top10` for the chart. |
| `competitors` | `KeywordCompetitor[]` | none | Turns on the Competitors tab. |
| `locations` | `KeywordLocation[]` | none | Options in the dialog. |
| `defaultLocation` | `string` | first | Preselected location. |
| `onAddKeywords` | `(input: AddKeywordsInput) => Promise<void \| { error?: string }>` | none | Shows the Add keywords button. |
| `onRemoveKeywords` | `(ids: string[]) => Promise<...>` | none | Bulk and row Remove. |
| `onRefresh` | `(ids: string[]) => Promise<...>` | none | Bulk and row Refresh rank. |
| `onUpdateKeyword` | `(id, patch: { url: string }) => Promise<...>` | none | Makes the URL cell editable. |
| `onOpenKeyword` | `(keyword) => void` | none | Row click. |
| `pageSize` | `number` | `8` | Rows per page. |
| `loading / error / onRetry` | | none | States. |
| `className / labels` | | none | Classes; `Partial<KeywordTrackerLabels>` strings. |

### TrackedKeyword

`{ id, keyword, position, previousPosition?, history?, best?, url?, volume, difficulty, features? }`. `features` is a list of `snippet`, `paa`, `images`, `video`, `local`, `sitelinks`, `reviews`, `ads`.

### RankChange

| Prop | Type | Description |
| --- | --- | --- |
| `current` | `number \| null` | Position now. |
| `previous` | `number \| null` | Position before. Lower is better, so a smaller number shows an up arrow. |

### RankDistribution

`distribution` from `rankDistribution(keywords)`, with optional `title`, `description`.

### AddKeywordsDialog

`open`, `onOpenChange`, `locations`, `defaultLocation?`, `defaultDevice?` (`desktop` or `mobile`), `onAdd(input)`. Lines and commas are both separators; duplicates are dropped.

### CompetitorComparison

`keywords`, `competitors`, `title?`, `description?`.

### Helpers

`rankBucket`, `rankDistribution`, `rankChange`, `averagePosition`, `bestPosition`, `visibilityShare` (click share estimated from `ctrForPosition`), `topMovers`, `competitorStats`, `difficultyBand`, `parseKeywordList`, `RANK_BUCKETS`.

## Examples

Distribution on its own:

```tsx
import { RankDistribution, rankDistribution } from "@fadymondy/nasaq/web";

<RankDistribution distribution={rankDistribution(keywords)} />;
```

A rank arrow in your own table:

```tsx
import { RankChange } from "@fadymondy/nasaq/web";

<RankChange current={4} previous={9} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move to the table, the dialog trigger and the tabs. |
| Arrow keys | Switch tabs. |
| Escape | Close the dialog. |

Rank changes have a text alternative ("up 5 places") in addition to colour and arrow. Sparklines are hidden from assistive tech; the table holds the numbers.

## RTL & i18n

Keywords in Arabic are shown with `dir="auto"`; URLs and domains stay left-to-right. Positions and volumes use Latin digits. Built-in English and Arabic strings; override with `labels`.

## Styling & tokens

Up, down and neutral use the success, danger and muted tokens. Charts use the `--nq-chart-*` palette.

## Do / Don't

- Do show the previous position: a rank alone says little.
- Do treat `null` position as "not in the top 100", not zero.
- Don't compare positions across devices or locations in one chart.

## Related

- [KeywordPlanner](../keyword-planner/README.md)
- [SeoPageList](../seo-pages/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-seo-keyword-tracker--docs
