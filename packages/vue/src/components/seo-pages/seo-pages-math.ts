/*
 * SEO page audit maths: a 0 to 100 score from the open issues of a page, counts by severity, a site average and the
 * worst-first order. Pure, shared by the UI and the tests.
 */

export type SeoSeverity = "error" | "warning" | "info";
export type SeoIndexStatus = "indexed" | "not-indexed" | "blocked" | "pending";

export interface SeoIssue {
  id: string;
  /** Key into the issue catalogue, e.g. "title-missing". */
  code: string;
  severity: SeoSeverity;
  /** Marked as fixed. Fixed issues do not count against the score. */
  fixed?: boolean;
  /** Page specific detail, e.g. "3 images have no alt text". */
  detail?: string;
}

/** Points an open issue takes off a page's score of 100. */
export const SEVERITY_WEIGHT: Record<SeoSeverity, number> = { error: 10, warning: 4, info: 1 };

export const SEVERITY_ORDER: readonly SeoSeverity[] = ["error", "warning", "info"];

export const openIssues = <T extends { fixed?: boolean }>(issues: readonly T[]): T[] => issues.filter((i) => !i.fixed);

/** 100 minus the weight of every open issue, never below 0. */
export function seoScore(issues: readonly SeoIssue[]): number {
  const lost = openIssues(issues).reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);
  return Math.max(0, 100 - lost);
}

export type ScoreBand = "good" | "fair" | "poor";

/** 90 and up is good, 50 to 89 fair, under 50 poor. */
export function scoreBand(score: number): ScoreBand {
  return score >= 90 ? "good" : score >= 50 ? "fair" : "poor";
}

export type IssueCounts = Record<SeoSeverity, number> & { total: number };

/** Open issues by severity. */
export function issueCounts(issues: readonly SeoIssue[]): IssueCounts {
  const out: IssueCounts = { error: 0, warning: 0, info: 0, total: 0 };
  for (const i of openIssues(issues)) {
    out[i.severity] += 1;
    out.total += 1;
  }
  return out;
}

/** Average score of pages, rounded. No pages gives 0. */
export function siteScore(pages: readonly { issues: readonly SeoIssue[] }[]): number {
  if (pages.length === 0) return 0;
  return Math.round(pages.reduce((sum, p) => sum + seoScore(p.issues), 0) / pages.length);
}

/** Issues most severe first, open before fixed, then by code so the order is stable. */
export function sortIssues(issues: readonly SeoIssue[]): SeoIssue[] {
  return [...issues].sort(
    (a, b) => Number(!!a.fixed) - Number(!!b.fixed) || SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.code.localeCompare(b.code),
  );
}
