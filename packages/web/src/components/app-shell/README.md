---
name: app-shell
title: AppShell
category: layout
status: stable
summary: The product frame every Nasaq app uses - resizable, collapsible sidebar at the inline start, sticky header, main area, mobile sheet, and the command registry.
exports: [AppShell, AppShellProps, AppHeader, AppMain, SidebarTrigger, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupProps, SidebarGroupAction, SidebarItem, SidebarItemProps, SidebarNest, SidebarNestProps, SidebarSubItem, SidebarExpandedOnly, useAppShell, useOptionalAppShell, useSidebarCollapsed, SIDEBAR_STORAGE_KEY, SIDEBAR_WIDTH_KEY]
related: [sidebar-layout, workspace-switcher, user-menu, breadcrumb, command-palette, commands, product-switcher, switchers]
story: pages-app-app-shell
base-ui: [dialog, collapsible]
keywords: [layout, shell, sidebar, header, navigation, rail, collapse, resize, mobile, rtl, frame]
---

# AppShell

The frame every product re-solved: a sidebar at the inline start, a sticky header, and the page.
`AppShell` also owns three things you would otherwise wire by hand:

- **Sidebar state.** It collapses to an icon rail, can be dragged to resize, remembers both in
  `localStorage`, and moves into a sheet below the `md` breakpoint (48rem).
- **The command registry.** It renders a `CommandProvider`, so `useRegisterCommands` and
  `<CommandPalette />` work anywhere inside it with no extra setup.
- **Shared open state** for the palette, so `SearchTrigger` can open it.

The sidebar is built from small parts (`Sidebar`, `SidebarGroup`, `SidebarItem`, `SidebarNest`…) that
know whether they are on the collapsed rail and adapt: labels hide, tooltips and accessible names appear.

## When to use

- The root layout of any product with more than one screen.
- You need a collapsible sidebar with workspace switcher, search, navigation and user menu.

## When not to use

- A single-purpose page, marketing site or auth screen: use plain layout primitives.
- Switching between products: use [`ProductSwitcher`](../product-switcher/README.md) inside the shell.
- Letting users reorder or hide sidebar items: add [`sidebar-layout`](../sidebar-layout/README.md) on top.
- Hand-rolling a second sidebar nested in the page: the shell supports one.

## Import

```tsx
import {
  AppShell, AppHeader, AppMain, SidebarTrigger,
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarItem, SidebarNest, SidebarSubItem,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  AppHeader,
  AppMain,
  AppShell,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
} from "@fadymondy/nasaq/web";
import { Inbox, LayoutDashboard } from "lucide-react";

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarItem href="/" icon={<LayoutDashboard />} active>
            Dashboard
          </SidebarItem>
          <SidebarItem href="/inbox" icon={<Inbox />} trailing="12">
            Inbox
          </SidebarItem>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<AppSidebar />}>
      <AppHeader>
        <SidebarTrigger />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </AppHeader>
      <AppMain>{children}</AppMain>
    </AppShell>
  );
}
```

`AppShell` must sit inside `NasaqProvider` (it reads the locale). `SidebarItem` renders a native `<a>`
and has no `render` prop, so drive client-side routing through `href` and `onClick`.

## Anatomy

```
AppShell                          data-slot="app-shell"      (flex row, min-h-dvh)
├─ aside                          data-slot="app-sidebar"    data-collapsed, data-resizing; md+ only
│  ├─ your `sidebar` node         (SidebarRailContext = collapsed)
│  └─ resize handle               data-slot="sidebar-resize-handle" role="separator"
├─ mobile sheet (Dialog)          data-slot="app-shell-sheet"   below md, opened by SidebarTrigger / ⌘B
│  └─ your `sidebar` node         (never collapsed inside the sheet)
└─ column                         (children)
   ├─ AppHeader                   data-slot="app-header"
   │  └─ SidebarTrigger first
   └─ AppMain                     data-slot="app-main"

Sidebar                           data-slot="sidebar"        <nav>, data-collapsed
├─ SidebarHeader                  data-slot="sidebar-header"  workspace switcher, search trigger
├─ SidebarContent                 data-slot="sidebar-content" scrolls; header and footer stay put
│  └─ SidebarGroup                data-slot="sidebar-group"   label, action, collapsible
│     ├─ SidebarItem              data-slot="sidebar-item"    <a>, aria-current when active
│     └─ SidebarNest              data-slot="sidebar-nest"    parent + SidebarSubItem[]
│        └─ SidebarSubItem        data-slot="sidebar-sub-item"
└─ SidebarFooter                  data-slot="sidebar-footer"  user menu
```

