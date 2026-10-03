/** Pure helpers for the server admin panels: which actions a service allows, update summaries, SSH key parsing, job counts. No framework code here. */

export type ServerDateLike = Date | number | string;

/* ---------------------------------------------------------------- services */

export type ServiceState = "active" | "inactive" | "failed" | "activating" | "deactivating" | "reloading";
export type ServiceAction = "start" | "stop" | "restart" | "reload" | "enable" | "disable";

export interface ServiceUnitInfo {
  state: ServiceState;
  enabled: boolean;
  /** Whether the unit can reload its configuration without a restart. Default true. */
  canReload?: boolean;
}

/** Actions that make sense for a unit right now. Transitional states only offer a stop. */
export function serviceActionsFor(unit: ServiceUnitInfo): ServiceAction[] {
  const boot: ServiceAction = unit.enabled ? "disable" : "enable";
  switch (unit.state) {
    case "active":
      return unit.canReload === false ? ["restart", "stop", boot] : ["restart", "reload", "stop", boot];
    case "inactive":
      return ["start", boot];
    case "failed":
      return ["start", "restart", boot];
    default:
      return ["stop"];
  }
}

/** Actions that interrupt work and so ask first. */
export const isDisruptive = (action: ServiceAction): boolean => action === "stop" || action === "restart" || action === "disable";

export const isTransitionalState = (state: ServiceState): boolean => state === "activating" || state === "deactivating" || state === "reloading";

/* ---------------------------------------------------------------- packages */

export type PackageKind = "security" | "kernel" | "regular";

export interface PackageInfo {
  name: string;
  kind: PackageKind;
  sizeBytes?: number;
}

export interface UpdateSummary {
  total: number;
  security: number;
  kernel: number;
  regular: number;
  downloadBytes: number;
}

export function summarizeUpdates(packages: readonly PackageInfo[]): UpdateSummary {
  const out: UpdateSummary = { total: packages.length, security: 0, kernel: 0, regular: 0, downloadBytes: 0 };
  for (const p of packages) {
    out[p.kind] += 1;
    out.downloadBytes += p.sizeBytes ?? 0;
  }
  return out;
}

const KIND_RANK: Record<PackageKind, number> = { security: 0, kernel: 1, regular: 2 };
export const kindRank = (kind: PackageKind): number => KIND_RANK[kind];

/** `12.4 MB`, Latin digits. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${Number(value.toFixed(value >= 100 ? 0 : 1))} ${units[i]}`;
}

/* ---------------------------------------------------------------- ssh keys */

export type SshKeyType = "ed25519" | "rsa" | "ecdsa" | "ed25519-sk" | "ecdsa-sk" | "dsa";

const KEY_PREFIX: Record<string, SshKeyType> = {
  "ssh-ed25519": "ed25519",
  "ssh-rsa": "rsa",
  "ecdsa-sha2-nistp256": "ecdsa",
  "ecdsa-sha2-nistp384": "ecdsa",
  "ecdsa-sha2-nistp521": "ecdsa",
  "sk-ssh-ed25519@openssh.com": "ed25519-sk",
  "sk-ecdsa-sha2-nistp256@openssh.com": "ecdsa-sk",
  "ssh-dss": "dsa",
};

export type SshKeyProblem = "empty" | "format" | "type" | "body" | "private";

export type ParsedSshKey =
  | { ok: true; type: SshKeyType; algorithm: string; comment: string; body: string }
  | { ok: false; problem: SshKeyProblem };

/** Reads one `authorized_keys` line: `<algorithm> <base64> [comment]`. It never accepts a private key. */
export function parseSshPublicKey(text: string): ParsedSshKey {
  const line = text.trim();
  if (!line) return { ok: false, problem: "empty" };
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) return { ok: false, problem: "private" };
  if (line.includes("\n")) return { ok: false, problem: "format" };
  const parts = line.split(/\s+/);
  if (parts.length < 2) return { ok: false, problem: "format" };
  const [algorithm = "", body = "", ...rest] = parts;
  const type = KEY_PREFIX[algorithm];
  if (!type) return { ok: false, problem: "type" };
  if (!/^[A-Za-z0-9+/]+={0,3}$/.test(body) || body.length < 20) return { ok: false, problem: "body" };
  return { ok: true, type, algorithm, comment: rest.join(" "), body };
}

/** `SHA256:abcd…wxyz`: long fingerprints shortened for a table cell. */
export function shortFingerprint(fingerprint: string): string {
  return fingerprint.length > 24 ? `${fingerprint.slice(0, 14)}…${fingerprint.slice(-6)}` : fingerprint;
}

export interface KeyCoverage {
  installed: number;
  total: number;
  /** "none", "some" or "all" servers. */
  level: "none" | "some" | "all";
}

export function keyCoverage(installedOn: readonly string[], serverIds: readonly string[]): KeyCoverage {
  const set = new Set(installedOn);
  const installed = serverIds.filter((id) => set.has(id)).length;
  return { installed, total: serverIds.length, level: installed === 0 ? "none" : installed === serverIds.length ? "all" : "some" };
}

/* ---------------------------------------------------------------- jobs */

export type JobStatus = "waiting" | "active" | "delayed" | "completed" | "failed";

export const JOB_STATUSES: readonly JobStatus[] = ["active", "waiting", "delayed", "failed", "completed"];

export function jobCounts(jobs: readonly { status: JobStatus }[]): Record<JobStatus, number> {
  const out: Record<JobStatus, number> = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
  for (const j of jobs) out[j.status] += 1;
  return out;
}

/** Only failed jobs are retried. */
export const canRetryJob = (status: JobStatus): boolean => status === "failed";

/** Finished jobs can be forgotten; a running one cannot. */
export const canForgetJob = (status: JobStatus): boolean => status !== "active";

/** First line of an error, trimmed to `max` characters. */
export function errorHeadline(error: string | undefined, max = 90): string {
  const first = (error ?? "").split("\n")[0]?.trim() ?? "";
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}
