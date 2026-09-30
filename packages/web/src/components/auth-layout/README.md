---
name: auth-layout
title: AuthLayout
category: auth
status: beta
summary: "Page shell for sign-in and sign-up screens: a centred card or a split layout with a brand panel, a heading, and a footer slot."
exports: [AuthLayout, AuthLayoutProps, AuthFooter, AuthFooterLink, AuthFooterProps]
related: [login-form, register-form, oauth-consent, product-logo, card]
story: components-auth-auth-layout
base-ui: []
keywords: [auth, layout, sign in, sign up, login, page, split, card, shell]
---

# AuthLayout

The page around an auth form. It gives the screen a `<main>`, the product mark, an `h1` with an optional description, and a
footer slot. Use it with any of the auth forms; the forms themselves render no heading.

## When to use

- Every sign-in, sign-up, recovery, verification and consent page.
- `variant="split"` when you have a brand panel to show beside the form on wide screens.

## When not to use

- Inside an app shell or a dialog: render the form directly.
- For account settings pages: use a settings layout.

## Import

```tsx
import { AuthLayout } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AuthLayout, LoginForm } from "@fadymondy/nasaq/web";

export function SignInPage() {
  return (
    <AuthLayout title="Welcome back" description="Sign in to your account.">
      <LoginForm onSubmit={async (values) => { /* call your API */ }} />
    </AuthLayout>
  );
}
```

## Anatomy

```
AuthLayout                       data-slot="auth-layout", data-variant="card" | "split"
├─ aside (split only, lg and up) data-slot="auth-layout-panel"
└─ main
   ├─ mark                        defaults to ProductLogo
   ├─ h1 + description
   ├─ children                    the form
   └─ footer                      AuthFooter or your own
```

## API

**AuthLayout**: every `div` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"card" \| "split"` | `"card"` | Centred card, or two columns from the `lg` breakpoint. |
| `mark` | `ReactNode` | `<ProductLogo size={28} />` | The brand mark above the title. |
| `title` | `ReactNode` | | Page heading, rendered as the `h1`. |
| `description` | `ReactNode` | | One line under the title. |
| `panel` | `ReactNode` | | Content of the brand side in the split layout. Hidden below `lg`. |
| `footer` | `ReactNode` | | Slot under the form. |

**AuthFooter**: `links?: AuthFooterLink[]` (`{ label, href, external? }`) and `end?: ReactNode` (usually a
`LocaleSwitcher`). External links open in a new tab with `rel="noreferrer"`.

Shared types: `AuthSubmitResult` and `AuthSubmitFailure` (`{ error?, fieldErrors? }`) are exported from the package
and are what every auth form's `onSubmit` may return.

## Examples

**Split layout with a brand panel**

```tsx
import { AuthFooter, AuthLayout, LocaleSwitcher, LoginForm } from "@fadymondy/nasaq/web";

export function SplitSignIn() {
  return (
    <AuthLayout
      variant="split"
      panel={<p className="text-h2">One account for every product.</p>}
      title="Welcome back"
      footer={<AuthFooter links={[{ label: "Terms", href: "/terms" }]} end={<LocaleSwitcher />} />}
    >
      <LoginForm onSubmit={async () => {}} />
    </AuthLayout>
  );
}
```

## Accessibility

- The content sits in `<main>`; the title is the page's single `h1`. Do not add another `h1` inside (for the consent
  screen pass `headingLevel={1}` and omit `title`).
- The brand panel is decorative content in an `aside`; do not put the only copy of important information there,
  it is hidden on small screens.
- Footer links are a real `<nav>` list of anchors.

## RTL & i18n

- The split layout puts the panel at the inline start and the form at the end, so it flips in Arabic. The panel's
  divider is `border-e`.
- The mark and footer align to the inline start.

## Styling & tokens

- Surfaces use `--nq-*` tokens: the card is `Card`, the panel is `bg-muted`.
- Extend with `className`. The layout fills the viewport height (`min-h-svh`).

## Do / Don't

- Do put one auth form in each layout.
- Do give the split panel something useful, not only decoration.
- Don't nest an AuthLayout inside another one.
- Don't hide required information in the panel.

## Related

- [`login-form`](../login-form/README.md)
- [`register-form`](../register-form/README.md)
- [`oauth-consent`](../oauth-consent/README.md)
- [`product-logo`](../product-logo/README.md)
- [`card`](../card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-auth-layout--docs
