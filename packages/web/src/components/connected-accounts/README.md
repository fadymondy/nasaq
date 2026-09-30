---
name: connected-accounts
title: ConnectedAccounts
category: account
status: beta
summary: OAuth sign-in methods for an account, each provider with its official logo, the connected email or username, and Connect or Disconnect, and the last remaining sign-in method cannot be disconnected.
exports: [ConnectedAccounts, ConnectedAccountsProps, ConnectedProvider, ConnectedProviderId, ConnectedAccountsLabels]
related: [oauth-buttons, alert-dialog, tooltip, passkey-list, card]
story: components-account-connected-accounts
base-ui: [alert-dialog, tooltip, button]
keywords: [oauth, connected accounts, linked accounts, google, github, apple, microsoft, sign in, disconnect]
---

# ConnectedAccounts

The social accounts linked to a sign-in. It lists each provider, shows the email or username that is
connected, and offers Connect or Disconnect. Your callbacks start the OAuth flow and remove the link.

## When to use

- The security page of an account.

## When not to use

- Sign in and sign up screens: use [`OAuthButtons`](../oauth-buttons/README.md).

## Import

```tsx
import { ConnectedAccounts } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ConnectedAccounts, type ConnectedProvider } from "@fadymondy/nasaq/web";

declare const providers: ConnectedProvider[];
declare const api: { connect(id: string): Promise<void>; disconnect(id: string): Promise<void> };

export function Accounts() {
  return (
    <ConnectedAccounts
      providers={providers}
      otherSignInMethods={1} // the password
      onConnect={api.connect}
      onDisconnect={api.disconnect}
    />
  );
}
```

## Anatomy

```
ConnectedAccounts                  data-slot="connected-accounts"
└─ ul  aria-label
   └─ li                           data-slot="connected-account", data-provider, data-connected
      ├─ official logo
      ├─ name, and the account (left-to-right) or "Not connected"
      ├─ the "last method" explanation (when it applies)
      └─ Connect  |  Disconnect (ConfirmButton)  |  Disconnect disabled with a Tooltip
```

## API

**ConnectedAccounts**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `providers` | `readonly ConnectedProvider[]` | required | The rows, in order. |
| `onConnect` | `(id) => Promise<void>` | required | Start OAuth. A throw shows an error. |
| `onDisconnect` | `(id) => Promise<void \| { error? }>` | required | Remove the link, after the confirm dialog. |
| `otherSignInMethods` | `number` | `0` | Ways to sign in that are not in this list: a password counts 1, each passkey 1. |
| `labels` | `Partial<ConnectedAccountsLabels>` | | Override any string. |

**ConnectedProvider**: `{ id, connected, account?, name?, icon? }`. The ids `google`, `github`, `apple` and
`microsoft` use the official logos from [`OAuthButtons`](../oauth-buttons/README.md). For any other id pass
`name` and the provider's own official logo as `icon`. Nasaq does not draw provider logos and you should
not redraw, recolour or replace them with a generic icon.

**The last-method rule**: when connected accounts plus `otherSignInMethods` is 1 or less, the Disconnect
button on the remaining account is disabled, a tooltip explains why and so does a visible line (tooltips do
not show on touch). Enforce the same rule on the server.

## Examples

**A custom provider**

```tsx
import { ConnectedAccounts } from "@fadymondy/nasaq/web";

declare const OktaLogo: () => JSX.Element; // the official Okta mark, from Okta's brand kit

export function Accounts() {
  return (
    <ConnectedAccounts
      providers={[{ id: "okta", name: "Okta", icon: <OktaLogo />, connected: false }]}
      onConnect={async () => {}}
      onDisconnect={async () => {}}
    />
  );
}
```

## Accessibility

- The list is a labelled `ul`. Each button includes the provider name for screen readers ("Disconnect GitHub").
- The disabled Disconnect stays focusable and is described by the visible explanation, so keyboard and screen reader users get the reason.
- Disconnect uses `AlertDialog`. Logos are decorative (`aria-hidden`); the name is text.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The connected email or username is left-to-right in Arabic.
- Logos are never mirrored.

## Styling & tokens

- `Card`, `Button`, `Status` and `--nq-*` tokens. GitHub and Apple logos switch black or white with the theme. Target `[data-slot="connected-account"][data-connected]`.

## Do / Don't

- Do enforce the last-method rule on the server as well.
- Do pass `otherSignInMethods` honestly: count the password only if the account has one.
- Don't substitute a generic icon for a missing logo.

## Related

- [`OAuthButtons`](../oauth-buttons/README.md)
- [`PasskeyList`](../passkey-list/README.md)
- [`AlertDialog`](../alert-dialog/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-connected-accounts--docs
