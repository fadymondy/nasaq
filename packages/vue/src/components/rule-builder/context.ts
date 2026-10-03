import type { RuleField, RuleIssue } from "./rule-model";
import type { ruleStrings } from "./rule-strings";

/** What the group and condition rows share. */
export interface RuleCtx {
  fields: readonly RuleField[];
  t: ReturnType<typeof ruleStrings>;
  maxDepth: number;
  disabled?: boolean;
  issues: readonly RuleIssue[];
}
