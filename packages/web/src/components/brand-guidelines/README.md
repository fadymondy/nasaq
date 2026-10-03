---
name: brand-guidelines
title: BrandGuidelines
category: brand
status: beta
summary: A brand guidelines page with downloadable marks on light and dark grounds, copyable palette swatches, typography, do and dont rules and social cards. It shows only assets that are passed in or already in the repo.
exports: [BrandGuidelines, BrandAssetCard, BrandSwatch, BrandDoDont, BrandOgCardView, BrandGuidelinesProps, BrandAssetCardProps, BrandSwatchProps, BrandDoDontProps, BrandOgCardViewProps, BrandGuidelinesLabels, BrandAsset, BrandFont, BrandRule, BrandOgCard]
related: [product-mark, brand-loaders, copy-button, text-utilities]
story: components-brand-brand-guidelines
base-ui: []
keywords: [brand, guidelines, logo, palette, colour, typography, download, do and dont, og, social card]
---

# BrandGuidelines

One page that says how a brand is used. By default it reads the brand package: the mark comes from the brand's own
specification (downloaded unchanged as SVG on a light and a dark ground) and the palette from its manifest. Nothing is
invented here.

## When to use

- A brand or press page for a Nasaq product, or for a client brand you pass assets for.

## When not to use

- Do not use it to show a logo you were not given. It never draws a logo of its own and offers no font files.

## Import

```tsx
import { BrandGuidelines } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { BrandGuidelines } from "@fadymondy/nasaq/web";

export function Page() {
  return <BrandGuidelines brand="nasaq" intro="How to use the Nasaq mark and colours." />;
}
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `BrandKey` | required | The brand to document. |
| `title`, `intro` | `ReactNode` | label | Heading and lead. |
| `assets` | `BrandAsset[]` | official mark, light and dark | `id`, `name`, `format`, `href`, `filename`, `ground`, `preview`. |
| `colors` | `BrandColor[]` | the brand's palette | `id`, `name`, `value`, `usage`, `onColor`. Copy button per swatch. |
| `fonts` | `BrandFont[]` | none | Family, role, sample, weights, licence line and link. Names and specimens only. |
| `dos` / `donts` | `BrandRule[]` | built-in logo and colour rules | Text, plus an optional `example` you supply. Pass `[]` to hide. |
| `ogCards` | `BrandOgCard[]` | none | A finished `image`, or a live layout with the mark and text. |
| `onDownload` | `(asset) => void` | none | Fires on a download click. |
| `labels` | `BrandGuidelinesLabels` | en and ar | |

The parts are exported too: `BrandAssetCard`, `BrandSwatch`, `BrandDoDont`, `BrandOgCardView`. Helpers: `brandPalette`,
`brandMarkDownloads`, `paletteFromManifest`, `markDownloadItems`, `svgDataUri`, `brandColorCopyValue`, `ogSizeLabel`.

## Accessibility

Sections are landmarks labelled by their headings, with an in-page nav. Do and Don't carry an icon and a word. Copy
and download buttons have names that include the colour or file.

## RTL & i18n

The page mirrors. Colour values, sizes and font names stay left to right. The mark itself is never mirrored.

## Styling & tokens

Page chrome uses Nasaq tokens. Swatches show the brand's own values, which are data, not tokens.

## Do / Don't

- Do pass assets you have the right to show.
- Do not recolour, mirror, distort or redraw an official logo, and do not swap in a generic icon.
- Do not invent a palette when the brand has one.
- Do not redistribute font files unless the licence allows it.

## Related

- [ProductMark](../product-mark/README.md)
- [CopyButton](../copy-button/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-brand-brand-guidelines--docs
