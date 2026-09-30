---
name: deploy-view
title: DeployView
category: developer
status: stable
summary: A deploy run as ordered steps with status, live durations, expandable ANSI logs that follow the output, and retry for failed steps.
exports: [DeployViewLabels, DeployStep, DeployResult, DeployViewProps, DeployView, completedCount, DeployStatus, deriveStatus, DurationUnits, formatDuration, stepDuration, tailLines, totalDuration]
related: [terminal, log-viewer, progress, collapsible]
story: components-developer-deploy-view
base-ui: [collapsible]
keywords: [deploy, pipeline, ci, build, steps, status, duration, retry, logs, release, progress]
---

# DeployView

Shows one deploy or pipeline run. The header has the title, meta (commit, branch, who), an overall status badge,
the total duration and a progress bar. Under it, each step has a status icon that differs by shape (not just
colour), the step name, its command, and a duration that counts up while it runs. A step opens to show its logs
(ANSI colours allowed) which follow the newest line while it runs, and a failed step shows its error and a Retry
button. Presentational: you update `steps` as the pipeline advances and handle `onRetry` and `onCancel`.

## When to use

- Deploys, CI runs, migrations, installs: any ordered list of steps with output.

## When not to use

- Free-form output: use [Terminal](../terminal/README.md).
- A searchable stream: use [LogViewer](../log-viewer/README.md).
- A user-facing checklist: use a stepper or `CheckoutSteps`.

## Import

```tsx
import { DeployView } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DeployView } from "@fadymondy/nasaq/web";

export function Deploy() {
  return (
    <DeployView
      title="Deploy api to production"
      meta="main · 4f2a91c"
      steps={[
        { id: "install", name: "Install", command: "pnpm install", status: "success", durationMs: 8200 },
        { id: "build", name: "Build", command: "pnpm build", status: "running", startedAt: Date.now() - 4000, logs: "compiling..." },
        { id: "ship", name: "Release", status: "pending" },
      ]}
      onRetry={async (id) => {}}
    />
  );
}
```

## Anatomy

```
DeployView      data-slot="deploy-view"          <section>
├─ header       data-slot="deploy-view-header"   title, meta, status badge, duration, cancel, progress
└─ steps        data-slot="deploy-view-steps"    <ol>
   └─ step      data-slot="deploy-step"          <li> Collapsible: icon, name, command, duration, chevron
      ├─ error  (Alert)                          when failed
      ├─ logs   data-slot="deploy-step-logs"     ANSI text, follows the tail while running
      └─ retry  (Button)                         when failed and onRetry is set
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `DeployStep[]` | required | `{ id, name, command?, status, startedAt?, durationMs?, logs?, error? }`. |
| `title?` | `ReactNode` | "Deploy" / "النشر" | What is being deployed. |
| `meta?` | `ReactNode` | none | Commit, branch, author. |
| `status?` | `DeployStatus` | derived | `pending running success failed skipped cancelled`. |
| `onCancel?` | `() => Promise<DeployResult> \| DeployResult` | none | Shows Cancel while running. |
| `onRetry?` | `(stepId) => Promise<{ error? } \| void>` | none | Shows Retry on failed steps. Resolve `{ error }` to keep it failed with a message. |
| `defaultExpanded?` | `string[]` | failed and running | Step ids open at the start. |
| `maxLogLines?` | `number` | `500` | Lines kept per step. |
| `logHeight?` | `string` | `"14rem"` | Height of a step's log. |
| `labels?` | `Partial<DeployViewLabels>` | built-in en/ar | Translations. |

Helpers: `deriveStatus`, `stepDuration`, `totalDuration`, `formatDuration`, `tailLines`, `completedCount`.

## Examples

### Retry

```tsx
<DeployView steps={steps} onRetry={async (id) => { const r = await api.retry(id); return r.ok ? undefined : { error: r.message }; }} />
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Each step trigger, then its buttons |
| `Enter` / `Space` | Open or close a step |

- Each step trigger is a button with `aria-expanded` and a name that includes the status text.
- Status is text and shape, never colour alone. The overall status is a badge with text.
- The step list is an ordered list. Running durations update once a second, not through a live region.

## RTL & i18n

- Commands and logs are `dir="ltr"` inside Arabic pages; step names, status text and buttons follow the page.
- The chevron mirrors. Durations use Latin digits with translated units (`1m 04s` / `1د 04ث`).
- Built-in Arabic strings; override with `labels`.

## Styling & tokens

- Status colours: `text-nq-success-text`, `-danger-text`, `-warning-text`, `-info-text`, `text-muted-foreground`. Logs on `bg-nq-surface-soft`.
- Slots: `deploy-view`, `deploy-view-header`, `deploy-view-steps`, `deploy-step`, `deploy-step-logs`. `data-status` on each step.

## Do / Don't

- **Do** send `startedAt` for running steps so the duration is accurate after a refresh.
- **Do** return `{ error }` from `onRetry` instead of throwing.
- **Don't** put secrets in `logs`; mask them at the source.
- **Don't** reorder steps while running.

## Related

- [Terminal](../terminal/README.md) · [LogViewer](../log-viewer/README.md) · [Progress](../progress/README.md) · [Collapsible](../collapsible/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-deploy-view--docs
