---
name: kill-switch
title: KillSwitch
category: workflow
status: beta
summary: One control that stops every automation with a required reason, plus a banner that shows the paused state and a list of paired browsers to unpair.
exports: [KillSwitch, KillSwitchProps, KillSwitchLabels, PausedBanner, PausedBannerProps, PauseInfo, PairedBrowser]
related: [approval-queue, impersonation-banner, alert-dialog, context-menu]
story: components-workflow-kill-switch
base-ui: [dialog, alert-dialog, context-menu]
keywords: [kill switch, pause, stop all, emergency, automation, paused banner, paired browsers, unpair]
---

# KillSwitch

The big red button for automations, and the banner that keeps everyone aware while it is pressed.

## When to use

- Operators need to stop every running automation or agent at once.
- A paused state must stay visible on every screen (`PausedBanner`).

## When not to use

- Pausing one workflow: use its own toggle.
- Ending a session: use `ImpersonationBanner`.

## Import

```tsx
import { KillSwitch, PausedBanner } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
{paused ? <PausedBanner paused={paused} onResume={resume} /> : null}
<KillSwitch paused={paused} activeCount={14} onStopAll={stop} onResume={resume} browsers={browsers} onUnpairBrowser={unpair} />
```

## Anatomy

```
KillSwitch           data-slot="kill-switch"
├─ status card       running count or paused info (who, when, why)
├─ Stop all          opens a dialog that requires a reason
├─ Resume            confirm, errors shown inline
└─ paired browsers   rows with online dot, unpair via AlertDialog; context menu on each row
PausedBanner         role="status", sticky
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `paused` | `PauseInfo \| null` | required | `{ by, at, reason }` while paused. |
| `activeCount` | `number` | required | Automations running now. |
| `onStopAll` | `(reason) => Promise<void \| { error? }>` | required | Stops everything. |
| `onResume` | `() => Promise<...>` | required | Resumes. |
| `browsers` | `PairedBrowser[]` | none | Paired browsers. The current one cannot be unpaired. |
| `onUnpairBrowser` | `(id) => Promise<...>` | none | Unpair one browser. |
| `labels` | `KillSwitchLabels` | en / ar | Every string. |

`PausedBanner` takes `paused`, `onResume?`, `sticky` (default true), `hint`, `labels`.

## Examples

- **Banner only**: render `PausedBanner` in the app shell whenever `paused` is set.

## Accessibility

Destructive actions go through dialogs; the reason field is required and labelled. The banner is a status
region. Online state has a text label as well as the dot.

## RTL & i18n

English and Arabic built in. Times use `DateTime`; browser names are shown as text, not as vendor logos.

## Styling & tokens

`--nq-danger-*` while running (the stop button) and `--nq-warning-*` while paused.

## Do / Don't

- Do keep the banner visible on every page while paused.
- Do not allow a stop without a reason: the audit trail needs it.

## Related

- [ApprovalQueue](../approval-queue/README.md)
- [ImpersonationBanner](../impersonation-banner/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-workflow-kill-switch--docs
