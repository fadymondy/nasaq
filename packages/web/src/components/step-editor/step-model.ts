/*
 * Step editor model: a tree of steps, a list of parameters, {{placeholder}} handling and validation.
 * Pure functions, so the editor, the test-run panel and the tests share one definition.
 */
import type { WorkflowStepType } from "../workflow-canvas/workflow-model";

export interface StepNode {
  id: string;
  /** A `WorkflowStepType` id. Empty while the person is still choosing one. */
  type: string;
  /** A name the person gave this step. */
  label?: string;
  config: Record<string, unknown>;
  /** Keep going with the next step when this one fails. */
  continueOnFailure?: boolean;
  /** Steps inside this one (a loop's body, a branch). Only for step types listed as nestable. */
  children?: StepNode[];
}

export interface StepParam {
  id: string;
  /** Used as `{{name}}`. Letters, digits, `_`, `-`, `.`. */
  name: string;
  value: string;
  /** Shown masked and hidden from test-run output. */
  secret?: boolean;
}

export type StepIssueCode = "missing-field" | "unknown-placeholder" | "no-type" | "bad-param-name" | "duplicate-param";

export interface StepIssue {
  code: StepIssueCode;
  /** Step id, or param id for parameter issues. */
  id: string;
  field?: string;
  /** The placeholder name or field name concerned. */
  token?: string;
}

export interface StepTestResult {
  stepId: string;
  status: "success" | "error" | "skipped";
  durationMs?: number;
  output?: unknown;
  error?: string;
}

let counter = 0;
export function stepUid(prefix = "step"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;
export const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/** Names used as `{{name}}` in a text, in order, without repeats. */
export function placeholders(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PLACEHOLDER)) if (!out.includes(m[1] as string)) out.push(m[1] as string);
  return out;
}

/** Replaces `{{name}}` with the parameter's value; unknown names stay as they are. */
export function resolvePlaceholders(text: string, params: readonly StepParam[]): string {
  const map = new Map(params.map((p) => [p.name, p.value]));
  return text.replace(PLACEHOLDER, (whole, name: string) => (map.has(name) ? (map.get(name) as string) : whole));
}

/** Hides every secret parameter's value in a text. */
export function maskSecrets(text: string, params: readonly StepParam[], mask = "••••••"): string {
  let out = text;
  for (const p of params) if (p.secret && p.value.length > 2) out = out.split(p.value).join(mask);
  return out;
}

export function flattenSteps(steps: readonly StepNode[]): StepNode[] {
  return steps.flatMap((s) => [s, ...flattenSteps(s.children ?? [])]);
}

export function countSteps(steps: readonly StepNode[]): number {
  return flattenSteps(steps).length;
}

/** A new step of a type, with its default config. */
export function newStep(type?: WorkflowStepType): StepNode {
  return { id: stepUid(), type: type?.id ?? "", config: { ...(type?.defaults ?? {}) } };
}

/** Changes one step wherever it is in the tree. */
export function updateStep(steps: readonly StepNode[], id: string, change: (s: StepNode) => StepNode): StepNode[] {
  return steps.map((s) => (s.id === id ? change(s) : s.children ? { ...s, children: updateStep(s.children, id, change) } : s));
}

function stringValues(config: Record<string, unknown>): [string, string][] {
  return Object.entries(config).flatMap(([k, v]) => (typeof v === "string" ? [[k, v] as [string, string]] : []));
}

/**
 * What is wrong: steps with no type, required fields left empty, `{{placeholders}}` nobody defines, and parameter
 * names that are malformed or repeated. `known` adds names that are available without a parameter (such as `trigger.body`).
 */
export function validateSteps(steps: readonly StepNode[], params: readonly StepParam[], types: readonly WorkflowStepType[], known: readonly string[] = []): StepIssue[] {
  const issues: StepIssue[] = [];
  const byType = new Map(types.map((t) => [t.id, t]));
  const names = new Set([...params.map((p) => p.name), ...known]);
  for (const s of flattenSteps(steps)) {
    const type = byType.get(s.type);
    if (!type) {
      issues.push({ code: "no-type", id: s.id });
      continue;
    }
    for (const f of type.fields ?? []) {
      const v = s.config[f.name];
      if (f.required && f.kind !== "boolean" && (v === undefined || v === null || v === "")) issues.push({ code: "missing-field", id: s.id, field: f.name });
    }
    for (const [field, text] of stringValues(s.config))
      for (const name of placeholders(text)) if (!names.has(name)) issues.push({ code: "unknown-placeholder", id: s.id, field, token: name });
  }
  const seen = new Set<string>();
  for (const p of params) {
    if (!PARAM_NAME.test(p.name)) issues.push({ code: "bad-param-name", id: p.id, token: p.name });
    else if (seen.has(p.name)) issues.push({ code: "duplicate-param", id: p.id, token: p.name });
    seen.add(p.name);
  }
  return issues;
}

/** One line describing a step's settings for a collapsed row: the first filled text field. */
export function stepSummary(step: StepNode, type?: WorkflowStepType): string {
  for (const f of type?.fields ?? []) {
    const v = step.config[f.name];
    if (typeof v === "string" && v.trim()) return v.trim().replace(/\s+/g, " ").slice(0, 80);
    if (typeof v === "number") return String(v);
  }
  return "";
}
