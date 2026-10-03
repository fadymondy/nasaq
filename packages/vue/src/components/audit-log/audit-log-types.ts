export interface AuditRetention {
  /** Days entries are kept; `null` keeps them forever. */
  days: number | null;
  /** The choices offered. Default `[30, 90, 180, 365, 730, null]`. */
  options?: readonly (number | null)[];
}
