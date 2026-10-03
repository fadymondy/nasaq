---
name: currency-input
title: CurrencyInput
category: forms
status: beta
summary: Money field whose value is an integer in minor units. The currency sets the decimals, Arabic and Western digits both parse, and the symbol sits where the locale puts it.
exports: [CurrencyInput, CurrencyInputProps, CurrencyInputLabels]
related: [numeric, price, phone-input, input-group, field]
story: components-forms-currency-input
base-ui: [input, select]
keywords: [money, currency, amount, price, minor units, cents, halalas, decimals, arabic digits, sar, usd, kwd, jpy]
---

# CurrencyInput

A field for an amount of money. The value you read and write is an **integer in minor units** (cents, halalas, fils):
`1999` is 19.99 USD, `12500` is 12.500 KWD, `1200` is 1,200 JPY. Nothing is a float, so nothing drifts. The currency
decides how many decimals the field accepts, and digits typed or pasted in any set (`1250.5`, `١٢٥٠٫٥`) give the same amount.

While the field has focus it shows the plain number you are editing. On blur it groups and pads it: `1,250.50`.

## When to use

- Prices, budgets, fees, invoice lines and any input the backend stores as minor units.
- Forms used in Arabic and English, where people paste amounts from spreadsheets and chats.
- An amount with a choosable currency (`currencies`).

## When not to use

- A plain quantity or percentage: use an `Input` with `inputMode="numeric"`.
- Showing a price: use [Price](../price/README.md) or `Num` with `style: "currency"` ([numeric](../numeric/README.md)).
- Converting between currencies at an exchange rate: this only keeps the same amount of money when the decimals differ.

## Import

```tsx
import { CurrencyInput, parseMoney, formatMinor } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CurrencyInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Fee() {
  const [minor, setMinor] = useState<number | null>(1999);
  return <CurrencyInput aria-label="Fee" currency="USD" value={minor} onValueChange={setMinor} />;
}
```

## Anatomy

```
CurrencyInput                data-slot="currency-input" data-currency="USD"
└─ InputGroup                data-invalid when out of range
   ├─ symbol addon           data-slot="currency-symbol"  (start or end, where the locale puts it)
   ├─ input                  dir="ltr", inputMode="decimal" (numeric for 0 decimals)
   ├─ currency Select        only with `currencies`
   └─ hidden input           only with `name`: the minor-unit integer
```

## API

### `CurrencyInput`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `number \| null` | none | Controlled amount in minor units. `null` is empty. |
| `defaultValue?` | `number \| null` | `null` | Initial amount when uncontrolled. |
| `onValueChange?` | `(minor: number \| null) => void` | none | Fires on every edit with the amount in minor units, `null` when emptied. |
| `currency?` | `string` | `"USD"` | ISO 4217 code. Sets the decimals: JPY 0, USD 2, KWD 3. |
| `currencies?` | `readonly string[]` | none | Show a currency picker. Needs `onCurrencyChange`. |
| `onCurrencyChange?` | `(currency: string, minor: number \| null) => void` | none | The new code and the amount rewritten for its decimals (12.50 USD stays 12.500 in KWD, so `1250` becomes `12500`). |
| `min?` / `max?` | `number` | none | Inclusive bounds in minor units. Outside them the field is invalid. |
| `clampOnBlur?` | `boolean` | `false` | Pull an out-of-range amount back to the bound on blur. |
| `allowNegative?` | `boolean` | `false` | Accept a leading minus. |
| `numberingSystem?` | `"latn" \| "arab"` | `"latn"` | Digits shown. Both sets are accepted when typing. |
| `locale?` | `string` | provider locale | Decimal mark and symbol placement. |
| `overflow?` | `"round" \| "truncate"` | `"round"` | A pasted amount with too many decimals (`1.005` in USD). Typing simply stops at the decimals. |
| `symbol?` | `"symbol" \| "code" \| "none"` | `"symbol"` | `$`, `USD`, or nothing. |
| `fixedDecimals?` | `boolean` | `true` | Keep `.00` on whole amounts when not focused. |
| `step?` | `number` | one major unit | ArrowUp and ArrowDown change the amount by this many minor units; Shift multiplies by 10. |
| `name?` | `string` | none | Hidden input with the minor-unit integer, for native form posts. |
| `placeholder?` | `string` | `0.00` in the field's format | |
| `disabled?` / `readOnly?` / `invalid?` / `required?` | `boolean` | `false` | |
| `id?` / `aria-label?` | `string` | none | Give the input a name when there is no `FieldLabel`. |
| `labels?` | `CurrencyInputLabels` | Arabic and English | `currency` (picker name) and `outOfRange` (screen-reader text). |
| `className?` | `string` | none | Merged onto the wrapper. |

### Helpers (also exported from the package)

