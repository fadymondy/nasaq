---
name: passkey-list
title: PasskeyList
category: security
status: beta
summary: Manage the passkeys on an account with a list with device hint, created and last-used dates, add through an async callback, rename in place, remove with confirmation, an unsupported-browser notice and an empty state.
exports: [PasskeyList, PasskeyListProps, Passkey, PasskeyKind, PasskeyLabels, isPasskeySupported]
related: [alert-dialog, states, card, two-factor-setup, connected-accounts, numeric]
story: components-security-passkey-list
base-ui: [alert-dialog, input, button]
keywords: [passkey, webauthn, fido, security key, biometric, passwordless, account, security]
---

# PasskeyList

The list of passkeys on an account, with add, rename and remove. It only draws the list: your `onAdd`
runs the WebAuthn ceremony (`navigator.credentials.create`) and saves the credential.

## When to use

- The security page of an account, next to two-factor and the password.

## When not to use

- Signing in with a passkey: that is a button on your sign-in form, not a list.
- Two-factor with an authenticator app: use [`TwoFactorSetup`](../two-factor-setup/README.md).

## Import

```tsx
import { PasskeyList, isPasskeySupported } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { PasskeyList, type Passkey } from "@fadymondy/nasaq/web";

declare const passkeys: Passkey[];
declare const api: { register(): Promise<void>; rename(id: string, name: string): Promise<void>; remove(id: string): Promise<void> };

export function Passkeys() {
  return <PasskeyList passkeys={passkeys} onAdd={api.register} onRename={api.rename} onRemove={api.remove} />;
}
```

## Anatomy

```
PasskeyList                        data-slot="passkey-list"
├─ Card header                     title, description, Add button (when the list is not empty)
├─ Alert                           unsupported browser, or an error from add/remove
└─ ul  aria-label
   └─ li                           data-slot="passkey-row"
      ├─ kind icon                 device, synced or security key
      ├─ name (or an inline form)  Enter saves, Escape cancels
      ├─ authenticator hint · Added <date> · Last used <relative>
      └─ Rename, Remove            Remove opens a ConfirmButton
```

The empty list renders an `EmptyState` with the add button.

## API

**PasskeyList**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `passkeys` | `readonly Passkey[]` | required | The passkeys to show. |
| `onAdd` | `() => Promise<void>` | required | Run the ceremony and save. Throw on failure; a `NotAllowedError` shows the "cancelled" message. |
| `onRename` | `(id, name) => Promise<void \| { error? }>` | | Shows the pencil. `{ error }` keeps the field open. |
| `onRemove` | `(id) => Promise<void \| { error? }>` | | Shows the remove button with a confirm dialog. |
| `supported` | `boolean` | `isPasskeySupported()` after mount | Force the browser check. |
| `labels` | `Partial<PasskeyLabels>` | | Override any string. |

**Passkey**: `{ id, name, kind?: "device" \| "synced" \| "security-key", authenticator?, createdAt, lastUsedAt? }`. Dates are `Date`, number or ISO string.

**isPasskeySupported(): boolean**: true when `window.PublicKeyCredential` exists. False on the server.

## Examples

**Show the add button only when supported**

```tsx
import { isPasskeySupported } from "@fadymondy/nasaq/web";

export const canUsePasskeys = () => isPasskeySupported();
```

## Accessibility

- The list is a labelled `ul`. The icon buttons name the passkey: "Rename: MacBook Pro", "Remove: MacBook Pro".
- The rename input has an accessible name, Enter saves and Escape cancels. Save and Cancel are buttons with labels.
- Removal uses `AlertDialog`: focus starts on Cancel.
- Errors from rename are `role="alert"`; add and remove errors use `Alert`.
- Dates are `<time>` elements, and the relative "last used" has its absolute date in a `title`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Dates and relative times use the locale with Latin digits.
- The row mirrors: icon at the inline start, actions at the inline end.

## Styling & tokens

- `Card`, `Button`, `Alert` and `--nq-*` tokens. Target `[data-slot="passkey-row"]`.

## Do / Don't

- Do let people name a passkey: "iPhone" beats "Passkey 3".
- Do require a fresh sign-in on the server before removing one.
- Don't remove the last sign-in method: check on the server (see [`ConnectedAccounts`](../connected-accounts/README.md)).

## Related

- [`AlertDialog`](../alert-dialog/README.md)
- [`States`](../states/README.md)
- [`TwoFactorSetup`](../two-factor-setup/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-security-passkey-list--docs
