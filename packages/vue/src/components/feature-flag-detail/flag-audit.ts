export type FlagAuditAction = "created" | "toggled" | "rollout" | "rules" | "variants" | "killed" | "restored";

export interface FlagAuditEntry {
  id: string;
  action: FlagAuditAction;
  /** Who did it. */
  actor: string;
  /** ISO date. */
  at: string;
  /** Localised environment name, for toggled and rollout. */
  environment?: string;
  /** For toggled: "on" or "off". For rollout: the old percentage. */
  from?: string;
  /** For toggled: "on" or "off". For rollout: the new percentage. */
  to?: string;
  /** Why, for kills. */
  reason?: string;
}
