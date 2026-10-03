/*
 * Feature flag model: deterministic percentage bucketing, variant weights and evaluation. The same user always lands in
 * the same bucket for the same flag, so raising a rollout from 10% to 20% keeps the first 10% in. Pure, shared by the UI
 * and the tests. Not a security boundary: use it to release features, not to guard data.
 */

import type { RuleDefinition } from "../rule-builder/rule-model";

export interface FlagEnvironmentDef {
  id: string;
  label: string;
}

export interface FlagEnvState {
  enabled: boolean;
  /** Share of users that get the flag while it is enabled, 0 to 100. */
  rollout: number;
}

export interface FlagVariant {
  key: string;
  label?: string;
  /** Relative share among the variants. Only the ratio matters. */
  weight: number;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  /** Emergency stop: forces the flag off everywhere, whatever the environments say. */
  killed?: boolean;
  environments: Record<string, FlagEnvState>;
  variants: FlagVariant[];
  /** Targeting rules, first match wins. A rule's "serve variant" action picks the variant. */
  rules: RuleDefinition[];
  /** ISO date. */
  updatedAt: string;
  updatedBy?: string;
  tags?: string[];
}

/** FNV-1a, 32 bits: small, fast and well spread for short keys. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A user's bucket for a flag: a stable number from 0 up to (not including) 100, with two decimals. */
export function bucketFor(flagKey: string, userId: string): number {
  return (hash32(`${flagKey}:${userId}`) % 10_000) / 100;
}

/** Clamps a percentage to 0-100 and rounds to a whole number of hundredths. */
export function clampRollout(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value)) * 100) / 100 : 0;
}

/** Whether a bucket is inside the rollout. 0% lets nobody in and 100% lets everybody in. */
export function isInRollout(bucket: number, rollout: number): boolean {
  return bucket < clampRollout(rollout);
}

/**
 * Turns raw weights into whole-number shares that add up to exactly 100 (largest remainder method). Negative and
 * non-finite weights count as 0; if every weight is 0 the shares are equal.
 */
export function normalizeWeights(weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  const w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = sum === 0 ? w.map(() => 100 / w.length) : w.map((x) => (x / sum) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  return floors;
}

/** The variant a user sees: a second, independent hash over the normalised weights. `null` when there are no variants. */
export function pickVariant(flagKey: string, userId: string, variants: readonly FlagVariant[]): string | null {
  if (variants.length === 0) return null;
  const shares = normalizeWeights(variants.map((v) => v.weight));
  const point = (hash32(`${flagKey}:variant:${userId}`) % 10_000) / 100;
  let acc = 0;
  for (let i = 0; i < variants.length; i++) {
    acc += shares[i]!;
    if (point < acc) return variants[i]!.key;
  }
  return variants[variants.length - 1]!.key;
}

export type FlagReason = "killed" | "disabled" | "rule" | "rollout" | "excluded";

export interface FlagEvaluation {
  on: boolean;
  variant: string | null;
  reason: FlagReason;
  bucket: number;
}

/** The variant a rule serves: the `variant` in the config of its first "serve" action. */
export function ruleVariant(rule: RuleDefinition): string | null {
  const a = rule.actions.find((x) => x.type === "serve");
  const v = a?.config.variant;
  return typeof v === "string" && v ? v : null;
}

/** Says whether a targeting rule matches a user. Build one with `ruleMatcher(fields)` from the rule builder. */
export type RuleMatcher = (rule: RuleDefinition, context: Record<string, unknown>) => boolean;

/**
 * Decides a flag for one user in one environment. Order: kill switch, environment off, targeting rules (first match
 * wins and skips the rollout), then the percentage rollout.
 */
export function evaluateFlag(flag: FeatureFlag, environmentId: string, context: { userId: string } & Record<string, unknown>, matches?: RuleMatcher): FlagEvaluation {
  const bucket = bucketFor(flag.key, context.userId);
  if (flag.killed) return { on: false, variant: null, reason: "killed", bucket };
  const env = flag.environments[environmentId];
  if (!env || !env.enabled) return { on: false, variant: null, reason: "disabled", bucket };
  for (const rule of flag.rules) {
    if (matches && rule.conditions.children.length > 0 && matches(rule, context)) {
      return { on: true, variant: ruleVariant(rule) ?? pickVariant(flag.key, context.userId, flag.variants), reason: "rule", bucket };
    }
  }
  if (!isInRollout(bucket, env.rollout)) return { on: false, variant: null, reason: "excluded", bucket };
  return { on: true, variant: pickVariant(flag.key, context.userId, flag.variants), reason: "rollout", bucket };
}

export type FlagState = "killed" | "off" | "partial" | "on";

/** A one-word state for a flag in an environment: killed, off, partial (under 100%) or on. */
export function flagState(flag: Pick<FeatureFlag, "killed" | "environments">, environmentId: string): FlagState {
  if (flag.killed) return "killed";
  const env = flag.environments[environmentId];
  if (!env || !env.enabled || env.rollout <= 0) return "off";
  return env.rollout < 100 ? "partial" : "on";
}

/** A flag key is lower snake or kebab case with dots for grouping: "checkout.new-flow". */
export function isValidFlagKey(key: string): boolean {
  return /^[a-z][a-z0-9]*([._-][a-z0-9]+)*$/.test(key);
}

/** Turns a display name into a flag key: "New checkout flow" becomes "new-checkout-flow". */
export function flagKeyFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^[0-9]+/, "");
}
