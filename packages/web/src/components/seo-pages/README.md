---
name: seo-pages
title: SeoPageList
category: analytics
status: beta
summary: "A pages list with SEO score, open-issue count, index status and Core Web Vitals, plus a per-page issue checklist with fix hints."
exports: [SeoPagesLabels, SeoPageRow, SeoPageListProps, SeoPageList, SeoIssueChecklistProps, SeoIssueChecklist, SEO_ISSUE_CATALOG, SEVERITY_WEIGHT, issueCounts, openIssues, scoreBand, seoScore, siteScore, sortIssues]
related: [seo-preview, keyword-tracker, web-vital-gauge, data-table]
story: components-analytics-seo-pages
base-ui: [collapsible, checkbox]
keywords: [seo, audit, crawl, index status, core web vitals, issues, score, checklist]
---

# SeoPageList

SeoPageList lists crawled pages with a 0 to 100 SEO score, the number of open issues, index status and the three Core Web Vitals. Opening a page shows SeoIssueChecklist: each issue has a severity, a plain explanation and a fix hint, and can be ticked off as fixed, which raises the score at once. The list is a DataTable, so sorting, search, paging and row actions come with it.

## When to use

- A site audit screen after a crawl.
- A marketing dashboard that needs to show which pages need work first.

## When not to use

- One page's search snippet: use [`SeoPreview`](../seo-preview/README.md).
- Clicks and impressions: use [`SearchPerformanceTable`](../search-performance-table/README.md).

## Import

```tsx
import { SeoIssueChecklist, SeoPageList } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { SeoPageList, type SeoPageRow } from "@fadymondy/nasaq/web";

export function Audit({ pages }: { pages: SeoPageRow[] }) {
  return <SeoPageList pages={pages} onOpen={(p) => console.log(p.url)} onRecrawl={async (p) => {}} />;
}
```

## Anatomy

```
SeoPageList          data-slot="seo-page-list"   (Card + DataTable)
  toolbar            search, index status facet
  row                URL, score meter, issues, index status, LCP, INP, CLS, crawled
SeoIssueChecklist    data-slot="seo-issue-checklist"
  issue              checkbox, severity, title, fix hint (collapsible)
```

## API

### SeoPageList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pages` | `SeoPageRow[]` | required | Rows. |
| `onOpen` | `(page) => void` | none | Row click and the Open action. |
| `onRecrawl` | `(page) => Promise<void \| { error?: string }>` | none | Adds a Recrawl action. |
| `onRequestIndexing` | `(page) => Promise<void \| { error?: string }>` | none | Adds a Request indexing action for pages not indexed. |
| `catalog` | `Record<string, SeoIssueKind>` | `SEO_ISSUE_CATALOG` | Accepted for symmetry; the list only counts issues, the checklist reads it. |
| `title / description` | `ReactNode` | built-in | Header. |
| `pageSize` | `number` | `8` | Rows per page. |
| `loading / error / onRetry` | | none | Loading, failure and retry states. |
| `className` | `string` | none | Root classes. |
| `labels` | `Partial<SeoPagesLabels>` | none | Strings. |

### SeoPageRow

`{ id, url, title?, indexStatus: "indexed" | "not-indexed" | "blocked" | "pending", issues: SeoIssue[], vitals?: { LCP?, INP?, CLS? }, lastCrawled? }`.

### SeoIssueChecklist

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `issues` | `SeoIssue[]` | required | `{ id, code, severity, fixed?, detail? }`; severity is error, warning or info. |
| `url` | `string` | none | Shown in the header. |
| `onToggleFixed` | `(issue, fixed) => Promise<Result>` | none | Makes the checkboxes live. `Result` is `void` or `{ error?: string }`. |
| `catalog` | `Record<string, SeoIssueKind>` | `SEO_ISSUE_CATALOG` | Titles and hints. |
| `title` | `ReactNode` | built-in | Header. |
| `className / labels` | | none | Classes and strings. |

### Helpers

`seoScore(issues)` is 100 minus the weighted open issues (`SEVERITY_WEIGHT`), never below 0. `siteScore(pages)` averages it. `scoreBand(score)` gives good, fair or poor. `openIssues`, `issueCounts` and `sortIssues` (most severe first) work on `SeoIssue[]`.

## Examples

A checklist next to the preview:

```tsx
import { SeoIssueChecklist } from "@fadymondy/nasaq/web";

<SeoIssueChecklist url="https://example.com/pricing" issues={issues} onToggleFixed={async (issue, fixed) => { await save(issue.id, fixed); }} />;
```

Your own issue codes:

```tsx
import { SeoIssueChecklist } from "@fadymondy/nasaq/web";

<SeoIssueChecklist issues={issues} catalog={{ "missing-hreflang": { severity: "warning", en: { title: "Missing hreflang", why: "Search engines cannot match language versions.", fix: "Add an hreflang link per language." }, ar: { title: "hreflang مفقود", why: "لا تستطيع محركات البحث مطابقة نسخ اللغات.", fix: "أضف رابط hreflang لكل لغة." } } }} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through rows, actions and checkboxes. |
| Space | Tick or untick an issue. |
| Enter | Open the row or expand a hint. |

The score is a meter with a spoken value and a band word; severity is a word plus an icon, not colour alone.

## RTL & i18n

URLs are left-to-right inside the RTL layout. Numbers use Latin digits. Built-in English and Arabic; issue titles in `SEO_ISSUE_CATALOG` are localised, and `labels` overrides the rest.

## Styling & tokens

Score bands use the success, warning and danger tokens. All spacing is logical.

## Do / Don't

- Do sort worst first by default; teams fix the top of the list.
- Do give every issue a fix hint.
- Don't treat the score as a ranking prediction: it is a to-do measure.

## Related

- [SeoPreview](../seo-preview/README.md)
- [KeywordTracker](../keyword-tracker/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-seo-pages--docs
