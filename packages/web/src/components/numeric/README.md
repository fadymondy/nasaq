---
name: numeric
title: Num
category: typography
status: stable
summary: Locale-aware number and date formatting with a fixed digit set (Western by default), tabular figures and bidi isolation. Num, DateTime and their string helpers.
exports: [Num, NumProps, formatNumber, useFormatNumber, FormatNumberOptions, DateTime, DateTimeProps, formatDate, formatDateRange, formatRelativeTime, useFormatDate, FormatDateOptions, FormatRelativeTimeOptions]
related: [text, icon, table]
story: components-typography-num
base-ui: []
keywords: [number, currency, percent, format, intl, arabic numerals, latn, arab, tabular, bidi, compact, date, time, relative time, date range, time element]
---

# Num

Renders a formatted figure: `1,284,093`, `SAR 48,210.50`, `-4.1%`. It uses `Intl.NumberFormat` for the
grouping, decimal mark and currency/percent placement of the active locale, but **fixes the digit
set**. By default that is Western digits (`latn`) even in Arabic UI, so figures line up in tables and match
what users type and paste. The value is wrapped in `<bdi>` so a sign or currency never reorders inside
an Arabic sentence, and tabular digits keep columns aligned.

`DateTime` does the same for dates: `Intl.DateTimeFormat` for the locale's order and month names, the
same fixed digit set, and a `<time>` element with a machine-readable `dateTime`.

## When to use

- Any number the user reads: counts, money, percent, durations, compact figures.
- Inside sentences (`Num` is inline) and inside table cells.
- Where you need the string, not an element (`formatNumber`, `useFormatNumber`), for example in a chart tooltip
  or an `aria-label`.
- Every displayed date or time: `DateTime`, or `formatDate` / `formatDateRange` / `formatRelativeTime` for strings.

## When not to use

- Identifiers (invoice numbers, phone numbers, codes) and ISO dates shown as codes (`2026-09-29`): these are
  text; isolate with `Ltr` ([icon](../icon/README.md)).
- Date inputs and pickers: this only formats.
- Editorial Arabic copy that should read as prose with ٠١٢٣: still use `Num`, with `numberingSystem: "arab"`.

## Import

```tsx
import {
  Num,
  DateTime,
  formatNumber,
  formatDate,
  formatDateRange,
  formatRelativeTime,
  useFormatNumber,
  useFormatDate,
  type FormatNumberOptions,
  type FormatDateOptions,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Num } from "@fadymondy/nasaq/web";

export function Revenue() {
  return <Num value={48210.5} format={{ style: "currency", currency: "SAR" }} />;
}
```

`Num`, `DateTime` and the hooks read the locale from `NasaqProvider` (`"en"` outside one). The `format*`
functions take the locale explicitly and work anywhere.

## Anatomy

```
Num       data-slot="num" data-numeric=""     (<bdi class="tabular-nums">)
DateTime  data-slot="date-time"               (<time dateTime="..." dir="auto" class="tabular-nums">, unicode-bidi: isolate)
```

## API

### `Num`

`NumProps extends Omit<ComponentProps<"bdi">, "children">`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number \| bigint` | required | The number to show. |
| `format?` | `FormatNumberOptions` | none | Intl options plus `numberingSystem`. |
| `className?` | `string` | none | Merged after `tabular-nums`. |
| any `<bdi>` prop | | none | Forwarded (`id`, `title`, `aria-*`, ...). `children` is not allowed. |

### `FormatNumberOptions`

`interface FormatNumberOptions extends Intl.NumberFormatOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `numberingSystem?` | `"latn" \| "arab"` | `"latn"` | `"latn"` gives 0-9, `"arab"` gives ٠-٩. |
| any `Intl.NumberFormatOptions` | | none | `style`, `currency`, `notation`, `unit`, `maximumFractionDigits`, `signDisplay`, ... |

### `formatNumber`

```ts
formatNumber(value: number | bigint, locale: string, options?: FormatNumberOptions): string
```

Builds an `Intl.NumberFormat` for the locale with the `-u-nu-<numberingSystem>` extension appended. Pass a plain locale such as
`"ar"`, `"ar-SA"` or `"en"`, without a `-u-` extension of your own.

### `useFormatNumber`

