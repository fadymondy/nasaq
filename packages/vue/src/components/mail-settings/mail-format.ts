/** Pure helpers for SMTP settings and mail domains: validation, ports, DNS record analysis. No React here. */

export type SmtpEncryption = "none" | "starttls" | "tls";

export const SMTP_ENCRYPTIONS: readonly SmtpEncryption[] = ["starttls", "tls", "none"];

/** The port each mode usually uses. */
export const defaultSmtpPort = (encryption: SmtpEncryption): number => (encryption === "tls" ? 465 : encryption === "starttls" ? 587 : 25);

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const isHostname = (value: string): boolean => {
  const v = value.trim();
  if (!v || v.length > 253) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v.split(".").every((p) => Number(p) <= 255);
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(v);
};

export interface SmtpDraft {
  host: string;
  port: string;
  encryption: SmtpEncryption;
  username: string;
  fromName: string;
  fromAddress: string;
}

export type SmtpField = "host" | "port" | "fromAddress";

/** Which fields are wrong. The port is text because it comes from an input. */
export function validateSmtp(draft: SmtpDraft): SmtpField[] {
  const out: SmtpField[] = [];
  if (!isHostname(draft.host)) out.push("host");
  const port = Number(draft.port);
  if (!/^\d+$/.test(draft.port.trim()) || port < 1 || port > 65535) out.push("port");
  if (!isEmail(draft.fromAddress)) out.push("fromAddress");
  return out;
}

export type TestStepId = "connect" | "tls" | "auth" | "send";
export const TEST_STEPS: readonly TestStepId[] = ["connect", "tls", "auth", "send"];

export interface TestStep {
  id: TestStepId;
  ok: boolean;
  /** Server reply or error text, shown as code. */
  message?: string;
}

export interface TestOutcome {
  ok: boolean;
  steps: readonly TestStep[];
}

/** The first failing step, or null when all passed. Steps after a failure are treated as skipped. */
export function firstFailure(steps: readonly TestStep[]): TestStep | null {
  return steps.find((s) => !s.ok) ?? null;
}

export type StepState = "pass" | "fail" | "skipped";

/** State of each of the four steps for display: everything after the first failure is skipped. */
export function stepStates(steps: readonly TestStep[]): Record<TestStepId, StepState> {
  const out: Record<TestStepId, StepState> = { connect: "skipped", tls: "skipped", auth: "skipped", send: "skipped" };
  let failed = false;
  for (const id of TEST_STEPS) {
    const step = steps.find((s) => s.id === id);
    if (failed || !step) continue;
    out[id] = step.ok ? "pass" : "fail";
    if (!step.ok) failed = true;
  }
  return out;
}

/* ---------------------------------------------------------------- dns */

export type DnsKind = "spf" | "dkim" | "dmarc";
export const DNS_KINDS: readonly DnsKind[] = ["spf", "dkim", "dmarc"];
export type DnsStatus = "pass" | "fail" | "missing" | "pending";

export interface DnsCheckLike {
  kind: DnsKind;
  status: DnsStatus;
}

export type DomainHealth = "healthy" | "attention" | "critical";

/** Healthy when all three pass, critical when any is missing or failing, otherwise attention (still checking). */
export function domainHealth(checks: readonly DnsCheckLike[]): DomainHealth {
  const by = new Map(checks.map((c) => [c.kind, c.status]));
  const statuses = DNS_KINDS.map((k) => by.get(k) ?? "missing");
  if (statuses.every((s) => s === "pass")) return "healthy";
  if (statuses.some((s) => s === "fail" || s === "missing")) return "critical";
  return "attention";
}

export interface SpfAnalysis {
  valid: boolean;
  /** `-all` fail, `~all` softfail, `?all` neutral, `+all` pass everyone. */
  policy: "fail" | "softfail" | "neutral" | "open" | "none";
  /** DNS lookups the record can cause; the limit is 10. */
  lookups: number;
}

export function analyzeSpf(record: string): SpfAnalysis {
  const text = record.trim().replace(/^"|"$/g, "");
  if (!/^v=spf1(\s|$)/i.test(text)) return { valid: false, policy: "none", lookups: 0 };
  const terms = text.split(/\s+/).slice(1);
  const all = terms.find((t) => /^[+\-~?]?all$/i.test(t));
  const policy: SpfAnalysis["policy"] = !all ? "none" : all.startsWith("-") ? "fail" : all.startsWith("~") ? "softfail" : all.startsWith("?") ? "neutral" : "open";
  const lookups = terms.filter((t) => /^[+\-~?]?(include|a|mx|ptr|exists|redirect)([:=/]|$)/i.test(t)).length;
  return { valid: true, policy, lookups };
}

export interface DmarcAnalysis {
  valid: boolean;
  policy: "none" | "quarantine" | "reject" | null;
  reportsTo: string | null;
}

export function analyzeDmarc(record: string): DmarcAnalysis {
  const text = record.trim().replace(/^"|"$/g, "");
  if (!/^v=DMARC1\s*;/i.test(text)) return { valid: false, policy: null, reportsTo: null };
  const tags = new Map<string, string>();
  for (const part of text.split(";")) {
    const [k, ...rest] = part.split("=");
    if (k && rest.length) tags.set(k.trim().toLowerCase(), rest.join("=").trim());
  }
  const p = tags.get("p")?.toLowerCase();
  const policy = p === "none" || p === "quarantine" || p === "reject" ? p : null;
  const rua = tags.get("rua") ?? null;
  return { valid: policy !== null, policy, reportsTo: rua ? rua.replace(/^mailto:/i, "") : null };
}

/* ---------------------------------------------------------------- mailboxes and aliases */

/** The part before the `@`: letters, digits and `._+-`, not starting or ending with a dot. */
export const isLocalPart = (value: string): boolean => /^[a-z0-9_+-]+(\.[a-z0-9_+-]+)*$/i.test(value.trim()) && value.trim().length <= 64;

export type MailboxField = "local" | "quota" | "password";

export function validateMailbox(input: { local: string; quotaMb: string; password: string }): MailboxField[] {
  const out: MailboxField[] = [];
  if (!isLocalPart(input.local)) out.push("local");
  const quota = Number(input.quotaMb);
  if (!/^\d+$/.test(input.quotaMb.trim()) || quota < 1) out.push("quota");
  if (input.password.length < 10) out.push("password");
  return out;
}

export type AliasField = "source" | "destination";

/** `sales` (or `*` for a catch-all) forwarding to a full address. */
export function validateAlias(input: { source: string; destination: string }): AliasField[] {
  const out: AliasField[] = [];
  const source = input.source.trim();
  if (source !== "*" && !isLocalPart(source)) out.push("source");
  if (!isEmail(input.destination)) out.push("destination");
  return out;
}

/** Share of the quota used, clamped to 0..1. */
export const quotaFraction = (usedMb: number, quotaMb: number): number => (quotaMb <= 0 ? 0 : Math.min(1, Math.max(0, usedMb / quotaMb)));

/** `500 MB`, `2 GB`, Latin digits. */
export function formatMegabytes(mb: number): string {
  if (!Number.isFinite(mb) || mb < 0) return "-";
  if (mb < 1024) return `${Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${Number(gb.toFixed(gb >= 100 ? 0 : 1))} GB`;
}
