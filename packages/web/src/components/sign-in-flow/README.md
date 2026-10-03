---
name: sign-in-flow
title: SignInFlow
category: auth
status: beta
summary: "Identifier-first sign-in: the email and the providers first, then the step your backend picks for that address (password, one-time code, sign-in link, SSO, sign-up or blocked), with two-factor and forgot password in place."
exports: [SignInFlow, SignInFlowProps, SignInFlowLabels, SignInNext, SignInStep, SignInAlternative, SignInPasswordResult]
related: [auth-layout, login-form, oauth-buttons, verify-otp-form, two-factor-challenge, forgot-password-form, reset-password-form, password-input]
story: components-auth-sign-in-flow
base-ui: []
keywords: [auth, sign in, login, identifier first, email first, sso, saml, oauth, passkey, one-time code, magic code, magic link, two-factor, 2fa, forgot password, blocked, enterprise]
---

# SignInFlow

The sign-in that starts with one question: which email? The first screen shows only an email field, the OAuth
providers and (when supported) a passkey button. Your backend looks at the address and answers with the next step:

- **password**: the account has a password.
- **code**: a one-time code was emailed.
- **sso**: the domain belongs to an organisation with single sign-on, so no password is asked here at all.
- **register**: no account uses this address; offer sign-up.
- **link-sent**: a sign-in link was emailed.
- **blocked**: this address may not sign in here (suspended, another tenant, no allowed method).

After a password, `onPassword` can answer `{ twoFactor: true }` and the flow asks for a second factor with
`TwoFactorChallenge`. With `onForgotPassword`, "Forgot password?" opens `ForgotPasswordForm` in place with the email
filled in.

Every later step shows the chosen email with a **Change** button, so people can always go back.

## When to use

- The default sign-in for any product, and the only sane one when some customers use SSO.
- When you want to add passkeys, codes or SSO later without redesigning the first screen.

## When not to use

- A single-method product that will only ever have email + password: `LoginForm` is shorter.
- Sign-up: use `RegisterForm` (the register step hands off to it with `onRegister`).

## Import

```tsx
import { SignInFlow } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

The smallest sign-in: email first, then the password. Without `onIdentify` every address goes to the password step.

```tsx
import { AuthLayout, SignInFlow } from "@fadymondy/nasaq/web";

