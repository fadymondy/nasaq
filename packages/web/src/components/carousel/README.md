---
name: carousel
title: Carousel
category: data-display
status: beta
summary: Swipeable slide carousel on Embla. Previous/next buttons, dots, direction-aware keyboard arrows, optional autoplay that respects reduced motion. Everything mirrors in RTL.
exports: [Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselDots, CarouselPlayPause, useCarouselContext, CarouselApi, CarouselOptions, CarouselProps]
related: [tabs, card, button]
story: components-data-display-carousel
keywords: [carousel, slider, gallery, slides, embla, swipe]
---

# Carousel

A row of slides you swipe, drag or step through. Built on `embla-carousel-react`; the reading direction is passed to
Embla, so in Arabic the first slide is at the right and next moves left.

## When to use

- Image galleries, feature highlights, product rows that do not fit the width.

## When not to use

- Content the user must compare or all read: show it in a grid.
- Switching between views: use [`Tabs`](../tabs/README.md).

## Import

```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselDots } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<Carousel label="Gallery" className="max-w-xl">
  <CarouselContent>
    <CarouselItem>One</CarouselItem>
    <CarouselItem>Two</CarouselItem>
    <CarouselItem>Three</CarouselItem>
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
  <CarouselDots />
</Carousel>
```

## Anatomy

```
Carousel              role="region" aria-roledescription="carousel", sets dir and lang
├─ CarouselContent    viewport and track
│  └─ CarouselItem    role="group" aria-roledescription="slide" "Slide 2 of 5"
├─ CarouselPrevious   inline-start edge, chevron mirrors in RTL
├─ CarouselNext       inline-end edge
├─ CarouselDots       one button per snap, aria-current on the active one
└─ CarouselPlayPause  only when autoplay is on
```

## API

### `Carousel`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `loop?` | `boolean` | `false` | Wrap around at the ends. |
| `align?` | `"start" \| "center" \| "end"` | `"start"` | Where the active slide rests. |
| `opts?` | Embla options | none | Extra options. `direction` is always taken from the reading direction. |
| `autoplay?` | `boolean \| number` | `false` | Advance on a timer; a number is the interval in ms (5000 for `true`). |
| `setApi?` | `(api: CarouselApi) => void` | none | Receives the Embla API. |
| `label?` | `string` | "Carousel" | Accessible name. Localise it. |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for isolated demos. |

`CarouselItem` is full width; set `basis-1/2` or `basis-1/3` to show several at once. `useCarouselContext()` returns
`{ api, selected, count, canPrev, canNext, rtl }` for custom controls.

## Accessibility

- The region is focusable; `Left` / `Right` move between slides and follow the reading direction (in RTL, `Left` goes to the next slide). Keys inside inputs are left alone.
- Each slide is announced as "Slide n of total"; the current position is in a polite live region unless autoplay is running.
- Autoplay is off under `prefers-reduced-motion`, pauses on hover, focus and hidden tabs, and stops for good after the user drags. `CarouselPlayPause` gives an explicit control.
- Dots and buttons have localised names and a 24px hit area.

## RTL & i18n

- Embla receives `direction: "rtl"`, so drag and slide order mirror.
- Previous/next sit on the start/end edges (`start-3`, `end-3`) and the chevrons use `Icon directional`.
- Default strings exist in English and Arabic.

## Styling & tokens

Slides use `ps-4` gutters (the track has `-ms-4`). Buttons use the `secondary` Button on `card` with `shadow-floating`. The dot for the current slide uses `primary`. No hex.

## Do / Don't

- **Do** give the carousel a `label` and every image real alt text.
- **Don't** hide essential content in slides after the first; users may never see them.
- **Don't** use autoplay for content that must be read.

## Related

- [Tabs](../tabs/README.md) · [Card](../card/README.md) · [Button](../button/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-carousel--docs