## API

### `AppShell`

Extends `ComponentProps<"div">` (extra props land on the root element).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sidebar` | `ReactNode` | required | Rendered as a column at md+ and inside a sheet below md. Usually a `<Sidebar>`. It is mounted once per surface, so keep it cheap and idempotent. |
| `defaultCollapsed?` | `boolean` | `false` | Initial rail state when uncontrolled. A saved choice in `localStorage` wins after mount. |
| `collapsed?` | `boolean` | none | Controlled rail state. When set, nothing is persisted; you own storage. |
| `onCollapsedChange?` | `(collapsed: boolean) => void` | none | Called on toggle, ⌘B and drag-to-rail. |
| `resizable?` | `boolean` | `true` | Shows the drag handle (desktop). |
| `defaultWidth?` | `number` | `256` | Sidebar width in px. The user's width is remembered. |
| `minWidth?` | `number` | `208` | Lower clamp. Dragging about 28px below it snaps to the rail. |
| `maxWidth?` | `number` | `420` | Upper clamp. |
| `resizeLabel?` | `string` | "Resize sidebar" / "تغيير عرض الشريط الجانبي" | Accessible name of the resize handle. Localise it if you are not on `en`/`ar`. |
| `className?` | `string` | none | Classes for the root. |

### `SidebarTrigger`

Extends `ComponentProps<typeof Button>` plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `string` | "Toggle sidebar" / "إظهار/إخفاء الشريط الجانبي" | The button's `aria-label` and tooltip. Localised by provider locale; override to customise. |

Collapses/expands the rail on desktop and opens the sheet on mobile. Place it first in `AppHeader`.
`aria-expanded` reflects the rail on desktop (md+) and the mobile sheet below md.

### `AppHeader`, `AppMain`

`AppHeader` is `ComponentProps<"header">` (sticky, 48px, blurred background). `AppMain` is
`ComponentProps<"main">` (`flex-1`, page padding). Neither has its own props.

### `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`

Plain wrappers over `nav` / `div` / `div` / `div`. No own props. `Sidebar` is a `<nav>` with a default
`aria-label` of "Main" / "الرئيسية" (by locale); pass `aria-label` to override, especially with more than one `nav`.

`SidebarContent` is the only part that scrolls. `SidebarHeader` and `SidebarFooter` never shrink, so on a
short window the nav scrolls between them and never runs under the account menu. Put everything that can
grow (groups, apps, projects) inside `SidebarContent`.

### `SidebarGroup`

Extends `Omit<ComponentProps<"div">, "title">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `ReactNode` | none | Group heading. Hidden on the rail. |
| `action?` | `ReactNode` | none | Icon button at the inline end of the label. Hidden on the rail. |
| `collapsible?` | `boolean` | `false` | Lets the user fold the group by its label. Not collapsible on the rail. |
| `defaultOpen?` | `boolean` | `true` | Initial state when `collapsible`. |

### `SidebarGroupAction`

`ComponentProps<typeof Button>` with ghost/icon-sm defaults. For a "+" beside a group label. Give it an `aria-label`.

### `SidebarItem`

