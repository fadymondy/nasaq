---
name: test-run-stream
title: Test Run Stream
category: workflow
status: beta
summary: A test run that streams. Run and Stop, each step appearing and updating in place as the server reports it, a live elapsed time and summary, and what the run saved, with its raw data behind a toggle.
exports: [TestRunStreamLabels, TestRunHandlers, TestRunStreamProps, TestRunStream]
related: [step-editor, run-history, log-viewer, code-block, status]
story: components-workflow-test-run-stream
base-ui: []
keywords: [test run, dry run, preview run, stream, sse, server-sent events, steps, progress, pipeline, source, connector, plugin, stop, abort]
---

# Test Run Stream

Try a source, pipeline or workflow once and watch it work. Each step shows up as soon as the server reports it,
spins while it runs, and settles to passed, failed or skipped with its duration, a count of what it produced and a
detail line. A live line under the header keeps time and counts. **Stop** aborts the run. Below the steps, what the
run saved (records, pages, messages) with a link, a few facts, a preview and the raw data as JSON.

Use `StepEditor`'s Test run tab when results come back all at once; use this when they stream.

## When to use

- "Test" on a data source, connector or plugin that fetches and saves things.
- A dry run of a workflow or pipeline where each step takes a while.

## When not to use

- A list of past runs: use `RunHistory`.
- Raw log lines: use `LogViewer`.

## Import

```tsx
import { TestRunStream } from "@fadymondy/nasaq";
```

## Quick start

With server-sent events:

```tsx
<TestRunStream
  controls={<Input ltr type="number" min={1} value={max} onChange={(e) => setMax(e.currentTarget.value)} className="w-20" />}
  run={(on, signal) => {
    const es = new EventSource(`/api/sources/${slug}/test-run?max=${max}`);
    signal.addEventListener("abort", () => es.close());
    es.addEventListener("step", (e) => on.step(JSON.parse(e.data)));
    es.addEventListener("saved", (e) => on.result(JSON.parse(e.data)));
    es.addEventListener("complete", () => { es.close(); on.done(); });
    es.addEventListener("error", () => { es.close(); on.fail("The connection closed."); });
  }}
/>
```

Or return a promise: resolving finishes the run, rejecting fails it.

## Anatomy

- `data-slot="test-run-stream"` (`data-state`: `idle`, `running`, `done`, `stopped`, `error`): a `section` named by
  its heading.
- Header: title, description, your `controls`, **Run test** / **Stop**, and **Clear** after a run.
- `test-run-summary`: a live status line ("Finished in 2.4 s · 4 passed · 1 skipped").
- An error message when the run fails.
- Steps: an `ol` of `test-run-step` rows (`data-status`).
- Saved: a list of `test-run-result` items with **Show raw data**.
- Before the first run, an empty state.

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `run` | `(handlers, signal) => void \| Promise` | Starts a run. Report with `handlers`; stop when `signal` aborts. |
| `controls` | `ReactNode` | Options before the Run button. |
| `disabled` | `boolean` | Blocks starting a run. |
| `title`, `description` | `ReactNode` | `null` hides them. |
| `headingAs` | `ElementType` | Default `h3`. |
| `onStateChange` | `(state) => void` | |
| `labels` | `Partial<TestRunStreamLabels>` | `status` and `summary` merge with the built-in ones. |

`TestRunHandlers`: `step(step)` adds a step or updates the one with the same `id` (or `name`); `result(result)`;
`done()`; `fail(message)`. Calls after the run ended or was stopped are ignored, so a late event never mixes into the
next run.

`TestRunStep`: `{ id?, name, status, detail?, durationMs?, count?, error? }`. `status` is `running`, `ok`, `error` or
`skipped`; `success` and `failed` are understood, anything else counts as running.

`TestRunResult`: `{ id, title?, url?, meta?: string[], body?, raw? }`.

### Helpers

From `test-run-stream-logic.ts`, pure: `testRunStepStatus`, `upsertTestRunStep`, `settleTestRunSteps` (running →
skipped when a run ends), `testRunCounts`, `formatTestRunDuration` ("850 ms", "2.4 s", "1 m 05 s"). Types
`TestRunStep`, `TestRunStepStatus`, `TestRunResult`, `TestRunState`, `TestRunCounts`.

## Accessibility

- The summary line is a polite live region, so progress and the outcome are announced without reading every step.
- Each step says its state in words next to the icon; the icons are hidden from assistive tech.
- A failed run is an `alert`. Result links say they open in a new tab. **Show raw data** has `aria-expanded`.
- Stop takes the Run button's place, so focus stays put when a run starts or ends.

## RTL & i18n

English and Arabic strings are built in. Numbers follow the locale; durations, hashes and raw data stay left to
right; names and previews follow their own direction.

## Styling & tokens

`bg-card`, `border-border`, `rounded-card`. Step states use `Status` tones; a failed run uses `bg-nq-danger-soft`.

## Do / Don't

- Do send a step's start and its end with the same `id`, so the row updates instead of repeating.
- Do close your stream when `signal` aborts.
- Don't save anything for real in a test run; say so in the description.

## Related

`step-editor`, `run-history`, `log-viewer`, `code-block`, `status`.

## Lab

Workflow › Test Run Stream: Default, Failing, Arabic.
