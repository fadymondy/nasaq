---
name: password-input
title: PasswordInput
category: forms
status: beta
summary: Password field built on InputGroup with a show/hide toggle (aria-pressed) and an optional strength meter driven by a score or a built-in estimator.
exports: [PasswordInput, PasswordInputProps, estimatePasswordStrength, PasswordScore]
related: [input-group, field, progress, otp-input]
story: components-forms-password-input
base-ui: [input, meter]
keywords: [password, secret, reveal, show, hide, strength, meter, auth, sign in, sign up]
---

# PasswordInput

A password field with an eye button that shows or hides the text, and an optional strength meter under it.
It is an [`InputGroup`](../input-group/README.md), so height, border, focus ring and invalid state match every
other field, and it works inside [`Field`](../field/README.md) for the label, description and error.

## When to use

- Sign in, sign up, change password, and any secret the person types and may want to check.
- Set `showStrength` when the person is choosing a new password.

## When not to use

- One-time codes: use [`OtpInput`](../otp-input/README.md).
- API keys or tokens you display read-only: use `CopyField` from [`CopyButton`](../copy-button/README.md).
- Plain text: use `Input` from [`Field`](../field/README.md).

## Import

```tsx
import { PasswordInput } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldLabel, PasswordInput } from "@fadymondy/nasaq/web";

export function SignInPassword() {
  return (
    <Field>
      <FieldLabel>Password</FieldLabel>
      <PasswordInput autoComplete="current-password" />
    </Field>
  );
}
```

## Anatomy

```
PasswordInput                     data-slot="password-input"
├─ InputGroup
│  ├─ InputGroupInput             type="password" | "text"
│  └─ InputGroupAddon (end)
│     └─ Button                   data-slot="password-input-toggle", aria-pressed
└─ strength (only with showStrength)   data-slot="password-input-strength", data-score="0".."4"
   ├─ Meter                       data-slot="meter"
   └─ level word                  aria-live="polite"
```

## API

**PasswordInput**: every `InputGroupInput` prop except `type` (so `autoComplete`, `name`, `value`, `defaultValue`,
`onChange`, `disabled`, `required`, `ltr` and `ref` all pass through to the `<input>`), plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `visible` | `boolean` | | Controlled visibility. |
| `defaultVisible` | `boolean` | `false` | Initial visibility when uncontrolled. |
| `onVisibleChange` | `(visible: boolean) => void` | | Called when the toggle is pressed. |
| `toggleLabel` | `string` | "Show password" / "إظهار كلمة المرور" | Accessible name of the toggle. It does not change with state; `aria-pressed` does. |
| `showStrength` | `boolean` | `false` | Show the strength meter and level word. |
| `score` | `number` | estimator | Strength from 0 to 4. Rounded and clamped. Omit to use `estimatePasswordStrength`. |
| `strengthLabel` | `string` | "Password strength" / "قوة كلمة المرور" | Name of the meter. |
| `strengthLevels` | `[string, string, string, string, string]` | English or Arabic words | Words for scores 0 to 4. |
| `className` | `string` | | Class for the outer wrapper. |
| `inputClassName` | `string` | | Class for the `<input>`. |

**estimatePasswordStrength(password: string): PasswordScore**: a small estimate from length and character classes.
Returns 0 to 4. `PasswordScore` is `0 | 1 | 2 | 3 | 4`. It is a hint, not a policy.

| Score | Rule |
| --- | --- |
| 0 | Empty, shorter than 6, or three or fewer distinct characters |
| 1 | 6 or more characters |
| 2 | 8 or more characters with two classes |
| 3 | 10 or more characters with three classes |
| 4 | 12 or more with four classes, or 16 or more with three |

Classes are lower case, upper case, digit, symbol, and uncased letters such as Arabic.

## Examples

**Sign up with the estimator**

```tsx
import { Field, FieldDescription, FieldLabel, PasswordInput } from "@fadymondy/nasaq/web";

export function NewPassword() {
  return (
    <Field>
      <FieldLabel>New password</FieldLabel>
      <PasswordInput autoComplete="new-password" showStrength />
      <FieldDescription>At least 8 characters.</FieldDescription>
    </Field>
  );
}
```

**Your own estimator**

```tsx
import { PasswordInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

// zxcvbn(value).score is already 0 to 4.
declare function zxcvbnScore(value: string): number;

export function Custom() {
  const [value, setValue] = useState("");
  return <PasswordInput showStrength value={value} score={zxcvbnScore(value)} onChange={(e) => setValue(e.target.value)} />;
}
```

**Arabic**

```tsx
import { Field, FieldLabel, PasswordInput } from "@fadymondy/nasaq/web";

export function ArabicPassword() {
  return (
    <Field>
      <FieldLabel>كلمة مرور جديدة</FieldLabel>
      <PasswordInput autoComplete="new-password" showStrength placeholder="أدخل كلمة المرور" />
    </Field>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves from the input to the toggle. |
| Enter / Space on the toggle | Shows or hides the password. |

- The toggle is a `button` with a constant `aria-label` and `aria-pressed` for the state, so a screen reader says
  "Show password, toggle button, pressed" and never a contradicting label.
- The meter is `role="meter"` with `aria-valuenow` 0 to 4 and an `aria-label`. The level word sits in an
  `aria-live="polite"` region, so it is spoken when it changes.
- Caller must localise: `toggleLabel`, `strengthLabel` and `strengthLevels` when not using English or Arabic.
- Set `autoComplete` so password managers work: `current-password` to sign in, `new-password` to create one.
- The input sets `autoCapitalize="none"`, `autoCorrect="off"` and `spellCheck={false}`.

## RTL & i18n

- The toggle sits at the inline end: the right in English, the left in Arabic. The meter fills from the inline start.
- The value keeps the input's natural direction and is not mirrored. Pass `ltr` to pin the typed value to
  left-to-right in an Arabic form, which keeps symbols in order.
- Built-in English and Arabic strings follow the Nasaq locale.
- The estimator counts code points, so Arabic letters and emoji are one character each.

## Styling & tokens

- Border, radius, focus ring: `--nq-*` tokens through `InputGroup`. Meter fill uses the danger, warning, info and success tokens.
- Target `[data-slot="password-input-strength"][data-score="3"]` to style by score.
- `aria-invalid` turns the border to the danger colour. Extend with `className` and `inputClassName`.

## Do / Don't

- Do set `autoComplete` on every password field.
- Do use the meter only when creating a password.
- Don't rely on the estimator as a security rule: enforce the policy on the server.
- Don't put a strength meter on a sign-in form.

## Related

- [`InputGroup`](../input-group/README.md)
- [`Field`](../field/README.md)
- [`Progress`](../progress/README.md) (Meter)
- [`OtpInput`](../otp-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-password-input--docs
