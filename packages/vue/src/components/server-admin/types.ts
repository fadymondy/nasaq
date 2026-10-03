import type { JobStatus, PackageKind, ServerDateLike, ServiceState, SshKeyType } from "./format";

export type ServerAdminResult = void | { error?: string };

export interface ServiceUnit {
  id: string;
  /** The unit name, such as `nginx.service`. Stays left-to-right. */
  name: string;
  description?: string;
  state: ServiceState;
  /** Starts at boot. */
  enabled: boolean;
  canReload?: boolean;
  memoryBytes?: number;
  /** When the current state began. */
  since?: ServerDateLike;
}

export interface PackageUpdate {
  /** The package name. Stays left-to-right. */
  name: string;
  currentVersion: string;
  newVersion: string;
  kind: PackageKind;
  sizeBytes?: number;
}

export interface SshServer {
  id: string;
  name: string;
}

export interface SshKeyRecord {
  id: string;
  name: string;
  type: SshKeyType;
  /** For example `SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s`. */
  fingerprint: string;
  comment?: string;
  addedAt: ServerDateLike;
  lastUsedAt?: ServerDateLike | null;
  /** Ids of the servers the key is installed on. */
  installedOn: readonly string[];
}

export interface SshKeyInput {
  name: string;
  /** The public key line. */
  publicKey: string;
}

export interface QueueJob {
  id: string;
  /** The job class or name, such as `SendInvoiceEmail`. Stays left-to-right. */
  name: string;
  queue: string;
  status: JobStatus;
  attempts: number;
  maxAttempts?: number;
  /** When it was queued, started or failed. */
  at: ServerDateLike;
  /** The error message, first line first. A stack trace can follow. */
  error?: string;
  /** The job payload as text, usually JSON. */
  payload?: string;
}

export interface ConfirmRequest {
  title: string;
  body: string;
  confirm: string;
  /** Default true: the confirm button is the danger variant. */
  danger?: boolean;
  run: () => Promise<void> | void;
}
