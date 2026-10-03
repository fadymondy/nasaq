---
name: domains-manager
title: DomainsManager
category: server-tools
status: beta
summary: Custom domains for a site - add a domain, see its DNS check state, check again, make one primary, remove with a confirm, with the CNAME target to copy. Also DomainChips, compact chips with a +N overflow chip.
exports: [DomainsManagerLabels, DomainsResult, DomainRecord, DomainChipsProps, DomainChips, DomainsManagerProps, DomainsManager, DomainCheck, DomainSummary, isValidHostname, normalizeHost, splitOverflow, summarizeDomains]
related: [dns-management, proxy-hosts, cert-monitor, data-table]
story: components-server-tools-domains-manager
base-ui: [alert-dialog, field, popover]
keywords: [domain, custom domain, cname, dns check, verify, primary, chips]
---

# DomainsManager

Connect custom domains. The add form normalises what people paste (scheme, path, case), the CNAME target they must point at is shown with a copy button, and each domain row shows its check (verified, pending, checking, failed) with the reason when it failed. Row actions: check again, make primary, remove (with a confirm). `DomainChips` is the compact version for tables and cards: it shows up to three domains as chips and a "+N more" chip that opens the rest. It has no backend: your callbacks talk to the server and you pass the updated `domains` back.

## When to use

- A site or project settings page with custom domains.
- `DomainChips` inside a table cell that lists domains.

## When not to use

- Editing DNS records of a zone: use `DnsManagement`.
- Domain purchase or registrar flows.

## Import

```tsx
import { DomainsManager } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DomainsManager, type DomainRecord } from "@fadymondy/nasaq/web";

declare const domains: DomainRecord[];
declare const api: { add(h: string): Promise<void>; remove(id: string): Promise<void>; recheck(id: string): Promise<void> };

export const Domains = () => (
  <DomainsManager
    domains={domains}
    cnameTarget="edge.example.com"
    onAdd={(host) => api.add(host)}
    onRemove={(id) => api.remove(id)}
    onRecheck={(id) => api.recheck(id)}
  />
);
```

## Anatomy

```
DomainsManager               data-slot="domains-manager"
├─ summary Badge             "2 of 4 verified"
├─ add form                  hostname Input + Add
├─ CNAME target              value with CopyButton
└─ DataTable                 domain (+ Primary badge), check Status (+ error), added; row menu: Check again, Make primary, Remove

DomainChips                  data-slot="domain-chips"
├─ chip x up to 3            host + check state
└─ "+N" chip                 Popover with the rest
```

## API

**DomainsManager**: every `Card` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `domains` | `readonly DomainRecord[]` | required | `{ id, host, check, primary?, addedAt?, error? }`. Check: `verified`, `pending`, `checking`, `failed`. |
| `cnameTarget` | `string` | | The CNAME people point at. Shown with a copy button. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onAdd` | `(host) => Promise<void \| { error? }>` | required | Host is already normalised. Resolve `{ error }` to show it under the field. |
| `onRemove` | `(id) => Promise<...>` | required | Runs after the confirm. |
| `onRecheck` | `(id) => Promise<...>` | required | Run the DNS check again, then update `check`. |
| `onMakePrimary` | `(id) => Promise<...>` | | Shows Make primary. |
| `labels` | `Partial<DomainsManagerLabels>` | | Override any string. |

**DomainChips**: `domains` (`{ id, host, check, primary? }[]`), `max` (default 3), `labels`, and every `ul` prop.

**Helpers** (pure, tested): `normalizeHost`, `isValidHostname(host, { wildcard })`, `summarizeDomains`, `splitOverflow(items, max)` (never hides just one).

## Examples

**Chips in a table cell**

```tsx
import { DomainChips } from "@fadymondy/nasaq/web";

export const Cell = () => (
  <DomainChips domains={[{ id: "1", host: "shop.example.com", check: "verified", primary: true }]} />
);
```

## Accessibility

- A check state is an icon and a word. Errors from callbacks appear under the field with `role="alert"`.
- Remove opens an `AlertDialog`. The "+N more" chip is a button with a name and opens a `Popover` with the list.
- The row menu is also a button in the row, not only right-click.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Hostnames and the CNAME value stay left to right in their own isolate.

## Styling & tokens

- Built on `Card`, `DataTable`, `Status`, `Badge`, `Popover`, `AlertDialog` and `--nq-*` tokens. Target `[data-slot="domains-manager"]`.

## Do / Don't

- Do show why a check failed (`error`).
- Do tell people the CNAME target before they add the domain.
- Don't let people remove the primary domain without making another one primary first.
- Don't trust the input: validate the host again on the server.

## Related

- [`dns-management`](../dns-management/README.md)
- [`proxy-hosts`](../proxy-hosts/README.md)
- [`cert-monitor`](../cert-monitor/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-server-tools-domains-manager--docs
