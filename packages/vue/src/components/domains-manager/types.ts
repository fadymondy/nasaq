import type { DomainCheck } from "./format";

export type DomainsResult = void | { error?: string };

export interface DomainRecord {
  id: string;
  host: string;
  check: DomainCheck;
  primary?: boolean;
  addedAt?: Date | number | string;
  /** Why the last check failed, shown under the status. */
  error?: string;
}
