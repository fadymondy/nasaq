---
name: seo-preview
title: SeoPreview
category: seo
status: beta
summary: "How a page looks in Google (desktop and mobile) and as an Open Graph, X, WhatsApp and LinkedIn share card, with title and description length meters."
exports: [SeoPreviewLabels, SeoPreviewPlatform, SeoMeta, LengthMeterProps, LengthMeter, SeoPreviewProps, SeoPreview]
related: [seo-pages, keyword-tracker, search-performance-table]
story: components-seo-seo-preview
base-ui: [tabs, meter]
keywords: [seo, snippet, google, open graph, twitter, whatsapp, linkedin, meta title, meta description, share card]
---

# SeoPreview

SeoPreview shows one page the way people will meet it: a Google result on desktop and on mobile, and the share cards that Open Graph, X, WhatsApp and LinkedIn draw from the same tags. Two length meters tell the editor when the title or description is too short or will be cut. It is controlled or uncontrolled, and can edit the title, description and image URL in place.

Platform names are plain text. No logo or brand mark is drawn, so the preview never misrepresents an official mark.

## When to use

- A page or post editor that needs a live snippet while the author types.
- An SEO audit detail view that shows what a crawled page looks like today.
- A share settings screen for a marketing page.

## When not to use

- Listing many pages with scores: use [`SeoPageList`](../seo-pages/README.md).
- Search performance numbers (clicks, position): use [`SearchPerformanceTable`](../search-performance-table/README.md).

## Import

```tsx
import { SeoPreview } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { useState } from "react";
import { type SeoMeta, SeoPreview } from "@fadymondy/nasaq/web";

export function PageSeo() {
  const [meta, setMeta] = useState<SeoMeta>({
    title: "A complete guide to RTL design systems",
    description: "Learn how to build interfaces that work from right to left without a second stylesheet.",
    url: "https://example.com/blog/rtl-guide",
  });
  return <SeoPreview value={meta} onValueChange={setMeta} />;
}
```

## Anatomy

```
SeoPreview            data-slot="seo-preview"   (a Card)
  fields              title, description, image URL (when editable)
  LengthMeter         data-slot="length-meter"  x2, data-status
  Tabs                Google | Open Graph | X | WhatsApp | LinkedIn
    Google preview    desktop or mobile toggle
    share card        one per platform
```

## API

### SeoPreview

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `SeoMeta` | none | Controlled meta. |
| `defaultValue` | `SeoMeta` | empty | Initial meta when uncontrolled. |
| `onValueChange` | `(value: SeoMeta) => void` | none | Turns on the editing fields; called on every change. |
| `defaultPlatform` | `SeoPreviewPlatform` | `"google"` | First tab. |
| `editable` | `boolean` | with `onValueChange` | Show the fields without a callback. |
| `title / description` | `ReactNode` | built-in | Card header. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<SeoPreviewLabels>` | none | Replace any built-in English or Arabic string. |

### SeoMeta

`{ title, description, url, siteName?, favicon?, image?, breadcrumb? }`. `breadcrumb` replaces the trail built from the URL.

### LengthMeter

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `field` | `"title" \| "description"` | required | Which limit to measure against. |
| `text` | `string` | required | The text. |
| `label` | `ReactNode` | field name | Visible name. |
| `labels` | `Partial<SeoPreviewLabels>` | none | Strings. |

### Helpers

`lengthMeter`, `textLength`, `SEO_LIMITS`, `estimatePixelWidth`, `truncateAt`, `pathSegments`, `breadcrumbFor` are exported from the package for use in your own validation. Limits: title 30 to 60 characters, description 70 to 160.

## Examples

Read only, for an audit:

```tsx
import { SeoPreview } from "@fadymondy/nasaq/web";

<SeoPreview value={{ title: "Pricing", description: "Plans for every team.", url: "https://example.com/pricing" }} />;
```

Arabic copy, share tab first:

```tsx
import { SeoPreview } from "@fadymondy/nasaq/web";

<SeoPreview
  defaultPlatform="whatsapp"
  defaultValue={{ title: "دليل تصميم واجهات من اليمين إلى اليسار", description: "تعلّم كيف تبني واجهات تعمل باتجاه اليمين دون ورقة أنماط ثانية.", url: "https://example.com/ar/guide" }}
/>;
```

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Move between platform tabs. |
| Tab | Move to the fields and the desktop / mobile toggle. |

Each meter is a `role="meter"` with a spoken value and a written verdict, so colour is not the only signal. Pass localised `labels`.

## RTL & i18n

Titles and descriptions use `dir="auto"`; the URL and breadcrumb stay left-to-right. Counts use Latin digits. Built-in English and Arabic strings.

## Styling & tokens

Uses `--nq-*` surface, border and status tokens. Meters carry `data-status="empty | short | good | long"`.

## Do / Don't

- Do let the author edit and see the result at once.
- Do pass a real `image` when you have one.
- Don't add logos of the networks: the preview uses names only.

## Related

- [SeoPageList](../seo-pages/README.md)
- [KeywordTracker](../keyword-tracker/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-seo-seo-preview--docs
