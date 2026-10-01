---
name: app-shell
title: AppShell
category: layout
status: stable
summary: The product frame every Nasaq app uses - resizable, collapsible sidebar at the inline start, sticky header, main area, mobile sheet, and the command registry.
exports: [AppShell, AppShellProps, SidebarProps, AppHeader, AppMain, AppBreadcrumbs, AppCrumb, AppCrumbProps, AppNav, AppNavProps, AppNavItem, AppNavItemProps, AppPageHeader, AppPageHeaderProps, AppFooter, AppFooterLink, SidebarStatus, SidebarStatusProps, SidebarTrigger, Sidebar, SidebarBrand, SidebarBrandProps, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupProps, SidebarGroupAction, SidebarItem, SidebarItemProps, SidebarNest, SidebarNestProps, SidebarSubItem, SidebarExpandedOnly, useAppShell, useOptionalAppShell, useSidebarCollapsed, SIDEBAR_STORAGE_KEY, SIDEBAR_WIDTH_KEY]
related: [sidebar-layout, workspace-switcher, user-menu, breadcrumb, command-palette, commands, product-switcher, switchers]
story: components-layout-pages-app-shell
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

Two frames, one component:

- **Sidebar navigation** (pass `sidebar`). Add `variant="inset"` to put the page on its own rounded
  panel, inset from the sidebar's surface, and `SidebarStatus` for the "All systems normal" line
  above the user.
- **Top navigation** (leave `sidebar` out). The header carries the path as `AppBreadcrumbs` with
  ⇅ switchers and tags (organisation / project / environment), `AppNav` puts section tabs under it,
  and `AppFooter` closes the page. Good for apps whose sections fit in one row.

Both share `AppPageHeader`: the page's big title, a line under it, and its controls (a time range,
filters, the main action) at the inline end.

## When to use

- The root layout of any product with more than one screen.
- You need a collapsible sidebar with workspace switcher, search, navigation and user menu.
- A few sections under one resource (a project, a server, a site): top navigation with a path and tabs.

## When not to use

- A single-purpose page, marketing site or auth screen: use plain layout primitives.
- Switching between products: use [`ProductSwitcher`](../product-switcher/README.md) inside the shell.
- Letting users reorder or hide sidebar items: add [`sidebar-layout`](../sidebar-layout/README.md) on top.
- Hand-rolling a second sidebar nested in the page: the shell supports one.

## Import

```tsx
import {
  AppShell, AppHeader, AppMain, SidebarTrigger,
  Sidebar, SidebarBrand, SidebarHeader, SidebarContent, SidebarFooter,
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
  SidebarBrand,
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
      <SidebarHeader>
        <SidebarBrand href="/" />
      </SidebarHeader>
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
AppShell                          data-slot="app-shell"      (flex row, min-h of 100dvh minus `--nasaq-shell-offset`)
├─ aside                          data-slot="app-sidebar"    data-collapsed, data-resizing; md+ only
│  ├─ your `sidebar` node         (SidebarRailContext = collapsed)
│  └─ resize handle               data-slot="sidebar-resize-handle" role="separator"
├─ mobile sheet (Dialog)          data-slot="app-shell-sheet"   below md, opened by SidebarTrigger / ⌘B
│  └─ your `sidebar` node         (never collapsed inside the sheet)
└─ column                         (children; inside app-shell-panel when variant="inset")
   ├─ AppHeader                   data-slot="app-header"
   │  ├─ SidebarTrigger first     (sidebar frame)
   │  └─ AppBreadcrumbs           data-slot="app-breadcrumbs"  (top frame) <nav> > <ol>
   │     └─ AppCrumb              data-slot="app-crumb"        icon, name, tag, ⇅ switcher
   ├─ AppNav                      data-slot="app-nav"          (top frame) section tabs, md and up
   │  ├─ bottom bar               data-slot="app-nav-bar"      below md; fixed, first mobileItems
   │  │  └─ More                  data-slot="app-nav-more"     opens a Drawer with the rest
   │  └─ AppNavItem               data-slot="app-nav-item"     <a>, aria-current when active
   ├─ AppMain                     data-slot="app-main"
   │  └─ AppPageHeader            data-slot="app-page-header"  h1, description, actions
   └─ AppFooter                   data-slot="app-footer"       (top frame) start + AppFooterLink[]

Root attributes: data-navigation="sidebar" | "top", data-variant="plain" | "inset".

Sidebar                           data-slot="sidebar"        <nav>, data-collapsed
├─ SidebarHeader                  data-slot="sidebar-header"  logo, workspace switcher, search trigger
│  └─ SidebarBrand                data-slot="sidebar-brand"   the product logo, a link home
├─ SidebarContent                 data-slot="sidebar-content" scrolls; header and footer stay put
│  └─ SidebarGroup                data-slot="sidebar-group"   label, action, collapsible
│     ├─ SidebarItem              data-slot="sidebar-item"    <a>, aria-current when active
│     └─ SidebarNest              data-slot="sidebar-nest"    parent + SidebarSubItem[]
│        └─ SidebarSubItem        data-slot="sidebar-sub-item"
└─ SidebarFooter                  data-slot="sidebar-footer"  support, docs, SidebarStatus, user menu
   └─ SidebarStatus               data-slot="sidebar-status"  data-tone; a dot on the rail
```

