---
name: user-actions-menu
title: UserActionsMenu
category: admin
status: beta
summary: "The admin actions for one account: edit email, roles and permissions, impersonate, set a password or send a reset link, send a sign-in link, and delete. A menu or a toolbar that owns its dialogs."
exports: [UserActionsMenu, UserActionsMenuProps, UserActionsMenuLabels, UserActionsTarget, UserEditValues, UserActionResult, UserLinkResult]
related: [admin-users, dropdown-menu, alert-dialog, copy-button, tag-input, password-input]
story: components-admin-user-actions-menu
base-ui: [menu, dialog, alert-dialog]
keywords: [admin, user, actions, impersonate, reset password, magic link, sign-in link, delete, roles, permissions]
---

# UserActionsMenu

Everything an admin does to one account, behind a "…" button or as a toolbar. Each action appears only when
you pass its handler. The component opens and closes its own dialogs: an edit form, a password dialog,
confirmations for impersonate and delete, and a result dialog that shows a link with a copy button.

## When to use

- A user detail page, or a custom users list that is not `AdminUsers`.
- When the server can return a one-time link (password reset, sign-in) that the admin may need to pass on.

## When not to use

- The full users screen: use `AdminUsers`, which has its own row actions.
- A user acting on their own account: use `AccountSettings`.

## Import

```tsx
import { UserActionsMenu } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<UserActionsMenu
  user={{ name: user.name, email: user.email, roles: user.roles, permissions: user.permissions }}
  roleSuggestions={["admin", "editor", "viewer"]}
  onEdit={(values) => api.updateUser(user.id, values)}
  onImpersonate={() => api.impersonate(user.id)}
  onSetPassword={(password) => api.setPassword(user.id, password)}
  onSendResetLink={() => api.resetLink(user.id)}       // → { link?, emailed? }
  onSendMagicLink={() => api.magicLink(user.id)}       // → { link?, emailed? }
  onDelete={() => api.deleteUser(user.id)}
/>
```

## Anatomy

```
UserActionsMenu        data-slot="user-actions-menu" data-variant="menu|toolbar"
├─ trigger             icon button ("Actions for {name}") or a row of buttons
├─ items               data-action="edit|impersonate|password|magic-link|delete"
├─ edit dialog         email, roles (TagInput), permissions (TagInput, when `user.permissions` is set)
├─ password dialog     new password with strength meter, "Send reset link"
├─ link dialog         pending → emailed notice and/or CopyField, or "no link returned"
└─ alert dialog        impersonate (audit warning) or delete (danger)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `user` | `UserActionsTarget` | required | `{ name?, email, roles?, permissions? }`. Omit `permissions` to hide that field. |
| `variant` | `"menu" \| "toolbar"` | `"menu"` | |
| `onEdit` | `(values: UserEditValues) => UserActionResult` | none | `{ email, roles, permissions }`. |
| `onImpersonate` | `() => UserActionResult` | none | Confirmed first. |
| `onSetPassword` | `(password: string) => UserActionResult` | none | Adds the password field. |
| `onSendResetLink` | `() => UserLinkResult` | none | Adds "Send reset link" to the password dialog. |
| `onSendMagicLink` | `() => UserLinkResult` | none | |
| `onDelete` | `() => UserActionResult` | none | Confirmed first, after a separator. |
| `roleSuggestions`, `permissionSuggestions` | `string[]` | none | Offered while typing. |
| `minPasswordLength` | `number` | `8` | |
| `labels` | `Partial<UserActionsMenuLabels>` | en / ar | |

`UserActionResult` is nothing on success or `{ error }`. `UserLinkResult` adds `link` and `emailed`. A thrown
error shows a generic message. Errors stay inside the open dialog; nothing depends on a toaster.

## Accessibility

- The trigger has an accessible name with the user's name. Menu keyboard support comes from Base UI.
- Impersonate and delete use an alert dialog. Errors use `role="alert"`; the link dialog is a `status` region
  with `aria-busy` while the link is created.
- Fields use `Field` labels and errors; the password field uses `autocomplete="new-password"`.

## RTL & i18n

Built-in English and Arabic from the Nasaq locale. Emails, links and permissions stay LTR.

## Styling & tokens

Dialogs, buttons and alerts use their own tokens. The delete action uses the danger tone. Extend the root
with `className`.

## Do / Don't

- Do record impersonation and password changes in your audit log on the server.
- Do return the link only when the admin may share it; prefer `emailed: true`.
- Don't offer delete for the signed-in admin's own account.

## Related

- [AdminUsers](../admin-users/README.md)
- [DropdownMenu](../dropdown-menu/README.md)
- [CopyButton](../copy-button/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-admin-user-actions-menu--docs
