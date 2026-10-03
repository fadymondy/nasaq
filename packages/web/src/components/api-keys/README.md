---
name: api-keys
title: ApiKeys
category: developer-tools
status: beta
summary: API key management with a create form (name, scopes, expiry), a one-time secret reveal with copy, a masked list with scopes and last used, and confirmed rotate and revoke, driven by async callbacks.
exports: [ApiKeys, ApiKeysProps, ApiKeysLabels, ApiKeyScope, ApiKeyRecord, ApiKeyCreateInput, ApiKeySecretResult, ApiKeyStatus, DateLike, EXPIRING_DAYS, daysLeft, expiryFromDays, keyStatus, maskKey, toggleScope]
related: [mcp-connect, copy-button, alert-dialog, dialog, status]
story: components-developer-tools-api-keys
base-ui: [alert-dialog, checkbox, dialog, field, input, select]
keywords: [api key, token, secret, scopes, expiry, rotate, revoke, developer, credentials]
---

# ApiKeys

Create, see and retire API keys. The secret is shown once, in a dialog with a copy button, and never
again: the list only has the public prefix and the last four characters. It has no backend: your
callbacks call your server and you pass the updated `keys` back.

## When to use

- A developer or settings page where people make keys for scripts and servers.
- Any place a secret must be shown exactly once.

## When not to use

- Session or OAuth tokens: those are not managed by hand.
- Showing a secret you keep readable: this component assumes you cannot show it again.

## Import

```tsx
import { ApiKeys } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ApiKeys, type ApiKeyRecord } from "@fadymondy/nasaq/web";

declare const keys: ApiKeyRecord[];
declare const api: {
  create(input: { name: string; scopes: string[]; expiresInDays: number | null }): Promise<{ secret: string }>;
  revoke(id: string): Promise<void>;
};

export function Keys() {
  return (
    <ApiKeys
      keys={keys}
      scopes={[
        { id: "read", label: "Read" },
        { id: "write", label: "Write" },
      ]}
      onCreate={async (input) => ({ secret: (await api.create(input)).secret })}
      onRevoke={(id) => api.revoke(id)}
    />
  );
}
```

## Anatomy

```
ApiKeys                         data-slot="api-keys" (Card)
├─ header + Create key          opens the create Dialog: name, scope checkboxes, expiry Select
├─ list                         data-slot="api-key" (data-status="active|expiring|expired|revoked")
│  ├─ name, masked key          nsq_live_a1b2••••9f3c (dir="ltr")
│  ├─ scope badges, status      Status: Active, Expires soon, Expired, Revoked
│  ├─ created, last used, expires
│  └─ Rotate and Revoke         each a ConfirmButton (AlertDialog)
└─ reveal dialog                data-slot="api-key-secret": Alert "copy it now" + CopyField
```

## API

**ApiKeys**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `keys` | `readonly ApiKeyRecord[]` | required | `{ id, name, prefix, last4?, scopes, createdAt, expiresAt?, lastUsedAt?, revokedAt? }`. Dates are ms, ISO string or Date. |
| `scopes` | `readonly ApiKeyScope[]` | required | Every scope a key can get: `{ id, label, description? }`. |
| `defaultScopes` | `readonly string[]` | none | Ticked when the form opens. |
| `expiryOptions` | `readonly (number \| null)[]` | 7, 30, 90, 365, never | Days, `null` is never. |
| `defaultExpiryDays` | `number \| null` | `90` | Preselected expiry. |
| `onCreate` | `(input) => Promise<{ secret } \| { error }>` | required | Make the key. The secret is shown once. |
| `onRotate` | `(id) => Promise<{ secret } \| { error }>` | | Shows Rotate. The new secret is revealed once. |
| `onRevoke` | `(id) => Promise<void \| { error? }>` | | Shows Revoke. |
| `labels` | `Partial<ApiKeysLabels>` | | Override any string. |

**Helpers** (pure, tested): `maskKey(prefix, last4)`, `keyStatus(record, now?)`, `expiryFromDays(days, now?)`,
`daysLeft(date, now?)`, `toggleScope(all, selected, id)`, `EXPIRING_DAYS` (7).

## Examples

**Rotate**

```tsx
import { ApiKeys, type ApiKeyRecord } from "@fadymondy/nasaq/web";

declare const keys: ApiKeyRecord[];
declare const api: { rotate(id: string): Promise<string> };

export const Rotating = () => (
  <ApiKeys
    keys={keys}
    scopes={[{ id: "read", label: "Read" }]}
    onCreate={async () => ({ error: "Not in this example" })}
    onRotate={async (id) => ({ secret: await api.rotate(id) })}
  />
);
```

## Accessibility

- Dialogs trap focus and return it. The confirm dialogs are `AlertDialog`: focus lands on Cancel, Escape closes.
- Status is text plus colour, never colour alone. Scope checkboxes are in a labelled group.
- The reveal dialog announces that the secret will not be shown again. Errors are `role="alert"`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Keys, prefixes and secrets are `dir="ltr"`.

## Styling & tokens

- Built on `Card`, `Dialog`, `AlertDialog`, `Status`, `Badge`, `CopyField` and `--nq-*` tokens.
- Target `[data-slot="api-key"][data-status="expiring"]`.

## Do / Don't

- Do store only a hash of the secret on the server and return the secret from `onCreate` once.
- Do give every key the narrowest scopes and an expiry.
- Don't log the returned secret or keep it in client state after the dialog closes. The component drops it after close.
- Don't show the full key in the list.

## Related

- [`McpConnect`](../mcp-connect/README.md)
- [`CopyButton`](../copy-button/README.md)
- [`AlertDialog`](../alert-dialog/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-developer-tools-api-keys--docs
