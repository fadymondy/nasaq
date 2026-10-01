---
name: admin-users
title: AdminUsers
category: admin
status: beta
summary: User management for an admin area. Summary tiles, a filterable users table, an add-user dialog and per-row actions to verify, disable, reset password, impersonate and edit roles.
exports: [AdminUsers, AddUserDialog, UserRolesDialog, AdminUsersProps, AdminUsersLabels, AddUserDialogProps, UserRolesDialogProps, ManagedUser, ManagedRole, ManagedUserStatus, NewUserValues, AdminActionResult, AddUserResult]
related: [admin-area, admin-tenants, data-table, stat-card, user-actions-menu]
story: components-admin-admin-users
base-ui: [dialog, alert-dialog, checkbox]
keywords: [admin, users, table, verify, disable, reset password, impersonate, roles, invite, password, free roles]
---

# AdminUsers

The users screen of a back office. You own the data; every action is an async callback that returns
nothing on success or `{ error }`, and you send back new `users`.

## When to use

- Admins who manage other people's accounts.

## When not to use

- A user editing their own account: use `AccountSettings`.

## Import

```tsx
import { AdminUsers } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AdminUsers, type ManagedUser } from "@fadymondy/nasaq/web";

const roles = [{ id: "admin", label: "Admin" }, { id: "member", label: "Member" }];

export function Users({ users }: { users: ManagedUser[] }) {
  return (
    <AdminUsers
      users={users}
      roles={roles}
      currentUserId="u1"
      onAddUser={async (values) => { await api.invite(values); }}
      onVerify={async (user) => { await api.verify(user.id); }}
      onSetDisabled={async (user, disabled) => { await api.disable(user.id, disabled); }}
      onResetPassword={async (user) => { await api.reset(user.id); }}
      onImpersonate={async (user) => { await api.impersonate(user.id); }}
      onUpdateRoles={async (user, next) => { await api.roles(user.id, next); }}
    />
  );
}
```

## Anatomy

```
AdminUsers            data-slot="admin-users"
├─ stat tiles         total, active, unverified, disabled
├─ notice             Alert, dismisses itself after 6 seconds
├─ toolbar            search, facets (status, role, verified), view options, add user
├─ DataTable          selectable; bulk verify and disable; row actions
└─ dialogs            AddUserDialog, UserRolesDialog, confirm dialogs
```

## API

### AdminUsers

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `users` | `ManagedUser[]` | required | `{ id, name, email, avatar?, roles, status, verified, workspace?, lastActive?, createdAt }`. Status is `active`, `disabled` or `invited`. |
| `roles` | `ManagedRole[]` | required | `{ id, label, description? }`. |
| `currentUserId` | `string` | none | That row cannot be disabled or impersonated. |
| `loading`, `error`, `onRetry` | | none | Table states. |
| `pageSize` | `number` | `10` | |
| `onAddUser` | `(values: NewUserValues) => result` | none | Shows the Add user button. Return `{ error, fieldErrors }` to keep the dialog open. |
| `onVerify`, `onResetPassword`, `onImpersonate` | `(user) => result` | none | An action appears only when its callback is given. |
| `onSetDisabled` | `(user, disabled) => result` | none | |
| `onUpdateRoles` | `(user, roleIds) => result` | none | |
| `onOpenUser` | `(user) => void` | none | Row click. |
| `hideStats` | `boolean` | `false` | |
| `labels` | `AdminUsersLabels` | en / ar | |

`AddUserDialog` and `UserRolesDialog` are exported for use on their own (`open`, `onOpenChange`, `roles`,
`onSubmit`; and `user`, `roles`, `onOpenChange`, `onSave`).

### AddUserDialog

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open`, `onOpenChange` | | required | Controlled open state. |
| `roles` | `ManagedRole[]` | required | Checkboxes, or suggestions with `freeRoles`. |
| `onSubmit` | `(values: NewUserValues) => result` | required | Return `{ error, fieldErrors }` to keep it open. |
| `defaultRoles` | `string[]` | first role | Ticked at first. None with `freeRoles`. |
| `password` | `boolean` | `false` | An optional password field with a strength meter. Typing one turns off the invitation email and sends `password`. |
| `minPasswordLength` | `number` | `8` | |
| `freeRoles` | `boolean` | `roles.length === 0` | Type role names in a tag input instead of ticking them. Roles become optional. |
| `labels` | `AdminUsersLabels` | en / ar | |

## Examples

- **Read-only**: omit the callbacks; only the table and filters remain.
- **Server errors**: `onAddUser={async () => ({ fieldErrors: { email: "Already registered" } })}`.
- **Set a password up front**: `<AddUserDialog password ... />`; leave it empty to send an invitation instead.
- **Roles without a catalogue**: `<AddUserDialog roles={[]} ... />` switches to typed roles.

## Accessibility

- Row actions are in a labelled menu per row. Reset password, impersonate and disable ask first in an alert dialog.
- Results appear in a polite alert. Pass `labels` for other languages.

## RTL & i18n

Built-in English and Arabic. Emails are shown in an LTR isolate. Numbers and dates use the locale.

## Styling & tokens

Uses StatCard, DataTable and Badge styles. Extend with `className`.

## Do / Don't

- Do log impersonation on the server and show `AdminArea`'s banner.
- Do not let users disable themselves.
- Known limit: the role facet matches the first role only.

## Related

- [AdminArea](../admin-area/README.md)
- [DataTable](../data-table/README.md)
- [UserActionsMenu](../user-actions-menu/README.md): the same actions for one user, on a detail page.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-admin-admin-users--docs
