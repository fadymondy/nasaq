---
name: spinner
title: Spinner
category: feedback
status: stable
summary: Small rotating loader icon for inline pending work; decorative, stops under reduced motion.
exports: [Spinner, SpinnerProps]
related: [states, status, badge]
story: components-loading-states-spinner
base-ui: []
keywords: [spinner, loader, loading, busy, pending, progress]
---

# Spinner

A lucide `LoaderCircle` that rotates. It is 16px (`size-4`) by default. Rotation is the one allowed non-colour
motion: it signals work, and it stops under `prefers-reduced-motion`. The spinner is decorative
(`aria-hidden`), so the surrounding UI must say what is happening.

## When to use

- Inline pending work: a button that is saving, a refresh, a row that is syncing.
- Next to a visible label such as "Saving…".

## When not to use

- Loading a whole region: use `LoadingState` or `Skeleton` from [states](../states/README.md); skeletons preview the layout.
- A completed or failed state: use [`Status`](../status/README.md).
- Progress with a known percentage: use a progress bar.
- A spinner alone with no text and no announcement: assistive tech gets nothing.

## Import

```tsx
import { Spinner } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Spinner } from "@fadymondy/nasaq/web";

export function Saving() {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
      <Spinner />
      جارٍ الحفظ…
    </span>
  );
}
```

## Anatomy

```
Spinner      data-slot="spinner"    <svg> (LoaderCircle), aria-hidden="true"
```

## API

### `Spinner`

`(props: SpinnerProps) => JSX.Element`, where `SpinnerProps extends ComponentProps<typeof LoaderCircle>` adds `label`. It accepts every lucide icon prop
(`size`, `strokeWidth`, `color`, `absoluteStrokeWidth`) and every SVG attribute, and forwards them.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `string` | none | When set, the spinner is wrapped in `role="status"` with an `sr-only` label instead of being decorative. Localise it. |
| `className?` | `string` | `"size-4 animate-spin motion-reduce:animate-none"` (merged) | Use `size-*` to resize. |
| `...props` | lucide `LoaderCircle` props | none | Spread after the defaults, so a caller can override `aria-hidden`. |

## Examples

### In a button

```tsx
import { Button, Spinner } from "@fadymondy/nasaq/web";

export function SaveButton({ saving }: { saving: boolean }) {
  return (
    <Button variant="primary" disabled={saving}>
      {saving ? <Spinner /> : null}
      {saving ? "جارٍ الحفظ…" : "حفظ"}
    </Button>
  );
}
```

### Larger, with a live announcement

```tsx
import { Spinner } from "@fadymondy/nasaq/web";

export function Syncing() {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      <Spinner className="size-6" />
      <span>جارٍ المزامنة…</span>
    </div>
  );
}
```

## Accessibility

- Without `label` the spinner is `aria-hidden="true"` and has no role or name.
- With `label`, it renders `<span role="status">` containing the icon and an `sr-only` label, so it is announced politely.
- Always give the pending state a text label. Wrap it in a `role="status"` region (or `aria-live="polite"`) so it is announced.
- `motion-reduce:animate-none` stops the rotation for users who prefer reduced motion, so the label matters even more.
- Localise the label yourself; the component has no strings.

## RTL & i18n

- A rotating circle is symmetrical and is not mirrored. The rotation direction does not change in RTL.
- Place it on the inline start of the label (`gap-2` in a flex row follows `dir`).
- No built-in strings.

## Styling & tokens

- Colour is `currentColor`; set text colour on the parent (`text-muted-foreground` is typical).
- Resize with `size-*` in `className` (default `size-4`).
- Target with `[data-slot=spinner]`. Do not colour it with raw hex.

## Do / Don't

- **Do** pair it with a text label and a `role="status"` region.
- **Do** prefer `LoadingState` / `Skeleton` when a whole region is loading.
- **Don't** use a spinner as the only signal of a failure or success.
- **Don't** add other animations; rotation is the only allowed motion.

## Related

- [States](../states/README.md) · [Status](../status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-loading-states-spinner--docs

The spinner has no story of its own; it appears under the `Primitives` story of Components/States.
