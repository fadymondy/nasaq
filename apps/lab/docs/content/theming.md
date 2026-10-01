# Theming and brands

Nasaq separates what stays the same in every product (layout, type scale, states, spacing) from what makes a product itself (its brand colour, action colour, mark and typeface). A **brand** is the second part. Components never hard-code a brand: they read `--nq-brand`, `--nq-action` and friends, so switching the brand re-skins the whole UI.

## The axes

`NasaqProvider` writes five attributes on `<html>` (or on a wrapper, see below). Every one of them can be changed at runtime, and every one is a toolbar item in this Storybook.

| Prop | Attribute | Values | What it changes |
| --- | --- | --- | --- |
| `brand` | `data-brand` | `nasaq`, `fadymondy`, `mahaam`, `zekra`, `moharrik`, `seatfor`, `health-debug`, `circlexo`, `hosbah`, `orchestra` | Brand and action colours, mark |
| `theme` | `data-theme` and the `dark` class | `light`, `dark`, `system` | The semantic colour set, see [Dark mode](?page=docs-guides-dark-mode) |
| `locale` / `direction` | `lang`, `dir` | `en`, `ar` (extend with the `locales` prop) | Language, reading direction, see [RTL and Arabic](?page=docs-guides-rtl-and-arabic) |
| `density` | `data-density` | `comfortable`, `compact` (default), `dense` | Control height, row height, page padding |
| `expression` | `data-expression` | `grid` (default), `native` | Card radius and the hatch texture: `grid` has square cards and a hatch pattern on fillers, `native` rounds cards to 10px and drops the hatch |

```tsx
import { NasaqProvider } from "@fadymondy/nasaq/web";

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <NasaqProvider brand="mahaam" defaultTheme="system" density="compact" expression="grid">
      {children}
    </NasaqProvider>
  );
}
```

## Your own colours (client brands)

An app that is not one of the registered brands themes Nasaq with its own colours, with no brand registered. Pass `brandColors`, or a `brand` object (the same colours plus an optional `name`, `wordmark` and `mark`):

```tsx
<NasaqProvider brandColors={{ brand: "#C8283A", accent: "#C9A227" }}>{children}</NasaqProvider>

// Full control per mode. Each role is "#RRGGBB" or { light, dark }.
<NasaqProvider
  brandColors={{
    brand: { light: "#C8283A", dark: "#F2626F" },
    action: { light: "#C8283A", dark: "#F2626F" },
    onAction: { light: "#FFFFFF", dark: "#1A0A0D" },
    accent: "#C9A227",
  }}
>
```

The provider sets `data-brand="custom"` and writes the seven raw variables (`--nq-brand-l/-d`, `--nq-action-l/-d`, `--nq-on-action-l/-d`, `--nq-accent-brand`). `--nq-brand`, `--nq-action`, `--nq-on-action` and `--nq-primary-action` then resolve from them exactly as for a registered brand, per theme. What you leave out is derived: a light-only colour gets a lighter dark step (same hue, lightness of at least 62%), `action` defaults to `brand`, and `onAction` is whichever of ivory or ink has the higher contrast on the action fill. Invalid values are ignored. On a scoped provider (`target="scope"`) the variables go on the wrapper. `useNasaq().isCustomBrand` tells you it is active.

Nasaq draws no brand mark for a client: pass your own `logo` / `mark` (`SidebarBrand logo`, `AuthLayout mark` and `logo`, `ProductMark src`, native `AppHeader logo`). The same API exists on the native `NasaqProvider` (`brandColors`, `brand`). The resolution (`resolveCustomBrandColors`) is a pure function in `@nasaq/tokens`, tested for contrast.

Legacy names from the products' earlier codenames resolve to the current key (`managy` to `mahaam`, `cabrain` to `zekra`, `cloudy` to `hosbah`, `booki` to `seatfor`, `claude-digital-twin` to `moharrik`).

## Choosing a brand

Pass the key to `NasaqProvider`, or set `data-brand` yourself. With the shadcn CLI there is one `registry:theme` item per brand that writes that brand's colours into `:root` as the default:

```bash
npx shadcn@latest add @nasaq/theme-mahaam
```

Each brand defines a light and a dark pair for `--nq-brand` and `--nq-action`, the colour of text on the action (`--nq-on-action`) and an accent. For example the default `nasaq` brand is green (`#15694A` in light, `#4CC495` in dark) with a gold accent. Everything else, the neutrals, statuses and tags, is shared so a screen keeps its meaning across brands.

## Brand data in code

`@fadymondy/nasaq/brands` (or `@/lib/nasaq/brands` after a shadcn install) exports the manifests:

```tsx
import { BRANDS, BRAND_KEYS, resolveBrand } from "@fadymondy/nasaq/brands";
import { ProductMark } from "@fadymondy/nasaq/web";

const brand = resolveBrand("mahaam"); // name, wordmark, mark, colours, typography
<ProductMark brand="mahaam" size={32} title="Mahaam" />;
```

`ProductMark` draws the official cube-lattice mark from its spec. Marks are never recoloured, mirrored or redrawn, and a brand name next to a mark is a typeset label, never an exported image.

## Scoping a brand to a region

By default the provider owns `<html>`. To show another brand inside a page, such as a preview panel or a product picker, use a scoped provider. It renders a wrapper `<div>` that carries the attributes:

```tsx
<NasaqProvider target="scope" brand="zekra" theme="dark">
  <PreviewPanel />
</NasaqProvider>
```

## Controlling it from your own UI

`useNasaq()` returns the current `brand`, `theme`, `resolvedTheme`, `direction`, `isRtl`, `density`, `expression` and `locale`, plus `setTheme` and `setLocale`. Two drop-in controls use it: `ThemeSwitcher` and `LocaleSwitcher` ([Switchers](?doc=components-actions-switchers)). Pass `onThemeChange` and `onLocaleChange` when the provider is controlled, which is how this Storybook keeps its toolbar in sync with in-page switchers.

## Adding your own brand

A brand is data, not code in components. Add its colours to the token source (`packages/tokens/src/dtcg`), its mark to `packages/brands/src/marks.ts` and its metadata to `manifests.ts`, then rebuild the tokens. See [Contributing](?page=docs-project-contributing). In an app that only consumes Nasaq, override the variables directly:

```css
[data-brand="acme"] {
  --nq-brand-l: #1d4ed8;
  --nq-brand-d: #93b4ff;
  --nq-action-l: #1d4ed8;
  --nq-action-d: #93b4ff;
  --nq-on-action-l: #ffffff;
  --nq-on-action-d: #0b1429;
}
```

Check the contrast of the action pair in both themes: the token package's own test enforces at least 3:1 and Nasaq aims for 4.5:1 for text.
