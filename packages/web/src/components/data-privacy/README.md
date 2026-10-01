---
name: data-privacy
title: DataPrivacy
category: security
status: beta
summary: Your data rights. Request a copy of your data and follow it until it is ready to download, delete the account with a grace period, and the public page that cancels a scheduled deletion.
exports: [DataPrivacy, DataPrivacyProps, DataPrivacyLabels, DataExport, DataExportProps, DataExportRequest, DataExportResult, AccountDeletion, AccountDeletionProps, CancelDeletionPage, CancelDeletionPageProps, CancelDeletionState, daysRemaining, deletionDate, deletionPhase, graceElapsed, isExportActive, pollDelay]
related: [account-settings, export-action, auth-layout, settings-sections]
story: components-security-data-privacy
base-ui: [alert-dialog, progress]
keywords: [gdpr, privacy, export, download, delete account, grace period, cancel deletion, data request]
---

# DataPrivacy

The privacy page of account settings, and the email link that goes with it. Two flows: export a copy of
everything, and delete the account after a grace period so a mistake can be undone.

## When to use

- The privacy or "Your data" page of account settings.
- The landing page of the "cancel deletion" link in the reminder email (`CancelDeletionPage`).

## When not to use

- Exporting rows of a table: use `ExportButton`.
- Deleting a workspace: use `WorkspaceSettings`.

## Import

```tsx
import { DataPrivacy, CancelDeletionPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<DataPrivacy
  dataExport={{
    request: latestExport,
    onRequest: () => api.requestExport(),
    poll: (id) => api.getExport(id),
    onDownload: (r) => window.open(r.url),
    includes: ["Profile", "Activity", "Files"],
  }}
  deletion={{
    scheduledFor: account.deleteAt,
    graceDays: 30,
    confirmText: account.email,
    onSchedule: () => api.scheduleDeletion(),
    onCancel: () => api.cancelDeletion(),
  }}
/>

<CancelDeletionPage state="ready" account={account} scheduledFor={date} onCancelDeletion={() => api.cancelWithToken(token)} />
```

## Anatomy

```
DataPrivacy                       data-slot="data-privacy"
├─ DataExport                        data-slot="data-export", data-status
│  └─ status card                    badge, progress, dates, Download
└─ AccountDeletion                   data-slot="account-deletion", data-phase (none, pending, due)
   ├─ none: DangerZone with the confirm text
   └─ pending: date, days left, grace progress, Cancel deletion

CancelDeletionPage                data-slot="cancel-deletion-page", data-state (ready, cancelled, expired, invalid)
```

## API

### DataExport

| Prop | Type | Description |
| --- | --- | --- |
| `request` | `DataExportRequest \| null` | `{ id, status, requestedAt, completedAt?, expiresAt?, sizeBytes?, progress? }`; status is `queued`, `processing`, `ready`, `failed` or `expired`. |
| `onRequest` | `() => Promise<{ request } \| { error }>` | |
| `poll` | `(id) => Promise<DataExportRequest>` | Called on a backing-off timer (3 s, growing to 30 s) while queued or processing. Three failures in a row stop it and offer "Check again". |
| `onChange` | `(request) => void` | Every new state, to store it. |
| `onDownload` | `(request) => void \| Promise<void>` | Shows Download on ready exports. |
| `includes` | `string[]` | What the file contains. |

### AccountDeletion

| Prop | Type | Description |
| --- | --- | --- |
| `scheduledFor` | date or `null` | When it will be deleted. |
| `graceDays` | `number` | Default 30. |
| `confirmText` | `string` | What to type, usually the email. |
| `onSchedule` | `() => Promise<void \| { scheduledFor? }>` | |
| `onCancel` | `() => Promise<void \| { error? }>` | |

### CancelDeletionPage

`state`, `account?`, `scheduledFor?`, `onCancelDeletion`, `onSignIn?`, `onSignUp?`, `onGoHome?`, `bare?`, plus `AuthLayout` props.

## Accessibility

Export status is a polite live region and is written out, not only coloured. Progress has an accessible name.
Scheduling deletion needs the confirm text typed.

## RTL & i18n

Built-in English and Arabic. File sizes and emails stay left-to-right; dates use the locale.

## Styling & tokens

Built on `SettingsSection`, `DangerZone`, `Progress` and `AuthLayout`.

## Do / Don't

- Do check the cancel token on the server and keep the grace period on the server clock.
- Do not delete anything before the date; sign the person out and hide the account instead.

## Related

- [AccountSettings](../account-settings/README.md)
- [ExportButton](../export-action/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-security-data-privacy--docs
