---
name: product-mark
title: ProductMark
category: brand
status: beta
summary: The official cube-lattice mark of a Nasaq brand, drawn from its MarkSpec, and ProductLogo (mark plus typeset name).
exports: [ProductMark, ProductLogo, MARK_ACCENT_MIN_SIZE, ProductMarkProps, ProductLogoProps]
related: [product-switcher, workspace-switcher, app-shell, icon]
story: brand-product-mark
base-ui: []
keywords: [logo, brand, mark, cube, lattice, wordmark, mahaam, zekra, nasaq, circlexo, product]
---

# ProductMark

Renders a product's official mark as an inline SVG made of square cubes on a lattice. The geometry,
body colour, dark-ground body colour and accent all come from the brand's `MarkSpec` in `@nasaq/brands`.
The mark is **never recoloured, filtered, mirrored, distorted or redrawn**. `ProductLogo` sets the mark
beside the brand name as a text label (never an image lockup).

## When to use

- Showing which product the user is in or can switch to (headers, launchers, sidebars, empty states).
- A brand's mark at any size from a 16px list icon to a large hero.
- `ProductLogo` when the name should read next to the mark in a UI label.

## When not to use

- A generic app or feature icon: use [`Icon`](../icon/README.md). Never substitute an icon for a brand mark.
- A launcher of several products: use [`ProductSwitcher`](../product-switcher/README.md), which uses this
  component.
- An exported lockup image. Nasaq does not ship one; the name is text.

## Import

```tsx
import { ProductMark, ProductLogo, MARK_ACCENT_MIN_SIZE } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProductMark } from "@fadymondy/nasaq/web";

export function Brand() {
  return <ProductMark brand="mahaam" size={32} />;
}
```

## Anatomy

```
ProductMark    data-slot="product-mark"    (<svg viewBox="0 0 100 100"> of <rect> cubes)
ProductLogo    data-slot="product-logo"    (<span> flex, gap 2)
├─ ProductMark  (size, title="" so it is decorative)
└─ name        Latin: <span dir="ltr"> mono, uppercase, +0.14em
               Arabic: <span lang="ar"> Arabic face, no tracking
```

## Brand keys

`BrandKey` values (from `@nasaq/brands`): `nasaq`, `fadymondy`, `mahaam`, `zekra`, `moharrik`, `seatfor`,
`health-debug`, `circlexo`, `hosbah`, `yes-delivery`, `orchestra`, `togo`.

Legacy aliases also resolve: `managy` to `mahaam`, `cabrain` to `zekra`, `claude-digital-twin` to
`moharrik`, `booki` to `seatfor`, `cloudy` to `hosbah`, `orchestra-mcp` to `orchestra`, `fady-mondy` to
`fadymondy`, `togo-framework` to `togo`.

The Nasaq mark itself is currently a proposal pending approval.

## API

### `ProductMark`

`ProductMarkProps extends Omit<ComponentProps<"svg">, "children">`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand?` | `BrandKey \| (string & {})` | provider's brand | Brand key or legacy alias. |
| `mark?` | `MarkSpec` | none | Draw a `MarkSpec` directly (previews of unreleased marks). Wins over `brand`. |
| `size?` | `number` | `24` | Rendered width and height in px (square). |
| `onDark?` | `boolean` | `NasaqProvider` resolved theme is dark | Use the spec's `bodyOnDark`. Set explicitly on a fixed dark or light ground. |
| `title?` | `string` | the mark's name | Accessible name. Pass `""` when the name is visible beside the mark (the SVG becomes `aria-hidden`). |
| `className?` | `string` | none | Merged after `shrink-0`. Use for layout only. |
| other `<svg>` props | | none | Forwarded. |

Resolution order: `mark`, then `brand`, then the provider's brand, then Nasaq. Works without
`NasaqProvider` (light theme, Nasaq mark).

Below `MARK_ACCENT_MIN_SIZE` the accent cube is drawn in the body colour.

### `MARK_ACCENT_MIN_SIZE`

`export const MARK_ACCENT_MIN_SIZE = 20`. Rendered size (px) below which the accent cube is drawn in the
body colour.

### `ProductLogo`

`ProductLogoProps extends ComponentProps<"span">`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand?` | `BrandKey \| (string & {})` | provider's brand | Brand key or alias. |
| `size?` | `number` | `20` | Mark size in px. |
| `arabic?` | `boolean` | `true` when the provider locale starts with `ar` | Show the Arabic name. Only applies to brands that have one; otherwise the Latin name is shown. |
| `className?` | `string` | none | Merged after `inline-flex items-center gap-2`. |

