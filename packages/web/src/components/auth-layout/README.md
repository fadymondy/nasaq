---
name: auth-layout
title: AuthLayout
category: auth
status: beta
summary: "Page shell for sign-in and sign-up screens: a centred card or a split layout with a brand panel, a heading, and a footer slot."
exports: [AuthLayout, AuthLayoutProps, AuthEmblem, AuthEmblemProps, AuthBackdrop, AuthOrigin, AuthFooter, AuthFooterLink, AuthFooterProps]
related: [sign-in-flow, login-form, register-form, oauth-consent, product-logo, card]
story: components-auth-auth-layout
base-ui: []
keywords: [auth, layout, sign in, sign up, login, page, split, card, shell, emblem, lock, identity]
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
import { AuthLayout, SignInFlow } from "@fadymondy/nasaq/web";

export function SignInPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Use your work email to continue."
      prompt={<>Don't have an account? <a href="/sign-up">Create one</a></>}
    >
      <SignInFlow onPassword={async ({ email, password }) => { /* sign in */ }} forgotPassword={<a href="/forgot-password">Forgot password?</a>} />
    </AuthLayout>
  );
}
```

For sign-in prefer [`SignInFlow`](../sign-in-flow/README.md) (email first, then password, code, SSO or sign-up);
`LoginForm` stays for products that only ever use a password.

## Anatomy

```
AuthLayout                        data-slot="auth-layout", data-variant="card" | "split"
├─ AuthBackdrop                   data-slot="auth-backdrop" (cubes and pointer layers; aria-hidden)
├─ AuthEmblem (the default mark)  data-slot="auth-emblem": rings of cells around a core
│  └─ core                         data-emblem-core: the product mark, which turns into a lock (data-emblem-lock)
├─ aside (split only, lg and up)  data-slot="auth-layout-panel", with its own AuthBackdrop
└─ main
   ├─ card (card variant)         the standard Card: mark, centred h1 + description, children, prompt
   │  └─ prompt                    data-slot="auth-layout-prompt": "Don't have an account? Create one"
   │  (split: the same stack, straight on the page, with the mark on top of the form)
   ├─ AuthOrigin (card variant)   data-slot="auth-origin": secure-connection check + the current host
   └─ footer                      AuthFooter or your own
```

## API

**AuthLayout**: every `div` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"card" \| "split"` | `"card"` | Centred card, or two columns from the `lg` breakpoint. |
| `mark` | `ReactNode` | `<AuthEmblem />` | The brand mark on top of the form, above the title, in both variants. `null` hides it. |
| `title` | `ReactNode` | | Page heading, rendered as the `h1`. |
| `description` | `ReactNode` | | One line under the title. |
| `panel` | `ReactNode` | | Content of the brand side in the split layout. Hidden below `lg`. |
| `logo` | `ReactNode` | `<ProductLogo />` | Your own logo in the default split panel (when no `panel` is passed). Use it, with `mark`, so an app that is not a Nasaq brand never shows a Nasaq mark. |
| `prompt` | `ReactNode` | | One centred line under the form that links to the other auth page: "Don't have an account? Create one" on sign-in, "Already have an account? Sign in" on sign-up. Links inside it get the foreground colour and an underline on hover. |
| `footer` | `ReactNode` | | Slot under the form. |
| `backdrop` | `boolean` | `true` | A plain lattice of tiny cubes around the form; the cubes under the mouse light up. |
| `origin` | `ReactNode \| false` | `<AuthOrigin />` | The line under the card that says whether the connection is secure and names the host. `false` hides it. Card variant only. |

**AuthEmblem**: the identity mark: rings of small cells in the brand colours around the product mark. Every `div` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | `number` | `112` | Width and height in px. The core mark is 30% of it. |
| `children` | `ReactNode` | `<ProductMark />` | What sits in the core before the lock. |
| `lock` | `boolean` | `true` | After the entrance the mark turns into a lock that clicks shut. `false` keeps the mark. |
| `busy` | `boolean` | | Scans the rings. Needed only outside an `AuthLayout`; inside one it scans while any control is `aria-busy`. |

It is decorative (`aria-hidden`). It is the default `mark`; render it yourself to change its size or core. It also
works on its own, over any component (a verify dialog, a passkey prompt, a loading card):

