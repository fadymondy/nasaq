---
name: product-switcher
title: ProductSwitcher
category: navigation
status: beta
summary: App launcher grid that shows each installed product's official mark, plus a sidebar products group and "Switch to…" palette commands.
exports: [ProductSwitcher, SidebarProducts, ProductIcon, useProductCommands, Product, ProductSwitcherProps, SidebarProductsProps]
related: [command-palette, commands, workspace-switcher, app-shell, product-mark]
story: components-navigation-product-switcher
base-ui: [popover]
keywords: [apps, app switcher, launcher, products, favourites, brand, grid, circlexo]
---

# ProductSwitcher

Moves the user between the products they have installed (Mahaam, Zekra, Nasaq, CircleXO…). It has
three pieces that share one `Product[]` list:

- **`ProductSwitcher`**: a grid icon button that opens a launcher popover (like Google's apps grid).
- **`SidebarProducts`**: the pinned products as a sidebar group.
- **`useProductCommands`**: registers "Switch to <product>" in the CommandPalette. `ProductSwitcher`
  already calls it.

Nasaq does not fetch the list. The host passes it in, whether that is a static array, CircleXO's
installed-apps API or a feature flag. Each product appears with its **official mark, never recoloured**.
Its brand accent appears only as the small "current" marker.

## When to use

- The user has access to more than one product and needs to jump between them.
- You want pinned products in the sidebar (this replaces the old "Favourites" group).

## When not to use

- Switching organisations or tenants inside one product: use [`WorkspaceSwitcher`](../workspace-switcher/README.md).
- Navigating pages inside one product: use `SidebarItem`s in [`AppShell`](../app-shell/README.md).
- Showing a single brand logo: use [`ProductMark` / `ProductLogo`](../product-mark/README.md).

## Import

```tsx
import { ProductSwitcher, SidebarProducts, type Product } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AppHeader, ProductSwitcher, type Product } from "@fadymondy/nasaq/web";

const products: Product[] = [
  { id: "mahaam", brand: "mahaam", name: "Mahaam", href: "https://mahaam.app", pinned: true },
  { id: "zekra", brand: "zekra", name: "Zekra", href: "https://zekra.dev", pinned: true },
  { id: "nasaq", brand: "nasaq", name: "Nasaq", href: "https://nasaqui.com" },
];

export function Header() {
  return (
    <AppHeader>
      <div className="ms-auto">
        <ProductSwitcher products={products} current="mahaam" allHref="/apps" />
      </div>
    </AppHeader>
  );
}
```

Products with `href` render as links. Without `href`, handle `onSelect`.

## Anatomy

```
ProductSwitcher
├─ trigger                    data-slot="product-switcher-trigger"  (grid icon, or your `children`)
└─ popover                    data-slot="product-switcher"
   ├─ title                   (labels.heading, default "Apps" / "التطبيقات")
   ├─ grid (role="group")
   │  └─ tile × n             data-slot="product-tile", aria-current="page" on the current one
   │     ├─ mark tile         ProductIcon (official mark) + optional badge
   │     ├─ name
   │     └─ accent marker     2px bar in the product's accent, current tile only
   └─ "All apps" link         only with allHref or onViewAll

SidebarProducts
└─ SidebarGroup (collapsible)
   └─ SidebarItem × n         ProductIcon 16px, badge as trailing, active = current
```

## API

### `Product`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable id. Compared with `current`. |
| `name` | `string` | Display name, already localised by the host. |
| `brand?` | `string` | A Nasaq brand key (`mahaam`, `zekra`, `nasaq`, `moharrik`, `seatfor`, `health-debug`, `circlexo`, `hosbah`, `orchestra`, `fadymondy`). Draws the official mark and supplies the accent. |
| `logo?` | `ReactNode` | For products without a Nasaq brand: the product's own official logo (e.g. an `<img>` of the supplied file). Never a generic icon. |
| `accent?` | `string` | Accent colour when `brand` is not a Nasaq brand. Used only for the current marker. |
| `description?` | `string` | Shown as the tile's tooltip (`title`). |
| `href?` | `string` | Renders the tile and sidebar item as a link. |
| `pinned?` | `boolean` | Shown in `SidebarProducts`; ranked first in the palette. |
| `badge?` | `ReactNode` | Small count, e.g. unread items. |
| `keywords?` | `string[]` | Extra palette search terms. |

With no `brand` and no `logo`, the product's initial is shown. Nasaq never substitutes a pictogram.

### `ProductSwitcher`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `products` | `Product[]` | required | Products to show, in order. |
| `current?` | `string` | none | The id of the product the user is in. |
| `onSelect?` | `(product: Product) => void` | none | Called on click and from the palette. |
| `allHref?` | `string` | none | Adds an "All apps" footer link (e.g. an app store). |
| `onViewAll?` | `() => void` | none | "All apps" as a button instead of a link. |
| `registerCommands?` | `boolean` | `true` | Registers "Switch to…" commands. Set `false` on a second instance so commands are not duplicated. |
| `labels?` | `{ trigger?; heading?; all? }` | EN/AR built in | Trigger aria-label and tooltip, popover title, footer link. |
| `children?` | `ReactNode` | `<LayoutGrid />` | Custom trigger content. |
| `className?` | `string` | none | Classes for the trigger. |

### `SidebarProducts`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `products` | `Product[]` | required | Same list as the switcher. |
| `current?` | `string` | none | Marks the active item. |
| `onSelect?` | `(product: Product) => void` | none | Called on click. |
| `label?` | `string` | "Apps" / "التطبيقات" | Group heading. |
| `action?` | `ReactNode` | none | Group header action, e.g. a `ProductSwitcher`. |
| `pinnedOnly?` | `boolean` | `true` | Only pinned products; shows all if none are pinned. |
| `order?` | `string[]` | none | The user's products, in their order, by id (e.g. `useSidebarLayout(…).visible`). Overrides `pinned`. |
| `onMove?` | `(activeId, overId) => void` | none | Makes the items draggable like the rest of the sidebar (`layout.move`). |

It renders nothing when there are no products to show.

### `ProductIcon`

`({ product: Product; size?: number = 20 }) => JSX.Element`: the official mark (via `ProductMark`),
the host's `logo`, or the product's initial.

### `useProductCommands`

```ts
useProductCommands(products: Product[], onSelect: (p: Product) => void, current?: string): void
```

Registers one command per product (except `current`) in the `products` section of the command registry.
Use it when you render `SidebarProducts` without a `ProductSwitcher`. It needs a
`CommandProvider`, which `AppShell` already includes.

## Examples

### Sidebar group with the full grid as its action

```tsx
<SidebarProducts
  products={products}
  current="mahaam"
  onSelect={open}
  action={<ProductSwitcher products={products} current="mahaam" onSelect={open} registerCommands={false} className="size-6" />}
/>
```

### User-pinned, reorderable, and editable in Customize sidebar

This is how the AppShell dashboard demo replaces the old Favourites group. Every product is listed in
`SidebarCustomize`, the unpinned ones start switched off, and the user drags or toggles them.

```tsx
const layout = useSidebarLayout("app-nav-products", products.map((p) => p.id), {
  defaultHidden: products.filter((p) => !p.pinned).map((p) => p.id),
});

<SidebarProducts products={products} current="mahaam" order={layout.visible} onMove={layout.move} action={…} />
// and in SidebarCustomize sections:
{ id: "apps", label: "Apps", items: products.map((p) => ({ id: p.id, label: p.name, icon: <ProductIcon product={p} size={16} /> })), layout }
```

Put a `ProductSwitcher` in the header as well (next to notifications), so the full grid is reachable
while the sidebar is collapsed or closed on mobile. Only one of the two should register commands.

### Data from CircleXO (or any source)

```tsx
const { data: installed = [] } = useInstalledApps(); // host code
const products = installed.map((app) => ({
  id: app.slug,
  name: locale === "ar" ? app.nameAr : app.name,
  brand: app.nasaqBrand,                  // when the app is a Nasaq brand
  logo: app.nasaqBrand ? undefined : <img src={app.logoUrl} alt="" />,
  accent: app.accent,
  href: app.url,
  pinned: app.pinned,
  badge: app.unread || undefined,
}));
```

### Handling selection without links

```tsx
<ProductSwitcher products={products} current={currentId} onSelect={(p) => router.push(`/apps/${p.id}`)} />
```

## Accessibility

| Key | Action |
| --- | --- |
| `Enter` / `Space` on trigger | Opens the launcher; focus moves into the grid. |
| `←` `→` | Previous/next tile (reversed in RTL, so it always follows reading order visually). |
| `↑` `↓` | Up/down one row (3 columns). |
| `Home` / `End` | First / last tile. |
| `Enter` | Opens the product and closes the popover. |
| `Esc` | Closes and returns focus to the trigger. |

- The trigger has an `aria-label` and a tooltip (`labels.trigger`).
- The current tile has `aria-current="page"`. Its accent marker is decorative, so current state is
  never shown by colour alone.
- Marks render with `title=""` (decorative) because the name is visible beside them.

## RTL & i18n

- The grid follows `dir`; arrow keys are RTL-aware. The "All apps" arrow mirrors.
- Marks are **never mirrored** (SVG geometry ignores `dir`).
- Built-in strings: "Apps"/"التطبيقات", "All apps"/"كل التطبيقات", palette hint "App"/"تطبيق".
- Product names are the host's responsibility. Pass them localised.

## Styling & tokens

- Surfaces: `bg-popover`, `shadow-floating`, `rounded-floating`; tiles `rounded-control`.
- States: hover `bg-nq-hover`, current `bg-nq-selected` + `--product-accent` bar, open trigger
  `data-popup-open`.
- The badge uses `bg-nq-danger-solid` / `text-nq-on-danger`.
- Target parts with `[data-slot=product-tile]`, `[data-slot=product-switcher]`.

## Do / Don't

- **Do** pass `brand` for Nasaq products so the official mark and accent are used.
- **Do** keep the list short and relevant; pin the 3–5 the user opens most.
- **Don't** recolour, mirror, redraw or replace a product's logo, or tint it with the accent.
- **Don't** put business logic in Nasaq: selection is the host's `onSelect` / `href`.
- **Don't** render two switchers with `registerCommands` both on.

## Related

- [CommandPalette](../command-palette/README.md) · [commands registry](../commands/README.md)
- [WorkspaceSwitcher](../workspace-switcher/README.md) · [AppShell](../app-shell/README.md)
- [ProductMark](../product-mark/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-product-switcher--docs