| Export | Description |
| --- | --- |
| `currencyDecimals(code)` | Decimals of a currency. Unknown codes give 2. |
| `parseMoney(text, { currency, locale?, paste?, overflow? })` | Text to minor units, or `null`. `paste: true` reads `1,250` as 1250 and `1.250,75` as 125075. |
| `formatMinor(minor, currency, locale, { digits?, fixed?, grouping? })` | Locale text without a symbol: `1,250.50`, `١٬٢٥٠٫٥٠`. |
| `minorToPlain(minor, decimals)` | Exact decimal string, `"-19.99"`. |
| `majorToMinor(major, currency)` / `minorToMajor(minor, currency)` | Conversions that avoid `1.005 * 100` mistakes. |
| `convertMinorDecimals(minor, from, to)` | Same money across currencies with different decimals. |
| `normalizeMoneyDigits(text)` | ٠-٩ and ۰-۹ to 0-9, Arabic marks to `.` and `,`. |
| `sanitizeMoneyText`, `toPlainDecimal`, `plainToMinor` | The editing pipeline, for custom fields. |
| `symbolSide(currency, locale)` / `currencySymbol(currency, locale, display?)` | Where and what the symbol is. |
| `moneyInRange(minor, min?, max?)` / `clampMoney(minor, min?, max?)` | Bounds. |

## Examples

### Arabic, Arabic digits and Saudi riyals

```tsx
import { CurrencyInput, NasaqProvider } from "@fadymondy/nasaq/web";

export const Riyals = () => (
  <NasaqProvider locale="ar" target="scope">
    <CurrencyInput aria-label="السعر" currency="SAR" numberingSystem="arab" defaultValue={125050} />
  </NasaqProvider>
);
```

The field shows `١٬٢٥٠٫٥٠` and the riyal symbol after the figure, as Arabic writes it.

### Choosable currency

```tsx
import { CurrencyInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Budget() {
  const [currency, setCurrency] = useState("USD");
  const [minor, setMinor] = useState<number | null>(1250);
  return (
    <CurrencyInput
      aria-label="Budget"
      currency={currency}
      currencies={["USD", "SAR", "KWD", "JPY"]}
      value={minor}
      onValueChange={setMinor}
      onCurrencyChange={(next, converted) => {
        setCurrency(next);
        setMinor(converted);
      }}
    />
  );
}
```

### In a Field with a range

```tsx
import { CurrencyInput, Field, FieldDescription, FieldLabel } from "@fadymondy/nasaq/web";

export const Deposit = () => (
  <Field>
    <FieldLabel>Deposit</FieldLabel>
    <CurrencyInput currency="SAR" min={5000} max={5000000} defaultValue={2500} />
    <FieldDescription>Between 50 and 50,000 SAR.</FieldDescription>
  </Field>
);
```

### Parse a pasted value yourself

```tsx
import { parseMoney } from "@fadymondy/nasaq/web";

const minor = parseMoney("١٬٢٥٠٫٥٠ ر.س.", { currency: "SAR", locale: "ar", paste: true }); // 125050
export { minor };
```

## Accessibility

| Key | Action |
| --- | --- |
| ArrowUp / ArrowDown | Add or subtract `step` (one major unit); Shift makes it 10 times larger. |
| Tab | Moves to the currency picker when there is one. |

- The input has `inputMode="decimal"` (`numeric` for 0 decimals), so phones show a number pad.
- Pass `aria-label`, or put the field inside a `Field` with a `FieldLabel`.
- An out-of-range amount sets `aria-invalid` and adds screen-reader text; the message beside the field is yours to write.

## RTL & i18n

- The input is always left to right (`dir="ltr"`): amounts read the same in Arabic and English. The symbol sits on the side the locale uses (`$1.00` at the start, `1.00 US$` at the end), inside a `bdi`.
- Type or paste `٠١٢٣٤٥٦٧٨٩`, `۰۱۲۳`, `٫` (Arabic decimal), `٬` (Arabic thousands) and `،` (Arabic comma): all read correctly. Display defaults to Western digits like the rest of Nasaq; pass `numberingSystem="arab"` for editorial forms.
- Typing treats `.` and the locale's decimal mark as the decimal point and drops other marks. Pasting is smarter: `1,250` is 1250, `1,25` (German) is 1.25.

## Styling & tokens

- Uses the `InputGroup` tokens (`--nq-control`, border, focus ring). The picker is a `Select` inside the group.
- `data-invalid` on the group when invalid or out of range. Extend with `className`.

## Do / Don't

- **Do** store and send the minor-unit integer.
- **Do** keep the currency next to the amount in your model: minor units mean nothing without it.
- **Don't** divide by 100 yourself: KWD has 3 decimals and JPY none. Use `currencyDecimals` or the helpers.
- **Don't** multiply floats (`19.99 * 100`); use `majorToMinor` or `parseMoney`.

## Related

- [Numeric](../numeric/README.md) · [Price](../price/README.md) · [PhoneInput](../phone-input/README.md) · [InputGroup](../input-group/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-forms-currency-input--docs
