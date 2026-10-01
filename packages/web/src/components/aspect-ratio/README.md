---
name: aspect-ratio
title: AspectRatio
category: layout
status: beta
summary: A box that keeps a fixed width-to-height ratio as it resizes, for video embeds, maps, cover images and thumbnails; direct img, video and iframe children fill it.
exports: [AspectRatio, AspectRatioProps]
related: [card, map-view]
story: components-layout-aspect-ratio
base-ui: []
keywords: [aspect ratio, ratio, 16:9, video, embed, iframe, image, thumbnail, responsive, cover]
---

# AspectRatio

A `div` with CSS `aspect-ratio`. It reserves the height before media loads, so the page does not jump.

## When to use

- Video and map embeds, cover images, thumbnails in a grid.

## When not to use

- Images with known `width` and `height` attributes: the browser already reserves their space.
- Text content: let it set its own height.

## Import

```tsx
import { AspectRatio } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AspectRatio } from "@fadymondy/nasaq/web";

export function Intro() {
  return (
    <AspectRatio ratio={16 / 9} className="rounded-card border border-border">
      <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Product tour" allowFullScreen />
    </AspectRatio>
  );
}
```

## Anatomy

```
AspectRatio                     data-slot="aspect-ratio", style="aspect-ratio: <ratio>"
└─ img | video | iframe         absolutely fills the box (img and video use object-cover)
```

Other children flow normally inside the box.

## API

**AspectRatio**: every `div` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `ratio` | `number` | `16 / 9` | Width over height: `16 / 9`, `4 / 3`, `1`. |

## Accessibility

- Give every `iframe` a `title` and every `img` an `alt`; the box adds no semantics.

## RTL & i18n

- Nothing to mirror.

## Styling & tokens

- No visual style of its own. Add `rounded-card` and `border-border`; `overflow-hidden` is set so corners clip.

## Do / Don't

- Do pick the media's real ratio so nothing is cropped by surprise.
- Don't put long text inside; it overflows on narrow screens.

## Related

- [`Card`](../card/README.md)
- [`MapView`](../map-view/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-aspect-ratio--docs
