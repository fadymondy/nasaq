---
name: server-card
title: ServerCard
category: server-tools
status: beta
summary: One server on a card - status, address, hardware, live CPU, memory and disk meters with a sparkline, last deploy, power controls that follow the state, snapshots to take, roll back and delete, and a resource limits editor.
exports: [ServerCardLabels, ServerCardResult, ServerSnapshot, ServerMetrics, ServerDeploy, ServerInfo, ServerCardProps, ServerCard, formatDisk, formatMemory, isTransitional, LIMIT_RANGES, LimitError, ServerLimitField, PowerAction, powerActionsFor, ServerLimits, ServerStatus, validateLimits]
related: [network-rules, backup-manager, deploy-view, metric-tiles, sparkline, alert-dialog]
story: components-server-tools-server-card
base-ui: [alert-dialog, dialog, menu, context-menu, meter]
keywords: [server, vps, power, restart, snapshot, rollback, resource limits, cpu, memory, disk]
---

# ServerCard

A card for one server. It shows the status and address (with a copy button), the hardware as badges, live CPU, memory and disk as meters with a CPU sparkline, and the last deploy. Power buttons depend on the state: a running server offers restart, stop and force stop; a stopped one offers start; a server in a transition only offers force stop. Stop and force stop always ask first. Snapshots can be taken, rolled back to and deleted (from the row menu or right-click), and the CPU, memory and disk limits open in a dialog. It has no backend: your callbacks run the work and you pass the new `server` back.

## When to use

- A server or VPS page in a hosting or admin app.
- A grid of servers, one card each.

## When not to use

- A fleet table with many columns: use `DataTable` and show `Status` per row.
- Historical charts: use `TimeSeriesPanel`.

## Import

```tsx
import { ServerCard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ServerCard, type ServerInfo } from "@fadymondy/nasaq/web";

declare const server: ServerInfo;
declare const api: { power(a: string): Promise<void> };

export function ServerPage() {
  return (
    <ServerCard
      server={server}
      onPower={(action) => api.power(action)}
      onTakeSnapshot={async (name) => {}}
      onRollback={async (id) => {}}
      onDeleteSnapshot={async (id) => {}}
      onSaveLimits={async (limits) => {}}
    />
  );
}
```

## Anatomy

```
ServerCard                    data-slot="server-card"
├─ header                    name, Status, copyable address, region, OS
├─ hardware                  Badges: vCPU, memory, disk
├─ live usage                Meter x3 + Sparkline (CPU history), or a note when the server is off
├─ last deploy               ref, status Badge, time, who
├─ power                     Restart, Stop, Force stop, Start (by state), Resource limits
├─ snapshots                 list: name, size, date, ⋯ menu (also right-click): Roll back, Delete
├─ AlertDialog               confirm for stop, force stop, roll back, delete
└─ Dialog                    take a snapshot, edit limits
```

## API

**ServerCard**: every `Card` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `server` | `ServerInfo` | required | `{ id, name, status, address, region?, os?, limits, metrics?, lastDeploy?, snapshots }`. Status: `running`, `stopped`, `starting`, `stopping`, `restarting`, `provisioning`, `suspended`, `error`. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onPower` | `(action: PowerAction) => Promise<void \| { error? }>` | required | `start`, `stop`, `restart`, `force-stop`. Stop and force stop run after the confirm. |
| `onTakeSnapshot` | `(name) => Promise<...>` | | Shows Take snapshot. `name` is empty if left blank. |
| `onRollback` | `(snapshotId) => Promise<...>` | | Shows Roll back, after the confirm. |
| `onDeleteSnapshot` | `(snapshotId) => Promise<...>` | | Shows Delete, after the confirm. |
| `onSaveLimits` | `(limits: ServerLimits) => Promise<...>` | | Shows Resource limits. `{ cpuCores, memoryMb, diskGb }`. |
| `labels` | `Partial<ServerCardLabels>` | | Override any string. |

**Helpers** (pure, tested): `powerActionsFor(status)`, `isTransitional(status)`, `validateLimits(raw)`, `LIMIT_RANGES`, `formatMemory`, `formatDisk`.

## Examples

**A stopped server**

```tsx
import { ServerCard, type ServerInfo } from "@fadymondy/nasaq/web";

declare const server: ServerInfo;

export const Stopped = () => <ServerCard server={{ ...server, status: "stopped", metrics: undefined }} onPower={async () => {}} />;
```

## Accessibility

- Every button has text. Stop, force stop, roll back and delete open an `AlertDialog` with focus trapped and returned; Cancel is focused first.
- Status is an icon and a word. Meters have a name and a value. The sparkline has a text alternative.
- The status region is live, so a change from Stopping to Stopped is announced. Errors from callbacks appear in an `Alert`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The address, sizes ("18.4 GB") and commit refs stay left to right inside their own isolate.

## Styling & tokens

- Built on `Card`, `Meter`, `Sparkline`, `Badge`, `Status`, `AlertDialog`, `Dialog` and `--nq-*` tokens. Target `[data-slot="server-card"]`.

## Do / Don't

- Do keep `status` in step with the real server: set a transitional status while your job runs.
- Do confirm destructive power actions (built in).
- Don't offer start on a running server: the buttons come from `powerActionsFor`.
- Don't show made-up metrics for a stopped server: leave `metrics` out.

## Related

- [`network-rules`](../network-rules/README.md)
- [`backup-manager`](../backup-manager/README.md)
- [`deploy-view`](../deploy-view/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-server-tools-server-card--docs
