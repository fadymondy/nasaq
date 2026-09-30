---
name: vuln-report
title: VulnReport
category: health
status: beta
summary: A vulnerability scan report - CVE counts per severity, the worst findings with the version that fixes them, the trend against the previous scan and a stacked history of the last scans.
exports: [VulnReportLabels, VulnFinding, VulnScan, SeverityCountsProps, SeverityTiles, VulnReportProps, VulnReport, countBySeverity, emptyCounts, isCveId, riskTone, RankableFinding, VULN_SEVERITIES, Severity, SeverityCounts, topFindings, totalCount, trend, RiskTone]
related: [cert-monitor, uptime-monitors, alerts, metric-tiles]
story: components-health-vulnerability-report
base-ui: []
keywords: [vulnerability, cve, security scan, severity, cvss, patch, report]
---

# VulnReport

Show what the last security scan found. Four tiles count findings by severity (critical, high, medium, low), a badge says whether the total went up or down since the previous scan, the top findings are listed (most severe first, then highest CVSS) with the installed and the fixed version and a copy button for the CVE id, and the scan history is drawn as stacked bars. With no findings it says so plainly; with no scan yet it shows an empty state. It has no scanner: you pass `findings` (or `counts`) and `history`, and `onScan` starts a new scan.

## When to use

- A security page in an admin or hosting product.
- `SeverityTiles` on a dashboard.

## When not to use

- Triage workflows with assignees and status per CVE: build on `DataTable`.
- Certificate expiry: use `CertificateMonitor`.

## Import

```tsx
import { VulnReport } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { VulnReport, type VulnFinding, type VulnScan } from "@fadymondy/nasaq/web";

declare const findings: VulnFinding[];
declare const history: VulnScan[];
declare const api: { scan(): Promise<void> };

export const Vulns = () => <VulnReport findings={findings} history={history} lastScanAt={Date.now()} onScan={() => api.scan()} />;
```

## Anatomy

```
VulnReport                   data-slot="vuln-report"
├─ header                    title, last scan, Scan now
├─ total + trend Badge       "3 fewer than the previous scan"
├─ SeverityTiles             Critical, High, Medium, Low
├─ top findings              severity Badge, CVE id, title, package@version → fixed version, CVSS, copy
└─ scan history              stacked bar per scan, oldest first
```

## API

**VulnReport**: every `Card` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `findings` | `readonly VulnFinding[]` | required | `{ id, severity, cvss?, title?, package, installedVersion?, fixedVersion? }`. |
| `counts` | `Partial<SeverityCounts>` | from `findings` | Override, for example when `findings` holds only the top items. |
| `history` | `readonly VulnScan[]` | `[]` | `{ id, at, counts }`, oldest first. |
| `lastScanAt` | `Date \| number \| string` | | Shown in the description. |
| `topLimit` | `number` | `5` | How many findings to list. |
| `scanning` | `boolean` | `false` | Loading state of Scan now. |
| `onScan` | `() => Promise<void \| { error? }>` | | Shows Scan now. |
| `onOpenFinding` | `(finding) => void` | | Makes the CVE id a button. |
| `labels` | `Partial<VulnReportLabels>` | | Override any string. |

**SeverityTiles**: `counts`. **Helpers** (pure, tested): `countBySeverity`, `totalCount`, `riskTone`, `topFindings`, `trend`, `isCveId`.

## Examples

**Counts only**

```tsx
import { SeverityTiles } from "@fadymondy/nasaq/web";

export const Tiles = () => <SeverityTiles counts={{ critical: 1, high: 4, medium: 9, low: 12 }} />;
```

## Accessibility

- Severity is always a word. The counts are a description list (`dl`). Each history bar is an image with a text alternative giving the date and total.
- Copy buttons have a name that includes the CVE id.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. CVE ids, package names and versions stay left to right. The history runs in reading order.

## Styling & tokens

- Built on `Card`, `Badge`, `CopyButton`, `EmptyState` and `--nq-*` tokens. Target `[data-slot="vuln-report"]`.

## Do / Don't

- Do show the fixed version: it is the action to take.
- Do say "no fix yet" when there is none.
- Don't show a green all-clear for a scan that failed: leave `lastScanAt` out and show an error.
- Don't invent CVE ids in production data.

## Related

- [`cert-monitor`](../cert-monitor/README.md)
- [`uptime-monitors`](../uptime-monitors/README.md)
- [`alerts`](../alerts/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-health-vulnerability-report--docs
