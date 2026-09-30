---
name: server-admin
title: Server Admin
category: developer
status: beta
summary: Four admin panels for one server. A systemd service list with start, stop and restart, a package updates panel, an SSH key manager with a servers by keys matrix, and a job queue monitor with retry and forget.
exports: [ServerAdminLabels, ServerAdminResult, ServiceUnit, ServiceUnitsListProps, ServiceUnitsList, PackageUpdate, PackageUpdatesPanelProps, PackageUpdatesPanel, SshServer, SshKeyRecord, SshKeyInput, SshKeyManagerProps, SshKeyManager, QueueJob, JobQueueMonitorProps, JobQueueMonitor, canForgetJob, canRetryJob, errorHeadline, isDisruptive, isTransitionalState, JOB_STATUSES, JobStatus, jobCounts, KeyCoverage, keyCoverage, PackageKind, ParsedSshKey, parseSshPublicKey, ServiceAction, ServiceState, serviceActionsFor, shortFingerprint, SshKeyProblem, SshKeyType, summarizeUpdates, UpdateSummary]
related: [data-table, backup-manager, log-viewer, alerts, api-keys]
story: components-developer-server-admin
base-ui: [alert-dialog, checkbox, dialog, tabs]
keywords: [server, systemd, services, packages, apt, updates, ssh keys, queue, jobs, retry, admin]
---

# Server Admin

Panels for running one server. They have no backend: your callbacks do the work and you pass the updated data back.

- `ServiceUnitsList`: units with state, boot setting, memory and uptime. The row menu (also the context menu) offers only the actions that fit the state. Stop, restart and disable ask first.
- `PackageUpdatesPanel`: pending updates, security first, with Update selected, Update all, Check now and a restart banner.
- `SshKeyManager`: keys as rows and servers as columns. Tick a box to install or remove a key. Add key rejects private keys and unknown formats.
- `JobQueueMonitor`: status counts as filters, retry and forget for one or many jobs, and a dialog with the error and payload.

## When to use

- A server detail page in a hosting or ops console.

## When not to use

- Fleet-wide dashboards: use the server card and a table.

## Import

```tsx
import { ServiceUnitsList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ServiceUnitsList, type ServiceUnit } from "@fadymondy/nasaq/web";

declare const services: ServiceUnit[];
declare const api: { run(id: string, action: string): Promise<void> };

export function Services() {
  return <ServiceUnitsList services={services} onAction={(id, action) => api.run(id, action)} />;
}
```

## API

Every panel takes the `div` props of a Card (except `children` and `title`), a `loading` flag and a `labels` override.

| Component | Main props |
| --- | --- |
| `ServiceUnitsList` | `services` `{ id, name, description?, state, enabled, canReload?, memoryBytes?, since? }`, `onAction(id, action)`, `onViewLogs?(id)`, `error?`, `onRetry?` |
| `PackageUpdatesPanel` | `packages` `{ name, currentVersion, newVersion, kind, sizeBytes? }`, `lastCheckedAt?`, `rebootRequired?`, `updating?` (names), `checking?`, `onCheck`, `onUpdate(names)`, `onReboot?` |
| `SshKeyManager` | `servers` `{ id, name }`, `keys` `{ id, name, type, fingerprint, comment?, addedAt?, lastUsedAt?, installedOn }`, `onInstallChange(keyId, serverId, installed)`, `onAdd({ name, publicKey })`, `onRemove(id)` |
| `JobQueueMonitor` | `jobs` `{ id, name, queue, status, attempts, maxAttempts?, at, error?, payload? }`, `onRetry(ids)`, `onForget(ids)`, `error?`, `onRetryLoad?` |

Callbacks return `Promise<void | { error?: string }>`. Return `{ error }` to show a failure in the panel.

## Accessibility

Dialogs trap focus; disruptive actions use an alert dialog. Matrix checkboxes are labelled with the key and server names.

## RTL and languages

English and Arabic strings, overridable through `labels`. Unit names, fingerprints, versions, IDs and payloads stay left to right.
