---
name: address-input
title: AddressInput
category: forms
status: beta
summary: Address form with cascading country, city and area comboboxes (searchable in English or Arabic), street and detail fields and an embedded PhoneInput. Places come from a pluggable LocationsDataSource, by default the CircleXO hub.
exports: [AddressInput, AddressInputProps, AddressInputLabels, Address, createHubLocationsDataSource, DEFAULT_HUB_URL, placeName, LocationsDataSource, LocationCountry, LocationCity, LocationArea, LocationItem, LocationType, LocationSearchOptions, HubLocationsDataSourceOptions]
related: [phone-input, combobox, country-select, field, country-flag]
story: components-forms-address-input
base-ui: [combobox, field, input]
keywords: [address, country, city, area, location, shipping, delivery, postal code, geo]
---

# AddressInput

One form for a postal address. Country, city and area are comboboxes that cascade: city stays disabled until a
country is chosen, area until a city is chosen, and choosing a new parent clears the children. Each list is
searchable by its English or Arabic name. Below them are street, building, floor, apartment, landmark and postal code
fields, and a [`PhoneInput`](../phone-input/README.md) whose value is E.164. The value is a plain snake_case object
(`Address`) that can be posted to an API as it is.

Places are loaded through a `LocationsDataSource`. The default is the CircleXO hub public locations API; pass your own
object to use another API or a static list. There is no map: `lat` and `lng` are part of the type and pass through
untouched, but the component never sets them.

## When to use

- Checkout, delivery, billing and profile forms in the Gulf and Arab world, where a place has an English and an Arabic name.
- Any form that must store country, city and area as ids from one reference list.

## When not to use

- A single country field: use [`CountrySelect`](../country-select/README.md).
- Free-text addresses with no reference data: use `Input` and `Textarea`.
- Picking a point on a map: Nasaq has no map component.

## Import

```tsx
import { AddressInput, createHubLocationsDataSource, type Address } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AddressInput, type Address } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Delivery() {
  const [address, setAddress] = useState<Address>({ street: "" });
  return <AddressInput value={address} onValueChange={setAddress} />;
}
```

## Anatomy

```
AddressInput                    div                      data-slot="address-input"
├─ country                      Field + Combobox         data-slot="address-input-country"
├─ city                         Field + Combobox         data-slot="address-input-city"
├─ area                         Field + Combobox         data-slot="address-input-area"
├─ street                       Field + Input            data-slot="address-input-street"
├─ building, floor, apartment   Field + Input            data-slot="address-input-building" / -floor / -apartment
├─ postal code                  Field + Input (ltr)      data-slot="address-input-postal-code"
├─ landmark                     Field + Input            data-slot="address-input-landmark"
└─ phone                        Field + PhoneInput       data-slot="address-input-phone"   (showPhone)
```

## API

### `AddressInput`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `Address` | none | Controlled address. |
| `defaultValue?` | `Address` | `{ street: "" }` | Initial address when uncontrolled. |
| `onValueChange?` | `(value: Address) => void` | none | Called with the whole address on every change. Optional fields that are empty are left out. Changing the country drops `city_id` and `area_id`; changing the city drops `area_id`. |
| `dataSource?` | `LocationsDataSource` | `createHubLocationsDataSource()` | Where countries, cities and areas come from. Create it once (module scope or `useMemo`); a new object on each render reloads the lists. |
| `showPhone?` | `boolean` | `true` | Show the phone field. |
| `disabled?` | `boolean` | `false` | Disables every field. |
| `invalid?` | `boolean` | `false` | Sets `aria-invalid` on the comboboxes, street and phone. |
| `labels?` | `Partial<AddressInputLabels>` | built-in EN / AR | Override any string: `country`, `city`, `area`, `street`, `building`, `floor`, `apartment`, `landmark`, `postalCode`, `phone`, `selectCountry`, `selectCity`, `selectArea`, `empty`, `loading`, `loadError`, `clear`, `open`. |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for strings, place names and direction. |
| `className?` | `string` | none | Merged onto the root grid. |

### `Address`

```ts
interface Address {
  country_id?: number;
  city_id?: number;
  area_id?: number;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  postal_code?: string;
  lat?: number;   // passed through, never set by the component
  lng?: number;
  phone?: string; // E.164
}
```

### `LocationsDataSource`

| Member | Signature | Description |
| --- | --- | --- |
| `countries` | `() => Promise<LocationCountry[]>` | All countries. |
| `cities` | `(countryId: number) => Promise<LocationCity[]>` | Cities of a country. |
| `areas` | `(cityId: number) => Promise<LocationArea[]>` | Areas of a city. Filtered in the browser, so keep it to one city. |
| `search?` | `(q: string, options: { type: "country" \| "city" \| "area"; countryId?: number; cityId?: number; limit?: number }) => Promise<LocationItem[]>` | Optional server-side search. The built-in inputs do not call it. |

