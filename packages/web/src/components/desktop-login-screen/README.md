---
name: desktop-login-screen
title: DesktopLoginScreen
category: auth
status: beta
summary: "A desktop OS sign-in screen. Wallpaper, a clock with a greeting, and a card with the mark and the Nasaq LoginForm, plus optional power buttons."
exports: [DesktopLoginScreenLabels, DesktopPowerAction, DesktopLoginScreenProps, DesktopLoginScreen]
related: [login-form, lock-screen, desktop-os-shell]
story: components-auth-pages-desktop-login-screen
base-ui: []
keywords: [login, sign in, desktop, os, clock, wallpaper, power, shutdown]
---

# DesktopLoginScreen

The first screen of a web OS: the time, a greeting and a sign-in card over a wallpaper. The form is `LoginForm`, so
passkeys, providers, errors and rate limiting work the same as on any Nasaq sign-in page.

## When to use

- Signing in to a desktop-style app built with `DesktopShell`.

## When not to use

- A person already signed in coming back after idle: use `LockScreen`.
- A normal web app sign-in page: use `AuthLayout` with `LoginForm`.

## Import

```tsx
import { DesktopLoginScreen } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DesktopLoginScreen } from "@fadymondy/nasaq/web";

export function SignIn() {
  return (
    <DesktopLoginScreen
      title="ToGO OS"
      onSubmit={async ({ email, password }) => {
        const ok = await api.signIn(email, password);
        if (!ok) return { error: "Incorrect email or password." };
      }}
    />
  );
}

declare const api: { signIn(e: string, p: string): Promise<boolean> };
```

## Anatomy

```
DesktopLoginScreen          data-slot="desktop-login-screen"
├─ wallpaper + scrim        aria-hidden
├─ clock                    greeting, time, date   (showClock)
├─ card                     <section> labelled by the title
│  ├─ mark, title, description
│  ├─ LoginForm | children
│  └─ footer
└─ power actions            <nav>  (powerActions)
```

## API

`div` props (except `children`, `title`, `onSubmit`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onSubmit` | `LoginFormProps["onSubmit"]` | | Resolve with nothing, or `{ error, fieldErrors }`. |
| `formProps` | `Omit<LoginFormProps, "onSubmit">` | | Passkeys, providers, forgot password, labels. |
| `children` | `ReactNode` | | Replaces the form. |
| `wallpaper` | `ReactNode` | | Under a scrim. |
| `mark` | `ReactNode` | `ProductMark` | `null` hides it. |
| `title` / `description` | `ReactNode` | `"Sign in"` | |
| `showClock` / `now` | `boolean` / `Date \| number` | `true` / live | Freeze time for docs. |
| `footer` | `ReactNode` | | Under the form. |
| `powerActions` | `{ id, label, icon, onSelect }[]` | | Round buttons at the bottom. |
| `labels` | `DesktopLoginScreenLabels` | | |

## Accessibility

- The card is a labelled `section` with an `h1`; the power buttons are a labelled `nav` and each has a name.
- Errors come from `LoginForm` and are announced.

## RTL & i18n

- Greetings and labels are in English and Arabic. The time uses `Intl` with Latin digits and stays left to right.

## Styling & tokens

- `rounded-card`, a hairline border and `bg-card/90` with a blur over the wallpaper. No shadows.

## Do / Don't

- Do keep the power actions real: hide them if they do nothing in a browser.
- Don't add a second form next to the card. Use `children` to replace it.

## Related

- [`login-form`](../login-form/README.md)
- [`lock-screen`](../lock-screen/README.md)
- [`desktop-os-shell`](../desktop-os-shell/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-pages-desktop-login-screen--docs
