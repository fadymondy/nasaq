---
name: audit-log
title: AuditLog
category: security
status: beta
summary: The audit log table. Filter by actor, action, entity, channel (web, API or MCP) and dates, open a row for the field-level before and after, and set how long entries are kept.
exports: [AuditLog, AuditLogProps, AuditLogLabels, AuditRetention, AUDIT_CHANNELS, diffRecords, changeKind, formatChangeValue, retentionCutoff, expiringCount]
related: [admin-area, data-table, admin-users, export-action]
story: components-security-audit-log
base-ui: [dialog, select]
keywords: [audit, log, activity, history, diff, before, after, retention, compliance, channel, mcp, api]
---

# AuditLog

Who did what, to which thing, from where and when. Every row is one action; opening it shows exactly which
fields changed, from what to what. Actions are tagged with the channel they came from, so a change made by an
API key or an MCP agent is told apart from one made in the web app.

## When to use

- The Security section of an admin area, or the activity page of a workspace.

## When not to use

- A friendly feed for end users: use `GithubActivity` or `Timeline`.

## Import

```tsx
import { AuditLog, diffRecords } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AuditLog
  entries={entries}
  actionLabels={{ "member.role_changed": "Role changed" }}
  entityLabels={{ member: "Member" }}
  retention={{ days: 90 }}
  onChangeRetention={(days) => api.setRetention(days)}
/>
```

An entry:

```ts
{
  id: "a1", at: "2026-03-10T09:12:00Z",
  actor: { id: "u1", name: "Sara Alharbi", email: "sara@example.com" },
  action: "member.role_changed",
  entity: { type: "member", label: "Omar Khalid" },
  channel: "web",
  changes: diffRecords({ role: "member" }, { role: "admin" }),
}
```

## Anatomy

```
AuditLog                     data-slot="audit-log"
├─ toolbar                      search, facets (actor, action, entity, channel), date range, columns, refresh
├─ DataTable                    when, actor, action, entity, channel, IP (hidden by default)
├─ retention                    data-slot="audit-retention": select, expiring warning
└─ Dialog                       data-slot="audit-log-details": fields, before and after table
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `AuditEntry[]` | required | See the example above. `actor: null` means the system. |
| `actionLabels`, `entityLabels` | `Record<string, string>` | none | Friendly names; unknown ids show as they are. |
| `loading`, `error`, `onRetry` | | | Table states. |
| `onRefresh` | `() => void \| Promise<void>` | none | Shows Refresh. |
| `pageSize` | `number` | `10` | |
| `retention` | `{ days: number \| null, options? }` | none | Shows the retention setting. `null` keeps forever. |
| `onChangeRetention` | `(days) => Promise<void \| { error? }>` | none | Optimistic; the select goes back if it fails. |
| `labels` | `AuditLogLabels` | en / ar | |

## Pure helpers

`diffRecords(before, after)` builds field-level changes (nested keys become dotted paths). `filterEntries` is used
internally. `expiringCount` and `retentionCutoff` say what a shorter retention deletes.

## Accessibility

Each change row says added, removed or changed in words, and the before and after cells carry a minus and plus
sign, so meaning never rests on colour. Rows open with Enter.

## RTL & i18n

Built-in English and Arabic. Action ids, field paths, emails and IP addresses are left-to-right.

## Styling & tokens

Success and danger soft tokens for the diff. Built on `DataTable`.

## Do / Don't

- Do enforce retention on the server; the warning only previews it.
- Do not put secrets in `changes`; redact them before they reach the log.

## Related

- [AdminArea](../admin-area/README.md)
- [DataTable](../data-table/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-security-audit-log--docs
