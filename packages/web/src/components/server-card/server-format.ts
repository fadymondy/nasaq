/** Pure helpers for the server card: which power actions a state allows, limit validation, formatting. No React here. */

export type ServerStatus = "running" | "stopped" | "starting" | "stopping" | "restarting" | "provisioning" | "suspended" | "error";
export type PowerAction = "start" | "stop" | "restart" | "force-stop";

/** Power actions that make sense in each state. Transitional states only offer a force stop. */
export function powerActionsFor(status: ServerStatus): PowerAction[] {
  switch (status) {
    case "running":
      return ["restart", "stop", "force-stop"];
    case "stopped":
      return ["start"];
    case "error":
      return ["start", "restart", "force-stop"];
    case "starting":
    case "stopping":
    case "restarting":
      return ["force-stop"];
    default:
      return [];
  }
}

/** True while the machine is changing state and the card should show a busy indicator. */
export const isTransitional = (status: ServerStatus): boolean =>
  status === "starting" || status === "stopping" || status === "restarting" || status === "provisioning";

export interface ServerLimits {
  cpuCores: number;
  memoryMb: number;
  diskGb: number;
}

export type ServerLimitField = keyof ServerLimits;
export type LimitError = "integer" | "range";

export const LIMIT_RANGES: Record<ServerLimitField, { min: number; max: number }> = {
  cpuCores: { min: 1, max: 64 },
  memoryMb: { min: 256, max: 262144 },
  diskGb: { min: 5, max: 4096 },
};

/** Validates raw text inputs. Returns the parsed limits, or the fields that are wrong. */
export function validateLimits(raw: Record<ServerLimitField, string>): { value: ServerLimits | null; errors: Partial<Record<ServerLimitField, LimitError>> } {
  const errors: Partial<Record<ServerLimitField, LimitError>> = {};
  const out = {} as ServerLimits;
  for (const key of Object.keys(LIMIT_RANGES) as ServerLimitField[]) {
    const text = raw[key].trim();
    const n = Number(text);
    if (text === "" || !Number.isInteger(n)) errors[key] = "integer";
    else if (n < LIMIT_RANGES[key].min || n > LIMIT_RANGES[key].max) errors[key] = "range";
    else out[key] = n;
  }
  return { value: Object.keys(errors).length ? null : out, errors };
}

/** `2 GB`, `512 MB`: memory from megabytes, Latin digits. */
export function formatMemory(mb: number): string {
  if (!Number.isFinite(mb) || mb < 0) return "-";
  return mb >= 1024 ? `${Number((mb / 1024).toFixed(1))} GB` : `${mb} MB`;
}

export const formatDisk = (gb: number): string => (gb >= 1024 ? `${Number((gb / 1024).toFixed(1))} TB` : `${gb} GB`);

export const clampPercent = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);
