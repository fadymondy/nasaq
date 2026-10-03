---
name: admin-area
title: AdminArea
category: admin
status: beta
summary: The admin frame. An icon rail plus sub-sidebar with ready-made admin navigation, an environment tag, an account button and an impersonation banner, plus AdminPage for the screen body.
exports: [AdminArea, AdminPage, defaultAdminSections, AdminAreaProps, AdminAreaLabels, AdminUser, AdminPageProps, AdminBreadcrumb]
related: [icon-rail-sidebar, admin-users, admin-tenants, app-shell]
story: components-admin-admin-area
base-ui: []
keywords: [admin, back office, layout, rail, navigation, impersonation, breadcrumb, page]
---

# AdminArea

`IconRailSidebar` with the admin navigation ready made (Overview, People, Tenants, Security, Settings), plus
the pieces every back office needs. `AdminPage` gives each screen a breadcrumb, title and actions.

## When to use

- Internal tools that manage users, workspaces, plans and security.

## When not to use

- The customer-facing app: use `AppShell`.

## Import

```tsx
import { AdminArea, AdminPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AdminArea, AdminPage, AdminUsers } from "@fadymondy/nasaq/web";

export function UsersScreen({ users, roles }) {
  return (
    <AdminArea activeItem="users" user={{ name: "Sara Alharbi", email: "sara@example.com" }} environment="Production">
      <AdminPage title="Users" breadcrumbs={[{ label: "People" }, { label: "Users" }]}>
        <AdminUsers users={users} roles={roles} />
      </AdminPage>
    </AdminArea>
  );
}
```

## Anatomy

```
AdminArea              data-slot="admin-area"
├─ impersonation banner   data-slot="admin-impersonation", role="status"
└─ IconRailSidebar        rail: brand, sections, railFooter, user avatar
   └─ AdminPage           data-slot="admin-page": breadcrumb, h1, description, actions, children
```

## API

### AdminArea

Takes every `IconRailSidebar` prop except `railFooter` and `labels`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sections` | `RailSection[]` | `defaultAdminSections(locale)` | Item ids: `dashboard`, `activity`, `users`, `roles`, `invitations`, `workspaces`, `plans`, `billing`, `invoices`, `coupons`, `audit`, `sessions`, `api-keys`, `settings`. |
| `user` | `AdminUser` | none | `{ name, email, avatar? }`, shown on the rail. |
| `railFooter` | `ReactNode` | none | Extra controls above the user. |
| `environment` | `string` | none | A warning tag above the sub-sidebar. |
| `impersonating` | `{ name, email? } \| null` | none | Shows the pinned banner. |
| `onStopImpersonating` | `() => void \| Promise<void>` | none | Banner button. |
| `labels` | `AdminAreaLabels` | en / ar | |

### AdminPage

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | The `h1`. |
| `description` | `ReactNode` | none | |
| `breadcrumbs` | `AdminBreadcrumb[]` | none | `{ label, href? }`; the last is the current page. |
| `actions` | `ReactNode` | none | Inline end of the title. |

## Examples

- **Impersonation**: `impersonating={{ name: "Omar" }} onStopImpersonating={exit}`.
- **Own navigation**: pass `sections` built like `defaultAdminSections`.

## Accessibility

Inherits the rail keyboard model. The banner is a `role="status"` region; the breadcrumb is a labelled `nav`.

## RTL & i18n

Built-in English and Arabic labels. Emails and IDs stay LTR.

## Styling & tokens

Uses `bg-nq-warning-soft`, `text-nq-warning-text`, `text-h1`. Extend with `className`.

## Do / Don't

- Do show the impersonation banner on every screen while acting as a user.
- Do not hide the environment tag in production.

## Related

- [IconRailSidebar](../icon-rail-sidebar/README.md)
- [AdminUsers](../admin-users/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-admin-admin-area--docs
