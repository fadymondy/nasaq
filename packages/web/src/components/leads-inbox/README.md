---
name: leads-inbox
title: LeadsInbox
category: crm
status: beta
summary: Inquiries from your forms with where each came from (UTM, referrer, Google click id), a stage pipeline with counts, a detail panel with reply and canned replies, and conversion into a CRM contact.
exports: [LeadsInboxLabels, Lead, LeadConversion, LeadActionResult, LeadsInboxProps, LeadSourceBadge, LeadStatusBadge, LeadAttributionList, LeadsInbox]
related: [score-explainer, canned-replies, contact-list, inbox, entity-list]
story: components-crm-leads-inbox
keywords: [leads, inquiries, utm, gclid, attribution, pipeline, convert, crm, forms, inbox]
---

# LeadsInbox

What a marketing site collects, made workable: every inquiry with its source, a pipeline you can filter by stage, a
side panel to read, reply and move it along, and a convert step that turns it into a contact (and optionally a
company and a deal).

## When to use

- Triage of form submissions before they become CRM records.

## When not to use

- Two-way conversations: use [`Inbox`](../inbox/README.md).
- Existing customers: use [`ContactList`](../contact-list/README.md).

## Import

```tsx
import { LeadsInbox } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<LeadsInbox
  leads={leads}
  canned={snippets}
  onStatusChange={async (lead, status) => setStatus(lead.id, status)}
  onConvert={async (lead, conversion) => convert(lead.id, conversion)}
  onReply={async (lead, message) => reply(lead.id, message)}
/>
```

## Anatomy

- Pipeline strip: All, New, Contacted, Qualified, Converted, Spam, each with a count, filtering the list.
- `EntityList`: lead, source, stage, score (`ScoreBadge`), received. Row actions open from a context-click.
- Detail sheet: stage stepper, actions, message, attribution list (click id and landing page are copyable), reply composer with the canned picker.
- Convert dialog: contact name, optional company, optional deal.

Source is classified as Paid (a click id is always paid search), Organic, Social, Email, Referral or Direct.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `leads` | `Lead[]` | `{ id, name, email?, phone?, company?, message?, budget?, status, receivedAt, form?, attribution?, score?, contact?, companyRef?, deal? }`. |
| `canned` | `CannedSnippet[]` | Saved replies for the composer. |
| `onStatusChange` | `(lead, status) => Promise<...>` | Never called with `converted`. |
| `onConvert` | `(lead, { contactName, company?, deal? }) => Promise<...>` | Return the lead as `converted` afterwards. |
| `onReply` | `(lead, message) => Promise<...>` | Omit to hide the composer. |
| `defaultOpenId` | `string` | Start with a lead open. |
| `labels` | `Partial<LeadsInboxLabels>` | Override any string. |

Also `EntityList` props such as `loading`, `error`, `empty`, `view`. Small parts: `LeadSourceBadge`, `LeadStatusBadge`, `LeadAttributionList`.
Pure helpers: `classifyLeadSource`, `leadAttributionEntries`, `leadStatusCounts`, `canMoveLead`, `canConvertLead`, `leadPipelineStates`.

## Examples

Spam cannot be converted and a converted lead cannot be moved back, so its links to the contact and deal stay true.

## Accessibility

The pipeline is a group of toggle buttons with counts. The stepper marks the current step. Source and stage are words. The sheet traps focus.

## RTL & i18n

English and Arabic ship. Emails, phones, UTM values and URLs stay left-to-right. Stepper arrows mirror.

## Styling & tokens

Semantic tokens only.

## Do / Don't

- Do keep the raw UTM values visible, marketers check them.
- Don't convert spam.

## Related

- [`ScoreBadge`](../score-explainer/README.md)
- [`CannedRepliesManager`](../canned-replies/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-crm-leads-inbox--docs
