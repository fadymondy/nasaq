---
name: members-manager
title: MembersManager
category: collaboration
status: beta
summary: Members and roles of a workspace. A searchable table with an inline role select limited to the roles you can grant, an invite by email dialog, pending invites with resend and revoke, transfer of ownership and leave, with the last owner protected.
exports: [MembersManager, InviteMembersDialog, MembersManagerProps, MembersManagerLabels, InviteMembersDialogProps, MemberRoleOption, TeamMember, PendingInvite, InviteValues, MemberActionResult, InviteResult, canLeave, isLastOwner, ownerCount, removeBlock, roleChangeBlock, roleChoices]
related: [profile-card, admin-users, workspace-settings, invite-accept, data-table, workspace-switcher]
story: components-collaboration-members-manager
base-ui: [select, tabs, dialog, alert-dialog]
keywords: [members, team, roles, invite, invitation, pending, transfer ownership, leave, owner, workspace, permissions]
---

# MembersManager

The "Members" page of a workspace or team. People and their roles in a table, an invite dialog that takes
several email addresses and one role, the invites still waiting, and the two ownership moves: transfer to
someone else, or leave. The rules for the last owner live in pure functions, so the UI and your server agree.

## When to use

- A team or organisation settings page where owners and admins manage who is in.
- Any product with roles per workspace (owner, admin, member, viewer).

## When not to use

- Managing every user of the whole product as an operator: use [`AdminUsers`](../admin-users/README.md).
- Choosing which workspace you are in: use `WorkspaceSwitcher`.

## Import

```tsx
import { MembersManager } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<MembersManager
  members={members}
  invites={invites}
  roles={[
    { id: "owner", label: "Owner" },
    { id: "admin", label: "Admin", description: "Manage members and settings" },
    { id: "member", label: "Member" },
  ]}
  currentUserId="u1"
  grantableRoles={["admin", "member"]}
  onInvite={({ emails, role }) => api.invite(emails, role)}
  onChangeRole={(m, role) => api.setRole(m.id, role)}
  onRemove={(m) => api.remove(m.id)}
  onResendInvite={(i) => api.resend(i.id)}
  onRevokeInvite={(i) => api.revoke(i.id)}
  onTransferOwnership={(m) => api.transfer(m.id)}
  onLeave={() => api.leave()}
/>
```

## Anatomy

```
MembersManager           data-slot="members-manager"
├─ Alert                    outcome of the last action
├─ Tabs                     Members / Pending invites (the tab shows only when `invites` is passed) + Invite button
│  ├─ DataTable             member, role select, last active, joined; row actions transfer / remove
│  └─ list                  pending invites: email, role, expiry, Resend, Revoke
├─ leave row                data-slot="members-leave"
├─ InviteMembersDialog      emails as chips (TagInput) + role
└─ AlertDialog              confirms remove, transfer and leave
```

## API

### MembersManager

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `members` | `TeamMember[]` | required | `{ id, name, email, avatar?, role, joinedAt, lastActive? }`. |
| `invites` | `PendingInvite[]` | none | `{ id, email, role, invitedBy?, sentAt, expiresAt? }`. Passing it shows the Pending invites tab. |
| `roles` | `MemberRoleOption[]` | required | `{ id, label, description? }` in display order. |
| `currentUserId` | `string` | none | Marks "You"; that row cannot be removed here. |
| `grantableRoles` | `string[]` | every role except the owner role | The role ids the signed-in person may give. The select shows only these plus the member's current role. |
| `ownerRole` | `string` | `"owner"` | The role id that means owner. |
| `canManage` | `boolean` | `true` | `false` hides invite and locks every control. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `pageSize` | `number` | `8` | |
| `onInvite` | `(values: { emails, role }) => Promise<void \| { error?, emailsError? }>` | none | Shows the Invite button. |
| `onChangeRole` | `(member, role) => Promise<void \| { error? }>` | none | Turns the role cell into a select. |
| `onRemove` | `(member) => Promise<void \| { error? }>` | none | Row action. |
| `onResendInvite` / `onRevokeInvite` | `(invite) => Promise<void \| { error? }>` | none | |
| `onTransferOwnership` | `(member) => Promise<void \| { error? }>` | none | Row action, only for owners. |
| `onLeave` | `() => Promise<void \| { error? }>` | none | Shows the leave row. |
| `profile` | `(member) => PersonProfile | null | undefined` | none | Gives each member cell a profile hover card (hover, focus and tap). |
| `profileActions` | `{ onMessage?, onMention?, onViewProfile?, viewerTimeZone? }` | none | Quick actions and your time zone for those cards. |
| `labels` | `MembersManagerLabels` | en / ar | |

Resolve `{ error }` (or throw) to show a failure; the dialog stays open. You send back new `members` and
`invites`; the component keeps no copy.

### Rules (pure, exported)

`ownerCount`, `isLastOwner`, `roleChoices`, `roleChangeBlock`, `removeBlock`, `canLeave`.
The last owner cannot be demoted, removed or leave; the owner role is reachable only through transfer.

## Examples

- **Read-only member view**: `canManage={false}`.
- **An admin who can only grant member and viewer**: `grantableRoles={["member", "viewer"]}`; owners and admins show a plain badge.

## Accessibility

The role select has an accessible name per member. A locked role shows a focusable badge with a tooltip that
says why. Destructive actions ask in an alert dialog; outcomes are announced in a status alert.

## RTL & i18n

Built-in English and Arabic. Emails stay left-to-right; dates and counts use the locale digits.

## Styling & tokens

Built from Nasaq parts (`DataTable`, `Select`, `Badge`, `Alert`), so it follows the tokens. Extend with `className`.

## Do / Don't

- Do enforce the same rules on your server; the UI only hides the options.
- Do not offer the owner role in the invite dialog: ownership moves by transfer.

## Related

- [AdminUsers](../admin-users/README.md)
- [WorkspaceSettings](../workspace-settings/README.md)
- [InviteAccept](../invite-accept/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-collaboration-members-manager--docs
