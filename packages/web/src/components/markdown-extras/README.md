---
name: markdown-extras
title: RichMarkdown
category: editors
status: beta
summary: Markdown with sortable and filterable tables, code blocks with line numbers and download, and a frontmatter table.
exports: [MarkdownExtrasLabels, MarkdownTableColumn, MarkdownTableRow, MarkdownTableProps, MarkdownTable, FrontmatterTableProps, FrontmatterTable, DownloadableCodeBlockProps, DownloadableCodeBlock, RichMarkdownProps, RichMarkdown]
related: [markdown, code-block, table, export-action]
story: components-editors-markdown-extras
base-ui: []
keywords: [markdown, table, sort, filter, csv, code block, line numbers, download, frontmatter, yaml]
---

# RichMarkdown

[Markdown](../markdown/README.md) plus the things people expect when notes and docs hold real data. Tables sort when you click a header, filter as you type and download as CSV. Code blocks get a line-number toggle, a download button and copy. A leading `---` frontmatter block becomes a tidy properties table. The parts are also exported to use on their own.

## When to use

- A notes app, knowledge base or docs page showing user-written Markdown that includes tables and code.
- Anywhere the reader should work with the data (sort, search, take it away) rather than just look at it.

## When not to use

- Short chat text or comments: use [markdown](../markdown/README.md).
- Large data sets: use [data-table](../data-table/README.md). Markdown tables are sorted and filtered in the browser.
- Editing Markdown: this renders only.

## Import

```tsx
import { RichMarkdown, MarkdownTable, FrontmatterTable, DownloadableCodeBlock } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { RichMarkdown } from "@fadymondy/nasaq/web";

const source = `---
title: Q3 numbers
tags: [finance, report]
published: 2026-09-01
---

| Region | Revenue |
| --- | ---: |
| Riyadh | $12,400 |
| Cairo | $8,900 |

\`\`\`ts title="sum.ts" showLineNumbers {2}
const a = 1;
const b = 2;
\`\`\`
`;

export function Note() {
  return <RichMarkdown tables={{ downloadable: true }}>{source}</RichMarkdown>;
}
```

## Anatomy

```
RichMarkdown            data-slot="rich-markdown"
├─ FrontmatterTable     data-slot="frontmatter-table"
└─ Markdown body
    ├─ MarkdownTable    data-slot="markdown-table"  (filter, count, CSV, sortable headers)
    └─ DownloadableCodeBlock  (CodeBlock with line-number toggle, download, copy)
```

## API

### RichMarkdown

Accepts the props of [Markdown](../markdown/README.md) (`components`, `remarkPlugins`, `className`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string` | required | Markdown source, with an optional frontmatter block. |
| `frontmatter` | `"table" \| "hide"` | `"table"` | Show the frontmatter as a table above the body, or drop it. |
| `tables` | `false \| { sortable?, filterable?, filterMinRows?, downloadable? }` | `{}` | Options for tables. `false` keeps plain tables. |
| `code` | `false \| { lineNumbers?, download? }` | `{}` | Options for code blocks. `false` keeps plain blocks. |
| `labels` | `MarkdownExtrasLabels` | English or Arabic | String overrides. |

Fence meta is read: `ts title="app.ts" showLineNumbers {2,4-6}` sets the file name, turns line numbers on and highlights lines.

### MarkdownTable

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `{ header, text?, align? }[]` | required | Rendered header, its plain text, and `start`, `center` or `end`. |
| `rows` | `{ cells, texts? }[]` | required | Rendered cells and their plain text (taken from the cells when omitted). |
| `sortable` | `boolean` | `true` | Click a header to sort ascending, descending, then off. Numbers sort by value, empty cells stay last. |
| `filterable` | `boolean \| "auto"` | `"auto"` | The filter box. `auto` shows it from `filterMinRows` rows. |
| `filterMinRows` | `number` | `6` | Rows from which `auto` shows the filter. |
| `downloadable`, `downloadName` | `boolean`, `string` | `false`, `"table.csv"` | A "Download CSV" button of the rows in view. |
| `defaultSort` | `{ column, direction } \| null` | `null` | Initial sort. |
| `label` | `string` | "Table" | Accessible name. |
| `labels` | `MarkdownExtrasLabels` | | String overrides. |

### FrontmatterTable

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `[key, value][] \| Record<string, value>` | required | Values are text, numbers, booleans or lists. Lists show as badges, ISO dates are formatted, links are clickable. |
| `title` | `ReactNode` | "Properties" | Heading. |

### DownloadableCodeBlock

Accepts the props of [CodeBlock](../code-block/README.md) plus `download` (default `true`), `downloadName`, `lineNumberToggle` (default `true`). `lineNumbers` is the starting state.

### Helpers

`parseMarkdownFrontmatter(source)`, `frontmatterLabel(key)`, `nextMarkdownSort`, `sortMarkdownRows`, `filterMarkdownRows`, `markdownCellNumber`, `compareMarkdownCells`, `parseFenceMeta`, `codeDownloadName`.

## Examples

```tsx
<RichMarkdown frontmatter="hide" code={{ lineNumbers: true }}>{md}</RichMarkdown>
```

```tsx
<MarkdownTable
  downloadable
  downloadName="orders.csv"
  columns={[{ header: "Order" }, { header: "Total", align: "end" }]}
  rows={[{ cells: ["A-1", "$40"] }, { cells: ["A-2", "$9"] }]}
/>
```

```tsx
<FrontmatterTable data={{ title: "Plan", tags: ["a", "b"], draft: false }} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Reach the filter, the sort buttons and code actions. |
| Enter, Space | Sort by the focused header, toggle line numbers, download. |

- Sortable headers carry `aria-sort` (`ascending`, `descending`, `none`) and a button named "Sort by column".
- A polite live region announces the sort and "3 of 12 rows" after a change.
- The filter box and the icon buttons are labelled. Localise `labels` for your wording.

## RTL & i18n

- Tables follow the page direction; cells use `dir="auto"` so mixed Arabic and English rows align.
- Numbers and currency in Arabic-Indic digits sort by value. The filter folds accents, tashkeel and hamza forms.
- Code stays left-to-right inside an Arabic page.
- CSV downloads start with a byte-order mark so Excel opens Arabic text correctly.

## Styling & tokens

Uses `--nq-*` border, surface, selected and focus tokens. Target `data-slot="markdown-table"`, `frontmatter-table` and `rich-markdown`. Extend with `className`.

## Do / Don't

- Do give downloads a meaningful file name.
- Do turn off features you do not need (`tables={false}`) for very small content.
- Don't render untrusted HTML. Raw HTML is never rendered, as in `Markdown`.
- Don't use it for tables with thousands of rows.

## Related

- [markdown](../markdown/README.md), [code-block](../code-block/README.md), [table](../table/README.md), [export-action](../export-action/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-editors-markdown-extras--docs