## API

### `AppShell`

Extends `ComponentProps<"div">` (extra props land on the root element).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sidebar?` | `ReactNode` | none | Rendered as a column at md+ and inside a sheet below md. Usually a `<Sidebar>`. It is mounted once per surface, so keep it cheap and idempotent. Leave it out for top navigation: no aside, no sheet, and `SidebarTrigger` has nothing to toggle, so don't render one. |
| `variant?` | `"plain" \| "inset"` | `"plain"` | `"inset"` puts the page on a rounded, bordered panel inset from the sidebar's surface (md+). Below md it is plain. Only meaningful with a `sidebar`. |
| `defaultCollapsed?` | `boolean` | `false` | Initial rail state when uncontrolled. A saved choice in `localStorage` wins after mount. |
| `collapsed?` | `boolean` | none | Controlled rail state. When set, nothing is persisted; you own storage. |
| `onCollapsedChange?` | `(collapsed: boolean) => void` | none | Called on toggle, ⌘B and drag-to-rail. |
| `resizable?` | `boolean` | `true` | Shows the drag handle (desktop). |
| `defaultWidth?` | `number` | `256` | Sidebar width in px. The user's width is remembered. |
| `minWidth?` | `number` | `208` | Lower clamp. Dragging about 28px below it snaps to the rail. |
| `maxWidth?` | `number` | `420` | Upper clamp. |
| `resizeLabel?` | `string` | "Resize sidebar" / "تغيير عرض الشريط الجانبي" | Accessible name of the resize handle. Localise it if you are not on `en`/`ar`. |
| `offset?` | `number | string` | `0` | Height taken from above the shell, such as an Electron title bar (number = px, string = any CSS length). Sets `--nasaq-shell-offset`, which the shell subtracts from its `100dvh` and the sidebar sticks below; you can also set that CSS variable yourself. The sticky `AppHeader` stays at the top of its scroll container. |
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

### `SidebarBrand`

The product logo at the top of the sidebar: a link (default `href="/"`) that shows the brand's `ProductLogo` (mark and
name) when the sidebar is expanded and only its `ProductMark` when it is collapsed, with the name as its label and
tooltip. Put it first in `SidebarHeader`. Every `a` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `brand` | `string` | the provider's brand | Which brand's logo to show. |
| `logo` | `ReactNode` | `<ProductLogo />` | What shows when expanded, e.g. your own lockup or the logo with an environment badge. |
| `mark` | `ReactNode` | `<ProductMark />` | What shows when collapsed to the rail. |
| `label` | `string` | the brand's name | The link's name and tooltip while only the mark shows. Set it when you pass a custom `logo` or `brand`. |

Keep the official mark as it is: do not recolour, mirror or redraw it.

### `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`

Plain wrappers over `nav` / `div` / `div` / `div`. `Sidebar` is a `<nav>` with a default
`aria-label` of "Main" / "الرئيسية" (by locale); pass `aria-label` to override, especially with more than one `nav`.

`Sidebar` has one prop of its own:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `icons?` | `"always" \| "mobile"` | `"always"` | `mobile` hides the icons of `SidebarItem` and `SidebarNest` on the desktop column, for a quieter text-only list. They stay in the phone sheet, and on the collapsed rail, where the icon is all there is. Still give every item an icon. |

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
| `active?` | `boolean` | `false` | Sets `aria-current="page"`, the selected background and a stronger weight. |
| `icon?` | `ReactNode` | none | Leading icon (16px). |
| `trailing?` | `ReactNode` | none | Count or status at the inline end. Hidden on the rail. |
| `tooltip?` | `string` | children if a string | Tooltip and `aria-label` on the rail. **Set it when `children` is not a string**; otherwise the rail item falls back to the `aria-label` prop you pass, and has no name if there is none. |
| `render?` | `ReactElement \| (props) => ReactElement` | `<a>` | Render another element in place of the `<a>`, so a router link keeps client-side navigation: `render={<Link href="/orders" />}` (Next.js) or `render={(props) => <NavLink {...props} to="/orders" />}` (react-router). Nasaq merges its classes, `aria-current`, `data-slot` and children into it. |

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

### `SidebarStatus`

The service status line at the foot of the sidebar, usually a link to your status page. Extends
`Omit<ComponentProps<"a">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tone?` | `"success" \| "warning" \| "danger" \| "info"` | `"success"` | The dot's colour. Anything but success pulses (not under reduced motion). |
| `children` | `string` | required | The status in words, e.g. "All systems normal". On the rail only the dot shows, and this becomes its tooltip and accessible name. |

The words carry the meaning; the dot is decoration (`aria-hidden`). Never ship a dot without text.

### `AppBreadcrumbs`, `AppCrumb`

The path for top navigation: organisation / project / environment, each with its own switcher.
`AppBreadcrumbs` is `ComponentProps<"nav">` with a default `aria-label` of "Breadcrumb" / "المسار";
it renders an `<ol>` with "/" separators. Below md only the last crumb shows.

`AppCrumb`:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | The name. |
| `icon?` | `ReactNode` | none | An avatar, mark or icon before the name. |
| `tag?` | `ReactNode` | none | A short uppercase badge after the name: the plan ("Free"), the environment ("Production"). |
| `tagVariant?` | `Badge` variant | `"outline"` | E.g. `"warning"` for production. |
| `href?` | `string` | none | Links the name. Ignored when `current`. |
| `current?` | `boolean` | `false` | The last step: not a link, `aria-current="page"`. |
| `menu?` | `ReactNode` | none | `DropdownMenuItem`s for the ⇅ switcher beside the name. No `menu`, no switcher. |
| `menuLabel?` | `string` | "Switch {name}" / "تبديل {name}" | The switcher's accessible name. Set it when `children` is not a string. |
| `className?` | `string` | none | Classes for the crumb. |

For the sidebar frame, keep using [`Breadcrumb`](../breadcrumb/README.md) and
[`WorkspaceSwitcher`](../workspace-switcher/README.md); `AppCrumb` is for the header path.

### `AppNav`, `AppNavItem`

Section tabs under the header. Place `AppNav` right after `AppHeader`. From md up it is a row of tabs
that scrolls sideways when it doesn't fit.

**Below md it becomes a bottom tab bar** within thumb reach, with an icon over a label. The first
`mobileItems` items sit on the bar, and the rest open from **More** in a bottom `Drawer`. Choosing a
link closes the drawer. When the current page is in the drawer, More shows as active. The shell pads
its bottom on phones so the bar never covers the page or the `AppFooter`, and the bar respects the
safe-area inset.

`AppNav` extends `ComponentProps<"nav">`:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `mobileItems?` | `number` | `4` | How many items fit on the phone bar. With exactly one more item than this, all of them show and there is no More. |
| `moreLabel?` | `string` | "More" / "المزيد" | Label and drawer title of the overflow button. |
| `icons?` | `"always" \| "mobile"` | `"always"` | `mobile` makes the desktop tabs text-only; the phone bar and its drawer keep the icons. |
| `aria-label?` | `string` | "Sections" / "الأقسام" | Names both the tab row and the bottom bar. |

`AppNavItem` extends `ComponentProps<"a">`:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `active?` | `boolean` | `false` | `aria-current="page"`, stronger text and a solid underline (never colour alone). |
| `icon?` | `ReactNode` | none | Leading icon: 16px in the tab row, 20px on the phone bar and in the drawer. **Give every item one**, because the bottom bar relies on it. |
| `trailing?` | `ReactNode` | none | A count or a `Badge` ("New") after the label. On the phone bar it becomes a dot on the icon; in the drawer it shows in full. |

These are links, not ARIA tabs: each one is a page. For tabs that swap content in place, use `Tabs`.

### `AppPageHeader`

The page's title row. Extends `Omit<ComponentProps<"div">, "title">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | Rendered as the page's `<h1>`. One per page. |
| `description?` | `ReactNode` | none | A line under the title: the URL, the owner, a count. |
| `icon?` | `ReactNode` | none | An avatar or mark before the title. |
| `actions?` | `ReactNode` | none | Controls at the inline end: a time range (`ToggleGroup`), filters, then the one primary action last. Wraps under the title on narrow screens. |

