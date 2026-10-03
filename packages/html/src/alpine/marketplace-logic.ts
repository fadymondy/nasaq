// Shared helpers of the marketplace Alpine modules (not a component: it registers nothing).

export interface Draft {
  name: string;
  summary: string;
  description: string;
  category: string;
  version: string;
  repository: string;
  price: number;
  tags: string[];
  permissions: string[];
}

export type DraftErrors = Partial<Record<"name" | "summary" | "category" | "version" | "repository" | "price", "required" | "invalid" | "tooLong">>;

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const isRepositoryUrl = (v: string) => /^https:\/\/[^\s/]+\/[^\s/]+\/[^\s/]+(?:\/)?$/.test(v.trim());

/** Checks the fields of a submission (the React marketplace-format validateDraft). Empty means it can be sent. */
export function validateDraft(d: Draft, summaryMax = 140): DraftErrors {
  const e: DraftErrors = {};
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

/** Fires a bubbling event with wait(promise) in its detail. Returns the pending promises, or null when nobody waited. */
export function fire(from: Element | null, name: string, detail: Record<string, unknown>): Promise<unknown[]> | null {
  const waits: Promise<unknown>[] = [];
  from?.dispatchEvent(new CustomEvent(name, { detail: { ...detail, wait: (p: Promise<unknown>) => void waits.push(p) }, bubbles: true }));
  return waits.length ? Promise.all(waits) : null;
}

/** The first { error } among the settled results of a wait. */
export function firstError(results: unknown): string | undefined {
  const list = Array.isArray(results) ? results : [results];
  for (const r of list) {
    const e = r && typeof r === "object" ? (r as { error?: string }).error : undefined;
    if (e) return e;
  }
  return undefined;
}

export const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The element events of a teleported part (a dialog content) should be fired from: its template placeholder. */
export function hostOf(el: Element): Element {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const back = (n as unknown as { _x_teleportBack?: Element })._x_teleportBack;
    if (back) return back;
  }
  return el;
}

interface StoreState {
  installed(id: string): boolean;
  override: Record<string, boolean>;
}

/** The reactive state of the nested catalog store of the marketplace around el, if there is one. */
export function storeOf(el: Element): StoreState | null {
  const store = el.closest('[data-slot="marketplace"]')?.querySelector('[data-slot="catalog-store"]') as (Element & { _x_dataStack?: unknown[] }) | null | undefined;
  return (store?._x_dataStack?.[0] as StoreState | undefined) ?? null;
}
