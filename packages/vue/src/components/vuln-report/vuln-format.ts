export type Severity = "critical" | "high" | "medium" | "low";
export type SeverityCounts = Record<Severity, number>;
export type RiskTone = "danger" | "warning" | "success" | "neutral";

export const VULN_SEVERITIES: readonly Severity[] = ["critical", "high", "medium", "low"];
const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const emptyCounts = (): SeverityCounts => ({ critical: 0, high: 0, medium: 0, low: 0 });

export function countBySeverity(findings: readonly { severity: Severity }[]): SeverityCounts {
  const c = emptyCounts();
  for (const f of findings) if (f.severity in c) c[f.severity] += 1;
  return c;
}

export const totalCount = (c: Partial<SeverityCounts>): number => VULN_SEVERITIES.reduce((n, s) => n + (c[s] ?? 0), 0);

/** Worst present severity decides the tone. Nothing found is success. */
export function riskTone(c: Partial<SeverityCounts>): RiskTone {
  if ((c.critical ?? 0) > 0 || (c.high ?? 0) > 0) return "danger";
  if ((c.medium ?? 0) > 0) return "warning";
  if ((c.low ?? 0) > 0) return "neutral";
  return "success";
}

export interface RankableFinding {
  severity: Severity;
  cvss?: number;
  id: string;
}

/** Most severe first, then higher CVSS, then id for a stable order. Returns a new array of at most `limit`. */
export function topFindings<T extends RankableFinding>(findings: readonly T[], limit = 5): T[] {
  return [...findings]
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || (b.cvss ?? 0) - (a.cvss ?? 0) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}

/** CVE-YYYY-NNNN+ */
export const isCveId = (s: string): boolean => /^CVE-\d{4}-\d{4,}$/i.test(s.trim());

/** Change in total between the last two scans: negative is better. Null when there is nothing to compare. */
export function trend(history: readonly { counts: Partial<SeverityCounts> }[]): number | null {
  if (history.length < 2) return null;
  return totalCount(history[history.length - 1]!.counts) - totalCount(history[history.length - 2]!.counts);
}
