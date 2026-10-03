---
name: icon-rail-sidebar
title: IconRailSidebar
category: navigation
status: beta
summary: Two-level navigation. A slim rail of icons picks the section and a sub-sidebar beside it lists that section's pages. Folds into a sheet on mobile.
exports: [IconRailSidebar, IconRailSidebarProps, IconRailSidebarLabels, RailLink, RailGroup, RailSection]
related: [app-shell, sidebar-layout, admin-area, sheet]
story: components-navigation-icon-rail-sidebar
base-ui: [dialog, tooltip]
keywords: [sidebar, rail, icons, two-level, sub-sidebar, navigation, admin, sections, mobile]
---

# IconRailSidebar

The navigation frame for products with many areas. The narrow rail (icons with tooltips) holds the areas; the
sub-sidebar next to it lists the pages of the chosen area, in groups, with expandable parents. Your page is
`children` and fills the rest. On narrow screens both fold into a sheet behind a menu button.

## When to use

- Admin areas and dashboards with 4 to 8 top-level areas and several pages in each.

## When not to use

- One flat list of pages: use the `AppShell` sidebar.
- Settings pages: use `SettingsSections`.

## Import

```tsx
import { IconRailSidebar } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Home, Users } from "lucide-react";
import { IconRailSidebar } from "@fadymondy/nasaq/web";

const sections = [
  { id: "home", label: "Home", icon: <Home />, groups: [{ id: "g", items: [{ id: "dash", label: "Dashboard" }] }] },
  { id: "people", label: "People", icon: <Users />, groups: [{ id: "g", items: [{ id: "users", label: "Users" }, { id: "roles", label: "Roles" }] }] },
];

export function Page() {
  return (
    <IconRailSidebar sections={sections} defaultValue="people" onItemSelect={(id) => console.log(id)}>
      <main>Content</main>
    </IconRailSidebar>
  );
}
```

## Anatomy

```
IconRailSidebar        data-slot="icon-rail-sidebar"
├─ rail                data-slot="icon-rail": brand, section buttons, railFooter
├─ sub-sidebar         data-slot="icon-rail-sub": title, subHeader, groups, subFooter
├─ mobile bar          data-slot="icon-rail-mobile-bar": menu button, opens a Sheet with rail and sub
└─ content             data-slot="icon-rail-content": children
```

## API

### IconRailSidebar

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sections` | `RailSection[]` | required | `{ id, label, icon, href?, badge?, title?, groups? }`. A section without `groups` is a plain link. |
| `value`, `defaultValue`, `onValueChange` | `string`, `(id) => void` | first section | Active section. |
| `activeItem` | `string` | none | Active page id (controlled). |
| `onItemSelect` | `(id, sectionId) => void` | none | A page, or a section with no sub-sidebar, was chosen. |
| `brand`, `railFooter` | `ReactNode` | none | Top and bottom of the rail. |
| `subHeader`, `subFooter` | `ReactNode` | none | Inside the sub-sidebar. |
| `subOpen`, `defaultSubOpen`, `onSubOpenChange` | `boolean`, `(open) => void` | open | Wide-screen collapse of the sub-sidebar. |
| `labels` | `IconRailSidebarLabels` | en / ar | Menu, collapse, expand and close text. |

`RailGroup` is `{ id, label?, items }`; `RailLink` is `{ id, label, icon?, href?, badge?, children? }`.

## Examples

- **Controlled**: `value={section} onValueChange={setSection} activeItem={page}`.
- **Links**: give each `RailLink` an `href` and route in `onItemSelect`.
- **Arabic**: pass Arabic `label`s; the rail moves to the inline start and mirrors.

## Accessibility

| Key | Action |
| --- | --- |
| Arrow Up / Down | Move between rail buttons. |
| Enter / Space | Choose the section or page. |
| Escape | Close the mobile sheet. |

Rail buttons are named by their `label` (also the tooltip); the active one has `aria-current`. Pass `labels`
for the menu and collapse buttons in other languages.

## RTL & i18n

The rail sits at the inline start and the sub-sidebar mirrors. Built-in English and Arabic strings follow the
Nasaq locale. Section and page labels are yours to translate.

## Styling & tokens

Uses `bg-nq-selected`, `bg-nq-hover`, `border-border`, `rounded-control` and the sidebar item styles.
Extend with `className`.

## Do / Don't

- Do keep the rail to a handful of areas with recognisable icons.
- Do not put actions on the rail; it navigates.

## Related

- [AppShell](../app-shell/README.md)
- [AdminArea](../admin-area/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-icon-rail-sidebar--docs
