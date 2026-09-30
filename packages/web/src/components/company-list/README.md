---
name: company-list
title: CompanyList
category: crm
status: beta
summary: A list of companies as a table or cards with logo, domain, industry, location, contacts count, tags, owner and last activity, plus search, industry and tag and owner filters, bulk select, loading skeletons and an empty state.
exports: [CompanyListLabels, Company, CompanyListProps, CompanyList]
related: [entity-list, contact-list, data-table, export-action]
story: components-crm-company-list
keywords: [companies, organizations, accounts, crm, b2b, list, cards, logo]
---

# CompanyList

The companies (accounts) screen of a CRM. It is `EntityList` with the columns, cards and filters set up: a square
logo, the domain, industry, location, how many contacts the company has, tags, owner and last activity.

## When to use

- A CRM list of organisations, clients or accounts.

## When not to use

- People: use [`ContactList`](../contact-list/README.md).
- Anything else: build on [`EntityList`](../entity-list/README.md).

## Import

```tsx
import { CompanyList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CompanyList, type Company } from "@fadymondy/nasaq/web";

const companies: Company[] = [
  { id: "1", name: "Acme", domain: "acme.com", industry: "Manufacturing", location: "Riyadh", contactsCount: 12, owner: { name: "Omar Nasser" }, lastActivity: new Date() },
];

export function Companies() {
  return <CompanyList companies={companies} />;
}
```

## Anatomy

`CompanyList` renders `EntityList`. Columns: name (logo, name, domain), industry, location (hidden by default),
contacts, tags, owner, last activity. Facets: industry, tags, owner.

## API

`CompanyListProps` extends the `EntityList` props (`view`, `pageSize`, `selectable`, `toolbar`, `bulkActions`,
`rowActions`, `onRowClick`, `loading`, `error`, `onRetry`, `empty`, `defaultSort`, `className`).

| Prop | Type | Description |
| --- | --- | --- |
| `companies` | `Company[]` | `{ id, name, domain?, logo?, industry?, location?, contactsCount, tags?, owner?, lastActivity? }`. |
| `label` | `string` | Accessible name. Default "Companies" / "الشركات". |
| `labels` | `Partial<CompanyListLabels>` | Override any string. |

## Examples

**Logos**

```tsx
<CompanyList companies={companies.map((c) => ({ ...c, logo: `/logos/${c.id}.svg` }))} />
```

Use the company's own logo file. Without one the list shows initials on a square tile; it never draws a brand mark.

## Accessibility

Inherited from `EntityList`: table or card grid, named checkboxes and menus, a live result count.

## RTL & i18n

- English and Arabic strings ship. Domains are set left-to-right in `<bdi dir="ltr">`; counts and times follow the locale.

## Styling & tokens

- The logo is a square `Avatar` (`shape="square"`), so wide logos are not cropped to a circle.

## Do / Don't

- Do pass the domain without a scheme (`acme.com`).
- Don't substitute another company's logo when yours is missing; leave `logo` empty.

## Related

- [`EntityList`](../entity-list/README.md)
- [`ContactList`](../contact-list/README.md)
- [`ExportButton`](../export-action/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-crm-company-list--docs
