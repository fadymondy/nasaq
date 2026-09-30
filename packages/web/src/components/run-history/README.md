---
name: run-history
title: RunHistory
category: workflow
status: beta
summary: A runs list with status filter and search beside a run detail showing per-step state, timings, input, output, logs and screenshots, the failing step, a span timeline with attributes, and the raw payload.
exports: [RunHistory, RunDetail, RunHistoryProps, RunDetailProps, RunHistoryLabels]
related: [workflow-canvas, cron-builder, step-editor, apm-panels, code-block]
story: components-workflow-run-history
base-ui: [tabs, toggle-group, dialog]
keywords: [runs, history, execution, trace, spans, logs, workflow, automation, failed step, waterfall]
---

# RunHistory

Answers "what happened when it ran?". Runs are listed newest first with a status filter and search. Choosing one shows
its steps on a shared time axis, each expandable to its input, output, logs and screenshots; the step that failed is
called out and opened for you. A Trace tab lays the spans out as a waterfall with attributes, and a Raw tab shows the
payload. `RunDetail` is exported on its own for a page that already knows which run to show.

## When to use

- The execution log of a workflow, job or automation.
- A detail page for one run reached from an alert or a list.

## When not to use

- Live request tracing across services with sampling and percentiles: use `apm-panels`.
- Editing the workflow itself: use `workflow-canvas` or `step-editor`.

## Import

```tsx
import { RunHistory, RunDetail } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { RunHistory, type RunRecord } from "@fadymondy/nasaq/web";

export function Runs({ runs }: { runs: RunRecord[] }) {
  return <RunHistory runs={runs} onRetry={async (run) => { await rerun(run.id); }} />;
}
```

## Anatomy

```
RunHistory                data-slot="run-history"
├─ list section           search, status ToggleGroup with counts, run rows (data-run-row)
└─ detail section
   └─ RunDetail           data-slot="run-detail"
      ├─ header           status, id, started, duration, trigger, Run again / Cancel
      ├─ Alert            failing step with a "Show the step" button
      └─ Tabs             Steps (data-step rows) | Trace (run-trace, run-span-detail) | Raw
```

## API

### RunHistory

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `runs` | `readonly RunRecord[]` | required | Any order; shown newest first. |
| `selectedId / defaultSelectedId` | `string \| null` | `null` | Controlled or initial selection. |
| `onSelect` | `(run \| null) => void` | none | Selection changed. |
| `onRetry` | `(run) => Promise<void \| { error?: string }>` | none | Shows "Run again" on finished runs. |
| `onCancel` | `(run) => Promise<void \| { error?: string }>` | none | Shows "Cancel run" on running ones. |
| `loading` | `boolean` | `false` | Skeleton list. |
| `labels` | `Partial<RunHistoryLabels>` | none | Override any string. |

### RunDetail

`run`, `onRetry`, `onCancel`, `defaultTab` (`"steps" | "trace" | "raw"`), `leading`, `labels`.

### RunRecord

`{ id, name?, status, startedAt, durationMs?, trigger?, steps: RunStep[], spans?: RunSpan[], payload?, error? }`.
`RunStep` has `startedAtMs?`, `durationMs?`, `depth?` (for nested steps), `input?`, `output?`, `error?`, `logs?`, `screenshots?`, `attempt?`.
`RunSpan` has `id`, `parentId?`, `name`, `service?`, `startMs`, `durationMs`, `error?`, `attributes?`.

Statuses are the workflow ones: `idle`, `running`, `success`, `error`, `waiting`, `skipped`.

## Examples

Start on the trace of one run:

```tsx
<RunDetail run={run} defaultTab="trace" />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves through search, filters, runs, tabs and step rows. |
| Enter / Space | Selects a run, expands a step, selects a span, enlarges a screenshot. |
| Arrow keys | Move between tabs and filter toggles. |

Status is an icon plus a word. Step rows are buttons with `aria-expanded`. Span bars carry a text alternative with the duration. The span detail is a polite live region. Screenshots open in a dialog with their alt text.

## RTL & i18n

- The layout mirrors: bars grow from the start edge, the back arrow flips, nesting indents on the start side.
- Ids, span names, attributes, durations and code stay left-to-right.
- English and Arabic strings ship; pass `labels` to change any.

## Styling & tokens

- Uses `--nq-danger-soft`, `--nq-selected`, `--nq-hover` and border tokens. Extend with `className`; never pass raw hex.

## Do / Don't

- Do record `startedAtMs` on steps so the bars show real overlap.
- Do keep screenshots small or served by URL.
- Don't put secrets in `input`, `output` or `payload`; they are displayed.

## Related

- [`workflow-canvas`](../workflow-canvas/README.md)
- [`cron-builder`](../cron-builder/README.md)
- [`apm-panels`](../apm-panels/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-run-history--docs