Extends `ComponentProps<"a">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `active?` | `boolean` | `false` | Sets `aria-current="page"`, a stronger weight and an accent rule at the inline start. |
| `icon?` | `ReactNode` | none | Leading icon (16px). |
| `trailing?` | `ReactNode` | none | Count or status at the inline end. Hidden on the rail. |
| `tooltip?` | `string` | children if a string | Tooltip and `aria-label` on the rail. **Set it when `children` is not a string**; otherwise the rail item falls back to the `aria-label` prop you pass, and has no name if there is none. |

### `SidebarNest`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | required | Parent row text; on the rail, the icon's accessible name and the flyout title. |
| `icon?` | `ReactNode` | none | Leading icon. |
| `active?` | `boolean` | `false` | A child is the current page. Also opens it initially. |
| `defaultOpen?` | `boolean` | `false` | Initial expanded state. |
| `children` | `ReactNode` | required | `SidebarSubItem` elements. |

On the collapsed rail there is no room to expand in place, so hovering or clicking the icon opens a
flyout (`data-slot="sidebar-nest-flyout"`) at the inline end with the label as its title and the
sub-items below it. Choosing a sub-item closes it; `Esc` returns focus to the icon.

### `SidebarSubItem`

`ComponentProps<"a"> & { active?: boolean }`. `active` sets `aria-current="page"` and the selected background.

### `SidebarExpandedOnly`

`({ children }: { children: ReactNode }) => ReactElement | null`: renders children only when the sidebar is
expanded (always in the mobile sheet). Use it for text-only rows such as a storage meter.

### Hooks and constants

| Export | Signature | Description |
| --- | --- | --- |
| `useAppShell` | `() => { collapsed; setCollapsed(c); mobileOpen; setMobileOpen(o); toggleSidebar(); commandOpen; setCommandOpen(o) }` | Shell state. Throws outside `<AppShell>`. |
| `useOptionalAppShell` | `() => ShellContextValue \| null` | Same, but `null` outside a shell. Use in components that also work standalone. |
| `useSidebarCollapsed` | `() => boolean` | `true` only for the desktop rail; always `false` in the mobile sheet. Use it in custom sidebar parts. |
| `SIDEBAR_STORAGE_KEY` | `"nasaq-sidebar"` | `localStorage` key for `"collapsed"` / `"expanded"`. |
| `SIDEBAR_WIDTH_KEY` | `"nasaq-sidebar-width"` | `localStorage` key for the width in px. |

`setCollapsed` in `useAppShell` persists only when `collapsed` is not controlled.

## Examples

### Full sidebar: workspace, search, nav, user

```tsx
import {
  AppShell, DropdownMenuItem, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader,
  SidebarItem, SidebarNest, SidebarSubItem, SearchTrigger, UserMenu, WorkspaceSwitcher,
} from "@fadymondy/nasaq/web";
import { FolderKanban, Inbox, Settings } from "lucide-react";
import { useState } from "react";

const workspaces = [
  { id: "3x1", name: "3x1", description: "Pro · 12 members" },
  { id: "personal", name: "Fady Mondy", description: "Personal" },
];

