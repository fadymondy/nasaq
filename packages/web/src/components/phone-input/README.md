---
name: phone-input
title: PhoneInput
category: forms
status: beta
summary: Phone number field with a searchable country combobox (flag, dial code, name; Gulf and Arab countries first) and a left-to-right digits input. The value is E.164.
exports: [PhoneInput, PhoneInputProps, PhoneCountry, PHONE_COUNTRIES, PHONE_PREFERRED, countryFlag, parsePhone, formatE164]
related: [input-group, combobox, field, otp-input]
story: components-forms-phone-input
base-ui: [combobox, field, input]
keywords: [phone, tel, mobile, country code, dial code, e164, flag]
---

# PhoneInput

One bordered control for a phone number. The start edge holds a country trigger (flag and calling code) that opens
a searchable list; the rest is the digits field. The component emits a canonical E.164 string such as
`+966501234567`. It ships its own small country list (no libphonenumber), so it validates nothing about the
number itself: it only splits country and digits.

## When to use

- Sign-up, checkout and contact forms that need a number a backend can dial.
- Any place users in the Gulf and Arab world type numbers, since those countries are listed first.

## When not to use

- Validating length or number type per country: use a dedicated library on the E.164 value.
- A one-time code: use [`OtpInput`](../otp-input/README.md).
- A plain text field: use `Input`.

## Import

```tsx
import { PhoneInput } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldLabel, PhoneInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Contact() {
  const [phone, setPhone] = useState("");
  return (
    <Field>
      <FieldLabel>Mobile number</FieldLabel>
      <PhoneInput value={phone} onValueChange={setPhone} />
    </Field>
  );
}
```

## Value format

`value` is E.164: a plus, the calling code, then the national digits, no spaces (`+966501234567`). It is `""`
when no digits are typed. While the digits are empty the selected country is still kept in the component.

- A leading `0` in the digits is a trunk prefix and is dropped: `0501234567` with Saudi Arabia selected gives `+966501234567`. Italy keeps its leading 0.
- Spaces, dashes and brackets are removed as you type; at most 15 digits in total (E.164 limit).
- Typing or pasting a number that starts with `+` (or a browser autofill) picks the country by its calling code (longest match) and puts the rest in the digits field. For shared codes the first list entry wins, so `+1` selects the United States.
- Passing a `value` (or `defaultValue`) selects its country the same way.

## Anatomy

```
PhoneInput                  InputGroup                       data-slot="phone-input"
├─ country trigger          Base UI Combobox.Trigger         data-slot="phone-input-country"
│  └─ popup                 search + list                    data-slot="phone-input-content"
│     ├─ search input       data-slot="phone-input-search"
│     └─ items              flag, name, +dial
├─ digits input             InputGroupInput (Field control)  dir="ltr" inputMode="tel" autoComplete="tel"
└─ hidden input             only when `name` is set
```

## API

### `PhoneInput`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `string` | none | Controlled E.164 value. |
| `defaultValue?` | `string` | `""` | Initial E.164 value when uncontrolled. |
| `onValueChange?` | `(value: string, country: PhoneCountry) => void` | none | Fires on every change of the digits or the country. `value` is E.164 or `""`. |
| `defaultCountry?` | `string` | `"SA"` | ISO code used when there is no value. |
| `countries?` | `readonly PhoneCountry[]` | `PHONE_COUNTRIES` | The list to offer. |
| `preferred?` | `readonly string[]` | `PHONE_PREFERRED` | ISO codes listed first, in order. The rest are sorted by name in the active language. |
| `disabled?` | `boolean` | `false` | Disables both parts. |
| `invalid?` | `boolean` | `false` | Sets `aria-invalid` and the danger border. |
| `name?` | `string` | none | Renders a hidden input with the E.164 value, for native form posts. |
| `id?` | `string` | none | Id of the digits input. |
| `placeholder?` | `string` | "Phone number" | Placeholder of the digits input. |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for strings, country names and popup direction. |
| `aria-label?` | `string` | none | Name of the digits input when there is no `FieldLabel`. |
| `className?` | `string` | none | Merged onto the group. |

