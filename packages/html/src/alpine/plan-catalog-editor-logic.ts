// Pure helpers for nqPlanCatalogEditor: the catalog shape, a dry-run diff between two catalogs, validation and ids.
// Same maths as the React plan-catalog-editor (catalog-math).

export interface CatalogApp {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}
export interface CatalogFeature {
  id: string;
  name: string;
  /** The app the feature belongs to; empty is platform-wide. */
  appId?: string;
}
export interface PaygPrice {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  freeUnits?: number;
}
export interface CatalogBundle {
  id: string;
  name: string;
  price: number;
  appIds: string[];
}
export interface CatalogPlan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  currency?: string;
  seats: number | null;
  storageGb: number | null;
  features: string[];
  visible: boolean;
  subscribers?: number;
  featured?: boolean;
}
export interface PlanCatalog {
  apps: CatalogApp[];
  features: CatalogFeature[];
  plans: CatalogPlan[];
  payg: PaygPrice[];
  bundles: CatalogBundle[];
}

export type CatalogEntity = "apps" | "features" | "plans" | "payg" | "bundles";
export type CatalogChangeKind = "added" | "updated" | "removed";

export interface CatalogChange {
  entity: CatalogEntity;
  id: string;
  name: string;
  kind: CatalogChangeKind;
  fields?: string[];
}

export const CATALOG_ENTITIES: readonly CatalogEntity[] = ["plans", "features", "apps", "payg", "bundles"];

type Row = { id: string; name: string } & Record<string, unknown>;

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    return [...keys].every((k) => sameValue(x[k], y[k]));
  }
  return false;
}

/** Fields that are read-only or derived, so they never count as an edit. */
const IGNORED: Partial<Record<CatalogEntity, readonly string[]>> = { plans: ["subscribers"] };

export function diffCatalog(before: PlanCatalog, after: PlanCatalog): CatalogChange[] {
  const changes: CatalogChange[] = [];
  for (const entity of CATALOG_ENTITIES) {
    const ignored = IGNORED[entity] ?? [];
    const was = new Map((before[entity] as unknown as Row[]).map((r) => [r.id, r]));
    const seen = new Set<string>();
    for (const row of after[entity] as unknown as Row[]) {
      seen.add(row.id);
      const old = was.get(row.id);
      if (!old) {
        changes.push({ entity, id: row.id, name: row.name, kind: "added" });
        continue;
      }
      const fields = [...new Set([...Object.keys(old), ...Object.keys(row)])].filter((k) => !ignored.includes(k) && !sameValue(old[k], row[k]));
      if (fields.length) changes.push({ entity, id: row.id, name: row.name, kind: "updated", fields });
    }
    for (const row of before[entity] as unknown as Row[]) {
      if (!seen.has(row.id)) changes.push({ entity, id: row.id, name: row.name, kind: "removed" });
    }
  }
  return changes;
}

export function countChanges(changes: readonly CatalogChange[]): Record<CatalogChangeKind, number> {
  const out: Record<CatalogChangeKind, number> = { added: 0, updated: 0, removed: 0 };
  for (const c of changes) out[c.kind] += 1;
  return out;
}

export type CatalogIssue = { entity: CatalogEntity; id: string; code: "name" | "duplicate" | "missing-app" };

/** Problems that would make an apply fail: empty names, duplicate ids, features or bundles on a missing app. */
export function catalogIssues(catalog: PlanCatalog): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const appIds = new Set(catalog.apps.map((a) => a.id));
  for (const entity of CATALOG_ENTITIES) {
    const seen = new Set<string>();
    for (const row of catalog[entity] as unknown as Row[]) {
      if (!String(row.name ?? "").trim()) issues.push({ entity, id: row.id, code: "name" });
      if (seen.has(row.id)) issues.push({ entity, id: row.id, code: "duplicate" });
      seen.add(row.id);
    }
  }
  for (const f of catalog.features) if (f.appId && !appIds.has(f.appId)) issues.push({ entity: "features", id: f.id, code: "missing-app" });
  for (const b of catalog.bundles) if (b.appIds.some((id) => !appIds.has(id))) issues.push({ entity: "bundles", id: b.id, code: "missing-app" });
  return issues;
}

/** A URL-safe id from a name, made unique against `taken`: "Pro Plus" becomes "pro-plus", then "pro-plus-2". */
export function makeId(name: string, taken: Iterable<string>, fallback = "item"): string {
  const used = new Set(taken);
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The editing shape: a feature with no app has appId "" (a select cannot hold undefined). */
export function toDraft(catalog: Partial<PlanCatalog>): PlanCatalog {
  const c = clone(catalog);
  return {
    apps: c.apps ?? [],
    features: (c.features ?? []).map((f) => ({ ...f, appId: f.appId ?? "" })),
    plans: c.plans ?? [],
    payg: c.payg ?? [],
    bundles: c.bundles ?? [],
  };
}

/** The published shape: the inverse of `toDraft`. */
export function fromDraft(draft: PlanCatalog): PlanCatalog {
  const c = clone(draft);
  c.features = c.features.map((f) => {
    const { appId, ...rest } = f;
    return appId ? { ...rest, appId } : rest;
  });
  return c;
}
