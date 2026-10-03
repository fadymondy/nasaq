export type VaultSecretKind = "api-key" | "password" | "token" | "certificate" | "ssh-key" | "other";
export type VaultAccessAction = "reveal" | "copy" | "create" | "update" | "delete";

export interface VaultSecret {
  id: string;
  name: string;
  /** Secrets with the same group are listed together. Blank goes under "Ungrouped". */
  group: string;
  kind?: VaultSecretKind;
  description?: string;
  /** A safe hint such as the last four characters, shown next to the mask. Never the value. */
  hint?: string;
  updatedAt: Date | number | string;
  expiresAt?: Date | number | string;
  lastAccessedAt?: Date | number | string;
}

export interface VaultAccessEvent {
  id: string;
  secretName: string;
  actor: string;
  action: VaultAccessAction;
  at: Date | number | string;
  /** IP address or device, shown as code. */
  address?: string;
}

export interface VaultSecretInput {
  name: string;
  group: string;
  kind: VaultSecretKind;
  /** Empty on edit means "keep the current value". */
  value: string;
  description?: string;
  /** `YYYY-MM-DD`. */
  expiresAt?: string;
}

export type VaultResult = void | { error?: string };
export type VaultRevealResult = { value: string } | { error: string };
