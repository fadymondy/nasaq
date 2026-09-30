---
name: keyword-planner
title: KeywordPlanner
category: analytics
status: beta
summary: "A keyword planning table with search intent, cluster, owning URL and cannibalization: which of your pages compete for the same keyword and which one to keep."
exports: [KeywordPlannerLabels, PlannerKeyword, KeywordPlannerProps, KeywordPlanner, classifyIntent, clusterKeywords, findCannibalization, keywordTokens, normalizeUrl]
related: [keyword-tracker, seo-pages, data-table]
story: components-analytics-keyword-planner
base-ui: [tabs]
keywords: [keyword planner, intent, cluster, cannibalization, content plan, seo]
---

# KeywordPlanner

KeywordPlanner turns a flat keyword list into a content plan. Each keyword has an intent (informational, commercial, transactional or navigational, guessed from the wording unless you set it), volume, difficulty and an owning URL that you edit in the cell. A Clusters tab groups related keywords under the biggest one, and a Cannibalization tab lists keywords where two of your own pages rank, with a one-click Keep this page.

## When to use

- Planning which page targets which keywords.
- Finding pages that compete with each other in search.

## When not to use

- Watching positions over time: use [`KeywordTracker`](../keyword-tracker/README.md).

## Import

```tsx
import { KeywordPlanner } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { KeywordPlanner, type PlannerKeyword } from "@fadymondy/nasaq/web";

export function Plan({ keywords }: { keywords: PlannerKeyword[] }) {
  return <KeywordPlanner keywords={keywords} onAssignOwner={async (id, url) => { await api.setOwner(id, url); }} />;
}
```

## Anatomy

```
KeywordPlanner         data-slot="keyword-planner"
  Tabs                 Keywords | Clusters | Cannibalization
    DataTable          keyword, intent, cluster, volume, difficulty, owner URL
    clusters           head keyword, members, total volume
    conflicts          keyword, ranking URLs with positions, Keep this page
```

## API

### KeywordPlanner

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `keywords` | `PlannerKeyword[]` | required | The list. |
| `onAssignOwner` | `(id: string, url: string) => Promise<void \| { error?: string }>` | none | Saves the owner. An empty string clears it. Without it owners are read only. |
| `title / description` | `ReactNode` | built-in | Header. |
| `pageSize` | `number` | `8` | Rows per page. |
| `loading / error / onRetry` | | none | States. |
| `className` | `string` | none | Root classes. |
| `labels` | `Partial<KeywordPlannerLabels>` | none | Strings. |

### PlannerKeyword

`{ id, keyword, volume, difficulty (0 to 100), intent?, ownerUrl?, rankingUrls?: { url, position }[] }`.

### Helpers

- `classifyIntent(keyword)` guesses an intent from English and Arabic cue words.
- `clusterKeywords(rows, threshold = 0.5)` groups by shared word overlap.
- `findCannibalization(rows, depth = 20)` lists keywords with two or more of your URLs in the top `depth`; `keep` is the owner if it is one of them, otherwise the best ranking URL.
- `keywordTokens`, `normalizeUrl` are the building blocks (`/Blog/` and `/blog` are the same page).

## Examples

Only the maths, for a report:

```tsx
import { findCannibalization } from "@fadymondy/nasaq/web";

const conflicts = findCannibalization(keywords);
```

Read only (no owner editing):

```tsx
import { KeywordPlanner } from "@fadymondy/nasaq/web";

<KeywordPlanner keywords={keywords} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Switch tabs. |
| Enter | Edit the owner cell, then confirm. |
| Escape | Cancel the edit. |

A failed save shows a visible message and keeps the old value.

## RTL & i18n

Arabic keywords are classified with Arabic cue words and shown with `dir="auto"`; URLs stay left-to-right. Built-in English and Arabic strings; override with `labels`.

## Styling & tokens

Intent badges use the status tokens (info, warning, success, neutral). Logical spacing only.

## Do / Don't

- Do give each keyword exactly one owning page.
- Do resolve cannibalization by merging or re-targeting, not only by picking a winner.
- Don't trust the guessed intent for brand terms; set `intent` yourself.

## Related

- [KeywordTracker](../keyword-tracker/README.md)
- [SeoPageList](../seo-pages/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-keyword-planner--docs
