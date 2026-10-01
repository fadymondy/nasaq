---
name: vault
title: Vault
category: security
status: beta
summary: A secrets manager UI with grouped secrets, masked values fetched only on reveal or copy, auto-hide, expiry badges, add, edit and delete, and an access log.
exports: [VaultLabels, VaultSecretKind, VaultAccessAction, VaultSecret, VaultAccessEvent, VaultSecretInput, VaultResult, VaultRevealResult, VaultProps, Vault, daysUntil, ExpiryState, expiryState, groupSecrets, matchesSecret, VAULT_MASK]
related: [api-keys, copy-button, data-table, alert-dialog, dialog]
story: components-security-vault
base-ui: [tabs, dialog, alert-dialog]
keywords: [vault, secrets, credentials, passwords, api keys, tokens, certificates, access log, expiry, rotation]
---

# Vault

Store and use secrets from the browser without keeping them in the page. The list shows names, groups,
kinds, a safe hint (for example the last four characters) and an expiry badge, never the value. The value is
fetched through `onReveal(id, purpose)` only when someone clicks Reveal or Copy, is shown for a short time
(15 seconds by default, with a countdown) and then hidden again. The second tab is an access log with search
and an action filter.

Because the value only exists after `onReveal`, your server can write every reveal and copy to the audit log
with the purpose.

## When to use

- A team secrets screen, a project environment variables page, a credentials area in an admin tool.

## When not to use

- API keys a user creates for your own product (show once, then hash): use `ApiKeys`.
- Encrypting or storing anything in the browser. This is only the interface.

## Import

```tsx
import { Vault } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Vault, type VaultSecret } from "@fadymondy/nasaq/web";

declare const secrets: VaultSecret[];
declare const api: { reveal(id: string, purpose: "reveal" | "copy"): Promise<string> };

export function Secrets() {
  return <Vault secrets={secrets} onReveal={async (id, purpose) => ({ value: await api.reveal(id, purpose) })} />;
}
```

## Anatomy

```
Vault                          data-slot="vault"
├─ heading, search, Add secret
└─ Tabs
   ├─ Secrets                  sections per group
   │  └─ row                   data-slot="vault-secret": name, kind, hint, expiry Badge, mask or value, Reveal, Copy, Edit, Delete
   └─ Access log               DataTable: time, who, secret, action, address, with search and action filter
Dialog, AlertDialog            add or edit, delete
```

## API

Every `section` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `secrets` | `VaultSecret[]` | required | `{ id, name, group, kind?, description?, hint?, updatedAt, expiresAt?, lastAccessedAt? }`. No value field. |
| `accessLog` | `VaultAccessEvent[]` | | `{ id, secretName, actor, action, at, address? }`. Shows the Access log tab. |
| `onReveal` | `(id, purpose) => Promise<{ value } \| { error }>` | required | Purpose is `reveal` or `copy`. Called on every reveal, never cached by the component. |
| `onSave` | `(input, id?) => Promise<void \| { error? }>` | | Add (no id) or edit. Shows Add and Edit. Empty value on edit means keep the current one. |
| `onDelete` | `(id) => Promise<void \| { error? }>` | | Shows Delete, after a confirm. |
| `revealTimeout` | `number` | `15000` | Milliseconds before a revealed value hides again. Minimum 1000. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `now` | `Date \| number \| string` | | Override the clock for expiry badges (stories and tests). |
| `title`, `description` | `ReactNode` | | Replace the heading and the line under it. |
| `labels` | `Partial<VaultLabels>` | | Override any string. |

**Helpers** (pure, tested): `groupSecrets`, `expiryState`, `daysUntil`, `matchesSecret`, `VAULT_MASK`.

## Examples

**Read-only vault**

```tsx
<Vault secrets={secrets} accessLog={log} onReveal={reveal} revealTimeout={8000} />
```

## Accessibility

- The value is in a labelled `code` element. Reveal and Copy have names that include the secret name.
- The countdown is text, and the hide is announced politely. A copy shows a checkmark and a polite message.
- Expiry is a word and an icon, not colour alone. Dialogs trap focus.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Values, hints, addresses and secret names are `dir="ltr"`.
- The mask has a fixed length, so it does not leak the real length.

## Styling & tokens

- Built on `Tabs`, `DataTable`, `Badge`, `Dialog`, `AlertDialog`, `CopyButton`-style feedback and `--nq-*` tokens.
- Target `[data-slot="vault"]` and `[data-slot="vault-secret"]`.

## Do / Don't

- Do log reveals and copies on the server, with who and why.
- Do rotate secrets that show an expired or "expires soon" badge.
- Don't put the value in `secrets`. Return it from `onReveal` only.
- Don't rely on the auto-hide for protection: it only reduces shoulder-surfing.

## Related

- [`ApiKeys`](../api-keys/README.md)
- [`DataTable`](../data-table/README.md)
- [`AlertDialog`](../alert-dialog/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-security-vault--docs
