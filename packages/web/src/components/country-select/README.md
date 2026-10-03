---
name: country-select
title: CountrySelect
category: forms
status: beta
summary: Searchable country combobox with SVG flags and names in English or Arabic. The value is the ISO 3166-1 alpha-2 code. Uses PHONE_COUNTRIES or a LocationsDataSource.
exports: [CountrySelect, CountrySelectProps]
related: [address-input, phone-input, combobox, country-flag]
story: components-forms-address-input
base-ui: [combobox]
keywords: [country, select, flag, iso, nationality, region]
---

# CountrySelect

A single combobox for choosing a country. Each item shows its flag ([`CountryFlag`](../country-flag/README.md)) and its
name in the active language; typing filters by English name, Arabic name or ISO code. The value is the ISO code
(`"SA"`).

## When to use

- A country field on its own: nationality, country of residence, shipping country.

## When not to use

- A full address with city and area: use [`AddressInput`](../address-input/README.md).
- A phone number: use [`PhoneInput`](../phone-input/README.md), which has its own country list.

## Import

```tsx
import { CountrySelect } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CountrySelect, Field, FieldLabel } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Residence() {
  const [iso, setIso] = useState("");
  return (
    <Field>
      <FieldLabel>Country</FieldLabel>
      <CountrySelect value={iso} onValueChange={setIso} />
    </Field>
  );
}
```

## Anatomy

```
CountrySelect               div (display: contents)   data-slot="country-select"
├─ input group              Combobox input, clear, chevron
├─ popup                    list of CountryFlag + name
└─ hidden input             only when `name` is set
```

## API

### `CountrySelect`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `string` | none | Controlled ISO alpha-2 code, `""` for none. |
| `defaultValue?` | `string` | `""` | Initial code when uncontrolled. |
| `onValueChange?` | `(iso: string) => void` | none | Called with the code, `""` when cleared. |
| `countries?` | `readonly PhoneCountry[]` | `PHONE_COUNTRIES` | The list to offer. Ignored when `dataSource` is set. |
| `dataSource?` | `LocationsDataSource` | none | Load countries from a locations source; items need an `iso2`. Create it once. |
| `disabled?` / `invalid?` | `boolean` | `false` | Disabled state; `aria-invalid`. |
| `name?` | `string` | none | Renders a hidden input with the ISO code. |
| `id?` / `placeholder?` / `aria-label?` | `string` | none | Input id, placeholder (default "Select a country"), name when there is no `FieldLabel`. |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for strings, names and popup direction. |
| `className?` | `string` | none | Merged onto the wrapper (which is `display: contents`). |

## Examples

### Gulf countries only

```tsx
import { CountrySelect, PHONE_COUNTRIES } from "@fadymondy/nasaq/web";

const gcc = PHONE_COUNTRIES.filter((c) => ["SA", "AE", "KW", "QA", "BH", "OM"].includes(c.iso));

export const Gulf = () => <CountrySelect countries={gcc} aria-label="Country" />;
```

### From the hub

```tsx
import { CountrySelect, createHubLocationsDataSource } from "@fadymondy/nasaq/web";

const hub = createHubLocationsDataSource();

export const FromHub = () => <CountrySelect dataSource={hub} aria-label="Country" />;
```

## Accessibility

The input is a Base UI combobox and a Field control, so `FieldLabel` names it. Flags are decorative; the name is text.

| Key | Action |
| --- | --- |
| `Down` / typing | Opens the list and filters it. |
| `Up` / `Down` | Moves the highlighted country. |
| `Enter` | Selects it. |
| `Esc` | Closes the list. |

Caller must localise `aria-label` and `placeholder`.

## RTL & i18n

Names follow the active language (English or Arabic, falling back to the other when empty); search matches both. The
popup takes the direction of the provider.

## Styling & tokens

Same as [`Combobox`](../combobox/README.md): `border-input`, `bg-card`, `rounded-control`, focus `nq-focus`. The wrapper
is `display: contents`, so `className` only matters for layout contexts such as grid placement. Never override colours
with raw hex.

## Do / Don't

- **Do** store the ISO code; it is stable across languages.
- **Don't** use it for phone numbers; `PhoneInput` already has a country list.

## Related

- [AddressInput](../address-input/README.md) · [PhoneInput](../phone-input/README.md) · [CountryFlag](../country-flag/README.md) · [Combobox](../combobox/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-address-input--docs
