---
name: navigation-menu
title: NavigationMenu
category: navigation
status: beta
summary: Marketing-site header menu on Base UI NavigationMenu, with chevron triggers, a shared animated panel, link lists and a featured card slot. Works in RTL.
exports: [NavigationMenuProps, NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuContent, NavigationMenuLinkList, NavigationMenuLinkItemProps, NavigationMenuLinkItem, NavigationMenuLabel, NavigationMenuFeatured, NavigationMenuLayout]
related: [menubar, dropdown-menu, tabs, breadcrumb]
story: components-navigation-navigation-menu
base-ui: [navigation-menu]
keywords: [navigation, mega menu, header, site nav, marketing, links, featured, flyout]
---

# NavigationMenu

The header menu of a marketing site: a row of triggers and links, where each trigger opens a panel of links and
an optional featured card. The panel is one shared viewport, so moving from one trigger to the next resizes and
slides the panel instead of closing and reopening it. These are links to pages, not commands.

## When to use

- A website header with grouped links, descriptions and a featured item (a mega menu).
- Navigation where every entry is a URL.

## When not to use

- Commands in an application window: use [`Menubar`](../menubar/README.md).
- A list of actions behind a button: use [`DropdownMenu`](../dropdown-menu/README.md).
- Switching views inside a page: use [`Tabs`](../tabs/README.md).
- A sidebar for an app: use `SidebarLayout` from [`AppShell`](../app-shell/README.md).

## Import

```tsx
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuLinkItem,
  NavigationMenuLinkList,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@fadymondy/nasaq/web";

export function SiteNav() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent className="w-72">
            <NavigationMenuLinkList>
              <NavigationMenuLinkItem href="/docs" title="Documentation" description="Guides and API reference." />
              <NavigationMenuLinkItem href="/blog" title="Blog" description="Product news." />
            </NavigationMenuLinkList>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
```

## Anatomy

```
NavigationMenu                          data-slot="navigation-menu"  (nav)
├─ NavigationMenuList                   data-slot="navigation-menu-list"
│  ├─ NavigationMenuItem
│  │  ├─ NavigationMenuTrigger          data-slot="navigation-menu-trigger" (with chevron)
│  │  └─ NavigationMenuContent          data-slot="navigation-menu-content"
│  │     ├─ NavigationMenuLayout        data-slot="navigation-menu-layout"
│  │     ├─ NavigationMenuLabel         data-slot="navigation-menu-label"
│  │     ├─ NavigationMenuLinkList      data-slot="navigation-menu-link-list"
│  │     │  └─ NavigationMenuLinkItem   data-slot="navigation-menu-link-item" (li > a)
│  │     └─ NavigationMenuFeatured      data-slot="navigation-menu-featured" (a)
│  └─ NavigationMenuItem > NavigationMenuLink   data-slot="navigation-menu-link"
└─ (rendered for you) positioner > popup > viewport   data-slot="navigation-menu-positioner" | "navigation-menu-popup" | "navigation-menu-viewport"
```

## API

