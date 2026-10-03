---
name: proxy-hosts
title: ProxyHosts
category: server-tools
status: beta
summary: A reverse-proxy host editor - a table of hosts with upstream, TLS mode and websockets, an enabled switch per host, and a dialog to add or edit one. Domains reuse DomainChips.
exports: [ProxyHostsLabels, ProxyHostsResult, ProxyHost, ProxyHostInput, ProxyHostsProps, ProxyHosts, isValidUpstream, parseHosts, ProxyHostError, TlsMode, tlsModeAllowsWebsockets, validateProxyHost]
related: [domains-manager, network-rules, cert-monitor, data-table]
story: components-server-tools-proxy-hosts
base-ui: [dialog, alert-dialog, field, select, switch]
keywords: [reverse proxy, proxy host, upstream, tls, websockets, nginx, ssl]
---

# ProxyHosts

List and edit reverse-proxy hosts. Each row shows the domains it serves (with a "+N" chip when there are many), the upstream URL, the TLS mode (off, automatic, custom, passthrough), whether websockets are on, its status and an enabled switch. Add and edit share one dialog with validation for the domains and the upstream; delete asks first. Passthrough TLS hands the connection over untouched, so websockets are turned off. It has no backend: your callbacks save and you pass the updated `hosts` back.

## When to use

- A hosting panel or self-hosted proxy admin.
- Routing several domains to internal apps.

## When not to use

- Load balancing pools or health checks per upstream.
- Editing DNS: use `DnsManagement`.

## Import

```tsx
import { ProxyHosts } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProxyHosts, type ProxyHost } from "@fadymondy/nasaq/web";

declare const hosts: ProxyHost[];
declare const api: { save(input: unknown, id?: string): Promise<void>; remove(id: string): Promise<void> };

export const Proxy = () => (
  <ProxyHosts hosts={hosts} onSave={(input, id) => api.save(input, id)} onDelete={(id) => api.remove(id)} />
);
```

## Anatomy

```
ProxyHosts                   data-slot="proxy-hosts"
├─ toolbar                   search, Add proxy host
├─ DataTable                 domains (DomainChips), upstream, TLS Badge, websockets, Status, enabled Switch; row menu: Edit, Delete
├─ host Dialog               domains Textarea, upstream Input, TLS Select, websockets and enabled Switches
└─ AlertDialog               delete confirm
```

## API

**ProxyHosts**: every `div` prop except `children` and `onToggle`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `hosts` | `readonly ProxyHost[]` | required | `{ id, hosts, upstream, tlsMode, websockets, enabled, status? }`. TLS: `off`, `auto`, `custom`, `passthrough`. Status: `online`, `offline`, `unknown`. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onSave` | `(input: ProxyHostInput, id?) => Promise<void \| { error? }>` | required | Create (no `id`) or update. `{ error }` shows in the dialog. |
| `onDelete` | `(id) => Promise<...>` | required | Runs after the confirm. |
| `onToggle` | `(id, enabled) => Promise<...>` | | Shows the enabled switch in the table. |
| `labels` | `Partial<ProxyHostsLabels>` | | Override any string. |

**Helpers** (pure, tested): `isValidUpstream` (needs `http://` or `https://`), `parseHosts`, `validateProxyHost`, `tlsModeAllowsWebsockets`.

## Examples

**Validate before sending**

```tsx
import { parseHosts, validateProxyHost } from "@fadymondy/nasaq/web";

const errors = validateProxyHost({ hosts: parseHosts("a.example.com, b.example.com"), upstream: "http://10.0.0.5:3000" });
// [] when valid, otherwise ["hosts"] and/or ["upstream"]
```

## Accessibility

- The enabled switch has a name that includes the host. Status is an icon and a word.
- The dialog traps focus and returns it; invalid fields are described by their message.
- The row menu is also a button in the row.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Hostnames and upstream URLs stay left to right.

## Styling & tokens

- Built on `DataTable`, `Dialog`, `Switch`, `Select`, `Badge` and `--nq-*` tokens. Target `[data-slot="proxy-hosts"]`.

## Do / Don't

- Do validate the upstream on the server too.
- Do show offline hosts clearly: they are the ones people look for.
- Don't enable websockets for passthrough hosts: it is disabled for you.
- Don't delete without the confirm.

## Related

- [`domains-manager`](../domains-manager/README.md)
- [`network-rules`](../network-rules/README.md)
- [`cert-monitor`](../cert-monitor/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-server-tools-proxy-hosts--docs
