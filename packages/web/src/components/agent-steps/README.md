---
name: agent-steps
title: Agent Steps and Confirm
category: ai-agents
status: beta
summary: The tool calls an agent made and a human-in-the-loop confirm before it acts. A step list with arguments, results and retry, plus a diff review with per-change ticks, risk, and Apply or Reject.
exports: [AgentStepsLabels, AgentSteps, AgentDiff, AgentConfirm, AgentStepsProps, AgentDiffProps, AgentConfirmProps, AgentStep, AgentStepStatus, AgentChange, AgentRisk, AgentChangeKind, AgentRunState, AgentStepCounts, agentRunState, agentStepCounts, currentStep, totalDurationMs, AGENT_MASK, redactDeep, stringifyArgs, resultLanguage, agentChangeKind, agentHighestRisk, selectedChangeIds, toggleId]
related: [ai-states, copilot-chat, approval-queue, run-history, step-editor, version-history, code-block]
story: components-ai-agents-agent-steps-and-confirm
base-ui: [collapsible, checkbox, dialog]
keywords: [agent, tool call, steps, confirm, approval, human in the loop, diff, apply, reject, risk]
---

# Agent Steps and Confirm

Two pieces for agentic features. `AgentSteps` shows what the agent did or plans to do, one tool call per row.
`AgentConfirm` stops before the change lands: it shows each proposed change as a diff and waits for a person to apply
or reject. Neither runs anything itself.

## When to use

- An assistant that calls tools and you want the run to be inspectable.
- Any agent action that edits data, sends messages or spends money and needs a yes first.

## When not to use

- A queue of requests from many people to approve: use [`ApprovalQueue`](../approval-queue/README.md).
- History of finished runs: use [`RunHistory`](../run-history/README.md).
- Editing a workflow by hand: use [`StepEditor`](../step-editor/README.md).

## Import

```tsx
import { AgentSteps, AgentConfirm } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AgentSteps
  steps={steps}
  redactKeys={["token", "password"]}
  onRetry={(id) => retry(id)}
  renderConfirm={() => (
    <AgentConfirm
      changes={changes}
      summary="I will rename 2 tags and delete 1 duplicate."
      onApply={async (ids) => api.apply(ids)}
      onReject={async (reason) => api.reject(reason)}
    />
  )}
/>
```

## API

### `AgentStep`

`id`, `label`, `tool?`, `status` (`pending`, `running`, `awaiting`, `done`, `error`, `skipped`), `args?`, `result?`
(text or a JSON string), `resultLanguage?`, `error?`, `durationMs?`.

### `AgentSteps`

| Prop | Type | Notes |
| --- | --- | --- |
| `steps` | `AgentStep[]` | In order. |
| `title` | `string?` | Heading. |
| `redactKeys` | `string[]` | Argument keys masked at any depth, case-insensitive. |
| `renderConfirm` | `(step) => ReactNode` | Shown under a step that is `awaiting`. |
| `onRetry` | `(stepId) => void` | Adds a Retry button on failed steps. |
| `defaultOpenIds` | `string[]` | Steps whose details start open. |
| `labels` | `Partial<AgentStepsLabels>` | |

### `AgentChange`

`id`, `title`, `target?`, `description?`, `before?`, `after?`, `risk?` (`low`, `medium`, `high`). No `before` means a
new item, no `after` means a deletion.

### `AgentConfirm`

| Prop | Type | Notes |
| --- | --- | --- |
| `changes` | `AgentChange[]` | |
| `onApply` | `(ids) => Promise<void \| { error? }>` | Gets the ticked ids. A rejection or `{ error }` shows the failure and keeps the choice open. |
| `onReject` | `(reason?) => Promise<...>` | |
| `summary` | `ReactNode` | The agent's one-line intent. |
| `requireReason` | `boolean` | Reason is mandatory on reject. |
| `defaultUnchecked` | `string[]` | Ids that start unticked. |
| `onDecided` | `(decision) => void` | After success. |

`AgentDiff` on its own takes `before`, `after` and `context`.

## Examples

- Read only run log: `AgentSteps` without `renderConfirm`.
- Destructive change: mark `risk: "high"`, and Apply stays disabled until the person ticks the acknowledgement.

## Accessibility

- The run summary is a polite live region: "Waiting for you", "Failed", "Done".
- Each step is a disclosure button with its status in text, not only an icon.
- Diff lines carry `+` and `-` marks, so colour is not the only signal.
- Reject opens a dialog that traps focus and returns it on close.

## RTL and i18n

- English and Arabic through `useOptionalNasaq()`, overridable with `labels`.
- Tool names, arguments, results and diffs stay left to right; the surrounding text follows the page direction.
- Progress arrows and chevrons flip in RTL.

## Styling and tokens

Status uses the `--nq-success`, `--nq-warning`, `--nq-danger` and `--nq-accent` families. Diff rows use the same tints
as [`VersionHistory`](../version-history/README.md).

## Do / Don't

- Do let the person leave single changes out.
- Do mask secrets with `redactKeys` before they reach the screen.
- Don't apply anything before `onApply` is called. Confirm is the only gate.
- Don't hide the diff for high risk changes.

## Related

[`ApprovalQueue`](../approval-queue/README.md), [`RunHistory`](../run-history/README.md),
[`StepEditor`](../step-editor/README.md), [`AiCitedAnswer`](../ai-citations/README.md).