### `AppFooter`, `AppFooterLink`

The quiet last row of a top-navigation app. `AppFooter` is `ComponentProps<"footer">` plus
`start?: ReactNode` (copyright or status, at the inline start); its children are the links, at the
inline end. `AppFooterLink` is a styled `<a>`. Don't use it with the sidebar frame: the sidebar
footer already holds support, docs and status.

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
  AppShell, DropdownMenuItem, Sidebar, SidebarBrand, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader,
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
        <SidebarBrand href="/" />
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

### Inset panel with support, docs and status

```tsx
<AppShell
  variant="inset"
  sidebar={
    <Sidebar>
      {/* SidebarHeader, SidebarContent… */}
      <SidebarFooter>
        <SidebarItem href="/support" icon={<LifeBuoy />}>Support</SidebarItem>
        <SidebarItem href="/docs" icon={<BookOpen />}>Documentation</SidebarItem>
        <SidebarStatus href="https://status.example.com">All systems normal</SidebarStatus>
        <UserMenu user={user} onSignOut={signOut} />
      </SidebarFooter>
    </Sidebar>
  }
>
  <AppHeader>
    <SidebarTrigger />
  </AppHeader>
  <AppMain>{children}</AppMain>
</AppShell>
```

### Top navigation: path, tabs, title row, footer

