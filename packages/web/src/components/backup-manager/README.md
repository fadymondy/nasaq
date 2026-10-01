---
name: backup-manager
title: BackupManager
category: server-tools
status: beta
summary: Backups in one place with a summary, history with progress, run now, download, delete, a restore that needs confirming, and a schedule and retention form with a preview of what would be pruned.
exports: [BackupManager, BackupManagerProps, BackupManagerLabels, BackupRecord, BackupKind, BackupFrequency, BackupRetention, BackupSchedule, BackupStatus, RetentionError, formatBytes, nextRun, parseTime, pruneCandidates, totalSize, validateRetention]
related: [deploy-view, progress, dialog, github-activity, dns-management]
story: components-server-tools-backup-manager
base-ui: [checkbox, dialog, field, select, switch]
keywords: [backup, restore, schedule, retention, snapshot, disaster recovery, database]
---

# BackupManager

Back up, schedule and restore. It shows when the last backup ran and when the next one will, the history with
a progress bar for anything running, and a form for the schedule (hourly, daily, weekly, monthly) and
retention (keep the last N, delete after N days) with a live preview of what retention would remove. A
restore always goes through a dialog with a checkbox. It has no backend: your callbacks run the work and you
pass the updated `backups` back, with `progress` while a job runs.

## When to use

- A settings or admin page for databases, sites or projects with backups.

## When not to use

- Point-in-time recovery timelines or file-level restore: this restores a whole backup.

## Import

```tsx
import { BackupManager } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BackupManager, type BackupRecord } from "@fadymondy/nasaq/web";

declare const backups: BackupRecord[];
declare const api: { run(): Promise<void>; restore(id: string): Promise<void>; save(next: unknown): Promise<void> };

export function Backups() {
  return (
    <BackupManager
      backups={backups}
      schedule={{ enabled: true, frequency: "daily", time: "02:30" }}
      retention={{ keepLast: 14, maxAgeDays: 60 }}
      onRunNow={() => api.run()}
      onRestore={(id) => api.restore(id)}
      onSaveSchedule={(next) => api.save(next)}
    />
  );
}
```

## Anatomy

```
BackupManager                   data-slot="backup-manager"
├─ summary (dl)                 last backup, next run, storage used
├─ history                      each: name, kind, status, size, date, Progress when running or restoring
│  └─ actions                   Download, Restore, Delete
├─ Run now
├─ restore Dialog               data-slot="backup-restore": warning, confirm Checkbox, danger button
└─ schedule and retention form  frequency, time, day, keep last, max age, prune preview
```

## API

**BackupManager**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `backups` | `readonly BackupRecord[]` | required | `{ id, createdAt, kind, status, name?, sizeBytes?, progress?, locked?, error? }`. Kind: `scheduled`, `manual`, `pre-restore`. Status: `completed`, `running`, `failed`, `restoring`. |
| `schedule` | `BackupSchedule` | required | `{ enabled, frequency, time, dayOfWeek? }` (`hourly`, `daily`, `weekly`, `monthly`; time is `HH:mm`). |
| `retention` | `BackupRetention` | required | `{ keepLast, maxAgeDays? }`. Locked backups and the newest completed one are never pruned. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onRunNow` | `() => Promise<void \| { error? }>` | required | Start a backup. |
| `onRestore` | `(id) => Promise<void \| { error? }>` | required | Runs after the confirm. |
| `onSaveSchedule` | `({ schedule, retention }) => Promise<void \| { error? }>` | required | Save the form. |
| `onDelete` | `(id) => Promise<void \| { error? }>` | | Shows Delete on finished backups. |
| `onDownload` | `(id) => Promise<void \| { error? }>` | | Shows Download on completed backups. |
| `safetyBackup` | `boolean` | `true` | Wording only: says a safety backup is taken before a restore. |
| `now` | `Date \| number \| string` | now | Override the clock (stories and tests). |
| `labels` | `Partial<BackupManagerLabels>` | | Override any string. |

**Helpers** (pure, tested): `formatBytes`, `totalSize`, `parseTime`, `nextRun(schedule, from)`, `pruneCandidates(backups, retention, now)`, `validateRetention`.

## Examples

**Weekly on Friday**

```tsx
import { BackupManager, type BackupRecord } from "@fadymondy/nasaq/web";

declare const backups: BackupRecord[];

export const Weekly = () => (
  <BackupManager
    backups={backups}
    schedule={{ enabled: true, frequency: "weekly", time: "03:00", dayOfWeek: 5 }}
    retention={{ keepLast: 8 }}
    onRunNow={async () => {}}
    onRestore={async () => {}}
    onSaveSchedule={async () => {}}
  />
);
```

## Accessibility

- A restore is a `Dialog` that needs a ticked checkbox; focus is trapped and returned. Progress bars have a name and a value.
- Status is an icon and a word. Errors from callbacks appear in an `Alert` with `role="alert"`.
- Form fields are labelled, and invalid ones are described by their message.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Sizes ("12.4 MB"), times and IDs stay LTR. Weekday names come from `Intl`.

## Styling & tokens

- Built on `Card`, `Progress`, `Dialog`, `Status`, `Switch`, `Select` and `--nq-*` tokens.
- Target `[data-slot="backup-manager"]`.

## Do / Don't

- Do take a safety backup before every restore on the server.
- Do show progress: set `progress` on the running backup as your job reports it.
- Don't let retention delete the only good backup. The preview always keeps the newest completed one.
- Don't run the restore without the confirm step.

## Related

- [`DeployView`](../deploy-view/README.md)
- [`Progress`](../progress/README.md)
- [`Dialog`](../dialog/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-server-tools-backup-manager--docs
