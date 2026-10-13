---
name: product-shell
title: ProductShell
category: layout
status: beta
summary: "The shell every Nasaq product shares: AppShell with the standard menu order (Dashboard → product groups → Reports → Integrations → Settings), workspace switcher, ⌘K, the Connect pill and a phone tab bar."
exports: [ProductShell, ProductShellProps, ProductShellBrand, ProductShellLabels, PRODUCT_NAV_SECTIONS, PRODUCT_SETTINGS_ORDER, ProductNavSection, ProductNavItem, ProductNavGroup, ProductNavInput, ProductNavLabels, ResolvedNavGroup, productNavGroups, sortSettings, sortIntegrations, isNavActive, activeNavId, pickMobileTabs, productNavProblems]
related: [app-shell, workspace-switcher, mcp-connect, command-palette, mobile-nav-kit, product-onboarding]
story: components-layout-pages-product-shell
base-ui: []
keywords: [shell, product, sidebar, menu, navigation, order, standard, family, mcp, connect, tabs, matjar, sanduq, qaima, mizan, mawared, makhzan]
---

# ProductShell

The business area of every Nasaq product (Matjar, Sanduq, Qaima, Mizan, Mawared, Makhzan…) in one component, so they
look and behave as one family. You pass the menu in sections and the shell puts it in the standard order. It also
renders the brand, the workspace switcher, search, the account footer, a header with the Connect pill last, ⌘K with
every menu item, and the phone tab bar with More. It is built on `AppShell`, so the parts stay the same.

## When to use

- The signed-in area of a Nasaq product: a business, store or workspace back office.

## When not to use

- A one-off app with its own information architecture: use `AppShell` parts directly.
- Public pages, storefronts or docs: use `store-chrome`, `docs-shell`.

## Import

```tsx
import { ProductShell, productNavProblems } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Plug, Settings, ShoppingBag } from "lucide-react";
import { ProductShell, type ProductNavInput } from "@fadymondy/nasaq/web";
import type { ReactNode } from "react";

const nav: ProductNavInput = {
  dashboard: { id: "dashboard", label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  core: [{ id: "sales", label: "Sales", items: [{ id: "orders", label: "Orders", href: "/admin/orders", icon: ShoppingBag }] }],
  integrations: [{ id: "mcp", label: "AI & MCP", href: "/admin/mcp", icon: Plug }],
  settings: [{ id: "settings", label: "Settings", href: "/admin/settings", icon: Settings }],
};

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <ProductShell brand={{ label: "Matjar", href: "/admin" }} nav={nav} pathname={usePathname() ?? ""} linkComponent={Link} onNavigate={router.push}>
      {children}
    </ProductShell>
  );
}
```

## Anatomy

```
ProductShell                       AppShell (variant inset)
├─ Sidebar
│  ├─ SidebarHeader: SidebarBrand · workspace · SearchTrigger
│  ├─ SidebarContent: SidebarGroup data-section="dashboard|core|reports|integrations|settings"
│  │                  └─ SidebarItem data-nav-id="<id>"
│  └─ SidebarFooter: account
├─ AppHeader: SidebarTrigger · headerStart · headerEnd · search icon (phone) · connect
├─ banner
├─ AppMain → page column (max-w-6xl)
├─ BottomTabBar (phone): up to 4 items + More (opens the menu sheet)
└─ CommandPalette: every menu item under "Go to", plus `commands`
```

## API