`LocationCountry` is `{ id, iso2, iso3?, name_en, name_ar, phone_code?, emoji?, region?, lat?, lng?, currency_code? }`,
`LocationCity` is `{ id, country_id, name_en, name_ar, lat?, lng?, timezone? }`, `LocationArea` is
`{ id, city_id, name_en, name_ar }`. `name_en` or `name_ar` may be an empty string; the UI shows the other one.

### `createHubLocationsDataSource({ baseUrl?, fetch? })`

Returns a `LocationsDataSource` for the CircleXO hub REST API (public, no auth):
`GET {base}/api/locations/countries`, `/cities?country_id=`, `/areas?city_id=`, `/search?q=&type=&country_id=&city_id=&limit=`,
each returning `{ "items": [...] }`. Responses are cached in memory per source object; a failed request is not cached.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl?` | `string` | `DEFAULT_HUB_URL` (`https://app.circlexo.com`) | Hub origin, without a trailing path. |
| `fetch?` | `typeof fetch` | `globalThis.fetch` | Custom fetch, for tests or server use. |

### Helpers

| Export | Description |
| --- | --- |
| `placeName(item, lang)` | `item.name_en` or `item.name_ar` for `lang`, falling back to the other when empty. |
| `DEFAULT_HUB_URL` | The default hub origin. |

## Examples

### Own data source

```tsx
import { AddressInput, type LocationsDataSource } from "@fadymondy/nasaq/web";

const source: LocationsDataSource = {
  countries: async () => [{ id: 1, iso2: "SA", name_en: "Saudi Arabia", name_ar: "السعودية" }],
  cities: async () => [{ id: 10, country_id: 1, name_en: "Riyadh", name_ar: "الرياض" }],
  areas: async () => [{ id: 100, city_id: 10, name_en: "Olaya", name_ar: "العليا" }],
};

export const Static = () => <AddressInput dataSource={source} />;
```

### Another hub, no phone

```tsx
import { AddressInput, createHubLocationsDataSource } from "@fadymondy/nasaq/web";

const staging = createHubLocationsDataSource({ baseUrl: "https://staging.example.com" });

export const Shipping = () => <AddressInput dataSource={staging} showPhone={false} />;
```

### Arabic

```tsx
import { AddressInput, NasaqProvider } from "@fadymondy/nasaq/web";

export const AddressAr = () => (
  <NasaqProvider locale="ar" target="scope">
    <AddressInput />
  </NasaqProvider>
);
```

## Accessibility

Every field has a visible `FieldLabel`. The comboboxes are Base UI comboboxes; the phone field's own country list is
named "Country" by `PhoneInput`. A disabled city or area is a real `disabled` input, so it leaves the tab order.
The empty message of a list reads "Loading...", "Could not load the list." or "No results." as appropriate.

| Key | Action |
| --- | --- |
| `Down` / typing in a combobox | Opens the list and filters it by English or Arabic name. |
| `Up` / `Down` | Moves the highlighted item. |
| `Enter` | Selects it; the children are cleared and the next list loads. |
| `Esc` | Closes the list. |

Caller must localise any `labels` override. Built-in strings come in English and Arabic.

## RTL & i18n

- The grid follows `dir`: in Arabic the first column is at the right.
- Names follow the active language and fall back to the other one when empty (Egyptian cities are Arabic only). Search matches both, folding Arabic letter variants.
- The postal code and phone fields are left to right in every direction.

## Styling & tokens

- Fields use the same tokens as `Input` and `Combobox`: `border-input`, `bg-card`, `rounded-control`, focus `nq-focus`, invalid `nq-danger`.
- Slots: `address-input` and the `address-input-*` slots in Anatomy. `data-invalid` is set on the root when `invalid`.
- Extend with `className`; the root is `grid sm:grid-cols-2`, so `className="sm:grid-cols-1"` makes a single column. Never override colours with raw hex.

## Do / Don't

- **Do** create the data source once and reuse it so lists are cached.
- **Do** validate `street` (required) and the ids on the server.
- **Don't** expect a map pin; set `lat` and `lng` yourself if you have them.
- **Don't** point `dataSource` at an endpoint that returns thousands of areas per city; filtering is client-side.

## Related

- [PhoneInput](../phone-input/README.md) · [CountrySelect](../country-select/README.md) · [Combobox](../combobox/README.md) · [Field](../field/README.md) · [CountryFlag](../country-flag/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-address-input--docs
