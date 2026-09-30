---
name: geo-list
title: GeoList
category: analytics
status: beta
summary: Top countries with a flag, the localised country name, a bar, share and change. Built on BreakdownTable.
exports: [GeoList, GeoListProps, GeoRow, GeoListLabels]
related: [breakdown-table, metric-tiles, google-analytics-page]
story: components-analytics-geo-list
base-ui: []
keywords: [country, geo, flag, audience, region, analytics]
---

# GeoList

GeoList turns ISO country codes into rows with a flag and the country's name in the active language (via `Intl.DisplayNames`), then hands them to `BreakdownTable`. Unknown codes fall back to the code and an "Unknown" label.

## When to use

- Audience by country in analytics, search and video reports.
- Any ranking of ISO 3166-1 alpha-2 regions.

## When not to use

- Cities or regions without ISO codes: use [`BreakdownTable`](../breakdown-table/README.md).
- A map: this is a list.

## Import

```tsx
import { GeoList } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { GeoList } from "@fadymondy/nasaq/web";

export function Audience() {
  return (
    <GeoList
      valueLabel="Users"
      rows={[
        { code: "SA", value: 12400, previous: 11200 },
        { code: "EG", value: 8100, previous: 8600 },
      ]}
    />
  );
}
```

## Anatomy

```
GeoList                data-slot="breakdown-table"  (BreakdownTable underneath)
  row label            flag + country name
```

## API

### GeoList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `readonly GeoRow[]` | required | `{ code, value, previous? }`; `code` is ISO alpha-2. |
| `valueLabel` | `ReactNode` | required | Heading of the value column. |
| `title / description` | `ReactNode` | `Countries` | Card header. |
| `format` | `FormatNumberOptions` | none | Intl options for values. |
| `limit` | `number` | `8` | Rows before "Show all". |
| `invert` | `boolean` | `false` | Down is good. |
| `color` | `string` | `var(--primary)` | Bar colour, a token. |
| `loading` | `boolean` | `false` | Skeleton. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<GeoListLabels> & { table? }` | none | Own strings plus `table` for the BreakdownTable strings. |

## Examples

Arabic country names:

```tsx
import { GeoList, NasaqProvider } from "@fadymondy/nasaq/web";

export const Ar = () => (
  <NasaqProvider locale="ar">
    <GeoList valueLabel="المستخدمون" rows={[{ code: "SA", value: 12400 }, { code: "AE", value: 5200 }]} />
  </NasaqProvider>
);
```

Unknown code:

```tsx
import { GeoList } from "@fadymondy/nasaq/web";

export const Unknown = () => <GeoList valueLabel="Users" rows={[{ code: "ZZ", value: 310 }]} />;
```

## Accessibility

Same as `BreakdownTable`. The flag is an emoji shown with the country name beside it, so the name is always readable.

## RTL & i18n

- Country names come from `Intl.DisplayNames` in the active locale.
- Flags never mirror.
- Every figure uses the active locale with Western digits and is bidi-isolated (`Num`), so `+12.4%` keeps its order in Arabic.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Inherits the `BreakdownTable` slots.

## Do / Don't

- Do pass ISO alpha-2 codes.
- Don't pass country names; they cannot be localised.

## Related

- [`breakdown-table`](../breakdown-table/README.md)
- [`metric-tiles`](../metric-tiles/README.md)
- [`google-analytics-page`](../google-analytics-page/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-geo-list--docs
