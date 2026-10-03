/** Pure rules of access grants: levels, scope summaries and revoke impact. No framework. */

export type AccessLevel = "none" | "read" | "write";
export const ACCESS_LEVELS: readonly AccessLevel[] = ["none", "read", "write"];

/** `grants[agentId][resourceId]`. A missing entry means no access. */
export type GrantMatrix = Record<string, Record<string, AccessLevel | undefined> | undefined>;

const RANK: Record<AccessLevel, number> = { none: 0, read: 1, write: 2 };

export const levelOf = (grants: GrantMatrix, agent: string, resource: string): AccessLevel => grants[agent]?.[resource] ?? "none";

/** Write includes read; read does not include write. */
export const allows = (level: AccessLevel, action: "read" | "write") => RANK[level] >= RANK[action];

/** A new matrix with one cell changed. The input is not touched. */
export function setLevel(grants: GrantMatrix, agent: string, resource: string, level: AccessLevel): GrantMatrix {
  return { ...grants, [agent]: { ...grants[agent], [resource]: level } };
}

/** How many resources an agent can reach at all, and how many it can change. */
export function grantCounts(grants: GrantMatrix, agent: string, resources: readonly string[]): { read: number; write: number } {
  let read = 0;
  let write = 0;
  for (const r of resources) {
    const l = levelOf(grants, agent, r);
    if (allows(l, "read")) read += 1;
    if (allows(l, "write")) write += 1;
  }
  return { read, write };
}

/** The first `max` scopes and how many were left out, for a compact badge row. */
export function summarizeScopes<T>(scopes: readonly T[], max = 3): { shown: T[]; more: number } {
  return { shown: scopes.slice(0, max), more: Math.max(0, scopes.length - max) };
}

/** Does a scope grant only reading? Scope ids end in `:read` or `.read` by convention. */
export const isReadOnlyScope = (scope: string) => /[:.]read$/.test(scope);

/** True when every scope of the app is read-only. An app with no scopes counts as read-only. */
export const isReadOnlyApp = (scopes: readonly string[]) => scopes.every(isReadOnlyScope);
