---
name: breadcrumb
title: Breadcrumb
category: navigation
status: stable
summary: Location trail for the app header - a nav landmark with an ordered list, links, a current page and directional separators.
exports: [Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator]
related: [app-shell]
story: components-navigation-breadcrumb
base-ui: []
keywords: [breadcrumb, trail, location, path, header, navigation]
---

# Breadcrumb

Shows where the user is in a hierarchy (workspace, project, page) and lets them jump back up. It is a
set of small composable parts, not a data-driven component: you write one `BreadcrumbItem` per level.

It has no story of its own; it appears in the header of the **App Shell** pattern story.

## When to use

- Hierarchies two or more levels deep, in the `AppHeader`.
- Pages the user can reach from several places, where "where am I" is not obvious.

## When not to use

- Primary navigation: use `SidebarItem`s in [`AppShell`](../app-shell/README.md).
- Steps in a flow: use a stepper or tabs.
- One-level pages: use a page heading.

## Import

```tsx
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@fadymondy/nasaq/web";

export function Trail() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">3x1</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Nasaq</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

## Anatomy

```
Breadcrumb                    data-slot="breadcrumb"            <nav aria-label="Breadcrumb">
└─ BreadcrumbList             data-slot="breadcrumb-list"       <ol>
   ├─ BreadcrumbItem          data-slot="breadcrumb-item"       <li>
   │  └─ BreadcrumbLink       data-slot="breadcrumb-link"       <a>
   ├─ BreadcrumbSeparator     data-slot="breadcrumb-separator"  <li role="presentation" aria-hidden>
   └─ BreadcrumbItem
      └─ BreadcrumbPage       data-slot="breadcrumb-page"       <span aria-current="page">
```

## API

Every part forwards its element's native props and merges `className`.

| Export | Element | Own props | Notes |
| --- | --- | --- | --- |
| `Breadcrumb` | `nav` | `aria-label` (default `"Breadcrumb"`) | **Localise the label.** |
| `BreadcrumbList` | `ol` | none | Flex, wraps, `gap-1.5`, `text-body-sm text-muted-foreground`. |
| `BreadcrumbItem` | `li` | none | `inline-flex`, truncates. |
| `BreadcrumbLink` | `a` | none | Truncates; hover `text-foreground`. |
| `BreadcrumbPage` | `span` | none | The current page: `aria-current="page"`, `text-foreground`. Not a link. |
| `BreadcrumbSeparator` | `li` | `children?: ReactNode` (default a directional chevron) | `role="presentation"`, `aria-hidden`. Place between items, as a sibling of `BreadcrumbItem`. |

## Examples

### Hide the early levels on small screens

```tsx
import { AppHeader, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, SidebarTrigger } from "@fadymondy/nasaq/web";

export const Header = () => (
  <AppHeader>
    <SidebarTrigger />
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink href="/">3x1</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden sm:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>Dashboard</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </AppHeader>
);
```

### Arabic, custom separator

```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@fadymondy/nasaq/web";

export const Trail = () => (
  <Breadcrumb aria-label="مسار التنقل">
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem>
        <BreadcrumbPage>المشاريع</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
);
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Moves through the links in order. |
| `Enter` | Follows the focused link. |

- `<nav>` landmark named by `aria-label`, with an ordered list. Separators are `aria-hidden` so they are not read.
- `BreadcrumbPage` has `aria-current="page"` and is not focusable; the current page is also shown by colour and by not being a link.
- Links show a focus ring (`nq-focus`).
- **Localise:** `aria-label` on `Breadcrumb` (the default is English).

## RTL & i18n

- The default separator is a `directional` chevron, so it flips in RTL and the trail reads right to left.
- A custom `children` separator is not mirrored for you; use text like `/` or a directional `Icon`.
- Long names truncate; pass a `title` if the full text matters.

## Styling & tokens

- Text `text-muted-foreground`; current page and hovered links `text-foreground`; focus outline `nq-focus`.
- Target `[data-slot=breadcrumb-link]`, `[data-slot=breadcrumb-page]`. Extend through `className`.

## Do / Don't

- **Do** end with `BreadcrumbPage` (the current page), never a link to itself.
- **Do** collapse early levels on narrow screens with `hidden sm:...` classes on both item and separator.
- **Don't** put separators inside `BreadcrumbItem`; they are siblings in the list.
- **Don't** use breadcrumbs as the only navigation.

## Related

- [app-shell](../app-shell/README.md): `AppHeader` and `SidebarTrigger`

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-navigation-breadcrumb--docs
