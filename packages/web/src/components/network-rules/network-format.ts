/** Pure helpers for the network rules editor: validation, and the diff between applied and staged rules. No React here. */

export type FirewallAction = "allow" | "deny";
export type FirewallProtocol = "tcp" | "udp" | "icmp" | "any";

export interface FirewallRule {
  id: string;
  action: FirewallAction;
  protocol: FirewallProtocol;
  /** `443`, or a range `8000-8100`. Empty for icmp and any. */
  port: string;
  /** An IPv4 or IPv6 address, a CIDR block, or `any`. */
  source: string;
  note?: string;
}

export type HttpRuleType = "redirect" | "header" | "basic-auth" | "ip-allow" | "ip-deny";

export interface HttpRule {
  id: string;
  type: HttpRuleType;
  /** The URL path the rule applies to, like `/admin`. `/` is the whole site. */
  path: string;
  /** redirect: the destination URL. */
  target?: string;
  /** redirect: 301, 302, 307 or 308. */
  status?: 301 | 302 | 307 | 308;
  /** header: the header name and its value. */
  name?: string;
  value?: string;
  /** basic-auth: the user. The password is write-only; it is never sent back. */
  username?: string;
  password?: string;
  /** ip-allow and ip-deny: an address or CIDR block. */
  cidr?: string;
}

export type RuleState = "unchanged" | "added" | "changed" | "removed";

export type FirewallError = "port" | "portForProtocol" | "source";
export type HttpError = "path" | "target" | "name" | "value" | "username" | "password" | "cidr";

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

/** An IPv4 or IPv6 address, optionally with a `/prefix`. Not a full RFC parser: it rejects the mistakes people make. */
export function isValidCidr(value: string): boolean {
  const v = value.trim();
  const [addr, prefix, extra] = v.split("/");
  if (extra !== undefined || !addr) return false;
  const v4 = IPV4.test(addr);
  const v6 = !v4 && addr.includes(":") && IPV6.test(addr) && (addr.match(/::/g) ?? []).length <= 1 && addr.split(":").length <= 8;
  if (!v4 && !v6) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;
  return Number(prefix) <= (v4 ? 32 : 128);
}

/** `443` or `8000-8100`, each 1 to 65535, the range ascending. */
export function isValidPort(value: string): boolean {
  const m = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(value.trim());
  if (!m) return false;
  const a = Number(m[1]);
  const b = m[2] === undefined ? a : Number(m[2]);
  return a >= 1 && b <= 65535 && a <= b;
}

export function validateFirewallRule(rule: Pick<FirewallRule, "protocol" | "port" | "source">): FirewallError[] {
  const errors: FirewallError[] = [];
  const hasPort = rule.protocol === "tcp" || rule.protocol === "udp";
  if (hasPort && !isValidPort(rule.port)) errors.push("port");
  if (!hasPort && rule.port.trim() !== "") errors.push("portForProtocol");
  if (rule.source.trim().toLowerCase() !== "any" && !isValidCidr(rule.source)) errors.push("source");
  return errors;
}

export function validateHttpRule(rule: HttpRule, opts: { requirePassword?: boolean } = {}): HttpError[] {
  const errors: HttpError[] = [];
  if (!rule.path.startsWith("/") || /\s/.test(rule.path)) errors.push("path");
  if (rule.type === "redirect" && !/^(https?:\/\/[^\s]+|\/[^\s]*)$/.test((rule.target ?? "").trim())) errors.push("target");
  if (rule.type === "header") {
    if (!/^[A-Za-z0-9-]+$/.test((rule.name ?? "").trim())) errors.push("name");
    if ((rule.value ?? "").trim() === "") errors.push("value");
  }
  if (rule.type === "basic-auth") {
    if ((rule.username ?? "").trim() === "") errors.push("username");
    if (opts.requirePassword && (rule.password ?? "").length < 8) errors.push("password");
    else if (rule.password && rule.password.length < 8) errors.push("password");
  }
  if ((rule.type === "ip-allow" || rule.type === "ip-deny") && !isValidCidr(rule.cidr ?? "")) errors.push("cidr");
  return errors;
}

const sameRule = (a: object, b: object): boolean => {
  const ka = Object.keys(a) as (keyof typeof a)[];
  const kb = Object.keys(b) as (keyof typeof b)[];
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k as string] === (b as Record<string, unknown>)[k as string]);
};

export interface RuleDiff<T extends { id: string }> {
  states: Map<string, RuleState>;
  added: number;
  changed: number;
  removed: number;
  moved: boolean;
  /** Total staged changes: added, changed, removed, plus one when only the order changed. */
  count: number;
}

/**
 * Compares the applied rules with the staged ones. `staged` holds every rule still present; `removedIds` are
 * rules the user marked for removal (they stay in the table until Apply so they can be restored).
 */
export function diffRules<T extends { id: string }>(applied: readonly T[], staged: readonly T[], removedIds: ReadonlySet<string> = new Set()): RuleDiff<T> {
  const appliedById = new Map(applied.map((r) => [r.id, r]));
  const states = new Map<string, RuleState>();
  let added = 0;
  let changed = 0;
  let removed = 0;
  for (const r of staged) {
    const before = appliedById.get(r.id);
    if (removedIds.has(r.id)) {
      if (before) (states.set(r.id, "removed"), removed++);
      continue;
    }
    if (!before) (states.set(r.id, "added"), added++);
    else if (!sameRule(before, r)) (states.set(r.id, "changed"), changed++);
    else states.set(r.id, "unchanged");
  }
  const keptApplied = applied.filter((r) => !removedIds.has(r.id) && staged.some((s) => s.id === r.id)).map((r) => r.id);
  const keptStaged = staged.filter((r) => !removedIds.has(r.id) && appliedById.has(r.id)).map((r) => r.id);
  const moved = keptApplied.some((id, i) => id !== keptStaged[i]);
  return { states, added, changed, removed, moved, count: added + changed + removed + (moved ? 1 : 0) };
}

/** The rules that will be sent on Apply: staged, minus the ones marked removed, in order. */
export const rulesToApply = <T extends { id: string }>(staged: readonly T[], removedIds: ReadonlySet<string>): T[] => staged.filter((r) => !removedIds.has(r.id));

/**
 * Rules are checked top to bottom and the first match wins. Returns the id of a rule that would deny SSH (port 22)
 * from anywhere before any allow rule for it, which usually locks the owner out. `null` when nothing looks risky.
 */
export function lockoutRisk(rules: readonly FirewallRule[]): string | null {
  const covers22 = (r: FirewallRule) => (r.protocol === "tcp" || r.protocol === "any") && (r.protocol === "any" || (isValidPort(r.port) && portIncludes(r.port, 22)));
  for (const r of rules) {
    if (!covers22(r)) continue;
    if (r.action === "allow") return null;
    if (r.source.trim().toLowerCase() === "any" || r.source.trim() === "0.0.0.0/0" || r.source.trim() === "::/0") return r.id;
  }
  return null;
}

function portIncludes(port: string, n: number): boolean {
  const [a, b] = port.split("-").map(Number);
  return n >= (a ?? 0) && n <= (b ?? a ?? 0);
}

/** `TCP 443`, `UDP 8000-8100`, `ICMP`, `Any`. Protocol names stay Latin. */
export function formatProtocolPort(rule: Pick<FirewallRule, "protocol" | "port">): string {
  if (rule.protocol === "any") return "Any";
  const p = rule.protocol.toUpperCase();
  return rule.port ? `${p} ${rule.port}` : p;
}
