---
name: barcode
title: Barcode
category: utilities
status: beta
summary: One-dimensional barcodes drawn as SVG with jsbarcode (Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF, Codabar, Pharmacode), with input validation that explains the problem, SVG and PNG download and a generator card.
exports: [Barcode, BarcodeProps, BarcodeLabels, BarcodeGenerator, BarcodeGeneratorProps, BARCODE_FORMATS, BarcodeFormat, BarcodeProblem, gtinCheckDigit, validateBarcode]
related: [qr-code, copy-button]
story: components-utilities-barcode
base-ui: [field, input, select]
keywords: [barcode, code128, ean13, upc, ean, gtin, jsbarcode, svg, download, generator]
---

# Barcode

A barcode as inline SVG. jsbarcode draws the bars; Nasaq checks the value first, so a bad EAN shows why
("needs 13 digits", "check digit should be 1") instead of a blank or broken image.

## When to use

- Product, asset and order labels.
- A generator for staff who print their own codes.

## When not to use

- Links or free text for phones: use [`QrCode`](../qr-code/README.md).
- Anything secret: a barcode is plain data.

## Import

```tsx
import { Barcode, BarcodeGenerator } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Barcode } from "@fadymondy/nasaq/web";

export function Label({ sku }: { sku: string }) {
  return <Barcode value={sku} format="CODE128" downloadable downloadName={sku} />;
}
```

## Anatomy

```
Barcode                         data-slot="barcode"
├─ error message                role="alert" (when the value is invalid)
├─ svg                          data-slot="barcode-svg" (role="img")
└─ actions (downloadable)       data-slot="barcode-actions": Download SVG, Download PNG
BarcodeGenerator                data-slot="barcode-generator" (Card): value, format, preview
```

## API

**Barcode**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | What the bars encode. |
| `format` | `BarcodeFormat` | `"CODE128"` | `CODE128`, `EAN13`, `EAN8`, `UPC`, `CODE39`, `ITF14`, `ITF`, `codabar`, `pharmacode`. |
| `showValue` | `boolean` | `true` | Print the value under the bars. |
| `height`, `barWidth`, `margin` | `number` | `80`, `2`, `10` | Geometry in px. |
| `fg`, `bg` | `string` | black, white | Any CSS colour or token. |
| `downloadable` | `boolean` | `false` | Show Download SVG and PNG. |
| `downloadName`, `pngSize` | `string`, `number` | `"barcode"`, `1200` | File name and PNG width. |
| `onValidate` | `(problem \| null) => void` | | Called after each draw. |
| `labels` | `Partial<BarcodeLabels>` | | Override any string. |

**BarcodeGenerator**: `defaultValue`, `defaultFormat`, `formats`, `downloadName`, `labels`.

**Helpers** (pure, tested): `validateBarcode(format, value)` returns `{ kind, ... }` or `null`; `gtinCheckDigit(digitsWithoutCheck)`.

## Examples

**Validate before saving**

```tsx
import { validateBarcode } from "@fadymondy/nasaq/web";

export const ok = validateBarcode("EAN13", "4006381333931") === null;
```

**Only retail formats in the generator**

```tsx
import { BarcodeGenerator } from "@fadymondy/nasaq/web";

export const Retail = () => <BarcodeGenerator formats={["EAN13", "EAN8", "UPC"]} defaultFormat="EAN13" defaultValue="4006381333931" />;
```

## Accessibility

- The SVG is `role="img"` with a name that includes the format and value. Errors are `role="alert"`.
- Bars need contrast and a quiet zone: keep the default margin.

## RTL & i18n

- Bars and digits are always left-to-right (`dir="ltr"`), also in Arabic. The generator UI mirrors and has Arabic strings.

## Styling & tokens

- Black on white by default so scanners read it. Tokens resolve to concrete colours at download time.
- Target `[data-slot="barcode"]`, `[data-slot="barcode-svg"]`.

## Do / Don't

- Do let the check digit be computed for you with `gtinCheckDigit` when you generate EANs.
- Do print at least the size the format standard asks for.
- Don't stretch the SVG unevenly: it changes the bar ratio.

## Related

- [`QrCode`](../qr-code/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-utilities-barcode--docs
