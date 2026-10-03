---
name: contact-identities
title: ContactIdentities
category: crm
status: beta
summary: Every account one contact is reachable on (email, phone, WhatsApp, social) with a primary per channel, a link form that rejects duplicates, and a consent switch per channel.
exports: [ContactIdentitiesLabels, ContactIdentitiesLabelOverrides, useContactIdentitiesLabels, ContactIdentity, ContactConsent, ContactIdentityResult, ContactIdentitiesProps, ContactConsentStatusText, ContactIdentities]
related: [contact-merge, contact-list, profile-card]
story: components-crm-contact-identities
keywords: [contact, identities, accounts, channels, consent, opt in, whatsapp, email, phone, crm]
---

# ContactIdentities

One person, many accounts. It lists every address, number and handle a contact can be reached on, lets you link a new
one (rejecting one already on the list), choose a primary per channel, remove one, and record whether the person
agreed to be contacted on each channel.

## When to use

- The identity section of a contact record.
- Anywhere consent has to be visible next to the address it applies to.

## When not to use

- A single email field on a form: use `Field` and `Input`.
- Merging two duplicate contacts: use [`ContactMerge`](../contact-merge/README.md).

## Import

```tsx
import { ContactIdentities } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<ContactIdentities
  identities={[{ id: "1", channel: "email", value: "sara@example.com", primary: true }]}
  consent={{ email: { status: "granted", at: new Date() } }}
  onAdd={async (channel, value) => save(channel, value)}
  onRemove={async (identity) => remove(identity.id)}
  onSetPrimary={async (identity) => makePrimary(identity.id)}
  onConsentChange={async (channel, status) => setConsent(channel, status)}
/>
```

## Anatomy

- Identity list: channel badge (text), value (left-to-right), primary and verified marks. Row actions open from a context-click or the row menu.
- Link form: channel select and value, with inline validation.
- Consent: one switch per consent channel, with the status word, date and source.
- Remove confirmation dialog.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `identities` | `ContactIdentity[]` | `{ id, channel, value, label?, primary?, verified? }`. |
| `consent` | `Partial<Record<channel, ContactConsent>>` | `{ status: "granted" or "denied" or "unknown", at?, source? }`. |
| `channels` | `ContactChannel[]` | Channels offered when linking. |
| `consentChannels` | `ContactChannel[]` | Channels that get a consent switch. Default email, whatsapp, phone. |
| `onAdd` | `({ channel, value, label? }) => Promise<void or { error? }>` | Link an account. |
| `onRemove` / `onSetPrimary` | `(identity) => Promise<...>` | Row actions. |
| `onConsentChange` | `(channel, "granted" or "denied") => Promise<...>` | Switch flipped. |
| `readOnly` | `boolean` | Hide every action. |
| `labels` | `ContactIdentitiesLabelOverrides` | Override any string. |

Pure helpers: `normalizeContactIdentity`, `contactIdentityKey`, `validateContactIdentity`, `mergeContactConsent`, `sortContactIdentities`.

## Examples

**Read only**

```tsx
<ContactIdentities identities={identities} consent={consent} readOnly />
```

## Accessibility

Each switch is named with its channel. Errors use `role="alert"`. Status is a word, never colour alone. The remove
dialog returns focus to the row.

## RTL & i18n

English and Arabic ship. Emails, phone numbers and handles stay left-to-right. Channel names are text badges, so no
brand mark is redrawn.

## Styling & tokens

Semantic tokens only, logical Tailwind classes. Extend with `className`.

## Do / Don't

- Do treat consent as per channel: agreeing to email is not agreeing to WhatsApp.
- Don't pre-set consent to granted.

## Related

- [`ContactMerge`](../contact-merge/README.md)
- [`ContactList`](../contact-list/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-crm-contact-identities--docs