function AppSidebar() {
  const [workspace, setWorkspace] = useState("3x1");
  return (
    <Sidebar aria-label="Main">
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} value={workspace} onValueChange={setWorkspace} />
        <SearchTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarItem href="/inbox" icon={<Inbox />} trailing="12">Inbox</SidebarItem>
          <SidebarNest label="Projects" icon={<FolderKanban />} active>
            <SidebarSubItem href="/projects">All projects</SidebarSubItem>
            <SidebarSubItem href="/projects/active" active>Active</SidebarSubItem>
          </SidebarNest>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={{ name: "Fady Mondy", email: "hello@example.com" }} onSignOut={() => {}}>
          <DropdownMenuItem><Settings />Settings</DropdownMenuItem>
        </UserMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const Root = ({ children }: { children: React.ReactNode }) => <AppShell sidebar={<AppSidebar />}>{children}</AppShell>;
```

### Controlled rail (your own persistence)

```tsx
import { AppShell } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Root({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <AppShell sidebar={sidebar} collapsed={collapsed} onCollapsedChange={setCollapsed} resizable={false}>
      {children}
    </AppShell>
  );
}
```

### Custom part that reacts to the rail

```tsx
import { SidebarExpandedOnly, useSidebarCollapsed } from "@fadymondy/nasaq/web";

export function StorageMeter() {
  const collapsed = useSidebarCollapsed();
  return (
    <SidebarExpandedOnly>
      <p className="px-2 text-caption text-muted-foreground" data-rail={collapsed}>
        4.2 GB of 10 GB
      </p>
    </SidebarExpandedOnly>
  );
}
```

### Arabic copy

```tsx
import { AppShell, SidebarItem, Sidebar, SidebarTrigger, AppHeader } from "@fadymondy/nasaq/web";
import { Inbox } from "lucide-react";

export const Ar = () => (
  <AppShell sidebar={<Sidebar aria-label="التنقل الرئيسي"><SidebarItem href="#" icon={<Inbox />} tooltip="الوارد">الوارد</SidebarItem></Sidebar>} resizeLabel="تغيير عرض الشريط الجانبي">
    <AppHeader>
      <SidebarTrigger label="إظهار/إخفاء الشريط الجانبي" />
    </AppHeader>
  </AppShell>
);
```

## Accessibility

| Key | Action |
| --- | --- |
| `⌘B` / `Ctrl+B` | Toggle the rail (desktop) or the sheet (mobile). Works anywhere on the page. |
| `Tab` (first) | Reveals "Skip to content", which moves focus to `AppMain` (`id="app-main"`, `tabIndex={-1}`). Keep that id unless you also render your own skip link. |
| `Tab` | Moves through sidebar items in DOM order; the resize handle is focusable. |
| `←` / `→` on the resize handle | Shrink / grow by 16px (`Shift` = 64px). Reversed in RTL so it follows the visual edge. At the minimum, shrink collapses to the rail; grow from the rail expands to `minWidth`. |
| `Home` / `End` on the resize handle | Minimum / maximum width. |
| `Enter` on the resize handle | Reset to `defaultWidth`. Double-click does the same. |
| `Esc` | Closes the mobile sheet. |

- `SidebarItem` sets `aria-current="page"` when `active`. The gold rule is decorative; the state is also carried by weight and the attribute.
- On the rail each item gets `aria-label` from `tooltip`, its string children, or the `aria-label` prop, plus a tooltip on hover/focus. A collapsed `SidebarGroup` is `role="group"` named by its `label` when that is a string (the label row is hidden on the rail).
- The resize handle is `role="separator"` with `aria-orientation="vertical"`, `aria-valuemin/max/now` (`now` is the current width, the stored one while collapsed) and a label. On the rail the handle is `aria-hidden` and not focusable.
- **Localise:** `resizeLabel`, `SidebarTrigger.label`, group labels, item text and `tooltip`. Built in and localised by provider locale: the sheet's screen-reader title ("Navigation" / "التنقل"), the `Sidebar` label, and the trigger label and tooltip. Blocked `localStorage` is tolerated: the state simply is not remembered.

## RTL & i18n

- The sidebar sits at the inline start, so it is on the right in RTL. Borders, resize handle, active rule, nest indent and chevrons all use logical properties and mirror.
- The chevrons and panel icon are `directional` icons; the mobile sheet slides in from the correct side.
- The resize drag and keyboard arrows read the computed direction, so dragging toward the page always grows the sidebar.
- Trailing counts use `tabular-nums`; wrap Latin numerals or keys inside Arabic text in `<bdi dir="ltr">`.

## Styling & tokens

- Surfaces: page `bg-background`, sidebar `bg-sidebar` with `border-e border-border`, header `bg-background/95`.
- Item states: hover `bg-nq-hover`, active `bg-nq-selected` with an `nq-accent` rule, focus ring `nq-focus`.
- Sizes come from tokens: `--nq-nav-row`, `--nq-control`, `--nq-touch-min`, `--nq-sidebar-width` (set on the aside; you can read it in CSS).

### Density

The whole frame follows the provider's density (`<NasaqProvider density="…">`, which sets `data-density` on `<html>`).
Density changes sizes, never hierarchy or the type scale.

| | comfortable | compact (default) | dense |
| --- | --- | --- | --- |
| Header height (`--nq-header`) | 56 | 48 | 40 |
| Nav row (`--nq-nav-row`) | 36 | 32 | 28 |
| Workspace / account trigger (nav row + 12) | 48 | 44 | 40 |
| Sidebar padding and gaps (`--nq-shell-pad`) | 16 | 12 | 8 |
| Page padding (`--nq-page-pad`) | 28 | 24 | 16 |
| Collapsed rail (`--nq-control` + 2 × shell pad) | 72 | 56 | 44 |

Use comfortable for portals and marketing-adjacent screens, compact for apps, and dense for ops consoles. On touch
devices, items keep a 44px minimum (`--nq-touch-min`) whatever the density. There is no per-shell density prop.
Menus and the mobile sheet render in portals and follow the document, so set density once on the provider.
- Target with `[data-slot=app-sidebar][data-collapsed]`, `[data-resizing]`, `[data-slot=sidebar-item]`.
- Extend with `className` on any part. Do not override colours with raw hex.

## Do / Don't

- **Do** put `SidebarTrigger` first in `AppHeader`, and the workspace switcher first in `SidebarHeader`.
- **Do** keep the active marker as the gold accent rule plus weight (colour is never the only cue).
- **Do** use whitespace and headings to group; the shell is flat by default (see `docs/foundations/LAYOUT.md`).
- **Don't** wrap page content in a card just to fill space.
- **Don't** add a second `AppShell` or `CommandProvider`; nested providers reuse the outer registry.
- **Don't** hard-code colours, and don't move settings/help into the footer next to the user menu; they live in the menu.

## Related

- [sidebar-layout](../sidebar-layout/README.md): user reorder/hide of sidebar items
- [workspace-switcher](../workspace-switcher/README.md) · [user-menu](../user-menu/README.md) · [breadcrumb](../breadcrumb/README.md)
- [command-palette](../command-palette/README.md) · [commands](../commands/README.md)
- [product-switcher](../product-switcher/README.md) · [switchers](../switchers/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/pages-app-app-shell--docs
