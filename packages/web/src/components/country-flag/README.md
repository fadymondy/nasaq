---
name: country-flag
title: CountryFlag
category: data-display
status: beta
summary: A country's flag as an SVG (3:2, one line of text tall) from its ISO code. Looks the same on every platform, including Windows, where flag emoji do not render.
exports: [CountryFlag, CountryFlagProps]
related: [phone-input, badge, avatar]
story: components-data-display-country-flag
keywords: [flag, country, iso, region, locale, emoji]
---

# CountryFlag

Draws a country's flag from its ISO 3166-1 alpha-2 code. The flags are SVGs from
[country-flag-icons](https://gitlab.com/catamphetamine/country-flag-icons) (MIT), in the 3:2 ratio. The flag is
`1em` tall, so it takes the size of the text around it. A thin inset line keeps white and pale flags visible on a
white surface.

All flags are one lazy chunk (about 145 KB gzipped). It is fetched the first time any flag renders, then shared by
every flag on the page. Until it arrives the flag shows as an empty muted frame of the same size, so nothing moves.

## When to use

- Next to a country name or calling code: phone inputs, country and region pickers, shipping addresses, analytics by country.
- Anywhere you would reach for a flag emoji. Windows shows two letters (`SA`) instead of an emoji flag.

## When not to use

- As the only way to name a country: always put the name (or code) next to it.
- For a language. A flag is a country; Arabic is spoken in more than 20 of them. Use the language name.
- In plain text that is not HTML (a notification title, a tab title): use `countryFlag(iso)` from `PhoneInput` for the emoji.

## Import

```tsx
import { CountryFlag } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CountryFlag } from "@fadymondy/nasaq/web";

export const Origin = () => (
  <span className="inline-flex items-center gap-2">
    <CountryFlag code="SA" />
    Saudi Arabia
  </span>
);
```

## Anatomy

```
CountryFlag     span, aspect 3:2, 1em tall     data-slot="country-flag"
└─ svg          the flag, from country-flag-icons
```

## API

### `CountryFlag`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `code` | `string` | none | ISO 3166-1 alpha-2 code, any case: `"SA"`, `"eg"`. Unknown codes show the empty frame. |
| `label?` | `string` | none | Accessible name, e.g. the country name. With it the flag is `role="img"`; without it the flag is decorative and hidden from screen readers. |
| `className?` | `string` | none | Merged onto the frame. Set the size with a text size (`text-[1.5rem]`) or a height (`h-6`). |

## Examples

### Sized with the text

```tsx
import { CountryFlag } from "@fadymondy/nasaq/web";

export const Sizes = () => (
  <div className="flex items-center gap-4">
    <CountryFlag code="AE" className="text-body-sm" />
    <CountryFlag code="AE" className="text-[1.5rem]" />
    <CountryFlag code="AE" className="h-10" />
  </div>
);
```

### A country list

```tsx
import { CountryFlag, PHONE_COUNTRIES } from "@fadymondy/nasaq/web";

export const Countries = ({ ar }: { ar: boolean }) => (
  <ul className="flex flex-col gap-2">
    {PHONE_COUNTRIES.slice(0, 5).map((c) => (
      <li key={c.iso} className="flex items-center gap-2">
        <CountryFlag code={c.iso} />
        {ar ? c.ar : c.en}
      </li>
    ))}
  </ul>
);
```

### A flag that carries meaning on its own

```tsx
import { CountryFlag } from "@fadymondy/nasaq/web";

export const Shipping = () => <CountryFlag code="KW" label="Kuwait" className="text-[1.25rem]" />;
```

## Accessibility

- Decorative by default (`aria-hidden`), because a flag should sit next to a name that screen readers already read.
- Pass `label` only when the flag stands alone; it becomes `role="img"` with that name. Localise the label.

## RTL & i18n

- Flags are never mirrored. In Arabic the flag keeps its drawing; only its place in the row follows the reading direction.
- Country names are not part of this component: take them from `PHONE_COUNTRIES` (`en`, `ar`) or `phoneCountryName(iso, locale)`.

## Styling & tokens

- Frame: `bg-muted` while loading, `rounded-[2px]`, inset hairline `foreground/15`.
- Slot: `country-flag`.
- Never recolour, redraw or crop a flag to a circle that hides its emblem.

## Do / Don't

- **Do** show the country name or code next to the flag.
- **Do** size it with the surrounding text so it lines up with the name.
- **Don't** use a flag to stand for a language.
- **Don't** use flag emoji in UI; they are letters on Windows.

## Related

- [PhoneInput](../phone-input/README.md) · [Badge](../badge/README.md) · [Avatar](../avatar/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-country-flag--docs
