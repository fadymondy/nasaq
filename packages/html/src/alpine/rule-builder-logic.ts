/*
 * Rule builder model: "when this happens, if these conditions hold, do these actions".
 * Conditions form a tree of AND / OR groups. Pure functions, shared by the UI and the tests.
 */
export interface WorkflowFieldDef {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "boolean" | "select" | "url" | "code";
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

export type RuleFieldKind = "text" | "number" | "select" | "boolean";
export type RuleJoin = "and" | "or";
export type RuleOperator = "is" | "isNot" | "contains" | "startsWith" | "isEmpty" | "isNotEmpty" | "gt" | "gte" | "lt" | "lte";

export interface RuleField {
  id: string;
  /** Localised name. */
  label: string;
  kind: RuleFieldKind;
  /** For `kind: "select"`. */
  options?: { value: string; label: string }[];
}

export interface RuleEvent {
  id: string;
  label: string;
  description?: string;
}

export interface RuleActionType {
  id: string;
  label: string;
  description?: string;
  /** The settings of this action, drawn with the same field editor as workflow steps. */
  fields?: WorkflowFieldDef[];
  defaults?: Record<string, unknown>;
}

export interface RuleCondition {
  kind: "condition";
  id: string;
  field: string;
  op: RuleOperator;
  value: string;
}

export interface RuleGroup {
  kind: "group";
  id: string;
  join: RuleJoin;
  children: RuleNode[];
}

export type RuleNode = RuleCondition | RuleGroup;

export interface RuleAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface RuleDefinition {
  /** Event id. Empty until one is chosen. */
  event: string;
  conditions: RuleGroup;
  actions: RuleAction[];
}

export const OPERATORS: Record<RuleFieldKind, RuleOperator[]> = {
  text: ["is", "isNot", "contains", "startsWith", "isEmpty", "isNotEmpty"],
  number: ["is", "isNot", "gt", "gte", "lt", "lte"],
  select: ["is", "isNot"],
  boolean: ["is"],
};

/** Operators that take no value. */
export const UNARY: readonly RuleOperator[] = ["isEmpty", "isNotEmpty"];

let counter = 0;
export function ruleUid(prefix = "r"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

export function emptyRule(): RuleDefinition {
  return { event: "", conditions: newGroup("and"), actions: [] };
}

export function newGroup(join: RuleJoin = "and"): RuleGroup {
  return { kind: "group", id: ruleUid("g"), join, children: [] };
}

/** A condition on a field with its first operator and a sensible starting value. */
export function newCondition(field: RuleField | undefined): RuleCondition {
  const kind = field?.kind ?? "text";
  return { kind: "condition", id: ruleUid("c"), field: field?.id ?? "", op: OPERATORS[kind][0] as RuleOperator, value: kind === "boolean" ? "true" : kind === "select" ? (field?.options?.[0]?.value ?? "") : "" };
}

/** Changes one node wherever it is. */
export function updateNode(group: RuleGroup, id: string, change: (n: RuleNode) => RuleNode): RuleGroup {
  if (group.id === id) return change(group) as RuleGroup;
  return { ...group, children: group.children.map((c) => (c.id === id ? change(c) : c.kind === "group" ? updateNode(c, id, change) : c)) };
}

export function removeNode(group: RuleGroup, id: string): RuleGroup {
  return { ...group, children: group.children.filter((c) => c.id !== id).map((c) => (c.kind === "group" ? removeNode(c, id) : c)) };
}

export function addChild(group: RuleGroup, parentId: string, node: RuleNode): RuleGroup {
  return updateNode(group, parentId, (n) => (n.kind === "group" ? { ...n, children: [...n.children, node] } : n));
}

export function countConditions(group: RuleGroup): number {
  return group.children.reduce((n, c) => n + (c.kind === "group" ? countConditions(c) : 1), 0);
}

/** How deep the deepest group sits: the root is 1. */
export function groupDepth(group: RuleGroup): number {
  return 1 + Math.max(0, ...group.children.map((c) => (c.kind === "group" ? groupDepth(c) : 0)));
}

/** A value that fits the field: changing a field resets an operator or value that no longer applies. */
export function retarget(cond: RuleCondition, field: RuleField | undefined): RuleCondition {
  const kind = field?.kind ?? "text";
  const op = OPERATORS[kind].includes(cond.op) ? cond.op : (OPERATORS[kind][0] as RuleOperator);
  const fresh = newCondition(field);
  const keep = field && cond.field === field.id;
  return { ...cond, field: field?.id ?? "", op, value: keep ? cond.value : fresh.value };
}

export type RuleIssueCode = "no-event" | "no-actions" | "no-field" | "no-value" | "action-field";

export interface RuleIssue {
  code: RuleIssueCode;
  /** Condition or action id. */
  id?: string;
  field?: string;
}

export function validateRule(rule: RuleDefinition, fields: readonly RuleField[], actionTypes: readonly RuleActionType[]): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (!rule.event) issues.push({ code: "no-event" });
  const walk = (g: RuleGroup) => {
    for (const c of g.children) {
      if (c.kind === "group") walk(c);
      else if (!fields.some((f) => f.id === c.field)) issues.push({ code: "no-field", id: c.id });
      else if (!UNARY.includes(c.op) && c.value.trim() === "") issues.push({ code: "no-value", id: c.id });
    }
  };
  walk(rule.conditions);
  if (rule.actions.length === 0) issues.push({ code: "no-actions" });
  for (const a of rule.actions) {
    const type = actionTypes.find((t) => t.id === a.type);
    for (const f of type?.fields ?? []) {
      const v = a.config[f.name];
      if (f.required && f.kind !== "boolean" && (v === undefined || v === null || v === "")) issues.push({ code: "action-field", id: a.id, field: f.name });
    }
  }
  return issues;
}

/** Runs the condition tree against a record: an empty group is true. */
export function evaluateConditions(group: RuleGroup, data: Record<string, unknown>, fields: readonly RuleField[]): boolean {
  const results = group.children.map((c) => (c.kind === "group" ? evaluateConditions(c, data, fields) : evaluateCondition(c, data, fields)));
  if (results.length === 0) return true;
  return group.join === "and" ? results.every(Boolean) : results.some(Boolean);
}

function evaluateCondition(c: RuleCondition, data: Record<string, unknown>, fields: readonly RuleField[]): boolean {
  const kind = fields.find((f) => f.id === c.field)?.kind ?? "text";
  const raw = data[c.field];
  const text = raw === undefined || raw === null ? "" : String(raw);
  if (c.op === "isEmpty") return text === "";
  if (c.op === "isNotEmpty") return text !== "";
  if (kind === "number") {
    const a = Number(text);
    const b = Number(c.value);
    if (text === "" || Number.isNaN(a) || Number.isNaN(b)) return c.op === "isNot";
    return c.op === "is" ? a === b : c.op === "isNot" ? a !== b : c.op === "gt" ? a > b : c.op === "gte" ? a >= b : c.op === "lt" ? a < b : a <= b;
  }
  const a = kind === "text" ? text.toLowerCase() : text;
  const b = kind === "text" ? c.value.toLowerCase() : c.value;
  switch (c.op) {
    case "is":
      return a === b;
    case "isNot":
      return a !== b;
    case "contains":
      return a.includes(b);
    case "startsWith":
      return a.startsWith(b);
    default:
      return false;
  }
}

export interface RuleWords {
  when: (event: string) => string;
  ifWord: string;
  then: string;
  ops: Record<RuleOperator, string>;
  noConditions: string;
  join: (join: RuleJoin) => string;
}

/** The rule as one sentence, for the summary line: "When X, if A and B, then C, D". */
export function describeRule(rule: RuleDefinition, fields: readonly RuleField[], events: readonly RuleEvent[], actionTypes: readonly RuleActionType[], w: RuleWords): string {
  const event = events.find((e) => e.id === rule.event);
  const cond = (c: RuleCondition) => {
    const f = fields.find((x) => x.id === c.field);
    const value = f?.kind === "select" ? (f.options?.find((o) => o.value === c.value)?.label ?? c.value) : c.value;
    return [f?.label ?? "…", w.ops[c.op], UNARY.includes(c.op) ? "" : value || "…"].filter(Boolean).join(" ");
  };
  const group = (g: RuleGroup, nested: boolean): string => {
    const parts = g.children.map((c) => (c.kind === "group" ? group(c, true) : cond(c))).filter(Boolean);
    const text = parts.join(` ${w.join(g.join)} `);
    return nested && parts.length > 1 ? `(${text})` : text;
  };
  const conditions = group(rule.conditions, false);
  const actions = rule.actions.map((a) => actionTypes.find((t) => t.id === a.type)?.label ?? "…").join(", ");
  return [w.when(event?.label ?? "…"), conditions ? `${w.ifWord} ${conditions}` : w.noConditions, `${w.then} ${actions || "…"}`].join(", ");
}
