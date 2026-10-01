import type { ShareExpiry } from "./share-helpers";

export type ShareLinkAccess = "restricted" | "anyone";

export interface ShareRole {
  value: string;
  label: string;
}

export interface SharePerson {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  /** A `ShareRole.value`. */
  role: string;
  /** The owner cannot be changed or removed. */
  owner?: boolean;
}

export interface ShareLinkSettings {
  access: ShareLinkAccess;
  /** The role people get through the link. */
  role: string;
  expiry: ShareExpiry;
  /** The computed moment, or null. */
  expiresAt: Date | null;
}
