---
name: dns-management
title: DnsManagement
category: server-tools
status: beta
summary: A DNS zone editor with a searchable records table (A, AAAA, CNAME, MX, TXT and more), an add and edit form with type-aware validation, TTL choices, a proxy toggle and confirmed delete.
exports: [DnsManagement, DnsManagementProps, DnsManagementLabels, DnsRecord, DnsRecordInput, DEFAULT_TTLS, DNS_TYPES, DnsDraft, DnsErrorCode, DnsErrors, DnsType, fqdn, formatTtl, isHostname, isIPv4, isIPv6, isProxiable, needsPriority, relativeName, TTL_AUTO, TtlUnits, validateRecord]
related: [data-table, dialog, alert-dialog, switch, api-keys]
story: components-server-tools-dns-management
base-ui: [dialog, alert-dialog, select, switch, field, input]
keywords: [dns, records, zone, a record, cname, mx, txt, ttl, proxy, cloudflare, domain]
---

# DnsManagement

The records of one DNS zone. A `DataTable` with search, a type filter and paging; an add and edit dialog that
checks the value against the type; a proxy switch in each row; and a confirmed delete. It does not talk to any
DNS provider: your callbacks do, and you pass the updated `records` back.

## When to use

- A domain settings page for a product that manages customer or own DNS.
- Anywhere people edit A, AAAA, CNAME, MX, TXT, NS, SRV or CAA records.

## When not to use

- Registering domains or checking ownership: that is a different flow.
- Editing zone files as text.

## Import

```tsx
import { DnsManagement } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DnsManagement, type DnsRecord } from "@fadymondy/nasaq/web";

declare const records: DnsRecord[];
declare const api: { save(zone: string, input: unknown): Promise<void>; remove(id: string): Promise<void> };

export function Dns() {
  return (
    <DnsManagement
      zone="example.com"
      records={records}
      onSave={(input) => api.save("example.com", input)}
      onDelete={(id) => api.remove(id)}
    />
  );
}
```

## Anatomy

```
DnsManagement                   data-slot="dns-management"
├─ toolbar                      search, type facet filter, Add record
├─ DataTable                    type, name, content, TTL, proxy, row menu (Edit, Delete)
├─ pagination
├─ record dialog                data-slot="dns-record-form": type, name, content, priority, TTL, proxy, comment
└─ delete AlertDialog
```

## API

**DnsManagement**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `zone` | `string` | required | The domain, such as `example.com`. Names are shown relative to it. |
| `records` | `readonly DnsRecord[]` | required | `{ id, type, name, content, ttl, proxied?, priority?, comment? }`. TTL is seconds, `1` is Auto. |
| `types` | `readonly string[]` | A, AAAA, CNAME, MX, TXT, NS, SRV, CAA | Types offered in the form. |
| `ttlOptions` | `readonly number[]` | Auto, 1 min, 5 min, 15 min, 1 h, 4 h, 1 day | TTL choices. |
| `proxy` | `boolean` | `true` | `false` hides the proxy column and switch. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `onSave` | `(input: DnsRecordInput) => Promise<void \| { error? }>` | required | Add (no `id`) or edit (with `id`). `{ error }` shows in the form. |
| `onDelete` | `(id) => Promise<void \| { error? }>` | | Shows Delete. |
| `onToggleProxy` | `(id, proxied) => Promise<void \| { error? }>` | | Flip the proxy from the table. Optimistic, rolled back on error. |
| `labels` | `Partial<DnsManagementLabels>` | | Override any string. |

**Helpers** (pure, tested): `validateRecord(draft, zone, existing, editingId?)`, `isIPv4`, `isIPv6`, `isHostname`,
`isProxiable`, `needsPriority`, `relativeName`, `fqdn`, `formatTtl`.

## Examples

**Zone without a proxy**

```tsx
import { DnsManagement, type DnsRecord } from "@fadymondy/nasaq/web";

declare const records: DnsRecord[];

export const NoProxy = () => <DnsManagement zone="example.org" records={records} proxy={false} onSave={async () => {}} />;
```

## Accessibility

- The table is a real `<table>` with sortable headers. Dialogs trap focus and return it; delete is an `AlertDialog`.
- Field errors are tied to the field and announced. The proxy switch has a label.
- Proxy state is a word ("Proxied", "DNS only"), not colour alone.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Names, values, IPs and TTL numbers are `dir="ltr"`.

## Styling & tokens

- Built on `DataTable`, `Dialog`, `AlertDialog`, `Switch`, `Badge` and `--nq-*` tokens.
- Target `[data-slot="dns-management"]`.

## Do / Don't

- Do validate again on your server. The form only catches typing mistakes.
- Do return `{ error }` for provider errors so they show next to the form.
- Don't turn on the proxy for MX, TXT or other types that cannot be proxied. The switch is off for them.
- Don't hand over a zone with thousands of records without server paging.

## Related

- [`DataTable`](../data-table/README.md)
- [`AlertDialog`](../alert-dialog/README.md)
- [`Switch`](../switch/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-server-tools-dns-management--docs
