import type { Component } from "vue";

export type IntegrationStatus = "disconnected" | "connected" | "needs-reauth" | "error" | "pending";

export interface IntegrationScope {
  id: string;
  /** What access this is, in plain words: "Read your Search Console performance data". */
  label: string;
  /** Required scopes are ticked and cannot be turned off. */
  required?: boolean;
}

export interface IntegrationAccount {
  id: string;
  /** "Nasaq blog (nasaq.dev)" */
  name: string;
  /** A second line: the property ID or the email. */
  detail?: string;
}

export interface IntegrationService {
  id: string;
  /** The brand's name. Shown as text; pass `icon` only with the brand's official logo. */
  name: string;
  description?: string;
  /** The service's official logo as a component (never a generic stand-in). Omit to show the name only. */
  icon?: Component;
  /** A heading to group cards under: "Google", "Developer tools". */
  group?: string;
  /** What connecting asks the service for. */
  scopes: readonly IntegrationScope[];
  status: IntegrationStatus;
  /** Scope ids granted, when connected. Default: all of `scopes`. */
  grantedScopes?: readonly string[];
  /** The identity at the service that authorised it, shown left-to-right. */
  connectedAs?: string;
  /** Accounts or properties the user can pick from after connecting. */
  accounts?: readonly IntegrationAccount[];
  /** The picked account id. */
  accountId?: string;
  lastSyncAt?: number | string | Date | null;
  /** A short reason shown when `status` is "error" or "needs-reauth". */
  message?: string;
  /** Where the service explains its permissions. */
  learnMoreHref?: string;
}

export type IntegrationResult = void | { error?: string };
