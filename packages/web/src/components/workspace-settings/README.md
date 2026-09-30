---
name: workspace-settings
title: WorkspaceSettings
category: account
status: beta
summary: Create and manage workspaces. A first-run onboarding page, a create dialog for the workspace switcher, a list of your workspaces, and a settings page with rename, address, picture, leave and type-to-confirm delete.
exports: [CreateWorkspaceForm, WorkspaceOnboarding, CreateWorkspaceDialog, WorkspaceList, WorkspaceSettings, WorkspaceSettingsLabels, WorkspaceSubmitResult, WorkspaceValues, SlugCheck, CreateWorkspaceFormProps, WorkspaceOnboardingProps, CreateWorkspaceDialogProps, WorkspaceListItem, WorkspaceListProps, WorkspaceSettingsProps]
related: [members-manager, workspace-switcher, account-settings, auth-layout]
story: components-account-workspace-settings
base-ui: [dialog, alert-dialog]
keywords: [workspace, team, organisation, onboarding, create, rename, slug, leave, delete, switcher]
---

# WorkspaceSettings

Everything around the life of a workspace: the first one you create, the list of the ones you belong to, and the
page where an owner renames, re-addresses, leaves or deletes one.

## When to use

- First run of a signed-in person who has no workspace (`WorkspaceOnboarding`).
- The "Add workspace" item of `WorkspaceSwitcher` (`CreateWorkspaceDialog`).
- A workspace settings page (`WorkspaceSettings`) and a "your workspaces" page (`WorkspaceList`).

## When not to use

- Managing the people in it: use `MembersManager`.
- Personal account settings: use `AccountSettings`.

## Import

```tsx
import { WorkspaceOnboarding, WorkspaceSettings } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<WorkspaceOnboarding
  slugPrefix="nasaq.app/"
  checkSlug={(slug) => api.slugAvailable(slug)}
  onSubmit={(v) => api.createWorkspace(v)}
/>

<WorkspaceSettings
  workspace={{ name: "Sahab Studio", slug: "sahab" }}
  canLeave={!isLastOwner}
  onRename={(v) => api.rename(v)}
  onLeave={() => api.leave()}
  onDelete={() => api.remove()}
/>
```

## Anatomy

```
WorkspaceOnboarding (AuthLayout or bare)  -> CreateWorkspaceForm   data-slot="create-workspace-form"
CreateWorkspaceDialog                     -> Dialog + CreateWorkspaceForm
WorkspaceList                             data-slot="workspace-list"
WorkspaceSettings                         data-slot="workspace-settings"
├─ SettingsSection General   picture, name, address
├─ SettingsSection Leave     confirm dialog; disabled with a reason for the last owner
└─ DangerZone Delete         type the workspace name to confirm
```

## API

| Prop | Component | Description |
| --- | --- | --- |
| `onSubmit(values)` | form, onboarding, dialog | `{ name, slug }`; resolve `{ error?, fieldErrors? }` to show a failure. |
| `checkSlug(slug)` | form, onboarding, dialog, settings | `boolean` or `{ available, message? }`; debounced and only for a valid address. |
| `slugPrefix` | same | Left-to-right text before the address, for example `nasaq.app/`. |
| `showSlug` | form, dialog | Hide the address field. The dialog hides it by default. |
| `bare` | onboarding | Render without `AuthLayout`. |
| `workspaces`, `onOpen`, `onCreate` | list | Items are `{ id, name, slug?, logo?, role?, members?, current? }`. |
| `workspace`, `canEdit`, `canDelete`, `canLeave` | settings | |
| `onRename`, `logo`, `onLeave`, `onDelete` | settings | Each section shows only when its handler is passed. |
| `labels` | all | English and Arabic built in. |

The address follows the name until edited; an Arabic-only name gives an empty address the person fills in.

## Examples

- **Switcher**: `<CreateWorkspaceDialog open={open} onOpenChange={setOpen} onSubmit={create} />` opened from `WorkspaceSwitcher`'s `onCreate`.

## Accessibility

Errors are tied to their fields; availability is announced in a status region and never by colour alone. Leave and
delete are alert dialogs.

## RTL & i18n

Addresses and prefixes are always left-to-right. The leave icon mirrors. Counts use locale digits.

## Styling & tokens

Built on `SettingsSection`, `DangerZone`, `Field` and `InputGroup`; follows the tokens.

## Do / Don't

- Do verify the address on the server; the check here is a hint.
- Do not delete without the typed confirmation.

## Related

- [MembersManager](../members-manager/README.md)
- [AccountSettings](../account-settings/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-workspace-settings--docs