export function SignInPage() {
  return (
    <AuthLayout
      title="Sign in"
      prompt={<>Don't have an account? <a href="/sign-up">Create one</a></>}
    >
      <SignInFlow
        onPassword={async ({ email, password, remember }) => {
          const res = await api.signIn(email, password, remember);
          if (!res.ok) return { error: "Wrong email or password." };
        }}
        forgotPassword={<a href="/forgot-password">Forgot password?</a>}
      />
    </AuthLayout>
  );
}
```

**Email only (passwordless).** Leave out `onIdentify` and `onPassword`: the flow emails a code and asks for it.

```tsx
<SignInFlow
  onRequestCode={async (email) => { await api.sendCode(email); }}
  onCode={async ({ email, code }) => {
    const res = await api.verifyCode(email, code);
    if (!res.ok) return { error: "That code is not right." };
  }}
/>
```

**Magic link only.** Leave out `onIdentify`, `onPassword` and `onRequestCode`: every address gets a sign-in link.

```tsx
<SignInFlow onMagicLink={async (email) => { await api.sendLink(email); }} />
```

**Full flow.** Let the backend pick the step for each address:

```tsx
import { AuthLayout, SignInFlow, type SignInStep } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function SignInPage() {
  const [step, setStep] = useState<SignInStep>("email");
  return (
    <AuthLayout title={step === "email" ? "Sign in" : "Welcome back"}>
      <SignInFlow
        onStepChange={setStep}
        onIdentify={async (email) => (await api.lookup(email)).next} // { step: "password" | "code" | "sso" | "register" }
        onPassword={async ({ email, password, remember }) => {
          const res = await api.signIn(email, password, remember);
          if (!res.ok) return { error: "Wrong email or password." };
        }}
        onTwoFactor={async ({ email, code, method, trustDevice }) => api.verify2fa(email, code, method, trustDevice)}
        onMagicLink={async (email) => { await api.sendLink(email); }}
        onForgotPassword={async (email) => { await api.sendReset(email); }}
        onSso={(email) => { window.location.href = `/sso/start?email=${encodeURIComponent(email)}`; }}
        onRegister={(email) => router.push(`/sign-up?email=${encodeURIComponent(email)}`)}
        oauthProviders={["google", "microsoft"]}
        onOAuth={(id) => { window.location.href = `/oauth/${id}`; }}
      />
    </AuthLayout>
  );
}
```

## Anatomy

```
SignInFlow                        data-slot="sign-in-flow", data-step="email" | "password" | "code" | "sso" | "register"
                                  | "link-sent" | "blocked" | "two-factor" | "forgot"
└─ step                           data-slot="sign-in-flow-step" (remounts on every step, so it re-enters)
   ├─ email step
   │  ├─ form                     data-slot="sign-in-flow-email": email field + Continue
   │  ├─ OAuthDivider + OAuthButtons
   │  └─ passkey button           data-slot="sign-in-flow-passkey"
   └─ later steps
      ├─ identity chip            data-slot="sign-in-flow-identity": the email + Change
      └─ password form | VerifyOtpForm | TwoFactorChallenge | SSO notice | register notice
         | link sent (data-slot="sign-in-flow-link-sent", resend "sign-in-flow-resend")
         | blocked notice (data-slot="sign-in-flow-blocked")
   forgot step                    data-slot="sign-in-flow-forgot": ForgotPasswordForm + Back to sign in (no identity chip)
```

## API

**SignInFlow**: every `div` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onIdentify` | `(email) => SignInNext \| AuthSubmitResult` (or a promise) | | Decide the next step. Return `{ error }` / `{ fieldErrors }` to stay on the email step; return nothing (or leave it out) for the default step: the password step when `onPassword` is set, otherwise the code step (it calls `onRequestCode` first). |
| `onPassword` | `({ email, password, remember }) => SignInPasswordResult` | | The password step. Return `{ twoFactor: true, length? }` to go to the two-factor step. |
| `onTwoFactor` | `({ email, code, method, trustDevice }) => AuthSubmitResult` | | The two-factor step (`TwoFactorChallenge`: authenticator or recovery code). |
| `onTwoFactorPasskey` | `() => void \| Promise` | | Passkey as the second factor. |
| `onMagicLink` | `(email) => AuthSubmitResult` | | Emails a sign-in link. Adds "Email me a sign-in link" to the password step, powers the resend, and is the default step when there is no `onPassword` or `onRequestCode`. |
| `resendSeconds` | `number` | `30` | Resend timer for links and reset emails. |
| `onForgotPassword` | `(email) => AuthSubmitResult` | | Emails a reset link. Adds "Forgot password?" (unless `forgotPassword` is set) which opens the request in place. The reset happens on the link's page with `ResetPasswordForm`. |
| `onRequestCode` | `(email) => AuthSubmitResult` | | Emails a code. Adds "Email me a code instead" to the password step and powers Resend. |
| `onCode` | `({ email, code }) => AuthSubmitResult` | | The code step. `{ step: "code", length }` sets the number of digits. |
| `onSso` | `(email) => AuthSubmitResult` | | Redirect to the identity provider. `{ step: "sso", connection }` names it on the button. |
| `onRegister` | `(email) => void` | | Go to sign-up with the email filled in. |
| `oauthProviders` | `OAuthProvider[]` | | Providers on the email step. |
| `onOAuth` | `(id) => void \| Promise` | | Called with the provider id. |
| `onPasskey` | `() => void \| Promise` | | Shows "Sign in with a passkey" when the browser supports WebAuthn. |
| `lastUsed` | `string \| null` | | `"passkey"` or a provider id: marks that button "Last used". Read it from your own cookie; the flow stores nothing. |
| `onPasskeyAutofill` | `(signal: AbortSignal) => void \| Promise` | | Passkey autofill (conditional UI) on the email field. |
| `forgotPassword` | `ReactNode` | | Slot beside the password label. |
| `showRemember` | `boolean` | `true` | "Keep me signed in" on the password step. |
| `defaultEmail` | `string` | | Prefill the email. |
| `onStepChange` | `(step, email) => void` | | Swap the page title per step. |
| `labels` | `Partial<SignInFlowLabels>` | en / ar | Override any string. `ssoWith` takes `{connection}`. |

`SignInNext` is `{ step: "password"; alternatives? } | { step: "code"; length? } | { step: "sso"; connection? } |
{ step: "register" } | { step: "link-sent" } | { step: "blocked"; message? }`. `alternatives` (`SignInAlternative[]`:
`"code"`, `"magic-link"`) limits the other ways in on the password step for that address; `[]` hides them.
`SignInStep` is `"email"`, one of those steps, `"two-factor"` or `"forgot"`.

## Examples

**Route by domain on the server** (the lab story does the same with a fake backend):

```ts
async function lookup(email: string): Promise<SignInNext> {
  const org = await orgs.byDomain(email.split("@")[1]);
  if (org?.sso) return { step: "sso", connection: org.ssoName };
  const user = await users.byEmail(email);
  if (!user) return { step: "register" };
  if (user.suspended) return { step: "blocked" };
  return user.hasPassword ? { step: "password", alternatives: user.allowLinks ? undefined : [] } : { step: "code" };
}
```

## Accessibility

- Each step is a real `<form>` with labelled fields; errors use the shared error summary and move focus to it.
- The email field is focused on load; the password and code steps focus their field when they open.
- The password step keeps a hidden `username` field with the email, so password managers save the right pair.
- The email field uses `autocomplete="username webauthn"` when passkey autofill is on.
- The password step warns "Caps Lock is on." in a `role="status"` region under the field, so screen readers hear it
  too. It clears when Caps Lock goes off or the field loses focus.
- The "Last used" badge is text inside the button, so it is part of the button's accessible name.
- The link-sent step is a `role="status"` region and its heading takes focus; the resend button counts down and a
  polite status says when a new link went out.

## Security notes

- Asking for the email first means your backend decides what to reveal. If you do not want to leak whether an account
  exists, never return `register`: return `password` or `code` for every address and fail at the next step.
- Return `blocked` only when you are happy to say the address exists; otherwise fail at the next step.
- SSO domains never see a password field, so users cannot type their IdP password into your app.
- Put the flow in `AuthLayout`: its origin line confirms a secure connection and names the host under the card, and
  it turns into a warning on an insecure page.
- `lastUsed` helps people pick the same method again instead of creating a second account. Keep the cookie to the
  method id only, never the email.

## Motion

The steps enter with the `AuthLayout` stagger. On the first render they join the card's entrance; after a step
change (`data-moved`) only the new step's rows rise 6px, 50ms apart, with no delay. `prefers-reduced-motion` turns it off.

## RTL & i18n

- English and Arabic strings are built in and follow the locale provider.
- The email is always shown LTR (`<bdi dir="ltr">`) and the field is `ltr`, in both directions.
- The Change arrow points back in the reading direction (it flips in RTL).

## Styling & tokens

- Only `--nq-*` tokens. The notices use the card radius and `border-border`.
- Target steps with `[data-slot="sign-in-flow"][data-step="…"]`.

## Do / Don't

- Do keep the first screen to the email, the providers and a passkey.
- Do name the SSO connection (`connection: "Acme Okta"`) so people recognise it.
- Don't ask for the password on the first screen: that is `LoginForm`.
- Don't put the flow in a dialog; it owns focus between steps.

## Related

- [`auth-layout`](../auth-layout/README.md)
- [`login-form`](../login-form/README.md)
- [`oauth-buttons`](../oauth-buttons/README.md)
- [`verify-otp-form`](../verify-otp-form/README.md)
- [`two-factor-challenge`](../two-factor-challenge/README.md)
- [`forgot-password-form`](../forgot-password-form/README.md)
- [`reset-password-form`](../reset-password-form/README.md)
- [`password-input`](../password-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-auth-sign-in-flow--docs
