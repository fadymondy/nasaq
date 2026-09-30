---
name: share-action
title: ShareButton
category: actions
status: beta
summary: A share button and dialog with copy link, email invites with a role, link access of restricted or anyone with the link, link expiry, the people who already have access and the native Web Share sheet where the browser offers it.
exports: [ShareLinkAccess, ShareActionLabels, ShareRole, SharePerson, ShareLinkSettings, ShareActionProps, ShareDialogProps, ShareDialog, ShareButton]
related: [export-action, copy-button, tag-input, dialog]
story: components-actions-share-button
keywords: [share, invite, link, permissions, access, expiry, email, web share, collaborators]
---

# ShareButton

The "Share" action of a document, project or board. One dialog holds everything: invite people by email with a
role, see and change who already has access, choose whether the link is restricted or open to anyone, set an
expiry, copy the link, and hand it to the phone's native share sheet when there is one.

## When to use

- Giving people access to a resource with roles.
- Producing a link with an access level and an expiry.
- Sharing a URL from a mobile browser through the system sheet.

## When not to use

- Only copying a value: use [`CopyButton`](../copy-button/README.md).
- Taking data out as a file: use [`ExportButton`](../export-action/README.md).
- Managing a whole team: build a members page; this dialog is per resource.

## Import

```tsx
import { ShareButton } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ShareButton } from "@fadymondy/nasaq/web";

export function Header() {
  return (
    <ShareButton
      url="https://app.example.com/docs/q3-plan"
      title="Q3 plan"
      onInvite={async (emails, role) => {
        await api.invite(emails, role);
      }}
    />
  );
}

declare const api: { invite(emails: string[], role: string): Promise<void> };
```

## Anatomy

```
ShareButton                    data-slot="share-button"
└─ ShareDialog                 data-slot="share-dialog"
   ├─ Invite people            TagInput of emails + role Select + Send
   ├─ People with access       avatar, name, email, role Select, remove
   ├─ Link access              Restricted / Anyone with the link, link role, expiry
   └─ Link                     CopyField, "Share via…" (Web Share), Email
```

## API

**ShareButton** (`ShareActionProps`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | `string` | | The link. |
| `title` / `text` | `string` | | For the native share sheet and the email. |
| `roles` | `{ value, label }[]` | view, comment, edit | Roles to choose from. |
| `defaultRole` | `string` | first role | The role new invitees start with. |
| `people` | `SharePerson[]` | `[]` | Who has access. `owner: true` locks a row. |
| `onInvite` | `(emails, role) => void \| Promise` | | Enables the invite section. Reject to show an error. |
| `onRoleChange` / `onRemove` | `(person, role)` / `(person)` | | Change or remove a person. |
| `linkAccess` | `boolean` | `true` | Show the link access section. |
| `access` / `defaultAccess` | `"restricted" \| "anyone"` | `"restricted"` | Link access level. |
| `linkRole` / `defaultLinkRole` | `string` | first role | Role given through the link. |
| `expiry` / `defaultExpiry` | `"never" \| "1d" \| "7d" \| "30d"` | `"never"` | Link expiry. |
| `onLinkChange` | `(settings) => void` | | `{ access, role, expiry, expiresAt }` after any change. |
| `onCopy` / `onShared` | | | After copying, or after the native sheet finished. |
| `mailto` | `boolean` | `true` | Show the Email button. |
| `children` / `variant` / `size` / `disabled` / `className` | | `Share`, `secondary`, `sm` | The trigger. |
| `labels` | `Partial<ShareActionLabels>` | | Override any string. |

**ShareDialog** takes the same props plus `open` and `onOpenChange`.

**Helpers** (pure): `expiryToDate`, `isEmail`, `parseEmails`, `withExpiry`, `mailtoLink`.

## Examples

**Persist link settings**

```tsx
<ShareButton
  url={url}
  defaultAccess="anyone"
  defaultExpiry="7d"
  onLinkChange={({ access, role, expiresAt }) => api.saveLink({ access, role, expiresAt })}
/>
```

**Existing collaborators**

```tsx
<ShareButton
  url={url}
  people={[
    { id: "1", name: "Sara Ali", email: "sara@example.com", role: "owner", owner: true },
    { id: "2", name: "Omar Nasser", email: "omar@example.com", role: "editor" },
  ]}
  onRoleChange={(person, role) => api.setRole(person.id, role)}
  onRemove={(person) => api.remove(person.id)}
/>
```

## Accessibility

- The dialog traps focus and closes with Escape. Every control has a name: the role selects say whose role they set.
- Invite results and errors are announced (`role="status"` / `role="alert"`); a bad email explains itself in the tag field.
- Copying announces "Copied" through the copy button.
- "Share via…" only renders where `navigator.share` exists, after mount, so server and client markup match.

## RTL & i18n

- English and Arabic strings ship; roles are yours to translate (the defaults are translated).
- Emails and the link are always left-to-right (`<bdi dir="ltr">`, an LTR field), also in Arabic.
- Layout uses logical spacing; nothing needs mirroring.

## Styling & tokens

- Composed from `Dialog`, `Select`, `TagInput`, `CopyField`, `Avatar`, `Alert` and `Button`. Use their tokens; extend with `className`.
- No third-party brand buttons are drawn. Sharing goes through the system sheet and `mailto:`.

## Do / Don't

- Do check permissions on the server; the dialog only collects intent.
- Do reject from `onInvite` with a readable message.
- Don't treat the `?expires=` query as security; enforce expiry on the server.
- Don't rely on Web Share on desktop; the copy field is the fallback.

## Related

- [`ExportButton`](../export-action/README.md)
- [`CopyButton`](../copy-button/README.md)
- [`TagInput`](../tag-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-actions-share-button--docs
