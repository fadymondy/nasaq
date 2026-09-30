---
name: oauth-consent
title: OAuthConsent
category: auth
status: beta
summary: "Authorization screen for a third-party app: app identity, signed-in account, requested scopes with sensitive badges, Allow and Deny, and the redirect host."
exports: [OAuthConsent, ConsentApp, ConsentScope, ConsentAccount, OAuthConsentLabels, OAuthConsentProps]
related: [auth-layout, oauth-buttons, avatar, badge]
story: components-auth-oauth-consent
base-ui: [avatar]
keywords: [oauth, consent, authorize, scopes, permissions, third-party app, allow, deny]
---

# OAuthConsent

The screen a third-party app sends people to. It names the app and its publisher, shows which account will be used
(with a switch button), lists what the app asks for, and offers Allow and Deny. Broad permissions are marked
"Sensitive".

## When to use

- The provider side of an OAuth or OpenID Connect flow.

## When not to use

- Signing in with a provider: use `OAuthButtons`.
- Managing granted apps later: use a connected-accounts list.

## Import

```tsx
import { OAuthConsent } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { OAuthConsent } from "@fadymondy/nasaq/web";

export function Consent() {
  return (
    <OAuthConsent
      headingLevel={1}
      app={{ name: "Zapline", publisher: "by Zapline Inc." }}
      account={{ name: "Fady Mondy", email: "fady@example.com" }}
      scopes={[{ id: "profile", label: "Read your profile" }, { id: "write", label: "Edit tasks", sensitive: true }]}
      redirectHost="app.zapline.io"
      onAllow={async () => { await api.allow(); }}
      onDeny={async () => { await api.deny(); }}
    />
  );
}

declare const api: { allow(): Promise<void>; deny(): Promise<void> };
```

## Anatomy

```
OAuthConsent                     data-slot="oauth-consent" (section)
├─ app logo + name + publisher
├─ heading                       "Zapline wants access to your account"
├─ account row                   Avatar, name, email, Switch account
├─ scopes list                   label, description, Sensitive badge
├─ error Alert                   role="alert"
├─ Deny + Allow                  per-action loading
└─ redirect note + revoke hint
```

## API

**OAuthConsent**: every `section` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `app` | `ConsentApp` | required | `{ name, logo?, publisher? }`. `logo` is a URL or a node; else the initial shows. |
| `scopes` | `ConsentScope[]` | required | `{ id, label, description?, sensitive? }`. |
| `account` | `ConsentAccount` | required | `{ name, email, avatar? }`. |
| `onAllow` | `() => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | Return `{ error }` to show a failure. |
| `onDeny` | `() => Promise<AuthSubmitResult> \| AuthSubmitResult` | required | |
| `onSwitchAccount` | `() => void` | | Shows "Switch account". |
| `redirectHost` | `string` | | Shown in "You will be sent back to {host}". |
| `productName` | `string` | brand name | The product the account belongs to. |
| `headingLevel` | `1 \| 2 \| 3` | `2` | Use `1` when this is the page's main heading. |
| `labels` | `Partial<OAuthConsentLabels>` | English or Arabic | Uses `{app}`, `{product}`, `{host}`. |

## Examples

**Failure keeps both buttons available**

```tsx
import { OAuthConsent } from "@fadymondy/nasaq/web";

export function Failing() {
  return (
    <OAuthConsent
      app={{ name: "Zapline" }}
      account={{ name: "Fady", email: "fady@example.com" }}
      scopes={[{ id: "p", label: "Read your profile" }]}
      onAllow={async () => ({ error: "The app could not be reached. Try again." })}
      onDeny={async () => {}}
    />
  );
}
```

## Accessibility

- One heading at the level you choose; scopes are a real list. The sensitive badge is text, not colour alone.
- Allow and Deny are ordinary buttons; the one running shows a spinner and `aria-busy`, and both stay reachable
  by keyboard. Deny is not styled as a destructive action.
- Errors are announced through a `role="alert"` Alert.

## RTL & i18n

- Built-in English and Arabic strings follow the Nasaq locale (`useNasaq`). Pass `labels` to change any of them or to
  add another language; keys you omit keep the built-in text.
- Layout uses logical properties, so it mirrors under `dir="rtl"` with no extra work.
- The redirect host and the email are isolated left to right inside Arabic sentences. App logos are not mirrored.

## Styling & tokens

- Built from `Card`-like surfaces, `Avatar`, `Badge`, `Button` and `Alert`; tokens only.

## Do / Don't

- Do show the redirect host so phishing is easier to spot.
- Do mark broad permissions as sensitive.
- Don't pre-select or auto-approve.
- Don't hide the account being used.

## Related

- [`auth-layout`](../auth-layout/README.md)
- [`oauth-buttons`](../oauth-buttons/README.md)
- [`avatar`](../avatar/README.md)
- [`badge`](../badge/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-oauth-consent--docs
