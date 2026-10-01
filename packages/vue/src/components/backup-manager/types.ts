import type { BackupStatus, DateLike } from "./backup-format";

export type BackupKind = "scheduled" | "manual" | "pre-restore";

export interface BackupRecord {
  id: string;
  /** A name to show. Default: the date of the backup. */
  name?: string;
  createdAt: DateLike;
  sizeBytes?: number;
  kind: BackupKind;
  status: BackupStatus;
  /** 0 to 100, while `running` or `restoring`. Leave out when the length is unknown. */
  progress?: number;
  /** Kept until deleted by hand; retention never removes it. */
  locked?: boolean;
  /** Why it failed. */
  error?: string;
}

/** What a callback returns: nothing, or `{ error }` to show a message. */
export type BackupResult = void | { error?: string };