```tsx
import { AuthBackdrop, AuthEmblem, Button, Card, CardContent } from "@fadymondy/nasaq/web";

export function VerifyCard({ pending, onVerify }: { pending: boolean; onVerify: () => void }) {
  return (
    <div className="relative isolate grid place-items-center p-8">
      <AuthBackdrop />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <AuthEmblem size={96} busy={pending} />
          <p className="text-h3">Confirm it is you</p>
          <Button className="w-full" onClick={onVerify} aria-busy={pending}>Verify</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

Give the emblem its own heading or label nearby; it carries no accessible name.

**AuthBackdrop**: the scene on its own, for custom auth pages. Decorative: `aria-hidden`, no pointer events,
`absolute inset-0 -z-10`, so its parent needs `relative isolate`.

**AuthOrigin**: checks `window.isSecureContext` and shows `window.location.host`. On a secure page it reads
"Secure connection to example.com" with a green shield; on an insecure one it switches to a danger-coloured warning
not to enter a password there (`data-secure` is absent). Rendered after mount so server and client markup match.

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

## Motion

The page settles in with a calm, staged entrance (CSS only, in `@fadymondy/nasaq/web/styles.css`) so a sign-in
screen never just pops:

- **Backdrop:** the grid fades in once (900ms) and then stays still. When the mouse moves, the cubes under it light
  up and the light follows the cursor closely (120ms); it fades out when the mouse leaves the page. Touch does not
  trigger it. There are no gradients, lines or flashes; the form stays the brightest thing on the page.
- **Emblem:** the cells sweep in ring by ring (about 1s). At about 1.5s the mark fades out and a lock fades in, its
  shackle drops shut at about 2.2s, and one ripple of light runs out through the rings. After that the rings only
  turn, very slowly (a full turn takes 2 to 4 minutes, alternate rings in opposite directions). While the form is
  `aria-busy` (or the emblem has `busy`) the rings scan. With reduced motion the lock shows straight away and nothing moves.
- **Card:** the card lifts 12px (80ms). The mark, the heading and each row of the form follow 50ms apart from
  180ms. The footer fades in last (520ms).
- `SignInFlow` steps join the same stagger; after a step change only the new step's rows move.
- **Split:** the brand panel fades in while the form side staggers from 60ms.
- A `<form>` passed as a child is staggered row by row (its direct children), not as one block.
- The page entrance is finished by about 1s, the emblem's lock by about 2.5s. `prefers-reduced-motion` turns it off (the global guard; the pointer light is off), and the fill mode is
  `backwards`, so no transform is left on the page after the entrance.
- The entrance is vertical only, so it reads the same in LTR and RTL.

## RTL & i18n

- The split layout puts the panel at the inline start and the form at the end, so it flips in Arabic. The panel's
  divider is `border-e`.
- The mark and heading are centred in both variants.
- The host in the origin line is always LTR (`<bdi dir="ltr">`).

## Styling & tokens

- The card is the standard Nasaq `Card` and the form uses the standard `Button`s and fields, so a sign-in page
  looks like the rest of the product. The panel is `bg-muted`.
- The backdrop is a flat lattice of 2px cubes in `--foreground` at 8% (5% in dark mode, so the page stays dark), and
  the lit cubes under the pointer are `--foreground` at 40% (30% in dark). Change the spacing with `--nq-auth-cell`
  (default `12px`), the colours with `--nq-auth-dot` and `--nq-auth-lit`.
- The card keeps the standard `Card` surface, with a soft, deep shadow.
- Extend with `className`. The layout fills the viewport height (`min-h-svh`).

## Do / Don't

- Do put one auth form in each layout.
- Do link sign-in and sign-up to each other with `prompt`, and give the password field a "Forgot password?" link
  (the form's `forgotPassword` slot).
- Do give the split panel something useful, not only decoration.
- Don't nest an AuthLayout inside another one.
- Don't hide required information in the panel.

## Related

- [`sign-in-flow`](../sign-in-flow/README.md)
- [`login-form`](../login-form/README.md)
- [`register-form`](../register-form/README.md)
- [`oauth-consent`](../oauth-consent/README.md)
- [`product-logo`](../product-logo/README.md)
- [`card`](../card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-auth-layout--docs