```ts
useFormatNumber(): (value: number | bigint, options?: FormatNumberOptions) => string
```

`formatNumber` bound to the provider's locale (`"en"` outside `NasaqProvider`).

A `currency` result with a Latin symbol (`US$`, or a code such as `SAR` when the locale spells it) has the symbol
wrapped in an LTR isolate (U+2066...U+2069), so `"48,210 US$"` does not turn into `"$US 48,210"` inside RTL
text. The marks are invisible and survive in plain strings (toasts, `title`, `aria-label`).

### `DateTime`

`DateTimeProps extends Omit<ComponentProps<"time">, "children" | "dateTime">`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `Date \| number \| string` | required | The instant. Numbers are epoch ms; strings go through `new Date()`. |
| `format?` | `FormatDateOptions` | `{ dateStyle: "medium" }` | Intl options plus `numberingSystem`. |
| `relative?` | `boolean` | `false` | Show "3 hours ago" / "قبل 3 ساعات". The absolute date moves to `title`. |
| `title?` | `string` | absolute date when `relative` | Your own tooltip wins. |
| any `<time>` prop | | none | Forwarded. `children` and `dateTime` are not allowed; `dateTime` is the ISO string of `value`. |

`dir="auto"` lets the formatted text set its own direction, and the element is a bidi isolate like `<bdi>`.
With `relative` it sets `suppressHydrationWarning`, because server and client can round to different values.
The relative text does not tick; re-render to refresh it.

### `FormatDateOptions`

`interface FormatDateOptions extends Intl.DateTimeFormatOptions`, plus `numberingSystem?: "latn" | "arab"`
(default `"latn"`). With no options the date uses `{ dateStyle: "medium" }`.

### `formatDate` · `formatDateRange` · `formatRelativeTime`

```ts
formatDate(value: DateInput, locale: string, options?: FormatDateOptions): string
formatDateRange(start: DateInput, end: DateInput, locale: string, options?: FormatDateOptions): string
formatRelativeTime(value: DateInput, locale: string, options?: FormatRelativeTimeOptions): string
// DateInput = Date | number | string
```

- `formatDateRange` uses `formatRange`, so shared parts are written once: `Sep 1 – 29, 2026`, `1–29 سبتمبر 2026`.
- `formatRelativeTime` picks the largest unit that fits (year, month, week, day, hour, minute, second) and
  defaults to `numeric: "auto"` ("yesterday", "أمس"). `FormatRelativeTimeOptions extends
  Intl.RelativeTimeFormatOptions` with `now?: DateInput` (default: the current time) and `numberingSystem?`.

### `useFormatDate`

```ts
useFormatDate(): { date(value, options?), range(start, end, options?), relative(value, options?) }
```

The three functions bound to the provider's locale.

## Examples

### Formats in a table

```tsx
import { Num } from "@fadymondy/nasaq/web";

const ROWS = [
  { label: "Integer", value: 1284093, format: {} },
  { label: "Currency", value: 48210.5, format: { style: "currency", currency: "SAR" } },
  { label: "Percent", value: -0.041, format: { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" } },
  { label: "Compact", value: 2_400_000, format: { notation: "compact" } },
  { label: "Hours", value: 11.25, format: { style: "unit", unit: "hour", unitDisplay: "short" } },
] as const;

export function Figures() {
  return (
    <table className="text-body-sm">
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.label}>
            <td className="py-2 pe-8 text-muted-foreground">{r.label}</td>
            <td className="py-2 text-end text-foreground">
              <Num value={r.value} format={r.format} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Inside an Arabic sentence (bidi isolation)

```tsx
import { Num, Text } from "@fadymondy/nasaq/web";

export function Summary() {
  return (
    <Text variant="body" dir="rtl" lang="ar" className="max-w-md">
      انخفضت الساعات المسجلة بنسبة <Num value={-0.041} format={{ style: "percent", maximumFractionDigits: 1 }} /> إلى{" "}
      <Num value={412} /> ساعة هذا الشهر.
    </Text>
  );
}
```

The `<bdi>` keeps `-4.1%` in one piece, so the minus stays attached to the figure in the RTL run.

### Western digits (default) versus Arabic-Indic digits

```tsx
import { formatNumber } from "@fadymondy/nasaq/web";

