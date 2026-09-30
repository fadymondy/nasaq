---
name: setup-wizard
title: SetupWizard
category: workflow
status: beta
summary: "Multi-step first-run wizard with a server-decided completion gate, plus a guided connect step that waits live for an agent to enroll."
exports: [SetupWizardLabels, SetupStep, SetupWizardProps, SetupWizard, AgentEnrollStatus, EnrolledAgent, AgentEnrollWaitProps, AgentEnrollWait]
related: [stepper, progress, copy-field, alert]
story: pages-app-setup-wizard
base-ui: []
keywords: [setup, onboarding, wizard, first run, stepper, gate, agent, enroll, connect]
---

# SetupWizard

Owns the order, gating and completion of a first-run flow. Each step body is your own form. The server decides when
setup may finish: pass `canFinish` and `completed` from it. `AgentEnrollWait` is a ready-made step body for connecting
an agent: it shows the command, then waits live until the agent checks in.

## When to use

- First-run setup of a workspace, project or integration.
- Guided connection of a machine or agent.

## When not to use

- A single form: use a form.
- Ongoing settings: use a settings page.

## Import

```tsx
import { AgentEnrollWait, SetupWizard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { SetupWizard } from "@fadymondy/nasaq/web";

export function Setup({ done, canFinish }: { done: string[]; canFinish: boolean }) {
  return (
    <SetupWizard
      title="Set up your workspace"
      completed={done}
      canFinish={canFinish}
      gateMessage={canFinish ? undefined : "Connect an agent first."}
      steps={[
        { id: "name", title: "Name", content: <input aria-label="Name" /> },
        { id: "agent", title: "Agent", content: <p>Run the command.</p> },
      ]}
      onStepComplete={async (id) => api.saveStep(id)}
      onFinish={async () => api.finish()}
    />
  );
}

declare const api: { saveStep(id: string): Promise<void>; finish(): Promise<void> };
```

## Anatomy

```
SetupWizard                   data-slot="setup-wizard"
├─ header (title, description)
├─ Stepper rail (md+) | Progress bar (mobile)
├─ current step: title, description, Optional badge, content
├─ error / gate message      role="alert"
├─ Back · Skip · Continue | Finish
└─ done screen               title, description, doneAction
```

## API

**SetupWizard**: `div` props (except `children`, `title`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `SetupStep[]` | required | `{ id, title, description?, optional?, ready?, content }`. |
| `current` / `defaultCurrent` / `onCurrentChange` | | | Zero-based step. |
| `completed` | `string[]` | | Step ids the server counts done. Required steps missing here block Finish. |
| `onStepComplete` | `(id) => AuthSubmitResult \| Promise` | | Runs on Continue. `{ error }` keeps the step. |
| `canFinish` / `gateMessage` | `boolean` / `string` | `true` | The server verdict, and the reason if false. |
| `onFinish` | `() => AuthSubmitResult \| Promise` | required | |
| `title`, `description`, `doneTitle`, `doneDescription`, `doneAction`, `labels` | | | |

**AgentEnrollWait**: `command`, `status` (`waiting`, `connected`, `timeout`, `failed`), `agent`
(`{ name, host, version, system }`), `elapsed`, `error`, `onRetry`, `hint`, `labels`. Poll on the host and feed it.

## Examples

**A step that holds Continue until the agent connects**

```tsx
import { AgentEnrollWait, type SetupStep } from "@fadymondy/nasaq/web";

export const step = (status: "waiting" | "connected"): SetupStep => ({
  id: "agent",
  title: "Connect an agent",
  ready: status === "connected",
  content: <AgentEnrollWait command="curl -fsSL https://get.example.com | sh" status={status} />,
});
```

## Accessibility

- The rail is a list with `aria-current="step"`. Moving forward or back focuses the new step heading.
- Status changes in `AgentEnrollWait` are announced politely; errors use `role="alert"`.
- Buttons show a spinner and `aria-busy` while a step saves.

## RTL & i18n

- English and Arabic are built in; pass `labels` to override.
- Back and Continue arrows mirror; the command is always left to right and copyable.

## Styling & tokens

- Built from `Stepper`, `Progress`, `Button`, `Alert`, `CopyField` and `Spinner`; tokens only.

## Do / Don't

- Do let the server, not the client, decide when setup is complete.
- Do mark truly optional steps `optional`.
- Don't hide why Finish is blocked: set `gateMessage`.
- Don't poll faster than every couple of seconds.

## Related

- [`stepper`](../stepper/README.md)
- [`progress`](../progress/README.md)
- [`copy-field`](../copy-field/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/pages-app-setup-wizard--docs
