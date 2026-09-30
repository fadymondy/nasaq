---
name: page-header
title: PageHeader
category: layout
status: beta
summary: "The top of a page: breadcrumbs or a back link, the page title, a line of description, meta facts and the page's actions at the inline end."
exports: [PageHeader, PageHeaderProps, PageHeaderCrumb, PageHeaderLabels]
related: [page-actions, breadcrumb, section-header, app-shell, status]
story: components-layout-page-header
base-ui: []
keywords: [page header, page title, heading, h1, breadcrumbs, back link, meta, actions, toolbar, detail page, list page]
---

# PageHeader

The top of a page's content. It shows where the page sits (breadcrumbs or a back link), the page title as the one `h1`, a line of description, a row of meta facts and the page's actions at the inline end. On narrow screens the actions wrap under the title.

## When to use

- At the top of every list, detail and settings page inside `AppMain`.
- When a detail page needs a way back to its list, or a list page needs its primary action beside the title.

## When not to use

- Headings further down the page: use [`SectionHeader`](../section-header/README.md).
- The app's top bar (search, account, notifications): that is `AppHeader` in [`AppShell`](../app-shell/README.md).
- Marketing heroes: use the marketing sections.

## Import

```tsx
import { PageHeader } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, PageHeader } from "@fadymondy/nasaq/web";

<PageHeader
  breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Customers" }]}
  title="Customers"
  description="Everyone who bought from you or opened an account."
  actions={<Button>New customer</Button>}
/>;
```

## Anatomy

```
header [data-slot=page-header]
├─ nav [data-slot=page-header-breadcrumbs]   (Breadcrumb, when `breadcrumbs`)
├─ a   [data-slot=page-header-back]          (when `backHref` or `onBack`)
└─ div
   ├─ h1  [data-slot=page-header-title]
   ├─ p   [data-slot=page-header-description]
   ├─ div [data-slot=page-header-meta]
   └─ div [data-slot=page-header-actions]    (inline end; wraps below on narrow screens)
```

## API

### `PageHeader`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | `ReactNode` | — | Required. The page's one heading. |
| `description` | `ReactNode` | — | One or two lines under the title. |
| `breadcrumbs` | `PageHeaderCrumb[]` | — | The last crumb is the current page. |
| `backHref` | `string` | — | Shows a "Back" link above the title. |
| `onBack` | `() => void` | — | Runs instead of following `backHref`, for client-side routers. |
| `meta` | `ReactNode` | — | Small facts under the description: a `Status`, an owner, a date. |
| `actions` | `ReactNode` | — | Usually [`PageActions`](../page-actions/README.md) or one or two buttons. |
| `as` | `"h1" \| "h2"` | `"h1"` | Heading element. Use `h2` when the shell already owns the `h1`. |
| `labels` | `Partial<PageHeaderLabels>` | — | Overrides the built-in "Back" / "رجوع". |

Plus any `<header>` prop.

### `PageHeaderCrumb`

| Field | Type | Notes |
| --- | --- | --- |
| `label` | `ReactNode` | The crumb text. |
| `href` | `string` | Leave out on the current page. |

## Examples

### Detail page with a back link and meta

```tsx
<PageHeader
  backHref="/customers"
  title="Nour Adel"
  description="Customer since March 2024 · Riyadh"
  meta={
    <>
      <Status tone="success">Active</Status>
      <span>12 orders</span>
    </>
  }
  actions={<PageActions primary={{ id: "crm.customer.edit", label: "Edit", onSelect: edit }} />}
/>
```

### Client-side back

```tsx
const navigate = useNavigate();
<PageHeader onBack={() => navigate({ to: "/customers" })} title="Nour Adel" />;
```

## Accessibility

- The title renders as an `h1` by default, so every page gets one top-level heading.
- Breadcrumbs are a `nav` landmark named "Breadcrumb" / "مسار التنقل"; the current page has `aria-current="page"`.
- The back link is a real link with visible text, not an icon-only button.

## RTL & i18n

Everything uses logical properties: actions sit at the inline end, and the back arrow and breadcrumb chevrons mirror in Arabic. "Back" is built in (English and Arabic); override it with `labels`.

## Styling & tokens

- Title: `text-h1 text-foreground`. Description: `text-body-sm text-muted-foreground`. Meta: `text-caption text-muted-foreground`.
- Target parts with `[data-slot=page-header-*]`.
- Extend spacing with `className`. Do not restyle the title with raw hex.

## Do / Don't

- Do keep the title short: the noun of the page ("Customers", a customer's name).
- Do put one primary action in `actions`; the rest belong behind `PageActions`' menu.
- Don't show both breadcrumbs and a back link; pick the one that fits the depth.
- Don't wrap the header in a card.

## Related

`page-actions`, `breadcrumb`, `section-header`, `app-shell`, `status`.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-page-header--docs