const latn = formatNumber(1234567.5, "ar");                                  // Western digits, Arabic separators
const arab = formatNumber(1234567.5, "ar", { numberingSystem: "arab" });     // ١٬٢٣٤٬٥٦٧٫٥
const money = formatNumber(1200, "ar-SA", { style: "currency", currency: "SAR" });

export const samples = { latn, arab, money };
```

Grouping and decimal marks follow the locale in both cases; only the digits change.

### Dates inside Arabic text

```tsx
import { DateTime, formatDateRange, useNasaq } from "@fadymondy/nasaq/web";

export function Due({ due, updated }: { due: Date; updated: Date }) {
  const { locale } = useNasaq();
  return (
    <p dir="rtl" lang="ar">
      تاريخ الاستحقاق <DateTime value={due} format={{ dateStyle: "long" }} />، عُدّلت{" "}
      <DateTime value={updated} relative />. الفترة{" "}
      {formatDateRange(new Date(2026, 8, 1), due, locale, { month: "long", day: "numeric" })}.
    </p>
  );
}
```

Plain `toLocaleDateString("ar-SA")` switches to ٠١٢ digits (Chrome's default numbering for `ar-SA` and
`ar-EG`, not for plain `"ar"`). `DateTime` keeps one digit set for every Arabic locale.

### Hook for strings (aria-label, tooltips)

```tsx
import { useFormatNumber } from "@fadymondy/nasaq/web";

export function Meter({ value }: { value: number }) {
  const fmt = useFormatNumber();
  return <div role="meter" aria-valuenow={value} aria-valuetext={fmt(value, { style: "percent" })} />;
}
```

### Arabic-Indic digits in editorial copy

```tsx
import { Num } from "@fadymondy/nasaq/web";

export function Editorial() {
  return (
    <p dir="rtl" lang="ar">
      تأسست الشركة عام <Num value={2019} format={{ numberingSystem: "arab", useGrouping: false }} />.
    </p>
  );
}
```

## Accessibility

- `Num` is plain text inside `<bdi>`; screen readers read the formatted string. With `arab` digits,
  the reading depends on the voice's Arabic support, which is why `latn` is the default.
- Provide `aria-valuetext` or a visible label where the figure alone is ambiguous (a bare `0.41`).
- No keyboard behaviour; it is not interactive.

## RTL & i18n

- The digit set is a product decision: Nasaq uses Western digits in Arabic UI so numbers align in tables and
  match keyboard input. Use `numberingSystem: "arab"` only for editorial copy.
- Separators, currency and percent placement follow the locale (`ar`, `ar-SA`, `en`, ...). A locale that already has a `-u-nu-` extension (`ar-SA-u-nu-arab`) is fine: `numberingSystem` overrides it.
- `Num` and `useFormatNumber` work outside `NasaqProvider`; the locale falls back to `"en"`.
- `<bdi>` isolates the figure, so the sign, currency code and percent stay in order in RTL sentences. A plain
  `"-4.1%"` in Arabic text renders `%4.1-`; a typed `"$48,210"` renders `48,210$` (after Arabic letters the
  digits count as Arabic numbers, so `$` no longer binds to them).
- Intl already puts the right-to-left marks Arabic dates need between the parts; `DateTime` adds isolation
  so a date inside a sentence of the other direction stays in one piece.
- The measured cases (currency, sign, codes, keys, dates, names) live in the lab: Foundations / Arabic & bidi.
- Align figure columns with `text-end`, not `text-right`.

## Styling & tokens

- `tabular-nums` so digits have equal width; nothing else is styled, so it inherits the surrounding text role.
- Target `[data-slot=num]` or `[data-numeric]`. Extend with `className`.

## Do / Don't

- **Do** use `Num` for every displayed figure; keep the digit set consistent across a screen.
- **Do** pass currency and percent through `format`, not by concatenating strings.
- **Don't** mix Western and Arabic-Indic digits on one screen.
- **Don't** format numbers with `toLocaleString()` in components; you lose the fixed digit set and bidi isolation.
- **Don't** format dates with `toLocaleDateString()`; use `DateTime` or `formatDate`.
- **Don't** build money by concatenating `"$" + value`.

## Related

- [Text](../text/README.md) · [Icon, Ltr, Bdi](../icon/README.md) · [Table](../table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-typography-num--docs
