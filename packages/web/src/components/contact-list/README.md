---
name: contact-list
title: ContactList
category: crm
status: beta
summary: A list of contacts as a table or cards with avatar, company, stage, tags, owner and last activity, plus search, stage and tag and owner filters, bulk select, loading skeletons and an empty state.
exports: [ContactListLabels, ContactStage, Contact, ContactListProps, ContactList]
related: [entity-list, company-list, data-table, export-action]
story: components-crm-contact-list
keywords: [contacts, crm, people, leads, customers, address book, list, cards]
---

# ContactList

The contacts screen of a CRM: people with their company, lifecycle stage, tags, owner and last activity. It is
`EntityList` with the columns, cards and filters already set up, so you pass contacts and get both views.

## When to use

- A CRM or address book of people.
- Any list of people with a stage, tags and an owner.

## When not to use

- Companies: use [`CompanyList`](../company-list/README.md).
- A different kind of record: build on [`EntityList`](../entity-list/README.md).

## Import

```tsx
import { ContactList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ContactList, type Contact } from "@fadymondy/nasaq/web";

const contacts: Contact[] = [
  {
    id: "1",
    name: "Sara Ali",
    email: "sara@example.com",
    company: "Nasaq",
    stage: "customer",
    tags: [{ label: "VIP", hue: "violet" }],
    owner: { name: "Omar Nasser" },
    lastActivity: new Date(),
  },
];

export function Contacts() {
  return <ContactList contacts={contacts} onRowClick={(c) => console.log(c.id)} />;
}
```

## Anatomy

`ContactList` renders `EntityList` (see its anatomy). Columns: name (avatar, name, email), company, phone (hidden by
default), stage, tags, owner, last activity. Facets: stage, tags, owner, built from the data.

## API

`ContactListProps` extends the `EntityList` props (`view`, `defaultView`, `pageSize`, `selectable`, `toolbar`,
`bulkActions`, `rowActions`, `onRowClick`, `loading`, `error`, `onRetry`, `empty`, `defaultSort`, `className`).

| Prop | Type | Description |
| --- | --- | --- |
| `contacts` | `Contact[]` | `{ id, name, email?, phone?, avatar?, company?, jobTitle?, stage?, tags?, owner?, lastActivity? }`. |
| `label` | `string` | Accessible name. Default "Contacts" / "جهات الاتصال". |
| `labels` | `Partial<ContactListLabels>` | Override any string, including `stages`. |

`ContactStage` is `"lead" | "prospect" | "customer" | "churned"`.

## Examples

**Loading, then an error**

```tsx
<ContactList contacts={[]} loading />
<ContactList contacts={[]} error="Could not load contacts" onRetry={reload} />
```

**Bulk actions and export**

```tsx
<ContactList
  contacts={contacts}
  bulkActions={({ selectedRows }) => <Button onClick={() => assign(selectedRows)}>Assign owner</Button>}
  toolbar={({ filteredRows, selectedRows }) => (
    <ExportButton columns={cols} scopes={{ selected: selectedRows, filtered: filteredRows, all: contacts }} filename="contacts" />
  )}
/>
```

## Accessibility

Inherited from `EntityList`: a table or a card grid with one tab stop, named checkboxes ("Select Sara Ali"), a named
row menu, a live result count.

## RTL & i18n

- English and Arabic strings ship, including stage names. Names are your data; emails and phone numbers are set left-to-right.
- Relative times use the locale.

## Styling & tokens

- Stage uses `Status` tones; tags use `Badge variant="tag"` hues. Extend with `className`.

## Do / Don't

- Do give every contact a stable `id`.
- Do pass `loading` while fetching, so users see skeletons and not "no contacts".
- Don't sort or filter yourself; the list does it.

## Related

- [`EntityList`](../entity-list/README.md)
- [`CompanyList`](../company-list/README.md)
- [`ExportButton`](../export-action/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-crm-contact-list--docs
