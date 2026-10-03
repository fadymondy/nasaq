import type { DateLike } from "./format";

export interface ApiKeyScope {
  id: string;
  label: string;
  description?: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  /** The public, non-secret start of the key, such as `nsq_live_a1b2`. */
  prefix: string;
  /** The last four characters of the secret. */
  last4?: string;
  /** Scope ids. */
  scopes: readonly string[];
  createdAt: DateLike;
  expiresAt?: DateLike | null;
  lastUsedAt?: DateLike | null;
  revokedAt?: DateLike | null;
}

export interface ApiKeyCreateInput {
  name: string;
  scopes: string[];
  /** Days until expiry, or null for never. */
  expiresInDays: number | null;
}

/** What `onCreate` and `onRotate` return: the full secret (shown once) or an error message. */
export type ApiKeySecretResult = { secret: string; error?: undefined } | { error: string; secret?: undefined };