**ProductShell**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `ProductShellBrand` | required | `{ label, href, logo?, mark? }`. |
| `nav` | `ProductNavInput` | required | The menu in sections (below). |
| `pathname` | `string` | required | The current path; the longest matching `href` is active. |
| `linkComponent` | `ElementType` | `<a>` | Your router's link (`next/link`). |
| `onNavigate` | `(href) => void` | full page load | Used by the tab bar and ⌘K, and by plain `<a>` clicks. |
| `workspace` | `ReactNode` | | Under the brand: a `WorkspaceSwitcher`. |
| `account` | `ReactNode` | | Sidebar footer: a `UserMenu`. |
| `headerStart` / `headerEnd` | `ReactNode` | | Breadcrumbs / a product action such as "View store". |
| `connect` | `ReactNode` | | The `McpConnectSheet` pill, always last in the header. |
| `banner` | `ReactNode` | | A strip above the page. |
| `commands` | `Command[]` | | More ⌘K commands (other workspaces, the console). |
| `mobileTabs` | `string[]` | first four | Item ids for the phone tab bar. |
| `variant` | `"plain" \| "inset"` | `"inset"` | Keep `inset` for the family look. |
| `contentClassName` | `string` | | Classes on the page column, e.g. `max-w-none`. |
| `labels` | `Partial<ProductShellLabels>` | built-in EN/AR | `reports`, `integrations`, `settings`, `search`, `more`, `menu`. |

**ProductNavInput**: `{ dashboard: ProductNavItem; core: ProductNavGroup[]; reports?: ProductNavItem[]; integrations?: ProductNavItem[]; settings: ProductNavItem[] }`.

**ProductNavItem**: `{ id, label, href, icon?, badge?, hidden?, match?: "exact" | "prefix", keywords? }`.

**ProductNavGroup**: `{ id, label?, items }`.

Helpers (pure):

| Function | Returns |
| --- | --- |
| `productNavGroups(input, labels)` | `ResolvedNavGroup[]` in the standard order, hidden items and empty groups removed, `mcp` first in Integrations, Settings sorted. |
| `sortSettings(items)` | Items in `PRODUCT_SETTINGS_ORDER` (`settings, branding, team, domains, billing`); other ids after `branding`. |
| `sortIntegrations(items)` | `mcp` first. |
| `isNavActive(item, pathname)` / `activeNavId(groups, pathname)` | Active state; the dashboard matches exactly. |
| `pickMobileTabs(groups, ids?, max = 4)` | The tab bar items. |
| `productNavProblems(input)` | `string[]`: what breaks the standard. Assert it is empty in product tests. |

## Examples

Test that the product's menu conforms:

```tsx
import assert from "node:assert/strict";
import { productNavProblems, type ProductNavInput } from "@fadymondy/nasaq/web";

declare const nav: ProductNavInput;
assert.deepEqual(productNavProblems(nav), []);
```

Arabic labels come from the provider locale. Pass `labels` only to rename a section:

```tsx
import { ProductShell, type ProductNavInput } from "@fadymondy/nasaq/web";

declare const nav: ProductNavInput;
export const Hr = () => (
  <ProductShell brand={{ label: "موارد", href: "/" }} nav={nav} pathname="/" labels={{ reports: "تقارير الموارد البشرية" }}>
    <p>…</p>
  </ProductShell>
);
```

## Accessibility

| Key | Action |
| --- | --- |
| `⌘K` / `Ctrl K` | Opens the command palette with every menu item. |
| `Tab` | Brand, workspace, search, menu items, header. |
| Arrow keys | Move between tabs in the phone tab bar. |

The sidebar is a `nav` labelled "Main menu" ("القائمة الرئيسية"). The active item has `aria-current="page"`. Collapsed rail items get a tooltip and an accessible name.

## RTL & i18n

The sidebar sits at the inline start and mirrors in Arabic. Section headings, search and More are built in for EN and AR. Item labels are yours: pass them in the page language.

## Styling & tokens

Inherits `AppShell`: `--nq-*` surface, border and action tokens. Target `[data-section]` and `[data-nav-id]` for tests and analytics, not styling overrides.

## Do / Don't

- Do keep every existing URL; only move items between sections.
- Do give AI & MCP the id `mcp` and the settings page the id `settings`.
- Don't add a fourth core group; split the product instead.
- Don't put settings items in a core group.

## Related

- [app-shell](../app-shell/README.md)
- [workspace-switcher](../workspace-switcher/README.md)
- [mcp-connect](../mcp-connect/README.md)
- [product-onboarding](../product-onboarding/README.md)

## Lab

`https://docs.nasaqui.com/?path=/docs/components-layout-pages-product-shell--docs`
