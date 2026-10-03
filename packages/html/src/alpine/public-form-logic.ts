// The pure logic of the public form, ported from form-model.ts: which fields show and which are required for the answers so far, what is
// wrong with the answers and what gets sent. No Register export, so the generated index skips it; public-form.ts imports it.

export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;
export type FormErrorCode = "required" | "email" | "phone" | "number";

export interface FormFieldLite {
  id: string;
  kind: string;
  required?: boolean;
}
interface Condition {
  kind?: "condition";
  field: string;
  op: string;
  value: string;
}
interface Group {
  kind: "group";
  join: "and" | "or";
  children: (Group | Condition)[];
}
export interface FormRuleLite {
  conditions: Group;
  actions: { type: string; config?: { target?: unknown } }[];
}
export interface FormFieldState {
  visible: boolean;
  required: boolean;
}

/** ٠-٩ and ۰-۹ to 0-9, and the Arabic decimal mark to a dot, so numbers read the same in either digits. */
export function formDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".");
}

function conditionMatches(c: Condition, fields: readonly FormFieldLite[], values: FormValues): boolean {
  const kind = fields.find((f) => f.id === c.field)?.kind;
  const raw = values[c.field];
  const text = raw === undefined || raw === null ? "" : String(raw);
  if (c.op === "isEmpty") return text === "";
  if (c.op === "isNotEmpty") return text !== "";
  if (kind === "number") {
    const a = Number(formDigits(text));
    const b = Number(formDigits(c.value));
    if (text === "" || Number.isNaN(a) || Number.isNaN(b)) return c.op === "isNot";
    return c.op === "is" ? a === b : c.op === "isNot" ? a !== b : c.op === "gt" ? a > b : c.op === "gte" ? a >= b : c.op === "lt" ? a < b : a <= b;
  }
  const a = text.toLowerCase();
  const b = c.value.toLowerCase();
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

function groupMatches(g: Group, fields: readonly FormFieldLite[], values: FormValues): boolean {
  const results = g.children.map((n) => (n.kind === "group" ? groupMatches(n, fields, values) : conditionMatches(n, fields, values)));
  if (results.length === 0) return true;
  return g.join === "and" ? results.every(Boolean) : results.some(Boolean);
}

/** Applies the rules to the answers. A field a `show` rule targets stays hidden until one matches; `hide` hides it while it matches; `require` makes it mandatory. */
export function formFieldStates(form: { fields: readonly FormFieldLite[]; rules: readonly FormRuleLite[] }, values: FormValues): Record<string, FormFieldState> {
  const shown = new Set<string>();
  const shownTargets = new Set<string>();
  const hidden = new Set<string>();
  const required = new Set<string>();
  for (const rule of form.rules) {
    const matched = groupMatches(rule.conditions, form.fields, values);
    for (const action of rule.actions) {
      const target = String(action.config?.target ?? "");
      if (!target) continue;
      if (action.type === "show") {
        shownTargets.add(target);
        if (matched) shown.add(target);
      } else if (action.type === "hide" && matched) hidden.add(target);
      else if (action.type === "require" && matched) required.add(target);
    }
  }
  const out: Record<string, FormFieldState> = {};
  for (const f of form.fields) {
    const visible = !hidden.has(f.id) && (!shownTargets.has(f.id) || shown.has(f.id));
    out[f.id] = { visible, required: visible && (Boolean(f.required) || required.has(f.id)) };
  }
  return out;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const E164 = /^\+[1-9]\d{6,14}$/;

/** What is wrong with the answers, by field id. Hidden fields are skipped. */
export function validateFormValues(form: { fields: readonly FormFieldLite[]; rules: readonly FormRuleLite[] }, values: FormValues): Record<string, FormErrorCode> {
  const states = formFieldStates(form, values);
  const errors: Record<string, FormErrorCode> = {};
  for (const f of form.fields) {
    const state = states[f.id];
    if (!state?.visible) continue;
    const raw = values[f.id];
    const text = typeof raw === "string" ? raw.trim() : "";
    if (f.kind === "checkbox") {
      if (state.required && raw !== true) errors[f.id] = "required";
      continue;
    }
    if (text === "") {
      if (state.required) errors[f.id] = "required";
      continue;
    }
    if (f.kind === "email" && !EMAIL.test(text)) errors[f.id] = "email";
    else if (f.kind === "phone" && !E164.test(text.replace(/[\s()-]/g, ""))) errors[f.id] = "phone";
    else if (f.kind === "number" && Number.isNaN(Number(formDigits(text)))) errors[f.id] = "number";
  }
  return errors;
}

/** The hidden field bots fill in. People never see or reach it. */
export const FORM_HONEYPOT = "website_url";

/** Only what is visible is sent. `spam` is true when the honeypot was filled: drop it, but show the thank-you anyway. */
export function buildFormSubmission(form: { fields: readonly FormFieldLite[]; rules: readonly FormRuleLite[]; honeypot: boolean }, values: FormValues): { data: FormValues; spam: boolean } {
  const states = formFieldStates(form, values);
  const data: FormValues = {};
  for (const f of form.fields) {
    if (!states[f.id]?.visible) continue;
    const v = values[f.id];
    if (v === undefined || v === "") continue;
    data[f.id] = typeof v === "string" ? v.trim() : v;
  }
  return { data, spam: form.honeypot && String(values[FORM_HONEYPOT] ?? "").trim() !== "" };
}
