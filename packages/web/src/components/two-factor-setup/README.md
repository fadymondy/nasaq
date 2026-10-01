---
name: two-factor-setup
title: TwoFactorSetup
category: security
status: beta
summary: Presentational TOTP two-factor flow in three steps (scan the QR code or type the key, confirm a 6-digit code, save recovery codes) plus the enabled state with regenerate and disable, driven by async callbacks.
exports: [TwoFactorSetup, TwoFactorSetupProps, TwoFactorLabels, TwoFactorResult, groupSecret, normalizeSecret, parseOtpAuthUri, recoveryCodesText, OtpAuthInfo]
related: [otp-input, copy-button, alert-dialog, password-input, passkey-list, change-password-form]
story: components-security-two-factor-setup
base-ui: [alert-dialog, checkbox, field, input]
keywords: [2fa, two-factor, totp, authenticator, qr, otpauth, recovery codes, security, mfa]
---

# TwoFactorSetup

Turn on authenticator-app two-factor authentication. It draws the QR code in the browser, asks for a
6-digit code, then shows recovery codes. Once two-factor is on it shows the status, with regenerate and
disable. It has no backend: your callbacks call your server.

## When to use

- The security page of an account, where the person turns two-factor on or off.
- Any TOTP enrolment: the QR is made from the `otpauth://` URI you give it.

## When not to use

- Asking for the code at sign in: use [`OtpInput`](../otp-input/README.md) in your own step.
- SMS or email codes: those have no QR or secret; use `OtpInput`.
- Passkeys: use [`PasskeyList`](../passkey-list/README.md).

## Import

```tsx
import { TwoFactorSetup } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { TwoFactorSetup } from "@fadymondy/nasaq/web";

export function Security({ otpauthUri }: { otpauthUri: string }) {
  return (
    <TwoFactorSetup
      otpauthUri={otpauthUri}
      onVerify={async (code) => {
        const res = await api.verifyTotp(code);
        return res.ok ? { recoveryCodes: res.recoveryCodes } : { error: "That code did not match." };
      }}
      onComplete={() => api.refresh()}
    />
  );
}
declare const api: { verifyTotp(code: string): Promise<{ ok: boolean; recoveryCodes: string[] }>; refresh(): void };
```

## Anatomy

```
TwoFactorSetup                     data-slot="two-factor-setup", data-state="step-1|step-2|step-3|enabled"
├─ Card header                     title and description
├─ steps                           data-slot="two-factor-steps" (ol, aria-current="step")
├─ step 1  data-slot="two-factor-scan"
│  ├─ QR                           data-slot="two-factor-qr" (svg, role="img")
│  └─ "Can't scan?" details        data-slot="two-factor-key": key in groups of four + CopyButton
├─ step 2  data-slot="two-factor-verify": OtpInput + Verify
├─ step 3  data-slot="two-factor-recovery": codes, Copy all, Download .txt, "I saved these", Finish
└─ enabled: Status, codes left, Regenerate and Disable (each opens an AlertDialog with a password or code)
```

## API

**TwoFactorSetup**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `otpauthUri` | `string` | required | The `otpauth://totp/...` URI the QR encodes. |
| `secret` | `string` | read from the URI | Base32 secret shown for manual entry. |
| `enabled` | `boolean` | internal | Show the enabled state. Omit to let it switch after step 3. |
| `onVerify` | `(code) => Promise<void \| { error?; recoveryCodes? }>` | required | Verify the 6-digit code. `{ error }` keeps step 2 open with that message. `{ recoveryCodes }` feeds step 3. Recovery codes are optional: when neither `onVerify` nor `recoveryCodes` supplies any, step 3 is skipped and setup finishes (`onComplete` fires). |
| `recoveryCodes` | `readonly string[]` | | Codes for step 3 when you already have them. Set before `onVerify` resolves. |
| `onComplete` | `() => void` | | The user confirmed they saved the codes and pressed Finish. |
| `recoveryCodesRemaining` | `number` | | Enabled state: unused codes. Fewer than 3 shows a warning. |
| `confirmWith` | `"password" \| "code"` | `"password"` | What regenerate and disable ask for. |
| `onRegenerateRecoveryCodes` | `(credential) => Promise<string[] \| { error? }>` | | Shows the Regenerate button. New codes appear in place. |
| `onDisable` | `(credential) => Promise<void \| { error? }>` | | Shows the Disable button. |
| `downloadFilename` | `string` | `"recovery-codes.txt"` | Name of the downloaded file. |
| `labels` | `Partial<TwoFactorLabels>` | | Override any string. |

**Helpers** (pure, tested): `groupSecret(secret, size = 4)` gives `"JBSW Y3DP EHPK 3PXP"`; `normalizeSecret`;
`parseOtpAuthUri(uri)` returns `{ secret, issuer, account }` or `null`; `recoveryCodesText(codes, header?)`.

## Examples

**Return an error from the server**

```tsx
import { TwoFactorSetup } from "@fadymondy/nasaq/web";

export function Setup({ uri }: { uri: string }) {
  return (
    <TwoFactorSetup
      otpauthUri={uri}
      onVerify={async (code) => {
        const res = await fetch("/api/2fa/verify", { method: "POST", body: JSON.stringify({ code }) });
        return res.ok ? { recoveryCodes: (await res.json()).recoveryCodes } : { error: "That code did not match." };
      }}
    />
  );
}
```

**Enabled, with a code as confirmation**

```tsx
import { TwoFactorSetup } from "@fadymondy/nasaq/web";

declare const api: { regenerate(code: string): Promise<string[]>; disable(code: string): Promise<void> };

export function Enabled() {
  return (
    <TwoFactorSetup
      otpauthUri=""
      enabled
      confirmWith="code"
      recoveryCodesRemaining={4}
      onVerify={async () => undefined}
      onRegenerateRecoveryCodes={(code) => api.regenerate(code)}
      onDisable={(code) => api.disable(code)}
    />
  );
}
```

## Accessibility

- The QR is an `img` with a text alternative, and the key is shown as text for people who cannot scan.
- The steps are an ordered list; the current one has `aria-current="step"` and each item has screen-reader text ("Step 2 of 3").
- Errors are `role="alert"` and the code boxes get `aria-invalid`.
- The confirm dialogs are `AlertDialog`: focus goes to Cancel, Escape closes, and they stay open on an error.
- The Finish button stays disabled until "I saved these recovery codes" is checked.
- The code boxes carry `autocomplete="one-time-code"`; the password field `current-password`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale; pass `labels` for anything else.
- The QR, the setup key and the recovery codes are always left-to-right, also in Arabic. The rest mirrors.

## Styling & tokens

- Built on `Card`, `Button`, `Status`, `Alert` and `--nq-*` tokens. The QR is black on white in both themes on purpose: scanners need the contrast.
- Target `[data-slot="two-factor-setup"][data-state="enabled"]` or `data-state="step-2"`.

## Do / Don't

- Do create the secret on the server and give it a fresh one each time the flow starts.
- Do show recovery codes once, and only from a fresh response.
- Don't log the secret or the codes. Don't keep them in client state after Finish.
- Don't skip the "I saved these" step.

## Related

- [`OtpInput`](../otp-input/README.md)
- [`CopyButton`](../copy-button/README.md)
- [`AlertDialog`](../alert-dialog/README.md)
- [`PasswordInput`](../password-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-security-two-factor-setup--docs
