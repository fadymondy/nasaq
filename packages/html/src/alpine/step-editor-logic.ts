// Pure step-editor helpers, the same maths as the React step-model: a tree of steps, parameters, {{placeholders}} and validation.
export interface StepField {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "boolean" | "select" | "url" | "code";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}
export interface StepType {
  id: string;
  label: string;
  category?: string;
  description?: string;
  fields?: StepField[];
  defaults?: Record<string, unknown>;
}
export interface StepNode {
  id: string;
  type: string;
  label?: string;
  config: Record<string, unknown>;
  continueOnFailure?: boolean;
  children?: StepNode[];
}
export interface StepParam {
  id: string;
  name: string;
  value: string;
  secret?: boolean;
}
export interface StepIssue {
  code: "missing-field" | "unknown-placeholder" | "no-type" | "bad-param-name" | "duplicate-param";
  id: string;
  field?: string;
  token?: string;
}

let counter = 0;
export function stepUid(prefix = "step"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;
export const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

export function stepPlaceholders(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PLACEHOLDER)) if (!out.includes(m[1] as string)) out.push(m[1] as string);
  return out;
}

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

export function newStep(type?: StepType): StepNode {
  return { id: stepUid(), type: type?.id ?? "", config: { ...(type?.defaults ?? {}) } };
}

export function cloneStep(s: StepNode): StepNode {
  return { ...JSON.parse(JSON.stringify({ ...s, children: undefined })), id: stepUid(), children: s.children?.map(cloneStep) };
}

export function validateSteps(steps: readonly StepNode[], params: readonly StepParam[], types: readonly StepType[], known: readonly string[] = []): StepIssue[] {
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
    for (const [field, text] of Object.entries(s.config))
      if (typeof text === "string") for (const name of stepPlaceholders(text)) if (!names.has(name)) issues.push({ code: "unknown-placeholder", id: s.id, field, token: name });
  }
  const seen = new Set<string>();
  for (const p of params) {
    if (!PARAM_NAME.test(p.name)) issues.push({ code: "bad-param-name", id: p.id, token: p.name });
    else if (seen.has(p.name)) issues.push({ code: "duplicate-param", id: p.id, token: p.name });
    seen.add(p.name);
  }
  return issues;
}

export function stepSummary(step: StepNode, type?: StepType): string {
  for (const f of type?.fields ?? []) {
    const v = step.config[f.name];
    if (typeof v === "string" && v.trim()) return v.trim().replace(/\s+/g, " ").slice(0, 80);
    if (typeof v === "number") return String(v);
  }
  return "";
}
