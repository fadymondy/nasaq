---
name: otp-input
title: OtpInput
category: forms
status: beta
summary: One-time-code entry with N boxes; paste fills every box, Backspace steps back, digits stay left-to-right in RTL.
exports: [OtpInput, OtpInputProps]
related: [field, input-group]
story: components-forms-otpinput
base-ui: [input]
keywords: [otp, code, verification, pin, one-time, 2fa, sms]
---

# OtpInput

A row of single-character boxes for verification codes and PINs. Typing advances, Backspace steps back, paste
(or an SMS autofill) fills all boxes at once. The group is always left-to-right so a code reads the same in
Arabic pages.

## When to use

- SMS, email or authenticator codes; short PINs.

## When not to use

- Long or free-form tokens: use [`Input`](../field/README.md).

## Import

```tsx
import { OtpInput } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldLabel, OtpInput } from "@fadymondy/nasaq/web";

export function VerifyField() {
  return (
    <Field className="w-fit">
      <FieldLabel>Verification code</FieldLabel>
      <OtpInput name="code" onComplete={(code) => console.log(code)} />
    </Field>
  );
}
```

## Anatomy

```
OtpInput            data-slot="otp-input" (role="group", dir="ltr")
├─ box × length     data-slot="otp-input-box" (Base UI Input; data-filled when it has a character)
└─ hidden input     only when `name` is set; carries the joined code
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `length` | `number` | `6` | Number of boxes. |
| `value` | `string` | none | Controlled code. |
| `defaultValue` | `string` | `""` | Initial code when uncontrolled. |
| `onValueChange` | `(value: string) => void` | none | Fires on every change with the joined code. |
| `onComplete` | `(value: string) => void` | none | Fires when all boxes are filled. |
| `type` | `"numeric" \| "alphanumeric"` | `"numeric"` | Accepted characters; numeric opens the digit keypad. |
| `name` | `string` | none | Form name; a hidden input submits the code. |
| `disabled` | `boolean` | `false` | Disable every box. |
| `invalid` | `boolean` | `false` | Danger border and `aria-invalid`. |
| `autoFocus` | `boolean` | `false` | Focus the first box on mount. |
| `getBoxLabel` | `(index: number, length: number) => string` | `"Digit i of n"` | Accessible name per box. Localise. |

Other props go to the wrapping `div`.

## Examples

Four-digit PIN, controlled, Arabic labels:

```tsx
import { Field, FieldLabel, OtpInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Pin() {
  const [pin, setPin] = useState("");
  return (
    <Field className="w-fit">
      <FieldLabel>الرمز السري</FieldLabel>
      <OtpInput
        length={4}
        value={pin}
        onValueChange={setPin}
        getBoxLabel={(i, n) => `الخانة ${i + 1} من ${n}`}
      />
    </Field>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Type | Fills the box and moves to the next. |
| Backspace | Clears the box; on an empty box, moves back and clears the previous one. |
| Left / Right | Previous / next box (physical, since the group is LTR). |
| Home / End | First / last box. |
| Paste | Fills all boxes from the clipboard, ignoring disallowed characters. |

Boxes use `autocomplete="one-time-code"` so mobile keyboards offer the SMS code. Each box has an accessible
name from `getBoxLabel`; the group is `role="group"`.

## RTL & i18n

`dir="ltr"` is set on the group, so the first digit is on the left even on RTL pages. The surrounding label and
messages still follow the page direction. Localise `getBoxLabel`.

## Styling & tokens

Uses `border-input`, `bg-card`, `border-nq-focus`, `border-nq-danger`, `size-control`, `rounded-control`.
State attributes: `data-filled`, `data-invalid`. Extend with `className` (on the group).

## Do / Don't

- Do show where the code was sent in the field description.
- Don't use it for values longer than about 8 characters.

## Related

- [Field](../field/README.md)
- [InputGroup](../input-group/README.md)

## Lab

`https://docs.nasaqui.com/?path=/docs/components-forms-otpinput--docs`
