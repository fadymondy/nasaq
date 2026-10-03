---
name: brand-loaders
title: Brand loaders
category: brand
status: beta
summary: "Loading states with a brand feel: a braille spinner, a benday dot-matrix progress fill, a loader that animates around a supplied logo, and a full-screen boot splash with an honest failure state."
exports: [BrandLoadersLabels, BrailleLoaderProps, BrailleLoader, DotMatrixFillProps, DotMatrixFill, LogoLoaderProps, LogoLoader, BootSplashError, BootSplashProps, BootSplash]
related: [product-mark, spinner, progress, route-progress]
story: components-brand-brand-loaders
base-ui: []
keywords: [loader, spinner, braille, dot matrix, benday, splash, boot, logo loader, loading, progress]
---

# Brand loaders

Four ways to say "working" that carry the product's character. `BrailleLoader` is a one-character text spinner.
`DotMatrixFill` is a halftone progress bar. `LogoLoader` moves around a mark you pass in. `BootSplash` is the full-screen
screen shown while the app starts, and it turns into a plain failure message when startup fails.

## When to use

- The first paint of an app, before any layout exists (`BootSplash`).
- A long wait that should feel branded (`LogoLoader`, `DotMatrixFill`).
- An inline, text-sized wait (`BrailleLoader`).

## When not to use

- A button that is busy: use the button's own spinner.
- Page-to-page navigation: use `RouteProgress`.
- Content that can be shown as a skeleton.

## Import

```tsx
import { BootSplash, BrailleLoader, DotMatrixFill, LogoLoader } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BootSplash } from "@fadymondy/nasaq/web";

export function Boot({ failed }: { failed: boolean }) {
  return (
    <BootSplash
      name="Nasaq"
      state={failed ? "failed" : "loading"}
      stage="Loading your workspace"
      error={failed ? { message: "We could not reach the server." } : undefined}
      onRetry={() => location.reload()}
    />
  );
}
```

## Anatomy

```
BootSplash                data-slot="boot-splash"
├─ LogoLoader             the mark, with a ring or pulse around it
├─ name                   product name
├─ stage line             role="status", polite
├─ DotMatrixFill          optional progress
├─ slow hint              after slowAfterMs
├─ error message + Retry  when state="failed" (role="alert")
└─ footer slot
```

## API

**BrailleLoader**: `span` props plus `label`, `frames` (default ten braille frames), `interval` (ms, default 80).

**DotMatrixFill**: `div` props plus `value` (0..100 or `null` for a sweep, required), `cols`, `rows`, `pitch` (px), `label`.

**LogoLoader**: `div` props plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `mark` | `ReactNode` | `ProductMark` | The host's official mark. It is never redrawn, recoloured or moved. |
| `size` | `number` | `56` | Mark size in px; sizes the ring. |
| `variant` | `"pulse" \| "ring"` | `"ring"` | `pulse` fades the whole mark box. `ring` draws an arc outside it. |
| `value` | `number \| null` | | 0..100 makes the ring a progress ring; otherwise it spins. |
| `label` | `string` | Loading | Accessible name. |

**BootSplash**: `div` props plus `mark`, `name`, `state` (`loading` or `failed`), `stage`, `progress`, `slowAfterMs`
(default 10 seconds), `error` (`{ message, detail? }`), `onRetry`, `footer`, `labels`.

## Examples

**Bring your own mark**

```tsx
import { LogoLoader } from "@fadymondy/nasaq/web";
import { MahaamMark } from "@nasaq/brands";

export function Wait() {
  return <LogoLoader mark={<MahaamMark size={48} />} size={80} variant="pulse" />;
}
```

## Accessibility

- Each loader has `role="status"` and an accessible name; the decorative dots and braille glyphs are `aria-hidden`.
- `BootSplash` announces the stage politely and the failure with `role="alert"`.
- Under `prefers-reduced-motion` frames stop advancing and the ring and pulse hold still.

## RTL & i18n

- English and Arabic strings are built in; pass `labels` to override.
- The dot matrix and the ring always run left to right and clockwise: they draw progress, not text.
- Logos are never mirrored.

## Styling & tokens

- Colours come from `--nq-*` tokens. The braille spinner inherits the current text colour and size.
- Brand marks come only from `packages/brands` or existing Nasaq logo components.

## Do / Don't

- Do tell the truth on failure: say what failed and offer Retry.
- Do pass the real mark from `packages/brands`.
- Don't redraw or recolour a mark to suit the animation.
- Don't leave a spinner running forever: use `slowAfterMs` and a failure state.

## Related

- [`product-mark`](../product-mark/README.md)
- [`spinner`](../spinner/README.md)
- [`progress`](../progress/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-brand-brand-loaders--docs
