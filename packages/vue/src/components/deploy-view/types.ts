import type { DeployStatus } from "./deploy-format";

export interface DeployStep {
  id: string;
  /** Human name: "Install dependencies". */
  name: string;
  /** The command or script this step runs. Shown in monospace, always left-to-right. */
  command?: string;
  status: DeployStatus;
  /** When it started. While `running`, the duration counts up from here. */
  startedAt?: Date | string | number;
  /** How long it took, once finished. */
  durationMs?: number;
  /** Output so far, with ANSI colours allowed. Append while running. */
  logs?: string;
  /** Why it failed, shown above the logs. */
  error?: string;
}

/** What a retry callback returns: nothing on success, or a message to show. */
export type DeployResult = void | { error?: string };
