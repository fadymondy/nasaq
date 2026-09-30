---
name: qr-code
title: QrCode
category: utilities
status: beta
summary: QR code drawn as SVG in the browser with dot, rounded or square modules, three eye styles, a centre logo slot, token or prop colours and SVG or PNG download, plus a full generator card.
exports: [QrCode, QrCodeProps, QrCodeLabels, QrCodeGenerator, QrCodeGeneratorProps, qrLayout, qrSvgString, QrEcc, QrEyeStyle, QrLayout, QrLayoutOptions, QrLogo, QrModuleStyle, downloadBlob, downloadPng, downloadSvg, resolveColor, svgToPng, toDataUri]
related: [barcode, copy-button, two-factor-setup, whatsapp-qr-connect]
story: components-utilities-qr-code
base-ui: [field, input, select, textarea]
keywords: [qr, qrcode, qr code, svg, png, download, logo, generator, uqr]
---

# QrCode

A QR code that stays sharp at any size. The bit matrix comes from `uqr`; the drawing is Nasaq's own SVG,
so modules can be squares, dots or rounded, the three corner eyes have their own shape and colour, and a
logo can sit in the middle. `QrCodeGenerator` wraps it in a card with the controls.

## When to use

- Share a link, a Wi-Fi string, a vCard or a pairing payload.
- Let people make and download their own code (`QrCodeGenerator`).
- Any place you need the code as inline SVG, with no image request.

## When not to use

- One-dimensional retail or shipping codes: use [`Barcode`](../barcode/README.md).
- A TOTP set-up: [`TwoFactorSetup`](../two-factor-setup/README.md) already draws its own.
- A pairing flow with a countdown: [`WhatsappQrConnect`](../whatsapp-qr-connect/README.md).

## Import

```tsx
import { QrCode, QrCodeGenerator } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { QrCode } from "@fadymondy/nasaq/web";

export function Share({ url }: { url: string }) {
  return <QrCode value={url} downloadable downloadName="my-link" />;
}
```

## Anatomy

```
QrCode                          data-slot="qr-code"
├─ svg                          data-slot="qr-code-svg" (role="img", aria-label)
└─ actions (downloadable)       data-slot="qr-code-actions": Download SVG, Download PNG
QrCodeGenerator                 data-slot="qr-code-generator" (Card)
├─ content, module style, eye style, colours, logo upload
└─ preview: QrCode with downloads
```

## API

**QrCode**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | What the code holds. |
| `moduleStyle` | `"square" \| "dots" \| "rounded"` | `"square"` | Shape of the data modules. |
| `eyeStyle` | `"square" \| "rounded" \| "circle"` | `"square"` | Shape of the three big corners. |
| `ecc` | `"L" \| "M" \| "Q" \| "H"` | `"M"` | Error correction. `"H"` is forced when there is a logo. |
| `margin` | `number` | `4` | Quiet zone in modules. |
| `fg`, `bg`, `eyeFg` | `string` | black, white, `fg` | Any CSS colour, including `var(--nq-...)` tokens. Keep strong contrast. |
| `logo` | `{ src: string; scale?: number }` | | Centre image. Scale is capped at 0.3. Modules under it are cleared. |
| `size` | `number \| "fill"` | `192` | Width and height in px. |
| `label` | `string` | "QR code for ..." | Accessible name. |
| `downloadable` | `boolean` | `false` | Show Download SVG and PNG. |
| `downloadName`, `pngSize` | `string`, `number` | `"qr-code"`, `1024` | File name and PNG width. |
| `labels` | `Partial<QrCodeLabels>` | | Override any string. |

**QrCodeGenerator**: `defaultValue`, `defaultModuleStyle`, `defaultEyeStyle`, `defaultFg`, `defaultBg`, `defaultLogo`, `downloadName`, `labels`.

**Helpers** (no React): `qrLayout(options)` returns `{ size, modules, eyes, logo }` path data; `qrSvgString(options)` returns a
standalone SVG string; `downloadSvg`, `downloadPng`, `svgToPng`, `resolveColor` are shared with `Barcode`.

## Examples

**Brand colours and a logo**

```tsx
import { QrCode } from "@fadymondy/nasaq/web";

export function Brand({ logo }: { logo: string }) {
  return <QrCode value="https://example.com" moduleStyle="rounded" eyeStyle="rounded" fg="var(--nq-brand)" logo={{ src: logo }} />;
}
```

**Make an SVG string on the server**

```tsx
import { qrSvgString } from "@fadymondy/nasaq/web";

export const svg = qrSvgString({ value: "https://example.com", fg: "rgb(0, 0, 0)", bg: "rgb(255, 255, 255)" });
```

## Accessibility

- The SVG is `role="img"` with an accessible name. The content is not read out: pass `label` when the value is long or private.
- Download buttons are real buttons with text. The colour inputs in the generator have labels.
- Contrast: dark on light with a quiet zone scans best. Light-on-dark and low-contrast pairs often fail in cameras.

## RTL & i18n

- The code is not mirrored: it is data, and scanners read it one way. The generator UI mirrors and has Arabic strings.
- The value field is `dir="ltr"`, because URLs and payloads are left-to-right.

## Styling & tokens

- Colours default to plain black and white for scanning. Tokens are resolved to concrete colours at download time, so files are portable.
- Target `[data-slot="qr-code"]`, `[data-slot="qr-code-svg"]`.

## Do / Don't

- Do test a styled code with a real phone before shipping it.
- Do keep a logo at or under 22 percent of the width.
- Don't use dots with a low error correction for long values: the code gets dense.
- Don't put a secret in a QR that will be shown to anyone else.

## Related

- [`Barcode`](../barcode/README.md)
- [`WhatsappQrConnect`](../whatsapp-qr-connect/README.md)
- [`TwoFactorSetup`](../two-factor-setup/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-utilities-qr-code--docs