The name text scales with `size`: `0.6 * size` px for the Latin wordmark (12px at the default 20) and `0.7 * size` px for the Arabic name.

## Examples

### Marks at several sizes

```tsx
import { ProductMark } from "@fadymondy/nasaq/web";

export function Sizes() {
  return (
    <div className="flex items-end gap-6">
      {[16, 24, 32, 64].map((size) => (
        <ProductMark key={size} brand="zekra" size={size} />
      ))}
    </div>
  );
}
```

### Every brand

```tsx
import { BRAND_KEYS, BRANDS } from "@nasaq/brands";
import { ProductMark } from "@fadymondy/nasaq/web";

export function AllBrands() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {BRAND_KEYS.map((key) => (
        <div key={key} className="flex flex-col items-center gap-3 border border-border p-4">
          <ProductMark brand={key} size={56} />
          <span className="text-caption text-muted-foreground">{BRANDS[key].name.en}</span>
        </div>
      ))}
    </div>
  );
}
```

### Mark plus name, in Arabic

```tsx
import { NasaqProvider, ProductLogo } from "@fadymondy/nasaq/web";

export function Header() {
  return (
    <NasaqProvider defaultLocale="ar">
      <ProductLogo brand="mahaam" />  {/* mark + مهام */}
      <ProductLogo brand="circlexo" /> {/* no Arabic name: Latin wordmark */}
    </NasaqProvider>
  );
}
```

### A mark beside a visible name

```tsx
import { ProductMark } from "@fadymondy/nasaq/web";

export function Row() {
  return (
    <div className="flex items-center gap-2 text-label">
      <ProductMark brand="hosbah" size={16} title="" />
      Hosbah
    </div>
  );
}
```

### Fixed dark ground

```tsx
import { ProductMark } from "@fadymondy/nasaq/web";

export function OnNavy() {
  return (
    <div className="bg-[#0B1429] p-6">
      <ProductMark brand="nasaq" size={96} onDark />
    </div>
  );
}
```

## Accessibility

- With a `title` (default: the brand name) the SVG has `role="img"` and `aria-label`.
- With `title=""` the SVG gets `aria-hidden="true"`. Use it whenever the name is visible next to the mark,
  as `ProductLogo` does.
- The mark is decorative in interactive controls: label the control, not the mark. The caller must localise
  `title` when it is used.
- No keyboard behaviour.
- An unknown `brand` key logs `console.warn` in development (not in production) and falls back to the default mark.

## RTL & i18n

- The mark is **never mirrored**. SVG geometry ignores `dir`, and you must not add `rtl:-scale-x-100`.
- `ProductLogo` in Arabic shows the brand's Arabic name in the Arabic face with no tracking and no
  uppercase. In Latin it is JetBrains Mono 500, uppercase, +0.14em, `dir="ltr"`.
- Brands without an Arabic name (`fadymondy`, `seatfor`, `circlexo`) always show the Latin wordmark.

## Styling & tokens

- Fills come from the brand's `MarkSpec` (`body`, `bodyOnDark`, `accent`). They are brand assets, not theme
  tokens, so they do not respond to `--primary` or brand overrides.
- `shapeRendering="crispEdges"`; cubes are square with no stroke.
- Target `[data-slot=product-mark]` and `[data-slot=product-logo]`. Use `className` only for size and layout.

## Do / Don't

- **Do** pass `brand` with a real key so the official mark is used.
- **Do** leave clear space of at least one cube around a mark.
- **Do** use the dark variant via `onDark` (or the theme) rather than picking a colour.
- **Don't** recolour, tint, filter, mirror, rotate, stretch or redraw a mark. Do not add `fill`, `filter`,
  `opacity` or `transform` to it.
- **Don't** substitute a generic icon or a screenshot for a mark.
- **Don't** build a lockup image; use `ProductLogo`, which sets the name as text.

## Related

- [ProductSwitcher](../product-switcher/README.md) · [WorkspaceSwitcher](../workspace-switcher/README.md)
- [AppShell](../app-shell/README.md) · [Icon](../icon/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/brand-product-mark--docs
