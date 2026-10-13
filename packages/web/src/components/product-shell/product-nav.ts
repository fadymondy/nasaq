/**
 * The one menu order every Nasaq product follows:
 * Dashboard → the product's own groups → Reports → Integrations (AI & MCP first) → Settings (fixed order).
 * Pure, so products can test their menu against the standard.
 */
import type { ElementType } from "react";

export const PRODUCT_NAV_SECTIONS = ["dashboard", "core", "reports", "integrations", "settings"] as const;
export type ProductNavSection = (typeof PRODUCT_NAV_SECTIONS)[number];

/** Settings items sort in this order. Ids not listed sit after `branding`, in the order given. */
export const PRODUCT_SETTINGS_ORDER = ["settings", "branding", "team", "domains", "billing"] as const;

export interface ProductNavItem {
  /** Stable id. The standard ids are `dashboard`, `mcp`, `settings`, `branding`, `team`, `domains`, `billing`. */
  id: string;
  label: string;
  href: string;
  /** A lucide icon component. */
  icon?: ElementType;
  /** A count or short text at the inline end. 0 and empty hide it. */
  badge?: number | string;
  /** Hidden from the menu, the tabs and ⌘K (no permission, feature off). */
  hidden?: boolean;
  /** `prefix` (default) is active on child pages too. The dashboard defaults to `exact`. */
  match?: "exact" | "prefix";
  /** Extra words for ⌘K: synonyms, the other language's name. */
  keywords?: string[];
}

export interface ProductNavGroup {
  id: string;
  /** Group heading. Omit for an unlabelled group. */
  label?: string;
  items: ProductNavItem[];
}

export interface ProductNavInput {
  dashboard: ProductNavItem;
  /** The product's own groups, 1–3 of them, in the order people use them. */
  core: ProductNavGroup[];
  reports?: ProductNavItem[];
  /** AI & MCP (`id: "mcp"`) is moved first. */
  integrations?: ProductNavItem[];
  /** Must include `id: "settings"`. Sorted by `PRODUCT_SETTINGS_ORDER`. */
  settings: ProductNavItem[];
}

export interface ProductNavLabels {
  reports: string;
  integrations: string;
  settings: string;
}

export interface ResolvedNavGroup extends ProductNavGroup {
  section: ProductNavSection;
}

const visible = (items: readonly ProductNavItem[] = []) => items.filter((i) => !i.hidden);

export function sortSettings<T extends { id: string }>(items: readonly T[]): T[] {
  const rank = (id: string) => {
    const i = (PRODUCT_SETTINGS_ORDER as readonly string[]).indexOf(id);
    return i === -1 ? 1.5 : i;
  };
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item.id) - rank(b.item.id) || a.index - b.index)
    .map((x) => x.item);
}

export function sortIntegrations<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items.filter((i) => i.id === "mcp"), ...items.filter((i) => i.id !== "mcp")];
}

/** The menu in the standard order, hidden items removed, empty groups dropped. */
export function productNavGroups(input: ProductNavInput, labels: ProductNavLabels): ResolvedNavGroup[] {
  const groups: ResolvedNavGroup[] = [];
  const push = (group: ResolvedNavGroup) => {
    if (group.items.length) groups.push(group);
  };
  push({ id: "dashboard", section: "dashboard", items: visible([{ match: "exact", ...input.dashboard }]) });
  for (const g of input.core) push({ ...g, section: "core", items: visible(g.items) });
  push({ id: "reports", section: "reports", label: labels.reports, items: visible(input.reports) });
  push({ id: "integrations", section: "integrations", label: labels.integrations, items: sortIntegrations(visible(input.integrations)) });
  push({ id: "settings", section: "settings", label: labels.settings, items: sortSettings(visible(input.settings)) });
  return groups;
}

const clean = (path: string) => {
  const bare = path.split(/[?#]/)[0] ?? "";
  return bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
};

/** Whether `item` is the page at `pathname`. */
export function isNavActive(item: Pick<ProductNavItem, "href" | "match">, pathname: string): boolean {
  const href = clean(item.href);
  const path = clean(pathname);
  if (path === href) return true;
  return item.match !== "exact" && href !== "/" && path.startsWith(href + "/");
}

/** The id of the item for `pathname`: the longest matching href wins, so `/settings/team` beats `/settings`. */
export function activeNavId(groups: readonly ProductNavGroup[], pathname: string): string | undefined {
  let best: ProductNavItem | undefined;
  for (const item of groups.flatMap((g) => g.items)) {
    if (isNavActive(item, pathname) && (!best || clean(item.href).length > clean(best.href).length)) best = item;
  }
  return best?.id;
}

/** Up to `max` items for the phone tab bar: the ids asked for, else the dashboard and the first core items. */
export function pickMobileTabs(groups: readonly ProductNavGroup[], ids?: readonly string[], max = 4): ProductNavItem[] {
  const all = groups.flatMap((g) => g.items);
  const picked = ids ? ids.map((id) => all.find((i) => i.id === id)).filter((i): i is ProductNavItem => !!i) : all;
  return picked.slice(0, max);
}

/** What breaks the standard. Empty means the menu conforms. Products assert this in their tests. */
export function productNavProblems(input: ProductNavInput): string[] {
  const problems: string[] = [];
  if (!input.dashboard?.href) problems.push("dashboard: missing");
  if (!input.core.length) problems.push("core: at least one product group is required");
  if (input.core.length > 3) problems.push("core: at most three product groups");
  if (!input.settings.some((i) => i.id === "settings")) problems.push('settings: an item with id "settings" is required');
  if (!(input.integrations ?? []).some((i) => i.id === "mcp")) problems.push('integrations: an "AI & MCP" item with id "mcp" is required');
  const ids = [input.dashboard, ...input.core.flatMap((g) => g.items), ...(input.reports ?? []), ...(input.integrations ?? []), ...input.settings].map((i) => i?.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`ids: duplicated ${[...new Set(dupes)].join(", ")}`);
  for (const g of input.core) {
    if (g.items.some((i) => (["mcp", ...PRODUCT_SETTINGS_ORDER] as string[]).includes(i.id))) problems.push(`core.${g.id}: settings/integration items belong in their own sections`);
  }
  return problems;
}
