---
name: feature-story
title: FeatureStory
category: layout
status: beta
summary: One feature told as copy plus a picture, side by side above 48rem of container width; alternate with reverse to build a product page.
exports: [FeatureStory, FeatureStoryProps]
related: [screenshot-frame, plan-card, tabs]
story: components-layout-feature-story
base-ui: []
keywords: [feature, story, marketing, section, product page, media, proof points, split]
---

# FeatureStory

Tells one feature as a story: an eyebrow and title, a description, a few proof points and a picture. Copy and media sit side by side from 48rem of container width and stack below it. Stack several with `reverse` alternating to build a product page.

## When to use

- Product and marketing pages that explain features one by one.
- Pairing text with a [`ScreenshotFrame`](../screenshot-frame/README.md), a code sample or a transcript.

## When not to use

- A grid of many short features: use cards.
- Pricing: use [`PlanCard`](../plan-card/README.md).
- App UI that is not marketing content.

## Import

```tsx
import { FeatureStory, type FeatureStoryProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { FeatureStory } from "@fadymondy/nasaq/web";

export function Feedback() {
  return (
    <FeatureStory
      eyebrow="Feedback SDK"
      title="Hear from users where they are"
      description="Collect reports from inside your product."
      points={["One script tag", "Screenshots attached", "Lands in your board"]}
    />
  );
}
```

## Anatomy

```
div                     data-slot="feature-story", @container
└─ section              aria-labelledby the title; 1 column, 2 columns from @3xl
   ├─ copy column       (order-2 at @3xl when reverse)
   │  ├─ eyebrow row    icon (brand tint, aria-hidden) + eyebrow
   │  ├─ title          <h2> or <h3>
   │  ├─ description    <p>
   │  ├─ points         <ul>, check icon (aria-hidden) + text
   │  └─ action         link or secondary button
   └─ media column      media
```

## API

### `FeatureStory`

`FeatureStoryProps extends Omit<ComponentProps<"section">, "title">`. Remaining props go to the `<section>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `eyebrow?` | `ReactNode` | none | Short label above the title ("Feedback SDK"). |
| `icon?` | `ReactNode` | none | Icon element shown on a brand tint beside the eyebrow. |
| `title` | `ReactNode` | required | The heading. |
| `description?` | `ReactNode` | none | Supporting paragraph. |
| `points?` | `ReactNode[]` | none | Two to four concrete proof points, one line each. |
| `media?` | `ReactNode` | none | The picture: a `ScreenshotFrame`, a code sample, a transcript. |
| `reverse?` | `boolean` | `false` | Put the media at the inline start instead of the end. Alternate it down a page. |
| `action?` | `ReactNode` | none | A link or secondary button under the points. |
| `titleAs?` | `"h2" \| "h3"` | `"h2"` | Heading element for the title. |
| `className?` | `string` | none | Merged onto the `<section>` grid. |

## Examples

### With a screenshot

```tsx
import { Button, FeatureStory, ScreenshotFrame } from "@fadymondy/nasaq/web";
import { Bug } from "lucide-react";

export function BoardStory() {
  return (
    <FeatureStory
      eyebrow="Feedback SDK"
      icon={<Bug />}
      title="Reports arrive with context"
      description="Every report carries the page, the browser and a screenshot."
      points={["Console errors attached", "Deduplicated automatically"]}
      action={<Button variant="secondary">Read the docs</Button>}
      media={
        <ScreenshotFrame variant="browser" title="app.example.com" label="Feedback widget open on a page">
          <img src="/widget.png" alt="" />
        </ScreenshotFrame>
      }
    />
  );
}
```

### Alternating on a page, in Arabic

```tsx
import { FeatureStory } from "@fadymondy/nasaq/web";

export function Features() {
  return (
    <div dir="rtl" className="flex flex-col gap-16">
      <FeatureStory
        title="تابع مهامك في مكان واحد"
        description="لوحة واحدة لكل المشاريع."
        points={["سحب وإفلات", "إشعارات فورية"]}
      />
      <FeatureStory
        reverse
        titleAs="h3"
        title="فواتير جاهزة من الوقت المسجل"
        description="حوّل ساعات العمل إلى فاتورة بنقرة."
      />
    </div>
  );
}
```

## Accessibility

- The `<section>` is labelled by its title through `aria-labelledby`, so it is a named region.
- Use `titleAs="h3"` when the story sits under another `h2`; keep heading levels in order.
- The eyebrow icon and the check icons are `aria-hidden`. Points are a plain list.
- Media keeps its own accessibility (give `ScreenshotFrame` a `label`).
- No interactive behaviour of its own; `action` is focusable as you supply it.

| Key | Action |
| --- | --- |
| `Tab` | Reaches the interactive elements in `action` and `media` in DOM order (copy first, media second, even when `reverse` shows media first). |

The caller localises all copy.

## RTL & i18n

- The layout uses logical grid flow: in RTL the copy is on the right and the media on the left; `reverse` swaps them.
- Check icons sit on the inline start.
- The title uses `text-balance` and the description `text-pretty`; both work with Arabic.
- Numbers in points: isolate with `Num`.
- No built-in strings.

## Styling & tokens

- Tokens: `text-h1`, `text-body`, `text-body-sm`, `text-label`, `text-foreground`, `text-muted-foreground`, `--nq-brand` (`text-nq-brand`, icon tint at 14%), `rounded-control`.
- The breakpoint is a container query (`@3xl`, 48rem) on the wrapper, so it responds to its container and not the viewport.
- Target with `[data-slot=feature-story]`. Extend with `className` (applied to the grid). Do not use raw hex.

## Do / Don't

- **Do** keep points to two to four short lines.
- **Do** alternate `reverse` down a page.
- **Do** set `titleAs` so headings stay in order.
- **Don't** put more than one primary action in `action`.
- **Don't** use it for dense app UI.
- **Don't** use the eyebrow for long sentences.

## Related

- [ScreenshotFrame](../screenshot-frame/README.md) · [PlanCard](../plan-card/README.md) · [Tabs](../tabs/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-feature-story--docs