```tsx
<AppShell>
  <AppHeader className="gap-3">
    <a href="/" aria-label="Home"><ProductMark size={22} title="" /></a>
    <AppBreadcrumbs>
      <AppCrumb href="/acme" icon={<Avatar name="Acme" size="xs" />} tag="Free"
        menu={orgs.map((o) => <DropdownMenuItem key={o.id}>{o.name}</DropdownMenuItem>)}>
        Acme
      </AppCrumb>
      <AppCrumb href="/acme/shop" menu={projectItems}>shop</AppCrumb>
      <AppCrumb current icon={<GitBranch />} tag="Production" tagVariant="warning" menu={branchItems}>
        main
      </AppCrumb>
    </AppBreadcrumbs>
    <div className="ms-auto flex items-center gap-2">
      <SearchTrigger className="hidden w-52 lg:flex" />
      <SearchTrigger variant="icon" className="lg:hidden" />
      <UserMenu variant="avatar" user={user} onSignOut={signOut} />
    </div>
  </AppHeader>
  <AppNav>
    {/* Phones: Overview…Logs on the bottom bar, Usage and Settings under More. */}
    <AppNavItem href="/acme/shop" icon={<LayoutGrid />} active>Overview</AppNavItem>
    <AppNavItem href="/acme/shop/deployments" icon={<CloudUpload />}>Deployments</AppNavItem>
    <AppNavItem href="/acme/shop/resources" icon={<Server />}>Resources</AppNavItem>
    <AppNavItem href="/acme/shop/logs" icon={<ScrollText />} trailing={<Badge variant="accent">New</Badge>}>Logs</AppNavItem>
    <AppNavItem href="/acme/shop/usage" icon={<ChartColumn />}>Usage</AppNavItem>
    <AppNavItem href="/acme/shop/settings" icon={<Settings />}>Settings</AppNavItem>
  </AppNav>
  <AppMain>
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <AppPageHeader
        title="shop"
        description={<bdi dir="ltr">shop.example.com</bdi>}
        actions={
          <>
            <ToggleGroup value={range} onValueChange={setRange} aria-label="Range">…</ToggleGroup>
            <Button variant="primary" size="sm">Deploy</Button>
          </>
        }
      />
      {children}
    </div>
  </AppMain>
  <AppFooter start="© 2026 Acme">
    <AppFooterLink href="/status">Status</AppFooterLink>
    <AppFooterLink href="/docs">Docs</AppFooterLink>
  </AppFooter>
</AppShell>
```

