import { evaluateConditions } from "../rule-builder/rule-model";
import type { RuleField } from "../rule-builder/rule-model";
import type { RuleMatcher } from "./flag-model";

/** A matcher for `evaluateFlag` that runs a rule's conditions (built with the rule builder) against the user context. */
export function ruleMatcher(fields: readonly RuleField[]): RuleMatcher {
  return (rule, context) => evaluateConditions(rule.conditions, context, fields);
}
