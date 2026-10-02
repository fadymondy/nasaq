import type { ApiKeyRecord, ApiKeyScope, ApiKeyCreateInput, ApiKeySecretResult, ApiKeysLabels } from "../api-keys";

export interface ConnectedApp {
  id: string;
  name: string;
  kind: "app" | "agent";
  /** Who makes it, shown under the name. */
  publisher?: string;
  /** Image URL. Without one the initials show. */
  logo?: string;
  /** The workspace it was authorized for. */
  orgId?: string;
  /** Scope ids it holds. */
  scopes: readonly string[];
  authorizedAt: string | number | Date;
  lastUsedAt?: string | number | Date | null;
}

export interface AccessResource {
  id: string;
  label: string;
}

/** The subset of the API keys props the delegated keys section takes. */
export interface AccessGrantsAgentKeys {
  keys: readonly ApiKeyRecord[];
  scopes: readonly ApiKeyScope[];
  onCreate: (input: ApiKeyCreateInput) => Promise<ApiKeySecretResult>;
  onRotate?: (id: string) => Promise<ApiKeySecretResult>;
  onRevoke?: (id: string) => Promise<void | { error?: string }>;
  defaultScopes?: readonly string[];
  expiryOptions?: readonly (number | null)[];
  defaultExpiryDays?: number | null;
  labels?: Partial<ApiKeysLabels>;
}
