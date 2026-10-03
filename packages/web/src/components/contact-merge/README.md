---
name: contact-merge
title: ContactMerge
category: crm
status: beta
summary: Merge duplicate contacts by choosing a survivor, then choosing which value wins for every field that differs, with a live result summary and a confirmation step.
exports: [ContactMergeLabels, ContactMergeLabelOverrides, ContactMergeRecord, ContactMergeResult, ContactMergeProps, ContactMerge]
related: [contact-identities, contact-list, entity-list]
story: components-crm-contact-merge
keywords: [merge, duplicates, dedupe, contacts, survivor, crm, conflict]
---

# ContactMerge

Two or more records for the same person. Pick the one that survives, then settle each field where they disagree.
Fields that hold a list (tags, emails) can be combined. A sticky summary shows what the merged contact will be and how
much moves over, and nothing happens until the person confirms.

## When to use

- A "merge these contacts" flow opened from a duplicate finder or a selection in a list.

## When not to use

- Deleting a duplicate outright: use a confirm dialog.
- Editing one contact: use a form.

## Import

```tsx
import { ContactMerge } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<ContactMerge
  records={[
    { id: "a", name: "Sara Ali", values: { email: "sara@a.com", phone: "0501" } },
    { id: "b", name: "Sara A.", values: { email: "sara@b.com", phone: "0501" } },
  ]}
  fields={[{ id: "email", label: "Email", ltr: true }, { id: "phone", label: "Phone", ltr: true }]}
  onMerge={async (outcome) => merge(outcome)}
/>
```

## Anatomy

1. Survivor choice, one card per record.
2. One radio group per field that differs (list fields add "Combine all").
3. A collapsible list of fields that are the same everywhere.
4. Result panel: final values, identities and activity that move over, consent (the most restrictive wins).
5. Confirmation dialog.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `records` | `ContactMergeRecord[]` | `{ id, name, avatar?, values, createdAt?, stats?, identities?, consent? }`. At least two. |
| `fields` | `ContactMergeField[]` | `{ id, label, multi?, ltr? }`. Default: name, email, phone, company, job title, owner, tags. |
| `defaultSurvivorId` | `string` | Default: the first record. |
| `onMerge` | `(outcome) => Promise<void or { error? }>` | `outcome` holds the survivor id, absorbed ids and resolved values. |
| `onCancel` | `() => void` | Shows a cancel button. |
| `labels` | `ContactMergeLabelOverrides` | Override any string. |

Pure helpers: `resolveContactMerge`, `defaultContactMergeChoices`, `resolveContactMergeValue`, `contactMergeConflict`, `combineMergeLists`, `rebaseContactMergeChoices`, `isEmptyMergeValue`.

## Examples

Changing the survivor keeps every choice you already made and only re-defaults fields that no longer apply.

## Accessibility

Radio groups are named by field. The confirmation is an alert dialog. Errors from `onMerge` show in an alert.

## RTL & i18n

English and Arabic ship. Values marked `ltr` (emails, phones) stay left-to-right.

## Styling & tokens

Semantic tokens only. Extend with `className`.

## Do / Don't

- Do show what will be lost before the person confirms.
- Don't auto-merge on similarity alone.

## Related

- [`ContactIdentities`](../contact-identities/README.md)
- [`ContactList`](../contact-list/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-crm-contact-merge--docs