An empty page in either frame: one `EmptyState` with an icon, one sentence and one button.

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
- Top navigation: `AppBreadcrumbs` and `AppNav` are separate named `<nav>` landmarks ("Breadcrumb", "Sections"); the current crumb and tab carry `aria-current="page"`. Each ⇅ switcher is a menu button named "Switch {name}". `AppFooter` is the `contentinfo` landmark.
- Only one of the tab row and the phone bar is rendered visibly at a time, so there is only ever one "Sections" landmark. More is a dialog trigger. The drawer has a "More" title, traps focus and closes with Esc, a swipe down or a tap on a link.
- `SidebarStatus` on the rail keeps its words as the accessible name and tooltip; its dot is `aria-hidden`.
- **Localise:** `resizeLabel`, `SidebarTrigger.label`, group labels, item text and `tooltip`. Built in and localised by provider locale: the sheet's screen-reader title ("Navigation" / "التنقل"), the `Sidebar` label, and the trigger label and tooltip. Blocked `localStorage` is tolerated: the state simply is not remembered.

## RTL & i18n

- The sidebar sits at the inline start, so it is on the right in RTL. Borders, resize handle, active rule, nest indent and chevrons all use logical properties and mirror.
- The chevrons and panel icon are `directional` icons; the mobile sheet slides in from the correct side.
- The resize drag and keyboard arrows read the computed direction, so dragging toward the page always grows the sidebar.
- In top navigation the path reads from the inline start (organisation on the right in Arabic), the tab row scrolls from the start, the phone bar runs right to left with More at the far left, and footer links sit at the inline end.
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

- **Do** put `SidebarTrigger` first in `AppHeader`, and `SidebarBrand` first in `SidebarHeader`, then the workspace switcher.
- **Do** keep the active marker as the gold accent rule plus weight (colour is never the only cue).
- **Do** use whitespace and headings to group; the shell is flat by default (see `docs/foundations/LAYOUT.md`).
- **Don't** wrap page content in a card just to fill space.
- **Don't** add a second `AppShell` or `CommandProvider`; nested providers reuse the outer registry.
- **Do** pick one frame per app: a sidebar for many sections, top navigation for a few sections under one resource.
- **Do** end `AppPageHeader` actions with the single primary action.
- **Don't** hard-code colours, and don't move settings into the sidebar footer; they live in the user menu. Support, docs and `SidebarStatus` may sit above it.
- **Don't** render `SidebarTrigger` or `AppFooter` in the wrong frame: no trigger without a sidebar, no footer with one.

## Related

- [sidebar-layout](../sidebar-layout/README.md): user reorder/hide of sidebar items
- [workspace-switcher](../workspace-switcher/README.md) · [user-menu](../user-menu/README.md) · [breadcrumb](../breadcrumb/README.md)
- [command-palette](../command-palette/README.md) · [commands](../commands/README.md)
- [product-switcher](../product-switcher/README.md) · [switchers](../switchers/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-pages-app-shell--docs

Frames: `Inset` (rounded panel, support/docs/status footer), `Text-only on desktop` and its mobile sheet, `Top navigation`, `Top navigation, empty page`, `Top navigation, mobile` and `Top navigation, text-only tabs`.
