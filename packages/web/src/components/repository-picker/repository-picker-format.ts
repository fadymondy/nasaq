/*
 * Repository picker logic. Pure: splitting repository names and filtering and ordering branches, testable under node.
 */

export interface BranchLike {
  name: string;
  default?: boolean;
  protected?: boolean;
}

/** `owner/name` into its parts. A name with no slash has no owner. */
export function splitFullName(fullName: string): { owner: string; name: string } {
  const i = fullName.indexOf("/");
  return i < 0 ? { owner: "", name: fullName } : { owner: fullName.slice(0, i), name: fullName.slice(i + 1) };
}

/** Case-insensitive match on any part of the name. */
export function filterBranches<T extends BranchLike>(branches: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches;
}

/** The default branch first, then protected ones, then the rest alphabetically. */
export function sortBranches<T extends BranchLike>(branches: T[]): T[] {
  const rank = (b: T) => (b.default ? 0 : b.protected ? 1 : 2);
  return [...branches].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The branch to select when a repository is chosen: its default, else "main", "master", else the first. */
export function pickDefaultBranch(branches: BranchLike[], fallback?: string): string | null {
  const names = new Set(branches.map((b) => b.name));
  const marked = branches.find((b) => b.default);
  if (marked) return marked.name;
  for (const n of [fallback, "main", "master"]) if (n && names.has(n)) return n;
  return branches[0]?.name ?? fallback ?? null;
}

/** Move an active index through `count` options with wrap-around. */
export function moveIndex(current: number, delta: 1 | -1, count: number): number {
  if (count <= 0) return -1;
  if (current < 0) return delta === 1 ? 0 : count - 1;
  return (current + delta + count) % count;
}
