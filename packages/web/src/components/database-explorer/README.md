---
name: database-explorer
title: DatabaseExplorer
category: developer
status: beta
summary: A database browser with a schema and table tree, a SQL editor, a results grid with CSV export, table structure and query history. It has no connection of its own, you run the SQL.
exports: [DatabaseExplorerLabels, DatabaseColumn, DatabaseTable, DatabaseSchema, QueryResult, QueryOutcome, TableRef, DatabaseExplorerProps, DatabaseExplorer, buildSelectSql, CellKind, cellKind, formatCell, isReadOnlySql, pushHistory, quoteIdent, resultToCsv]
related: [tree-view, data-table, code-block, alert-dialog, tabs, backup-manager]
story: components-developer-database-explorer
base-ui: [tabs, alert-dialog]
keywords: [database, sql, query, schema, tables, postgres, mysql, sqlite, explorer, admin, results, csv]
---

# DatabaseExplorer

Browse a database inside an admin or developer tool. The left side is a filterable tree of schemas and tables
with row counts. Picking a table shows its structure and runs `SELECT * ... LIMIT n`. The right side has a SQL
editor (Ctrl or Cmd plus Enter runs it) and three tabs: Results (a sortable grid, copy and download CSV),
Structure (columns, types, keys, references) and History (your last queries, click to reuse).

The component never connects to anything. `onRunQuery` receives the SQL and returns rows or `{ error }`, so
you decide what the browser is allowed to do (read-only user, statement timeout, row cap).

## When to use

- An internal admin console, a support tool, a "run a query" screen in a developer portal.

## When not to use

- A general data grid over your own API rows: use `DataTable`.
- Anything that should not let a user type SQL. Build a report screen instead.

## Import

```tsx
import { DatabaseExplorer } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DatabaseExplorer, type DatabaseSchema, type QueryOutcome } from "@fadymondy/nasaq/web";

declare const schemas: DatabaseSchema[];
declare const api: { query(sql: string): Promise<QueryOutcome> };

export function Explorer() {
  return <DatabaseExplorer schemas={schemas} onRunQuery={api.query} />;
}
```

## Anatomy

```
DatabaseExplorer               data-slot="database-explorer"
├─ aside                       filter input and TreeView of schemas and tables
└─ main
   ├─ SQL editor               Textarea, Run button, Ctrl/Cmd+Enter
   └─ Tabs                     Results, Structure, History
      ├─ Results               DataTable, duration, row count, Copy CSV, Download CSV
      ├─ Structure             columns with type, null, key and reference
      └─ History               newest first, no repeats, capped at 20
AlertDialog                    asks before a statement that is not read-only
```

## API

Every `section` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `schemas` | `DatabaseSchema[]` | required | `{ name, tables: { name, kind?, rowCount?, columns: { name, type, nullable?, primaryKey?, references? }[] }[] }`. |
| `onRunQuery` | `(sql) => Promise<QueryOutcome>` | required | Return `{ columns, rows, durationMs?, affectedRows?, truncated? }` or `{ error }`. A rejection shows a generic error. |
| `rowLimit` | `number` | `100` | The `LIMIT` used when a table is opened. |
| `defaultQuery` | `string` | | Text in the editor at first. |
| `defaultTable` | `TableRef` | | A table selected at first. Its structure shows and nothing runs. |
| `confirmWrites` | `boolean` | `true` | Confirm before running anything that does not start with SELECT, WITH, EXPLAIN, SHOW, VALUES or DESCRIBE. |
| `onExport` | `(result) => void` | saves `query.csv` | Called by Download CSV. |
| `title` | `ReactNode` | | Replace the heading. |
| `labels` | `Partial<DatabaseExplorerLabels>` | | Override any string. |

**Helpers** (pure, tested): `buildSelectSql`, `quoteIdent`, `resultToCsv`, `formatCell`, `cellKind`, `isReadOnlySql`, `pushHistory`.

## Examples

**Read-only console**

```tsx
<DatabaseExplorer schemas={schemas} confirmWrites={false} onRunQuery={async (sql) => {
  if (!/^\s*select\b/i.test(sql)) return { error: "Only SELECT is allowed here." };
  return api.query(sql);
}} />
```

## Accessibility

- The tree uses the tree pattern with arrow keys. The result grid is a real table with sortable headers.
- Errors from the database appear in an `Alert` (`role="alert"`). The run state and row count are announced politely.
- The write confirmation is an `AlertDialog`: focus is trapped and Cancel is the default.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. SQL, table and column names, types and values stay `dir="ltr"` inside an RTL page.
- Row counts use `Num`, so digits follow the locale.

## Styling & tokens

- Built on `TreeView`, `DataTable`, `Tabs`, `Alert`, `AlertDialog` and `--nq-*` tokens.
- Target `[data-slot="database-explorer"]`.

## Do / Don't

- Do run queries with a read-only database user, a timeout and a row cap on your server.
- Do return `truncated: true` when you cut rows off, so people know.
- Don't rely on `isReadOnlySql` for security. It only decides whether to ask first.
- Don't send secrets or PII to the History tab: it lives in memory only and resets on reload.

## Related

- [`TreeView`](../tree-view/README.md)
- [`DataTable`](../data-table/README.md)
- [`CodeBlock`](../code-block/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-database-explorer--docs
