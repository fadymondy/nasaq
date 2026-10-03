---
name: price
title: Price
category: pricing
status: beta
summary: A locale-formatted price with currency, billing period suffix, optional struck-through original and a built-in "Free" label.
exports: [Price, PricePeriod, PriceProps]
related: [plan-card, product-card, rating, numeric]
story: components-pricing-price
base-ui: []
keywords: [price, currency, billing, period, discount, free, plan, subscription]
---

# Price

Formats an amount as currency for the active locale, adds an optional billing period ("/mo", "/seat/mo"), can
show the original price struck through after a discount, and renders a "Free" label when the amount is 0. The
figure is isolated so it keeps its order inside Arabic text.

## When to use

- Plan cards, product listings, checkout summaries, invoice lines.
- Any amount that has a currency and possibly a billing period.

## When not to use

- A plain number or count: use the helpers from [`numeric`](../numeric/README.md).
- A whole plan tile with features and a call to action: use [`PlanCard`](../plan-card/README.md).
- Tables of money that need aligned decimals: format with `useFormatNumber` in a tabular column.

## Import

```tsx
import { Price, type PricePeriod, type PriceProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Price } from "@fadymondy/nasaq/web";

export function SeatPrice() {
  return <Price amount={12} period="seat-month" />;
}
```

## Anatomy

```
Price                   data-slot="price"   <span>          (data-free when amount is 0)
├─ amount               <bdi> formatted currency
├─ period               "/mo" | "/yr" | "/seat/mo" (omitted for "once")
└─ compareAt            <s> with sr-only "was", <bdi> formatted original
```

When `amount` is `0` the root holds only the free label.

## API

### `Price`

`PriceProps extends Omit<ComponentProps<"span">, "children">`. Remaining props go to the outer `<span>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `amount` | `number` | required | The price. `0` renders the free label. |
| `currency?` | `string` | `"USD"` | ISO 4217 code. |
| `period?` | `PricePeriod` | `"once"` | Billing period suffix. `"once"` shows none. |
| `compareAt?` | `number` | none | The price before a discount, shown struck through. Only shown when greater than `amount`. |
| `freeLabel?` | `string` | `"Free"` / `"مجاني"` | Shown when `amount` is 0. |
| `fractionDigits?` | `number` | `0` for whole amounts, `2` otherwise | Fraction digits, applied to both amounts. |
| `size?` | `"sm" \| "md" \| "lg"` | `"md"` | `lg` renders the amount as a heading-size figure. |
| `className?` | `string` | none | Merged onto the outer span. |

### `PricePeriod`

`"month" | "year" | "seat-month" | "once"`

| Value | English | Arabic |
| --- | --- | --- |
| `month` | `/mo` | `/شهريًا` |
| `year` | `/yr` | `/سنويًا` |
| `seat-month` | `/seat/mo` | `/للمقعد شهريًا` |
| `once` | none | none |

## Examples

### Discount

```tsx
import { Price } from "@fadymondy/nasaq/web";

export function Discounted() {
  return <Price amount={99} compareAt={149} currency="USD" period="year" size="lg" />;
}
```

### Free and Arabic currency

```tsx
import { NasaqProvider, Price } from "@fadymondy/nasaq/web";

export function ArabicPrices() {
  return (
    <NasaqProvider locale="ar" dir="rtl">
      <div className="flex flex-col gap-2">
        <Price amount={0} />
        <Price amount={49} currency="SAR" period="month" />
      </div>
    </NasaqProvider>
  );
}
```

## Accessibility

- Plain text; no role. The struck-through original is preceded by a `sr-only` "was" ("بدلًا من" in Arabic), so
  screen readers do not read two prices as one.
- Not every screen reader announces `<s>` as removed; the "was" text covers that.
- No keyboard interaction.
- Localise `freeLabel` if you set it yourself.

## RTL & i18n

- Formatting comes from `useFormatNumber`: currency placement ("$12" or "12 US$"), separators and the Nasaq
  digit set follow the active locale.
- Each amount is in `<bdi>`, so it keeps its order inside Arabic text.
- Built-in strings: "Free" / "مجاني", the three period suffixes, and "was" / "بدلًا من", chosen by the provider's
  locale (English when there is no provider).

## Styling & tokens

- Tokens: `text-foreground`, `text-muted-foreground` (period, original), `text-h2` for `size="lg"`.
- Target with `[data-slot=price]` or `[data-free]`.
- Extend with `className`. The root wraps onto a second line when space is tight.

## Do / Don't

- **Do** pass the ISO currency code and let the locale format it.
- **Do** use `period` instead of writing "/mo" into your own copy.
- **Don't** pass a pre-formatted string; pass the number.
- **Don't** set `compareAt` at or below `amount`; it is then hidden.

## Related

- [PlanCard](../plan-card/README.md) · [ProductCard](../product-card/README.md) · [Rating](../rating/README.md) · [Numeric](../numeric/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-pricing-price--docs
