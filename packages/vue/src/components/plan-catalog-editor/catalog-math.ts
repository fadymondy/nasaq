/** Pure helpers for the plan catalog editor: the catalog shape and a dry-run diff between two catalogs. */
import type { AdminPlan } from "../admin-tenants/types";

export interface CatalogApp {
  id: string;
  name: string;
  description?: string;
  /** Sold and visible. Disabled apps stay in the catalog for existing subscribers. */
  enabled: boolean;
}

export interface CatalogFeature {
  id: string;
  name: string;
  /** The app the feature belongs to. Empty is a platform-wide feature. */
  appId?: string;
}

/** A pay-as-you-go price: money per unit of usage. */
export interface PaygPrice {
  id: string;
  name: string;
  /** What one unit is: "1K calls", "GB". Localise it. */
  unit: string;
  unitPrice: number;
  /** Units included free each month before billing starts. */
  freeUnits?: number;
}

export interface CatalogBundle {
  id: string;
  name: string;
  /** Monthly price of the bundle. */
  price: number;
  /** Apps the bundle includes. */
  appIds: readonly string[];
}

export interface PlanCatalog {
  apps: readonly CatalogApp[];
  features: readonly CatalogFeature[];
  plans: readonly AdminPlan[];
  payg: readonly PaygPrice[];
  bundles: readonly CatalogBundle[];
}

export type CatalogEntity = "apps" | "features" | "plans" | "payg" | "bundles";
export type CatalogChangeKind = "added" | "updated" | "removed";

export interface CatalogChange {
  entity: CatalogEntity;
  id: string;
  /** Display name of the entity (the new name, or the old one when removed). */
  name: string;
  kind: CatalogChangeKind;
  /** For `updated`: the names of the fields that differ. */
  fields?: string[];
}

export const CATALOG_ENTITIES: readonly CatalogEntity[] = ["plans", "features", "apps", "payg", "bundles"];

export const emptyCatalog: PlanCatalog = { apps: [], features: [], plans: [], payg: [], bundles: [] };

type Row = { id: string; name: string } & Record<string, unknown>;

/** Structural equality for JSON-like values; object key order does not matter. */
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

/**
 * Everything that differs between the published catalog and a draft: what was added, updated (with the fields that
 * changed) and removed, grouped by entity in `CATALOG_ENTITIES` order, in draft order then removed ones.
 */
export function diffCatalog(before: PlanCatalog, after: PlanCatalog): CatalogChange[] {
  const changes: CatalogChange[] = [];
  for (const entity of CATALOG_ENTITIES) {
    const ignored = IGNORED[entity] ?? [];
    const was = new Map((before[entity] as readonly Row[]).map((r) => [r.id, r]));
    const now = after[entity] as readonly Row[];
    const seen = new Set<string>();
    for (const row of now) {
      seen.add(row.id);
      const old = was.get(row.id);
      if (!old) {
        changes.push({ entity, id: row.id, name: row.name, kind: "added" });
        continue;
      }
      const fields = [...new Set([...Object.keys(old), ...Object.keys(row)])].filter((k) => !ignored.includes(k) && !sameValue(old[k], row[k]));
      if (fields.length) changes.push({ entity, id: row.id, name: row.name, kind: "updated", fields });
    }
    for (const row of before[entity] as readonly Row[]) {
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

/** Problems that would make an apply fail: empty names, duplicate ids, features on a missing app, bundles with a missing app. */
export function catalogIssues(catalog: PlanCatalog): { entity: CatalogEntity; id: string; code: "name" | "duplicate" | "missing-app" }[] {
  const issues: { entity: CatalogEntity; id: string; code: "name" | "duplicate" | "missing-app" }[] = [];
  const appIds = new Set(catalog.apps.map((a) => a.id));
  for (const entity of CATALOG_ENTITIES) {
    const seen = new Set<string>();
    for (const row of catalog[entity] as readonly Row[]) {
      if (!row.name.trim()) issues.push({ entity, id: row.id, code: "name" });
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
