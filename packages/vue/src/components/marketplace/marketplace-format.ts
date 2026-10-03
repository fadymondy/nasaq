/*
 * Marketplace logic. Pure: validating a submission, ranking permissions by risk and picking featured listings,
 * testable under node.
 */

export type PermissionRisk = "low" | "medium" | "high";

const RISK_RANK: Record<PermissionRisk, number> = { low: 0, medium: 1, high: 2 };

/** Highest risk among permissions; `null` when there are none. */
export function highestRisk(perms: { risk?: PermissionRisk }[]): PermissionRisk | null {
  let out: PermissionRisk | null = null;
  for (const p of perms) {
    const r = p.risk ?? "low";
    if (out === null || RISK_RANK[r] > RISK_RANK[out]) out = r;
  }
  return out;
}

/** Highest risk first, keeping the given order inside a risk level. */
export function sortPermissions<T extends { risk?: PermissionRisk }>(perms: T[]): T[] {
  return perms.map((p, i) => ({ p, i })).sort((a, b) => RISK_RANK[b.p.risk ?? "low"] - RISK_RANK[a.p.risk ?? "low"] || a.i - b.i).map((x) => x.p);
}

export interface PublishDraft {
  name: string;
  summary: string;
  description: string;
  category: string;
  version: string;
  repository: string;
  /** 0 for free. */
  price: number;
  tags: string[];
  permissions: string[];
}

export type PublishErrors = Partial<Record<"name" | "summary" | "category" | "version" | "repository" | "price", "required" | "invalid" | "tooLong">>;

export const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function isRepositoryUrl(v: string): boolean {
  return /^https:\/\/[^\s/]+\/[^\s/]+\/[^\s/]+(?:\/)?$/.test(v.trim());
}

/** Checks the fields of a submission. An empty result means it can be sent. */
export function validateDraft(d: PublishDraft, summaryMax = 140): PublishErrors {
  const e: PublishErrors = {};
  if (!d.name.trim()) e.name = "required";
  if (!d.summary.trim()) e.summary = "required";
  else if (d.summary.trim().length > summaryMax) e.summary = "tooLong";
  if (!d.category) e.category = "required";
  if (!d.version.trim()) e.version = "required";
  else if (!SEMVER.test(d.version.trim())) e.version = "invalid";
  if (!d.repository.trim()) e.repository = "required";
  else if (!isRepositoryUrl(d.repository)) e.repository = "invalid";
  if (!Number.isFinite(d.price) || d.price < 0) e.price = "invalid";
  return e;
}

/** Listings flagged `featured`, best first (most installs), at most `limit`. */
export function pickFeatured<T extends { featured?: boolean; installs?: number }>(items: T[], limit = 3): T[] {
  return items.filter((i) => i.featured).sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0)).slice(0, limit);
}
