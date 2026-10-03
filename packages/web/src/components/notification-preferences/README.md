---
name: notification-preferences
title: NotificationPreferences
category: account
status: beta
summary: The notification settings screen. A matrix of kinds by channel (email, push, WhatsApp, desktop), quiet hours, a daily cap with batching, a digest schedule and extra email or webhook destinations with a test send. Every change saves at once and rolls back if it fails.
exports: [NotificationPreferences, NotificationPreferencesProps, NotificationPreferencesLabels, NotificationSaveResult, DEFAULT_PREFS, NOTIFICATION_CHANNELS, channelState, isQuietNow, nextDigest, quietMinutes, setCell, setChannel]
related: [notification-center, desktop-notification, account-settings, settings-sections]
story: components-account-notification-preferences
base-ui: [checkbox, switch, select]
keywords: [notifications, preferences, email, push, whatsapp, desktop, quiet hours, digest, webhook, cap, batching]
---

# NotificationPreferences

Where a person decides what reaches them and how. Each row is a kind of notification, each column a channel;
below are quiet hours, a daily limit, a digest and extra destinations. There is no Save button: each change is
applied on screen at once and sent to you, and if your save fails the screen goes back to the last saved state.

## When to use

- The "Notifications" page of account settings (it fills the section body of `AccountSettings`).

## When not to use

- Showing the notifications themselves: use `NotificationCenter`.

## Import

```tsx
import { NotificationPreferences } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<NotificationPreferences
  kinds={[
    { id: "mention", label: "Mentions", group: "Activity" },
    { id: "security", label: "Security alerts", group: "Account", locked: ["email"] },
  ]}
  value={prefs}
  onChange={(next) => api.savePrefs(next)}
  pushPermission={permission}
  onRequestPush={requestPermission}
  unavailable={{ whatsapp: "Add a WhatsApp number first" }}
  destinations={destinations}
  onAddDestination={({ kind, target }) => api.addDestination(kind, target)}
  onTestDestination={(d) => api.testDestination(d.id)}
/>
```

## Anatomy

```
NotificationPreferences        data-slot="notification-preferences"
├─ status                         "Saving" / "Saved", polite live region
├─ Alert                          rollback, push blocked
├─ matrix                         data-slot="notification-matrix": a table, header checkbox per channel
├─ quiet hours                    switch, from and until (TimePicker), summary
├─ volume                         daily cap switch and number, delivery (instant, hourly, daily)
├─ digest                         switch, frequency, day, time, next send
└─ destinations                   data-slot="notification-destinations": list, test, remove, add form
```

## API

| Prop | Type | Description |
| --- | --- | --- |
| `kinds` | `NotificationKind[]` | `{ id, label, description?, group?, locked? }`. `locked` channels are fixed on. |
| `channels` | `NotificationChannel[]` | Columns to show. Default all four. |
| `unavailable` | `{ [channel]: reason }` | Locks a column and shows why. |
| `value` | `NotificationPrefs` | `{ matrix, quietHours, dailyCap, batching, digest }`. |
| `onChange` | `(next) => Promise<void \| { error? }>` | Saves. Saves run one after another; a failure rolls the screen back. |
| `pushPermission`, `onRequestPush` | | Turning push on asks the browser first; a refusal changes nothing. |
| `destinations`, `onAddDestination`, `onRemoveDestination`, `onTestDestination` | | Extra email or webhook destinations. |
| `sections` | array | Show only some sections. |
| `labels` | `NotificationPreferencesLabels` | English and Arabic built in. |

Pure helpers: `setCell`, `setChannel`, `channelState`, `isQuietNow` (windows can cross midnight), `nextDigest`.

## Accessibility

The matrix is a real table with row and column headers; every checkbox is named "kind: channel". Saving state is
a polite status. Locked cells say why in a tooltip and are disabled.

## RTL & i18n

Built-in English and Arabic. Webhook URLs and emails are left-to-right; the digest date follows the locale.

## Styling & tokens

Built on `SettingsSection`, `Checkbox`, `Switch`, `Select` and `TimePicker`.

## Do / Don't

- Do apply the same rules on the server (locked channels, quiet hours).
- Do not offer a channel you cannot deliver on; pass it in `unavailable` with the reason.

## Related

- [NotificationCenter](../notification-center/README.md)
- [DesktopNotification](../desktop-notification/README.md)
- [AccountSettings](../account-settings/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-account-notification-preferences--docs
