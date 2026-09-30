/** Pure helpers for DNS records: types, TTL, name and value validation, and conflicts. No React here. */

export const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"] as const;
export type DnsType = (typeof DNS_TYPES)[number];

/** A TTL of 1 means "Auto" (the provider decides), as at Cloudflare. */
export const TTL_AUTO = 1;
export const DEFAULT_TTLS: readonly number[] = [TTL_AUTO, 60, 300, 900, 3600, 14_400, 86_400];

/** Only address and alias records can go through a proxy. */
export const isProxiable = (type: string): boolean => type === "A" || type === "AAAA" || type === "CNAME";
/** MX and SRV carry a priority. */
export const needsPriority = (type: string): boolean => type === "MX" || type === "SRV";

export function isIPv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && String(Number(p)) === p);
}

export function isIPv6(value: string): boolean {
  if (!/^[0-9a-fA-F:]+$/.test(value)) return false;
  const halves = value.split("::");
  if (halves.length > 2) return false;
  const parse = (part: string | undefined) => (part ? part.split(":") : []);
  const all = [...parse(halves[0]), ...parse(halves[1])];
  if (all.some((g) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return false;
  return halves.length === 2 ? all.length < 8 : all.length === 8;
}

/** A hostname: dot separated labels of letters, digits and hyphens, none starting or ending with a hyphen. */
export function isHostname(value: string): boolean {
  const host = value.endsWith(".") ? value.slice(0, -1) : value;
  return host.length > 0 && host.length <= 253 && host.split(".").every((l) => /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/.test(l));
}

/** The name as stored: `@` for the zone apex, otherwise the label(s) without the zone. */
export function relativeName(name: string, zone: string): string {
  const n = name.trim().toLowerCase().replace(/\.$/, "");
  const z = zone.trim().toLowerCase();
  if (n === "" || n === "@" || n === z) return "@";
  return n.endsWith(`.${z}`) ? n.slice(0, -(z.length + 1)) : n;
}

/** The full name: `@` becomes the zone, `www` becomes `www.example.com`. */
export function fqdn(name: string, zone: string): string {
  const rel = relativeName(name, zone);
  return rel === "@" ? zone : `${rel}.${zone}`;
}

/** `Auto`, `60s`, `5 min`, `1 hour`, `1 day`: as short text using the given unit words. */
export interface TtlUnits {
  auto: string;
  seconds: (n: number) => string;
  minutes: (n: number) => string;
  hours: (n: number) => string;
  days: (n: number) => string;
}
export const DEFAULT_TTL_UNITS: TtlUnits = {
  auto: "Auto",
  seconds: (n) => `${n} sec`,
  minutes: (n) => `${n} min`,
  hours: (n) => (n === 1 ? "1 hour" : `${n} hours`),
  days: (n) => (n === 1 ? "1 day" : `${n} days`),
};

export function formatTtl(ttl: number, units: TtlUnits = DEFAULT_TTL_UNITS): string {
  if (ttl === TTL_AUTO) return units.auto;
  if (ttl % 86_400 === 0) return units.days(ttl / 86_400);
  if (ttl % 3600 === 0) return units.hours(ttl / 3600);
  if (ttl % 60 === 0) return units.minutes(ttl / 60);
  return units.seconds(ttl);
}

export interface DnsDraft {
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number | undefined;
  proxied?: boolean | undefined;
}

export type DnsErrorCode = "name" | "content" | "ipv4" | "ipv6" | "hostname" | "priority" | "ttl" | "cnameApex" | "conflict" | "duplicate";
export type DnsErrors = Partial<Record<"name" | "content" | "priority" | "ttl", DnsErrorCode>>;

/**
 * Check a draft record against the zone and the existing records. Returns an error code per field, or an
 * empty object. `editing` is the id of the record being edited, so it does not conflict with itself.
 */
export function validateRecord(draft: DnsDraft, zone: string, existing: readonly (DnsDraft & { id: string })[] = [], editing?: string): DnsErrors {
  const errors: DnsErrors = {};
  const name = relativeName(draft.name, zone);
  const content = draft.content.trim();
  if (name !== "@" && !/^(\*\.)?[A-Za-z0-9_]([A-Za-z0-9_.-]*[A-Za-z0-9_])?$/.test(name)) errors.name = "name";
  if (!content) errors.content = "content";
  else if (draft.type === "A" && !isIPv4(content)) errors.content = "ipv4";
  else if (draft.type === "AAAA" && !isIPv6(content)) errors.content = "ipv6";
  else if ((draft.type === "CNAME" || draft.type === "MX" || draft.type === "NS") && !isHostname(content)) errors.content = "hostname";
  if (needsPriority(draft.type) && !(Number.isInteger(draft.priority) && (draft.priority as number) >= 0 && (draft.priority as number) <= 65_535)) errors.priority = "priority";
  if (draft.ttl !== TTL_AUTO && !(Number.isInteger(draft.ttl) && draft.ttl >= 30 && draft.ttl <= 86_400)) errors.ttl = "ttl";
  if (!errors.name) {
    const others = existing.filter((r) => r.id !== editing && relativeName(r.name, zone) === name);
    if (draft.type === "CNAME" && name === "@") errors.name = "cnameApex";
    else if (draft.type === "CNAME" && others.length > 0) errors.name = "conflict";
    else if (draft.type !== "CNAME" && others.some((r) => r.type === "CNAME")) errors.name = "conflict";
    else if (!errors.content && others.some((r) => r.type === draft.type && r.content.trim().toLowerCase() === content.toLowerCase() && (r.priority ?? null) === (draft.priority ?? null))) errors.content = "duplicate";
  }
  return errors;
}
