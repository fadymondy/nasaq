---
name: phone-input
title: PhoneInput
category: forms
status: beta
summary: Phone number field with a searchable country list (SVG flag, name in English or Arabic, calling code; Gulf and Arab countries first) and a digits input that groups the number as you type. The value is E.164.
exports: [PhoneInput, PhoneInputProps, PhoneCountry, PHONE_COUNTRIES, PHONE_PREFERRED, phoneCountryName, countryFlag, parsePhone, parsePhoneLenient, formatE164, formatNational, phoneExample, isValidE164]
related: [input-group, combobox, field, otp-input, country-flag]
story: components-forms-phone-input
base-ui: [combobox, field, input]
keywords: [phone, tel, mobile, country code, dial code, e164, flag]
---

# PhoneInput

One bordered control for a phone number. The start edge holds a country trigger (flag and calling code) that opens
a searchable list of every country, each with its flag, its name in English or Arabic and its calling code. The rest
is the digits field, which groups the number the way it is written in that country (`50 123 4567`) and shows an
example number as the placeholder. The component emits a canonical E.164 string such as `+966501234567`.

Calling codes, grouping and examples come from [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js)
(about 19 KB gzipped). Flags are SVGs from [country-flag-icons](https://gitlab.com/catamphetamine/country-flag-icons),
drawn by [`CountryFlag`](../country-flag/README.md), so they look the same on Windows, where flag emoji do not render.

## When to use

- Sign-up, checkout and contact forms that need a number a backend can dial.
- Any place users in the Gulf and Arab world type numbers, since those countries are listed first.

## When not to use

- Checking that a number really exists or can receive SMS: that needs a lookup service. `isValidE164` only checks the numbering plan.
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
- Arabic-Indic (`٠١٢`) and Persian (`۰۱۲`) digits are read as `0-9`.
- The field shows the digits grouped for the country (`50 123 4567`, `416 555 0123`); the caret stays after the digit you typed.
- Typing or pasting a number that starts with `+` (or a browser autofill) picks the country from the number. Shared codes resolve by number range: `+1 416…` selects Canada, `+1 202…` the United States. A bare `+1` selects the main country, the United States.
- Passing a `value` (or `defaultValue`) selects its country the same way.

## Anatomy

```
PhoneInput                  InputGroup                       data-slot="phone-input"
├─ country trigger          Base UI Combobox.Trigger         data-slot="phone-input-country"
│  └─ popup                 search + list                    data-slot="phone-input-content"
│     ├─ search input       data-slot="phone-input-search"
│     └─ items              CountryFlag, name, +dial
├─ digits input             InputGroupInput (Field control)  dir="ltr" inputMode="tel" autoComplete="tel"
└─ hidden input             only when `name` is set
```

## API

### `PhoneInput`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `string` | none | Controlled value, E.164. A local number (`0591234567`) or `00966…` is accepted and kept as the national digits of `defaultCountry` (or the country the `00` code names) instead of being dropped; `onValueChange` then reports E.164. |
| `defaultValue?` | `string` | `""` | Initial E.164 value when uncontrolled. |
| `onValueChange?` | `(value: string, country: PhoneCountry) => void` | none | Fires on every change of the digits or the country. `value` is E.164 or `""`. |
| `defaultCountry?` | `string` | `"SA"` | ISO code used when there is no value, and the country of a local-format value such as `0591234567`. |
| `countries?` | `readonly PhoneCountry[]` | `PHONE_COUNTRIES` | The list to offer. |
| `preferred?` | `readonly string[]` | `PHONE_PREFERRED` | ISO codes listed first, in order. The rest are sorted by name in the active language. |
| `disabled?` | `boolean` | `false` | Disables both parts. |
| `invalid?` | `boolean` | `false` | Sets `aria-invalid` and the danger border. |
| `name?` | `string` | none | Renders a hidden input with the E.164 value, for native form posts. |
| `id?` | `string` | none | Id of the digits input. |
| `onFocus?` / `onBlur?` | `FocusEventHandler<HTMLInputElement>` | none | Focus and blur of the digits input, for form libraries that validate on blur. |
| `placeholder?` | `string` | an example number | Placeholder of the digits input. Default is an example mobile number for the selected country (`50 123 4567`), or "Phone number". |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for strings, country names and popup direction. |
| `aria-label?` | `string` | none | Name of the digits input when there is no `FieldLabel`. |
| `className?` | `string` | none | Merged onto the group. |

### Data and helpers

| Export | Description |
| --- | --- |
| `PhoneCountry` | `{ iso: string; dial: string; en: string; ar: string }`. `dial` has no plus. |
| `PHONE_COUNTRIES` | Every country and territory with a calling code (about 245), from libphonenumber, with Intl region names in English and Arabic. |
| `PHONE_PREFERRED` | `["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"]`. |
| `phoneCountryName(iso, locale?)` | A country's name in any locale (Intl region names, with Palestine as "Palestine" / "فلسطين"). |
| `parsePhone(value, countries?)` | `{ country, national } \| null` from an E.164 string. Shared codes resolve by number range. |
| `parsePhoneLenient(value, countries?, fallbackIso?)` | Like `parsePhone`, but reads `00966…` as `+966…` and keeps local numbers as national digits of `fallbackIso`. `null` only without digits. |
| `formatE164(country, national)` | E.164 string, or `""` when there are no digits. Drops a trunk prefix where the country uses one. |
| `formatNational(country, national)` | The digits grouped as written after the calling code: `50 123 4567`. |
| `phoneExample(country)` | An example mobile number, grouped the same way, for placeholders. |
| `isValidE164(value)` | True when the value is a complete number that fits its country's numbering plan. |
| `countryFlag(iso)` | Flag emoji, for plain text only (a title, a notification). In UI use `CountryFlag`. |

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
import { Field, FieldError, FieldLabel, isValidE164, NasaqProvider, PhoneInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function PhoneAr() {
  const [phone, setPhone] = useState("");
  const bad = phone !== "" && !isValidE164(phone);
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

- The flag is decorative (`aria-hidden`); the name and code are always text.
- Caller must localise `aria-label` and any `FieldLabel`. Built-in strings and country names come in English and Arabic.

## RTL & i18n

- The group mirrors: in Arabic the country trigger sits at the right (start) edge.
- The digits input is always `dir="ltr"` and start-aligned, and dial codes are isolated with `bdi dir="ltr"`, so `+966` never reverses.
- Country names follow the active language (English or Arabic, from `Intl.DisplayNames`) and search matches both.
- Digits are shown Western (`0-9`). Arabic-Indic and Persian digits typed or pasted by the user are converted.

## Styling & tokens

- The shell is `InputGroup`: `border-input`, `bg-card`, `rounded-control`, focus ring `nq-focus`, invalid `nq-danger`.
- The popup uses `bg-popover`, `border-border`, `shadow-floating`; items use `nq-selected` on highlight.
- Slots: `phone-input`, `phone-input-country`, `phone-input-content`, `phone-input-search`.
- Extend with `className`; never override colours with raw hex.

## Do / Don't

- **Do** store and send the E.164 value, and format it for display separately.
- **Do** check the number with `isValidE164` before submit, and again on the server.
- **Don't** put your own `+966` in the digits; pick the country or paste the full number.
- **Don't** rely on the flag alone to tell countries apart.

## Related

- [CountryFlag](../country-flag/README.md) · [InputGroup](../input-group/README.md) · [Combobox](../combobox/README.md) · [Field](../field/README.md) · [OtpInput](../otp-input/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-forms-phone-input--docs
