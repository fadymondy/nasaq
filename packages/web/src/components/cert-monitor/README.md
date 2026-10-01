---
name: cert-monitor
title: CertificateMonitor
category: security
status: beta
summary: A TLS certificate monitor - a table of hosts with issuer, expiry date and a days-left badge that turns amber at 30 days and red at 7 or when expired, soonest first, with check again, renew and stop monitoring.
exports: [CertMonitorLabels, CertResult, CertificateRecord, DaysLeftBadgeProps, DaysLeftBadge, CertificateMonitorProps, CertificateMonitor, byExpiry, CertStatus, CertThresholds, CertTone, certStatus, certTone, DEFAULT_THRESHOLDS, certDaysLeft, isValidCertHost, summarizeCerts]
related: [domains-manager, proxy-hosts, uptime-monitors, vuln-report, data-table]
story: components-security-certificate-monitor
base-ui: [alert-dialog, field]
keywords: [certificate, tls, ssl, expiry, days left, renew, https, lets encrypt]
---

# CertificateMonitor

Watch certificates so none lapses unnoticed. Each host shows its issuer, expiry date, whether it renews automatically and a days-left badge: green above 30 days, amber at 30 or fewer, red at 7 or fewer or already expired, and neutral when the check failed. The list is sorted with the soonest expiry first. Row actions: check again, renew now (for certificates that do not renew automatically) and stop monitoring (with a confirm). Add a host from the toolbar. It has no backend: your callbacks act and you pass the updated `certificates` back. Change the thresholds with `thresholds`; override the clock with `now` in tests and stories.

## When to use

- A security or hosting page that lists certificates.
- `DaysLeftBadge` beside a domain elsewhere.

## When not to use

- Issuing certificates or CSRs.
- Domain verification: use `DomainsManager`.

## Import

```tsx
import { CertificateMonitor } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CertificateMonitor, type CertificateRecord } from "@fadymondy/nasaq/web";

declare const certificates: CertificateRecord[];
declare const api: { add(host: string): Promise<void>; recheck(id: string): Promise<void> };

export const Certs = () => (
  <CertificateMonitor certificates={certificates} onAdd={(h) => api.add(h)} onRecheck={(id) => api.recheck(id)} />
);
```

## Anatomy

```
CertificateMonitor           data-slot="certificate-monitor"
├─ header                    title, "N monitored, M need attention" Badge
├─ toolbar                   search, add host form
├─ DataTable                 host, issuer, expires, auto renew, DaysLeftBadge; row menu: Check again, Renew now, Stop monitoring
└─ AlertDialog               stop monitoring confirm

DaysLeftBadge                data-slot="days-left-badge"   data-status = valid | expiring | critical | expired | error
```

## API

**CertificateMonitor**: every `Card` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `certificates` | `readonly CertificateRecord[]` | required | `{ id, host, issuer?, validTo?, autoRenew?, error? }`. `error` marks a failed check. |
| `thresholds` | `{ warnDays, criticalDays }` | `{ 30, 7 }` | At or below `warnDays` is amber; at or below `criticalDays` is red. |
| `now` | `Date \| number` | now | Override the clock. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onAdd` | `(host) => Promise<void \| { error? }>` | | Shows the add form. |
| `onRecheck`, `onRenew`, `onRemove` | `(id) => Promise<...>` | | Each shows its row action. Renew only shows for manual certificates. |
| `labels` | `Partial<CertMonitorLabels>` | | Override any string. |

**DaysLeftBadge**: `days`, `host`, `thresholds`.

**Helpers** (pure, tested): `certDaysLeft(validTo, now)`, `certStatus`, `certTone`, `byExpiry`, `summarizeCerts`, `isValidCertHost`.

## Examples

**Custom thresholds**

```tsx
import { DaysLeftBadge } from "@fadymondy/nasaq/web";

export const Badge = () => <DaysLeftBadge days={20} thresholds={{ warnDays: 14, criticalDays: 3 }} />; // still green
```

## Accessibility

- The badge always says how many days (or that it expired): never colour alone. It also has an `aria-label` with the host.
- Rows have a button for the menu, not only right-click. Errors show in an `Alert`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Hostnames stay left to right; dates use Latin digits.

## Styling & tokens

- Built on `DataTable`, `Card`, `Badge`, `AlertDialog` and `--nq-*` tokens. Target `[data-slot="certificate-monitor"]`.

## Do / Don't

- Do alert well before 30 days for certificates that renew by hand.
- Do show a failed check as its own state instead of hiding the row.
- Don't count days from a stale `now`: leave it unset in production.
- Don't remove a host without the confirm.

## Related

- [`domains-manager`](../domains-manager/README.md)
- [`proxy-hosts`](../proxy-hosts/README.md)
- [`vuln-report`](../vuln-report/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-security-certificate-monitor--docs
