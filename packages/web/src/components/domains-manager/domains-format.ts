/** Pure helpers for custom domains: normalising and validating host names, summarising check states. No React here. */

export type DomainCheck = "verified" | "pending" | "checking" | "failed";

/** Lower-cases, trims, and strips a scheme, path, port and trailing dot: `HTTPS://Shop.Example.com/x` becomes `shop.example.com`. */
export function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/** A fully qualified host name: at least two labels, letters, digits and dashes, a letter-only last label. `*.example.com` is allowed when `wildcard` is true. */
export function isValidHostname(host: string, { wildcard = false }: { wildcard?: boolean } = {}): boolean {
  let h = host;
  if (wildcard && h.startsWith("*.")) h = h.slice(2);
  if (h.length === 0 || h.length > 253) return false;
  const labels = h.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((l) => LABEL.test(l))) return false;
  return /^[a-z]{2,63}$/.test(labels[labels.length - 1] as string) || /^xn--[a-z0-9-]+$/.test(labels[labels.length - 1] as string);
}

export interface DomainSummary {
  total: number;
  verified: number;
  pending: number;
  failed: number;
}

export function summarizeDomains(domains: readonly { check: DomainCheck }[]): DomainSummary {
  const s: DomainSummary = { total: domains.length, verified: 0, pending: 0, failed: 0 };
  for (const d of domains) {
    if (d.check === "verified") s.verified++;
    else if (d.check === "failed") s.failed++;
    else s.pending++;
  }
  return s;
}

/** The first `max` items to show, and how many are hidden behind the "+N" chip. When only one would be hidden it is shown instead. */
export function splitOverflow<T>(items: readonly T[], max: number): { shown: T[]; hidden: T[] } {
  const limit = Math.max(1, Math.floor(max));
  if (items.length <= limit + 1) return { shown: [...items], hidden: [] };
  return { shown: items.slice(0, limit), hidden: items.slice(limit) };
}