**NavigationMenu**: Base UI `NavigationMenu.Root` props (`value`, `defaultValue`, `onValueChange`, `delay`, `closeDelay`, `orientation`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Where the shared panel sits against the active trigger. |
| `sideOffset` | `number` | `8` | Gap between the bar and the panel. |
| `panelClassName` | `string` | | Class for the panel. |

**NavigationMenuList, NavigationMenuItem**: the Base UI list and item. `NavigationMenuItem` is unchanged.

**NavigationMenuTrigger**: Base UI trigger with the bar style and a chevron that rotates while open.

**NavigationMenuLink**: a top-level link in the bar. Takes `href` and Base UI `active`. Use the `render` prop for a router link.

**NavigationMenuContent**: the panel body. Sets the slide and fade. Set the width with `className` (`w-72`).

**NavigationMenuLinkList**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `1 \| 2 \| 3` | `1` | Columns from the `sm` breakpoint. |

**NavigationMenuLinkItem** (`NavigationMenuLinkItemProps`): Base UI link props except `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | | Link title. |
| `description` | `ReactNode` | | One line under the title. |
| `icon` | `ReactNode` | | Icon at the inline start. Decorative. |

**NavigationMenuFeatured**: a link styled as a card, for the featured slot. Takes `href` and any children.

**NavigationMenuLayout**: a flex row (column on small screens) that places a link list and a featured card side by side. DOM order is visual order.

**NavigationMenuLabel**: a small heading above a link list.

## Examples

**Mega menu with a featured card**

```tsx
import {
  Badge,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuFeatured,
  NavigationMenuItem,
  NavigationMenuLayout,
  NavigationMenuLinkItem,
  NavigationMenuLinkList,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@fadymondy/nasaq/web";

export function ProductMenu() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLayout>
              <NavigationMenuLinkList className="w-80">
                <NavigationMenuLinkItem href="/automation" title="Automation" description="Rules that move work along." />
                <NavigationMenuLinkItem href="/analytics" title="Analytics" description="Dashboards for time and cost." />
              </NavigationMenuLinkList>
              <NavigationMenuFeatured href="/release">
                <Badge>New</Badge>
                <span className="text-label text-foreground">Nasaq 2.0 is here</span>
                <span className="text-body-sm text-muted-foreground">A design system for Arabic-first products.</span>
              </NavigationMenuFeatured>
            </NavigationMenuLayout>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
```

**Arabic**

```tsx
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLinkItem, NavigationMenuLinkList, NavigationMenuList, NavigationMenuTrigger } from "@fadymondy/nasaq/web";

export function ArabicNav() {
  return (
    <NavigationMenu aria-label="الرئيسية">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>المصادر</NavigationMenuTrigger>
          <NavigationMenuContent className="w-72">
            <NavigationMenuLinkList>
              <NavigationMenuLinkItem href="/docs" title="التوثيق" description="أدلة ومرجع الواجهات." />
            </NavigationMenuLinkList>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
```

**Router links**

```tsx
import { NavigationMenuLink } from "@fadymondy/nasaq/web";

// Pass your framework's link through `render`.
export function RouterLink() {
  return <NavigationMenuLink render={<a href="/pricing" />}>Pricing</NavigationMenuLink>;
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Left / Right | Moves between triggers and links in the bar. Swapped in RTL. |
| Down / Enter / Space | Opens the panel of the focused trigger. |
| Tab | Moves into the open panel's links, then on. |
| Escape | Closes the panel and returns focus to its trigger. |

- The root is a `nav`; give it an `aria-label`. Triggers have `aria-expanded`. The current page link takes `active`, which sets `aria-current="page"`.
- Hover opens a panel after a short delay; touch and keyboard open it on press.
- The caller must localise the `aria-label` and all link text.

## RTL & i18n

- The bar starts at the inline start (the right in Arabic) and the panel aligns to its trigger's start edge.
- ArrowLeft moves to the next trigger in Arabic. The `sm:flex-row` layout puts the first child at the right.
- Panel content slides by the side the previous panel was on. Reduced motion turns every transition off.

## Styling & tokens

- Panel: `popover`, `border`, `shadow-floating`, `rounded-floating`. Triggers and links: `nq-hover`, `nq-selected`, `nq-focus`. Featured card: `nq-surface-soft`.
- State attributes: `data-popup-open` on the trigger, `data-starting-style` and `data-ending-style` on the panel, `data-activation-direction` on the content, `data-active` on a current link.
- Extend with `className` and `panelClassName`. Use tokens, never raw hex.

## Do / Don't

- Do keep panels to one link list, and one featured card at most.
- Do give every link a description of one line.
- Don't use it for actions or commands: use `Menubar` or `DropdownMenu`.
- Don't nest a second menu inside a panel.

## Related

- [`Menubar`](../menubar/README.md)
- [`DropdownMenu`](../dropdown-menu/README.md)
- [`Tabs`](../tabs/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-navigation-menu--docs
