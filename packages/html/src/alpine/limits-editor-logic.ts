/** Pure helpers for the limits editor: rule shape, validation, effective values and change detection. */

export type LimitMode = "limit" | "unlimited" | "inherit";

export type LimitField = "value" | "price" | "overage" | "rateLimit" | "spendLimit";

export interface LimitRule {
  mode: LimitMode;
  /** The numeric limit when `mode` is `limit`. */
  value?: number;
  /** Price per unit (or per pack) charged for the resource. */
  price?: number;
  /** Price of each unit past the limit. */
  overage?: number;
  /** Requests allowed per minute for one key. */
  rateLimit?: number;
  /** Spend cap per key per period, in money. */
  spendLimit?: number;
}

export type LimitRules = Record<string, LimitRule>;
export type LimitErrors = Record<string, Partial<Record<LimitField, "required" | "invalid">>>;

export const LIMIT_FIELDS: readonly LimitField[] = ["value", "price", "overage", "rateLimit", "spendLimit"];

/** The rule for a key, defaulting to "inherit" when nothing is set. */
export const ruleOf = (rules: LimitRules, key: string): LimitRule => rules[key] ?? { mode: "inherit" };

const isNonNegative = (n: number | undefined) => n !== undefined && Number.isFinite(n) && n >= 0;

/**
 * Checks every rule. A `limit` rule needs a value; every filled number must be finite and not negative.
 * Fields that are not shown (pricing, key limits) are ignored via the `fields` option.
 */
export function validateRules(rules: LimitRules, keys: readonly string[], fields: readonly LimitField[] = LIMIT_FIELDS): LimitErrors {
  const errors: LimitErrors = {};
  for (const key of keys) {
    const rule = ruleOf(rules, key);
    const e: LimitErrors[string] = {};
    if (fields.includes("value") && rule.mode === "limit") {
      if (rule.value === undefined || Number.isNaN(rule.value)) e.value = "required";
      else if (!isNonNegative(rule.value)) e.value = "invalid";
    }
    for (const f of fields) {
      if (f === "value") continue;
      const v = rule[f];
      if (v !== undefined && !isNonNegative(v)) e[f] = "invalid";
    }
    if (Object.keys(e).length) errors[key] = e;
  }
  return errors;
}

export const hasErrors = (errors: LimitErrors) => Object.keys(errors).length > 0;

/** The limit that actually applies: the rule's own value, `null` for unlimited, or the inherited value. `undefined` when unset. */
export function effectiveLimit(rule: LimitRule, inherited: number | null | undefined): number | null | undefined {
  if (rule.mode === "unlimited") return null;
  if (rule.mode === "limit") return rule.value;
  return inherited;
}

const norm = (rule: LimitRule) => ({
  mode: rule.mode,
  value: rule.mode === "limit" ? rule.value : undefined,
  price: rule.price,
  overage: rule.overage,
  rateLimit: rule.rateLimit,
  spendLimit: rule.spendLimit,
});

export function ruleEquals(a: LimitRule, b: LimitRule): boolean {
  const x = norm(a);
  const y = norm(b);
  return (Object.keys(x) as (keyof typeof x)[]).every((k) => x[k] === y[k]);
}

/** Keys whose rule differs between two sets, in the order of `keys`. */
export function changedKeys(before: LimitRules, after: LimitRules, keys: readonly string[]): string[] {
  return keys.filter((k) => !ruleEquals(ruleOf(before, k), ruleOf(after, k)));
}

/** Parses the text of a number input: empty is `undefined`, anything else is a number (NaN when not numeric). */
export function parseNumberInput(text: string): number | undefined {
  const s = text.trim();
  return s === "" ? undefined : Number(s);
}
