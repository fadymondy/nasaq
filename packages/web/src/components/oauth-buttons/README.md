---
name: oauth-buttons
title: OAuthButtons
category: auth
status: beta
summary: "Provider sign-in buttons for Google, GitHub, Apple and Microsoft with their official logos, stacked, in a grid or icon-only, with per-provider loading."
exports: [OAuthButtons, OAuthDivider, LastUsed, OAuthProviderId, OAuthCustomProvider, OAuthProvider, OAuthIntent, OAuthButtonsLabels, OAuthButtonsProps, OAuthDividerProps]
related: [login-form, register-form, button, auth-layout]
story: components-auth-oauth-buttons
base-ui: []
keywords: [oauth, social login, google, github, apple, microsoft, sso, provider, sign in with]
---

# OAuthButtons

A group of "Continue with X" buttons. Each provider's logo is the official artwork in its official colours; the
button text uses the approved verbs (Continue / Sign in / Sign up with). Clicking one shows a spinner on that
button and disables the others until your handler settles.

## When to use

- Under or above a sign-in or sign-up form.
- `intent="signup"` on registration screens, `"signin"` on login.

## When not to use

- Enterprise SAML or a provider list you fully own: pass `OAuthCustomProvider` items, or build a menu.
- Connecting accounts inside settings: use a connected-accounts list.

## Import

```tsx
import { OAuthButtons } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { OAuthButtons } from "@fadymondy/nasaq/web";

export function Providers() {
  return <OAuthButtons providers={["google", "github", "apple"]} onSelect={(id) => startOAuth(id)} />;
}

declare function startOAuth(id: string): Promise<void>;
```

## Anatomy

```
OAuthButtons                     data-slot="oauth-buttons", role="group"
└─ Button (one per provider)     data-slot="oauth-button", data-provider
   ├─ logo                        official SVG, aria-hidden
   ├─ label                       "Continue with Google"
   └─ LastUsed (optional)         data-slot="last-used": the "Last used" pill at the inline end
OAuthDivider                     data-slot="oauth-divider" (the "or" rule)
```

## API

**OAuthButtons**: every `div` prop except `onSelect`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `providers` | `OAuthProvider[]` | `["google", "github"]` | Ids (`google`, `github`, `apple`, `microsoft`) or custom `{ id, label, icon }`. |
| `onSelect` | `(id: string) => void \| Promise<unknown>` | required | Called with the provider id. A returned promise drives the loading state. |
| `layout` | `"stack" \| "grid" \| "icon-only"` | `"stack"` | Full-width rows, two columns, or square icon buttons. |
| `intent` | `"signin" \| "signup" \| "continue"` | `"continue"` | Which verb the labels use. |
| `pendingProvider` | `string \| null` | | Hold a provider in the loading state from outside (redirect flows). |
| `lastUsed` | `string \| null` | | Provider id to mark "Last used" (not shown in `icon-only`). Read it from your own cookie; the component stores nothing. |
| `disabled` | `boolean` | `false` | Disable all buttons. |
| `labels` | `Partial<OAuthButtonsLabels>` | English or Arabic | `signin`, `signup`, `continue` (use `{provider}`), `group`, `divider`, `lastUsed`. |

**LastUsed**: the small pill on its own, for other sign-in buttons (the passkey button in `SignInFlow` uses it).
Give its parent `relative`.

**OAuthDivider**: a horizontal rule with centred text. `children` defaults to "or" / "أو".

Logos: Google (multicolour "G"), GitHub (Octicon mark, follows text colour), Apple (black on light, white on dark)
and Microsoft (four squares) are the official marks, never recoloured, mirrored or redrawn. Source URLs are in
`oauth-logos.tsx`.

## Examples

**Sign-up, two columns**

```tsx
import { OAuthButtons, OAuthDivider } from "@fadymondy/nasaq/web";

export function SignUpProviders() {
  return (
    <>
      <OAuthButtons layout="grid" intent="signup" providers={["google", "microsoft"]} onSelect={begin} />
      <OAuthDivider />
    </>
  );
}

declare function begin(id: string): Promise<void>;
```

**A custom provider**

```tsx
import { OAuthButtons } from "@fadymondy/nasaq/web";

export function Sso() {
  return (
    <OAuthButtons
      providers={["google", { id: "okta", label: "Continue with Okta", icon: <span aria-hidden="true">O</span> }]}
      onSelect={() => {}}
    />
  );
}
```

## Accessibility

- The group has an accessible name (`labels.group`). Each button's name is the full text ("Continue with Google"), the
  logo is `aria-hidden`. In `icon-only` layout the text is kept as the accessible name.
- Loading buttons are `aria-busy`; the other buttons are disabled while one is pending.
- The "Last used" text is inside the button, so it is read as part of its name.
- All buttons are keyboard operable and show the standard focus ring.

## RTL & i18n

- Logos are never mirrored, in either direction. Only the position of the icon relative to the text flips.
- Provider names stay in Latin script inside Arabic labels (`المتابعة عبر Google`), as the brands require.
- The divider text follows the locale ("أو").

## Styling & tokens

- Buttons are the secondary `Button`; Apple is a black button in light theme and white in dark, per Apple's guidelines.
- Brand colours live only inside the logo SVGs. Everything else uses `--nq-*` tokens.

## Do / Don't

- Do keep the provider order the same on sign-in and sign-up.
- Do use the official verbs through `intent`.
- Don't restyle, recolour or redraw a provider logo.
- Don't show a provider you have not configured.

## Related

- [`login-form`](../login-form/README.md)
- [`register-form`](../register-form/README.md)
- [`button`](../button/README.md)
- [`auth-layout`](../auth-layout/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-oauth-buttons--docs