### Data and helpers

| Export | Description |
| --- | --- |
| `PhoneCountry` | `{ iso: string; dial: string; en: string; ar: string }`. `dial` has no plus. |
| `PHONE_COUNTRIES` | The 22 Arab League countries plus about 30 major ones. |
| `PHONE_PREFERRED` | `["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"]`. |
| `countryFlag(iso)` | Flag emoji for an ISO code. |
| `parsePhone(value, countries?)` | `{ country, national } \| null` from an E.164 string. |
| `formatE164(country, national)` | E.164 string, or `""` when there are no digits. |

## Examples

### Prefilled from the server

```tsx
import { PhoneInput } from "@fadymondy/nasaq/web";

export const Saved = () => <PhoneInput defaultValue="+971501234567" aria-label="Phone" />;
```

### Only some countries

```tsx
import { PHONE_COUNTRIES, PhoneInput } from "@fadymondy/nasaq/web";

const gcc = PHONE_COUNTRIES.filter((c) => ["SA", "AE", "KW", "QA", "BH", "OM"].includes(c.iso));

export const GulfOnly = () => <PhoneInput countries={gcc} preferred={[]} aria-label="Phone" />;
```

### Arabic and validation in a Field

```tsx
import { Field, FieldError, FieldLabel, NasaqProvider, PhoneInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function PhoneAr() {
  const [phone, setPhone] = useState("");
  const bad = phone.length > 0 && phone.length < 12;
  return (
    <NasaqProvider locale="ar" target="scope">
      <Field invalid={bad}>
        <FieldLabel>رقم الجوال</FieldLabel>
        <PhoneInput value={phone} onValueChange={setPhone} invalid={bad} />
        <FieldError match>أدخل رقمًا كاملًا.</FieldError>
      </Field>
    </NasaqProvider>
  );
}
```

## Accessibility

The country trigger is a `combobox` named "Country: Saudi Arabia +966"; the popup search input is named "Search
countries". The digits input is a Field control, so `FieldLabel`, `FieldDescription` and `FieldError` name and
describe it. The country list is inside its own Field scope so it does not take the outer label.

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `Down` on the trigger | Opens the list; focus goes to the search input. |
| Type in the search | Filters by name (English or Arabic), ISO code or dial code (`+20`, `20`). |
| `Up` / `Down` | Moves the highlighted country. |
| `Enter` | Selects the country and moves focus to the digits input. |
| `Esc` | Closes the list. |

- The flag emoji is decorative (`aria-hidden`); the name and code are always text. Some platforms, such as Windows, show two letters instead of a flag.
- Caller must localise `aria-label` and any `FieldLabel`. Built-in strings and country names come in English and Arabic.

## RTL & i18n

- The group mirrors: in Arabic the country trigger sits at the right (start) edge.
- The digits input is always `dir="ltr"` and start-aligned, and dial codes are isolated with `bdi dir="ltr"`, so `+966` never reverses.
- Country names follow the active language (English or Arabic) and search matches both.
- Digits are Western (`0-9`). Arabic-Indic digits typed by the user are not converted.

## Styling & tokens

- The shell is `InputGroup`: `border-input`, `bg-card`, `rounded-control`, focus ring `nq-focus`, invalid `nq-danger`.
- The popup uses `bg-popover`, `border-border`, `shadow-floating`; items use `nq-selected` on highlight.
- Slots: `phone-input`, `phone-input-country`, `phone-input-content`, `phone-input-search`.
- Extend with `className`; never override colours with raw hex.

## Do / Don't

- **Do** store and send the E.164 value, and format it for display separately.
- **Do** validate the full number on the server or with a phone library.
- **Don't** put your own `+966` in the digits; pick the country or paste the full number.
- **Don't** rely on the flag alone to tell countries apart.

## Related

- [InputGroup](../input-group/README.md) · [Combobox](../combobox/README.md) · [Field](../field/README.md) · [OtpInput](../otp-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-phone-input--docs
