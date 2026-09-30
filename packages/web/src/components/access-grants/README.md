---
name: access-grants
title: AccessGrants
category: account
status: beta
summary: Who and what can act for you. Authorized apps and agents per workspace with their scopes and revoke, delegated agent keys, and a matrix of agents by resource with no access, read or read and write.
exports: [AccessGrants, AccessGrantsProps, AccessGrantsLabels, ConnectedApp, AccessResource, ACCESS_LEVELS, grantCounts, levelOf, setLevel]
related: [api-keys, connected-accounts, oauth-consent, integration-connector]
story: components-account-access-grants
base-ui: [select, alert-dialog]
keywords: [authorized apps, agents, mcp, oauth, scopes, revoke, grants, permissions, read, write, delegated keys]
---

# AccessGrants

The other side of `OAuthConsent`: after you approve an app or connect an agent, this is where you see it, narrow
it and cut it off. Apps show their scopes; agents also get a row in a matrix where you decide, per resource,
whether they can read it or change it.

## When to use

- A "Connected apps" or "Agents and access" page of account or workspace settings.

## When not to use

- Signing in with Google or GitHub: use `ConnectedAccounts`.
- Your own API keys, not delegated to an agent: use `ApiKeys`.

## Import

```tsx
import { AccessGrants } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AccessGrants
  apps={apps}
  scopeLabels={{ "docs:read": "Read documents" }}
  organizations={orgs}
  onRevoke={(app) => api.revoke(app.id)}
  resources={[{ id: "docs", label: "Documents" }, { id: "billing", label: "Billing" }]}
  grants={grants}
  onChangeGrant={(agentId, resourceId, level) => api.setGrant(agentId, resourceId, level)}
  agentKeys={{ keys, scopes, onCreate, onRotate, onRevoke: revokeKey }}
/>
```

## Anatomy

```
AccessGrants             data-slot="access-grants"
├─ Alert                    outcome of the last action
├─ apps                     data-slot="access-apps": workspace filter, rows with scopes, dates, Revoke
├─ agent keys               ApiKeys, data-slot="access-agent-keys"
└─ matrix                   data-slot="access-matrix": agents by resources, a Select per cell
```

## API

| Prop | Type | Description |
| --- | --- | --- |
| `apps` | `ConnectedApp[]` | `{ id, name, kind: "app" \| "agent", publisher?, logo?, orgId?, scopes, authorizedAt, lastUsedAt? }`. |
| `scopeLabels` | `Record<string, string>` | Friendly scope names. |
| `organizations` | `{ id, name }[]` | Adds a workspace filter when there is more than one. |
| `onRevoke` | `(app) => Promise<void \| { error? }>` | Adds Revoke, with a confirm dialog. |
| `resources`, `grants`, `onChangeGrant` | | The matrix. `grants[agentId][resourceId]` is `"none" \| "read" \| "write"`. Optimistic, rolls back on failure. |
| `agentKeys` | subset of `ApiKeysProps` | Renders `ApiKeys` for delegated keys. Omit to hide. |
| `sections` | `("apps" \| "keys" \| "grants")[]` | |
| `labels` | `AccessGrantsLabels` | English and Arabic built in. |

## Accessibility

The matrix is a table; each cell select is named "agent: resource". Access is written out (No access, Read, Read
and write), never colour alone. Revoke asks first.

## RTL & i18n

Built-in English and Arabic. There are no brand logos: apps show the `logo` URL you pass, or their initials.

## Styling & tokens

Built on `SettingsSection`, `ApiKeys`, `Select` and `Badge`.

## Do / Don't

- Do enforce grants on the server for every agent call; this screen only edits them.
- Do not give an agent write access by default.

## Related

- [ApiKeys](../api-keys/README.md)
- [ConnectedAccounts](../connected-accounts/README.md)
- [OAuthConsent](../oauth-consent/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-access-grants--docs
