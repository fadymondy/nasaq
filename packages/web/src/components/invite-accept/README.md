---
name: invite-accept
title: InviteAccept
category: auth
status: beta
summary: The public accept-invitation page. It covers a valid invitation with accept and decline or sign in first, an expired one, one sent to another account, one already used and one that was cancelled.
exports: [InviteAccept, InviteAcceptProps, InviteAcceptLabels, InviteState, InviteWorkspace]
related: [auth-layout, members-manager, oauth-consent, login-form]
story: components-auth-invite-accept
base-ui: []
keywords: [invite, invitation, accept, join, workspace, team, expired, revoked, wrong account, link]
---

# InviteAccept

What a person sees after clicking the link in an invitation email. You resolve the link on the server and pass
the outcome as `state`; the page shows the right message and the right next step for it.

## When to use

- The landing page of an invitation link, signed in or not.

## When not to use

- Asking for consent for a third-party app: use `OAuthConsent`.
- Inviting people (the sender side): use `MembersManager`.

## Import

```tsx
import { InviteAccept } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<InviteAccept
  state="valid"
  workspace={{ name: "Sahab Studio", meta: "12 members" }}
  invitedBy={{ name: "Sara Alharbi" }}
  role="Admin"
  inviteEmail="omar@example.com"
  account={{ name: "Omar Khalid", email: "omar@example.com" }}
  onAccept={() => api.acceptInvite(token)}
  onDecline={() => api.declineInvite(token)}
/>
```

## Anatomy

```
InviteAccept (AuthLayout, or bare)   data-slot="invite-accept", data-state
├─ state icon                           for every state except valid
├─ workspace row                        logo, name, meta, role badge
├─ details                              role, invited email, expiry (valid)
└─ actions                              by state
```

## States

| `state` | Shows | Actions |
| --- | --- | --- |
| `valid`, signed in | workspace, role, expiry, who you are | Accept, Decline |
| `valid`, signed out (`account` empty) | the invited email | `onSignIn`, `onSignUp` |
| `expired` | how to get a new one | `onRequestNew`; a success message after |
| `wrong-account` | invited email versus signed-in email | `onSwitchAccount` |
| `already-accepted` | you are already a member | `onOpenWorkspace` |
| `revoked` | the inviter cancelled it | `onGoHome` |

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `state` | `InviteState` | required | One of the five outcomes. |
| `workspace` | `{ name, logo?, meta? }` | required | |
| `invitedBy` | `{ name, email? }` | none | Names the sender in the copy. |
| `role` | `string` | none | The role label the person gets. |
| `inviteEmail` | `string` | none | Where the invitation was sent. Always left-to-right. |
| `expiresAt` | `string \| number \| Date` | none | |
| `account` | `{ name, email, avatar? } \| null` | none | The signed-in account. |
| `onAccept` | `() => Promise<void \| { error? }>` | required | |
| `onDecline`, `onRequestNew` | same shape | none | |
| `onSignIn`, `onSignUp`, `onOpenWorkspace`, `onGoHome` | `() => void` | none | |
| `onSwitchAccount` | `() => void \| Promise<void>` | none | |
| `bare` | `boolean` | `false` | Render without `AuthLayout`. |
| `labels` | `InviteAcceptLabels` | en / ar | |

The rest are `AuthLayout` props (`variant`, `mark`, `panel`, `footer`).

## Examples

- **In your own layout**: `<InviteAccept bare ... />`.
- **Split screen**: `<InviteAccept variant="split" panel={<BrandPanel />} ... />`.

## Accessibility

The page heading is the `h1`. Failures from your callbacks show in a `role="alert"`. Each blocked state has an
icon and a sentence, so the meaning never rests on colour.

## RTL & i18n

Built-in English and Arabic. Emails are isolated inside sentences and stay left-to-right.

## Styling & tokens

Status icons use the `nq-warning`, `nq-success` and `nq-danger` soft tokens. The frame is `AuthLayout`.

## Do / Don't

- Do check the token on the server; this page only presents the result.
- Do not pass an invited email you would not show to anyone who holds the link.

## Related

- [AuthLayout](../auth-layout/README.md)
- [MembersManager](../members-manager/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-auth-invite-accept--docs
