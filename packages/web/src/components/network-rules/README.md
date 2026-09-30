---
name: network-rules
title: NetworkRules
category: developer
status: beta
summary: A network rules editor with a firewall tab (allow or deny, protocol, port, source) and an HTTP rules tab (redirects, headers, basic auth, IP allow and deny). Edits are staged until Apply, with move, undo and a lockout warning.
exports: [NetworkRulesLabels, NetworkRulesResult, NetworkRulesProps, NetworkRules, diffRules, FirewallAction, FirewallError, FirewallProtocol, FirewallRule, formatProtocolPort, HttpError, HttpRule, HttpRuleType, isValidCidr, isValidPort, lockoutRisk, RuleDiff, RuleState, rulesToApply, validateFirewallRule, validateHttpRule]
related: [server-card, proxy-hosts, data-table, domains-manager, alert]
story: components-developer-network-rules
base-ui: [tabs, dialog, field, select]
keywords: [firewall, network, rules, allow, deny, port, cidr, redirect, headers, basic auth, ip allow]
---

# NetworkRules

Edit the firewall and HTTP rules of a server. Rules run top to bottom and the first match wins, so order matters; each row can be edited, moved up or down, or removed (from the row menu or right-click). Nothing is sent until Apply: changes are staged, added and changed rows are marked, removed rows stay visible struck through with Undo, and Discard drops the lot. A warning shows when a rule would deny SSH before an allow. It has no backend: `onApplyFirewall` receives the whole staged list and you pass the new `firewall` back.

## When to use

- A server or site security page.
- Anywhere rules are an ordered list that should only go live when the user says so.

## When not to use

- Rules with conditions and actions (if this, then that): use `RuleBuilder`.
- A live traffic log: use `LogViewer`.

## Import

```tsx
import { NetworkRules } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { NetworkRules, type FirewallRule } from "@fadymondy/nasaq/web";

declare const firewall: FirewallRule[];
declare const api: { applyFirewall(rules: FirewallRule[]): Promise<void> };

export const Network = () => <NetworkRules firewall={firewall} onApplyFirewall={(rules) => api.applyFirewall(rules)} />;
```

## Anatomy

```
NetworkRules                 data-slot="network-rules"
├─ Tabs                      Firewall, HTTP rules (only when `http` is given)
├─ DataTable                 #, action, protocol and port, source, note, state; row menu: Edit, Move up, Move down, Remove / Undo
├─ Add rule                  opens the rule Dialog
├─ lockout Alert             when an SSH deny comes before an allow
└─ apply bar                 "N changes staged", Discard, Apply changes
```

## API

**NetworkRules**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `firewall` | `readonly FirewallRule[]` | required | In force, in order. `{ id, action: "allow" \| "deny", protocol: "tcp" \| "udp" \| "icmp" \| "any", port, source, note? }`. Port is `443` or `8000-8100`; source is an IP, a CIDR or `any`. |
| `http` | `readonly HttpRule[]` | | Leave out to hide the HTTP tab. `{ id, type, path, ... }`; type: `redirect`, `header`, `basic-auth`, `ip-allow`, `ip-deny`. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onApplyFirewall` | `(rules) => Promise<void \| { error? }>` | required | The whole staged list. Pass the new `firewall` back. |
| `onApplyHttp` | `(rules) => Promise<void \| { error? }>` | | Same for HTTP rules. A basic-auth password is write-only: send it, never render it back. |
| `defaultTab` | `"firewall" \| "http"` | `"firewall"` | Which tab opens first. |
| `labels` | `Partial<NetworkRulesLabels>` | | Override any string. |

**Helpers** (pure, tested): `isValidCidr`, `isValidPort`, `validateFirewallRule`, `validateHttpRule`, `diffRules(applied, staged, removedIds)`, `rulesToApply`, `lockoutRisk`, `formatProtocolPort`.

## Examples

**Firewall only**

```tsx
import { NetworkRules } from "@fadymondy/nasaq/web";

export const FirewallOnly = () => (
  <NetworkRules
    firewall={[{ id: "1", action: "allow", protocol: "tcp", port: "443", source: "any" }]}
    onApplyFirewall={async () => {}}
  />
);
```

## Accessibility

- Rows are a real table with sorted headers; the row actions are also reachable from a button in the row, not only right-click.
- State (added, changed, removed) is text as well as colour. The apply bar is a live region.
- Fields are labelled and invalid ones are described by their message.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Ports, addresses and CIDR blocks stay left to right. Arrows and columns mirror.

## Styling & tokens

- Built on `DataTable`, `Tabs`, `Dialog`, `Badge`, `Alert` and `--nq-*` tokens. Target `[data-slot="network-rules"]`.

## Do / Don't

- Do put the SSH allow above any broad deny.
- Do apply as one list: partial applies can lock you out.
- Don't render a stored password back into the form.
- Don't apply without the staged count showing what will change.

## Related

- [`server-card`](../server-card/README.md)
- [`proxy-hosts`](../proxy-hosts/README.md)
- [`data-table`](../data-table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-network-rules--docs
