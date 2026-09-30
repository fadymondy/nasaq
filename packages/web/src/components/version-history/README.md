---
name: version-history
title: VersionHistory
category: collaboration
status: beta
summary: Saved versions newest first with a read-only preview, a line diff against the previous, current or any other version, and a confirmed restore that saves as a new version.
exports: [VersionHistory, HistoryVersion, VersionHistoryProps, VersionHistoryLabels]
related: [workflow-canvas, step-editor, rule-builder, code-block, run-history]
story: components-collaboration-version-history
base-ui: [alert-dialog, tabs, select]
keywords: [versions, history, diff, restore, revisions, changelog, compare, rollback, audit]
---

# VersionHistory

"What did this look like on Tuesday, and what changed?" Versions are listed newest first. Choosing one shows it
read-only, and a Changes tab shows a line diff against the previous version (or the current one, or any other) with
added and removed lines marked by a sign, not only colour, and long unchanged stretches folded. Restore asks first,
explains that it saves a new version on top, and stays open to show the error if it fails. Content is text (JSON,
Markdown, code), and `renderPreview` / `renderDiff` replace the built-in views for anything richer.

## When to use

- Settings, workflows, documents, templates, rules: anything saved repeatedly that people may need to roll back.

## When not to use

- A who-did-what audit trail without content: use an activity feed.
- The version list inside the workflow canvas: `workflow-canvas` has its own panel that previews on the canvas.

## Import

```tsx
import { VersionHistory } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { VersionHistory, type HistoryVersion } from "@fadymondy/nasaq/web";

export function History({ versions }: { versions: HistoryVersion[] }) {
  return <VersionHistory versions={versions} language="json" onRestore={async (v) => { await api.restore(v.id); }} />;
}
```

## Anatomy

```
VersionHistory            data-slot="version-history"
├─ list                   rows (data-version-row): number, Current badge, date, author, note
├─ detail                 header with Restore, then Tabs
│  ├─ Preview             CodeBlock, or renderPreview
│  └─ Changes             compare-with Select, +/- counts, data-slot="version-diff" or renderDiff
└─ AlertDialog            confirm restore
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `versions` | `readonly HistoryVersion[]` | required | `{ id, version, savedAt, author?, note?, content }`. Any order. |
| `currentId` | `string` | newest | The version live now. It has no Restore button. |
| `selectedId / defaultSelectedId` | `string \| null` | `null` | Controlled or initial selection. |
| `onSelect` | `(version \| null) => void` | none | Selection changed. |
| `onRestore` | `(version) => Promise<void \| { error?: string }>` | none | Enables Restore. |
| `language` | `string` | `"text"` | Syntax for preview. |
| `renderPreview` | `(version) => ReactNode` | none | Custom preview. |
| `renderDiff` | `(older, newer) => ReactNode` | none | Custom changes view. |
| `loading` | `boolean` | `false` | Skeleton list. |
| `labels` | `VersionHistoryLabels` | none | Override any English or Arabic string. |

### Helpers

`diffLines(older, newer)`, `diffStats`, `foldDiff(lines, context)`, `sortVersions` are exported and pure.

## Examples

A custom preview for non-text content:

```tsx
<VersionHistory versions={versions} renderPreview={(v) => <PagePreview html={v.content} />} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves through versions, Restore, tabs and the compare select. |
| Enter / Space | Selects a version, opens the confirmation. |
| Escape | Closes the confirmation (Cancel takes initial focus). |

Versions are toggle buttons. The diff is a table whose added and removed rows are named. Counts are a polite live region. The confirmation is an alert dialog.

## RTL & i18n

- The layout mirrors; the diff and code stay left-to-right. Notes use `dir="auto"`.
- English and Arabic strings ship; digits are Latin.

## Styling & tokens

- Diff rows use `--nq-success-soft` and `--nq-danger-soft`. Extend with `className`; never pass raw hex.

## Do / Don't

- Do save a restore as a new version so history never loses anything.
- Do write notes in the author's words.
- Don't keep megabytes per version in the client; diff very large content on the server and use `renderDiff`.

## Related

- [`workflow-canvas`](../workflow-canvas/README.md)
- [`step-editor`](../step-editor/README.md)
- [`code-block`](../code-block/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-collaboration-version-history--docs
