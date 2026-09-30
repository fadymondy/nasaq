---
name: screenshot-frame
title: ScreenshotFrame
category: data-display
status: beta
summary: Frames a product screenshot as a window, browser or phone in neutral greys; with a label it becomes one accessible image.
exports: [ScreenshotFrame, ScreenshotFrameProps]
related: [feature-story, tabs, card]
story: components-data-display-screenshot-frame
base-ui: []
keywords: [screenshot, frame, window, browser, phone, mockup, marketing, figure]
---

# ScreenshotFrame

Wraps a screenshot (an image or live mock markup) in a window, browser or phone frame so marketing pages can show the product without imitating a real operating system. The frame uses neutral greys only; the screenshot carries the brand.

## When to use

- Product pages and docs that show the product UI.
- Inside [`FeatureStory`](../feature-story/README.md) as the `media`.

## When not to use

- Plain photos or illustrations: use an `<img>` in a `figure`.
- Interactive content the user should operate: with `label` set, the content is inert. Render it without a label, or without the frame.
- Code samples: use a code block.

## Import

```tsx
import { ScreenshotFrame, type ScreenshotFrameProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ScreenshotFrame } from "@fadymondy/nasaq/web";

export function BoardShot() {
  return (
    <ScreenshotFrame variant="browser" title="app.mahaam.com/board" label="Mahaam board with three columns">
      <img src="/board.png" alt="" />
    </ScreenshotFrame>
  );
}
```

## Anatomy

```
ScreenshotFrame                     data-slot="screenshot-frame", data-variant   <figure>
├─ chrome                           window/browser: rounded card with ring; phone: rounded bezel
│  ├─ bar                           data-slot="screenshot-frame-bar" (window, browser only)
│  │  ├─ three dots                 aria-hidden
│  │  └─ title                      dir="ltr", centred
│  └─ screen                        data-slot="screenshot-frame-screen" (role="img" when label is set)
│     └─ children
└─ figcaption                       when caption is set
```

## API

### `ScreenshotFrame`

`ScreenshotFrameProps extends Omit<ComponentProps<"figure">, "title">`. Remaining props go to the `<figure>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"window" \| "browser" \| "phone"` | `"window"` | `window`: desktop app. `browser`: web page with an address bar. `phone`: mobile screen (9:19, max 18rem wide, no bar). |
| `title?` | `ReactNode` | none | Window title (`window`) or address (`browser`). Always shown left-to-right. Not shown for `phone`. |
| `label?` | `string` | none | What the screenshot shows, for screen readers. When set the screen is `role="img"` with this `aria-label`, and its content is `aria-hidden` and `inert`. |
| `caption?` | `ReactNode` | none | Visible caption under the frame, in a `figcaption`. |
| `children` | `ReactNode` | required | The screenshot: an `<img>`, or live markup rendered as a mock. |
| `className?` | `string` | none | Merged onto the figure. |

## Examples

### Desktop window with caption

```tsx
import { ScreenshotFrame } from "@fadymondy/nasaq/web";

export function WindowShot() {
  return (
    <ScreenshotFrame
      title="Mahaam"
      label="Project board with tasks grouped by status"
      caption="Every task in one board."
    >
      <img src="/board.png" alt="" className="w-full" />
    </ScreenshotFrame>
  );
}
```

### Phone with Arabic copy

```tsx
import { ScreenshotFrame } from "@fadymondy/nasaq/web";

export function PhoneShot() {
  return (
    <ScreenshotFrame variant="phone" label="شاشة المهام في تطبيق مهام" caption="مهامك في جيبك.">
      <img src="/mobile-tasks.png" alt="" className="size-full object-cover" />
    </ScreenshotFrame>
  );
}
```

### Live mock instead of an image

```tsx
import { ScreenshotFrame } from "@fadymondy/nasaq/web";

export function LiveMock() {
  return (
    <ScreenshotFrame variant="browser" title="nasaq.dev" label="Landing page hero">
      <div className="p-8">
        <h3 className="text-h2">Build in Arabic first</h3>
      </div>
    </ScreenshotFrame>
  );
}
```

## Accessibility

- With `label`: the screen is one `role="img"` named by `label`; children are `aria-hidden` and `inert`, so nothing inside is focusable or announced. Write what the screenshot shows, not "screenshot of".
- Without `label`: children stay in the accessibility tree. Give an inner `<img>` a real `alt`, or use this for interactive mocks.
- The traffic-light dots and spacer are `aria-hidden`.
- The frame is a `figure`; `caption` becomes its `figcaption`.

| Key | Action |
| --- | --- |
| none | The frame is not interactive. Focusable children are reachable only when `label` is not set. |

The caller localises `label`, `title` and `caption`.

## RTL & i18n

- `title` is forced `dir="ltr"`: window titles and addresses stay left-to-right on Arabic pages.
- The frame chrome does not mirror; the dots stay at the left of the bar, like a real window.
- The caption is centred and follows the page direction.
- Screenshot content is not mirrored. Provide a localised screenshot per locale.
- No built-in strings.

## Styling & tokens

- Tokens: `bg-nq-surface-raised`, `ring-border`, `bg-nq-line-strong` (dots), `bg-secondary` (address pill), `bg-background` (screen), `rounded-card`, `text-caption`, `text-muted-foreground`.
- Target with `[data-slot=screenshot-frame]`, `[data-variant=phone]`, `[data-slot=screenshot-frame-bar]`, `[data-slot=screenshot-frame-screen]`.
- The frame fills its container width; set the width with `className` (`max-w-3xl`). Do not recolour with raw hex.

## Do / Don't

- **Do** set `label` for image screenshots.
- **Do** use one frame style per page.
- **Do** ship a localised screenshot for each locale.
- **Don't** put controls the user must operate inside a labelled frame.
- **Don't** colour the chrome with brand colours.
- **Don't** put long text in `title`; it truncates.

## Related

- [FeatureStory](../feature-story/README.md) · [Tabs](../tabs/README.md) · [Card](../card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-screenshot-frame--docs
