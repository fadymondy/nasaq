/*
 * Public form model: what a form is, which fields show, what is valid, who may embed it and what to paste.
 * Pure functions with no runtime imports, shared by the builder, the renderer, the lab and the node tests.
 *
 * The rules follow moharrik's subscribe forms: origins are a comma-separated list where an EMPTY list allows
 * nothing (a form is closed until you say where it may live), a hidden honeypot drops bots silently, and the
 * thank-you text is kept per language.
 */
import type { RuleCondition, RuleDefinition, RuleGroup } from "../rule-builder/rule-model";

export const FORM_FIELD_KINDS = ["text", "email", "phone", "number", "textarea", "select", "radio", "checkbox"] as const;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];
export type FormKind = "contact" | "subscribe" | "inquiry" | "testimonial";
export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;

export interface FormFieldOption {
  value: string;
  label: string;
  labelAr?: string;
}

export interface FormFieldDef {
  id: string;
  kind: FormFieldKind;
  label: string;
  labelAr?: string;
  help?: string;
  helpAr?: string;
  placeholder?: string;
  placeholderAr?: string;
  required?: boolean;
  /** For select and radio. */
  options?: FormFieldOption[];
}

/** A rule is a RuleBuilder definition whose actions are `show`, `hide` or `require`, each with `config.target` = field id. */
export type FormRule = RuleDefinition;
export type FormRuleAction = "show" | "hide" | "require";

export interface FormDefinition {
  name: string;
  kind: FormKind;
  fields: FormFieldDef[];
  rules: FormRule[];
  /** Where the embedded form may live. Empty allows nothing. */
  allowedOrigins: string[];
  enabled: boolean;
  thanksEn: string;
  thanksAr: string;
  /** Adds a hidden field that people never see; anything typed in it is treated as a bot. Default true. */
  honeypot: boolean;
}

/** Picks the Arabic or English text of a pair, falling back to the other one. */
export function formText(en: string | undefined, ar: string | undefined, locale: string): string {
  const wantsArabic = locale.toLowerCase().startsWith("ar");
  return (wantsArabic ? ar || en : en || ar) ?? "";
}

/* ------------------------------------------------------------------ fields */

/** ٠-٩ and ۰-۹ to 0-9, and the Arabic decimal mark to a dot, so numbers read the same in either digits. */
export function formDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".");
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A field id that is not taken yet: `text`, `text_2`, `text_3`. */
export function uniqueFormFieldId(base: string, fields: readonly Pick<FormFieldDef, "id">[]): string {
  const taken = new Set(fields.map((f) => f.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

export function newFormField(kind: FormFieldKind, fields: readonly FormFieldDef[], label = "", labelAr = ""): FormFieldDef {
  const field: FormFieldDef = { id: uniqueFormFieldId(kind, fields), kind, label, labelAr };
  if (kind === "select" || kind === "radio") {
    field.options = [
      { value: "option-1", label: "Option 1", labelAr: "الخيار 1" },
      { value: "option-2", label: "Option 2", labelAr: "الخيار 2" },
    ];
  }
  return field;
}

export function moveFormField<T extends { id: string }>(fields: readonly T[], id: string, delta: -1 | 1): T[] {
  const from = fields.findIndex((f) => f.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= fields.length) return [...fields];
  const next = [...fields];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** "Riyadh | الرياض" per line to options. The value is a slug of the English text, or option-N. */
export function parseFormOptions(text: string): FormFieldOption[] {
  const out: FormFieldOption[] = [];
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [en = "", ar = ""] = line.split("|").map((s) => s.trim());
      const label = en || ar;
      let value = slug(en) || `option-${i + 1}`;
      while (out.some((o) => o.value === value)) value = `${value}-${i + 1}`;
      out.push(ar && en ? { value, label, labelAr: ar } : en ? { value, label } : { value, label, labelAr: ar });
    });
  return out;
}

export function formatFormOptions(options: readonly FormFieldOption[] | undefined): string {
  return (options ?? []).map((o) => (o.labelAr && o.labelAr !== o.label ? `${o.label} | ${o.labelAr}` : o.label)).join("\n");
}

/* ------------------------------------------------------------------ rules: show, hide, require */

function conditionMatches(c: RuleCondition, fields: readonly FormFieldDef[], values: FormValues): boolean {
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

function groupMatches(g: RuleGroup, fields: readonly FormFieldDef[], values: FormValues): boolean {
  const results = g.children.map((n) => (n.kind === "group" ? groupMatches(n, fields, values) : conditionMatches(n, fields, values)));
  if (results.length === 0) return true;
  return g.join === "and" ? results.every(Boolean) : results.some(Boolean);
}

export interface FormFieldState {
  visible: boolean;
  required: boolean;
}

/**
 * Applies the rules to the current answers. A field a `show` rule targets stays hidden until one of those rules
 * matches; `hide` hides it while it matches; `require` makes it mandatory while it matches. Hidden fields are never required.
 */
export function formFieldStates(form: Pick<FormDefinition, "fields" | "rules">, values: FormValues): Record<string, FormFieldState> {
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

/* ------------------------------------------------------------------ validation and submission */

export type FormErrorCode = "required" | "email" | "phone" | "number";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const E164 = /^\+[1-9]\d{6,14}$/;

/** What is wrong with the answers, by field id. Hidden fields are skipped. */
export function validateFormValues(form: Pick<FormDefinition, "fields" | "rules">, values: FormValues): Record<string, FormErrorCode> {
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
export function buildFormSubmission(form: FormDefinition, values: FormValues): { data: FormValues; spam: boolean } {
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

/* ------------------------------------------------------------------ origins and embed */

/**
 * "https://Example.com/path" to "https://example.com". `https://*.example.com` allows subdomains. Returns null for
 * anything that is not an http(s) origin.
 */
export function normalizeFormOrigin(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  const m = /^(https?):\/\/(\*\.)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*)(:\d{1,5})?(?:[/?#].*)?$/.exec(text);
  if (!m) return null;
  if (m[2] && !m[3]?.includes(".")) return null;
  return `${m[1]}://${m[2] ?? ""}${m[3]}${m[4] ?? ""}`;
}

/** Comma, Arabic comma, semicolon or new line separated. Invalid entries are dropped, duplicates removed. */
export function parseFormOrigins(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[,،;\n]/)) {
    const origin = normalizeFormOrigin(part);
    if (origin && !out.includes(origin)) out.push(origin);
  }
  return out;
}

/** Is this page allowed to embed the form? An empty list allows nothing. */
export function formOriginAllowed(allowed: readonly string[], origin: string): boolean {
  const target = normalizeFormOrigin(origin);
  if (!target || target.includes("*")) return false;
  const t = /^(https?):\/\/([^:]+)(:\d+)?$/.exec(target);
  if (!t) return false;
  return allowed.some((entry) => {
    const a = /^(https?):\/\/(\*\.)?([^:]+)(:\d+)?$/.exec(entry);
    if (!a || a[1] !== t[1] || (a[4] ?? "") !== (t[3] ?? "")) return false;
    return a[2] ? (t[2] as string).endsWith(`.${a[3]}`) : t[2] === a[3];
  });
}

/** What to paste on the site: an iframe, or a script that mounts the form in a div. */
export function formEmbedSnippet({ baseUrl, formKey, style = "iframe", height = 520, title = "Form" }: { baseUrl: string; formKey: string; style?: "iframe" | "script"; height?: number; title?: string }): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (style === "script") {
    return `<div data-nasaq-form="${formKey}"></div>\n<script async src="${base}/embed.js"></script>`;
  }
  return `<iframe src="${base}/f/${formKey}" title="${title}" width="100%" height="${height}" style="border:0" loading="lazy"></iframe>`;
}

/* ------------------------------------------------------------------ presets */

let nextRuleId = 0;
/** A blank rule that shows, hides or requires a field. Give it a target and a condition. */
export function newFormRule(action: FormRuleAction = "show"): FormRule {
  nextRuleId += 1;
  return {
    event: "change",
    conditions: { kind: "group", id: `fg${nextRuleId}`, join: "and", children: [] },
    actions: [{ id: `fa${nextRuleId}`, type: action, config: { target: "" } }],
  };
}

export interface ContactTopic {
  value: string;
  label: string;
  labelAr?: string;
}

/** name, email, topic, message and the honeypot: the contact form every site needs. */
export function contactFormDefinition(topics: readonly ContactTopic[] = [{ value: "sales", label: "Sales", labelAr: "المبيعات" }, { value: "support", label: "Support", labelAr: "الدعم" }, { value: "other", label: "Something else", labelAr: "شيء آخر" }]): FormDefinition {
  return {
    name: "Contact",
    kind: "contact",
    fields: [
      { id: "name", kind: "text", label: "Your name", labelAr: "اسمك", required: true },
      { id: "email", kind: "email", label: "Email", labelAr: "البريد الإلكتروني", required: true },
      { id: "topic", kind: "select", label: "Topic", labelAr: "الموضوع", required: true, options: topics.map((t) => ({ ...t })) },
      { id: "message", kind: "textarea", label: "Message", labelAr: "الرسالة", required: true },
    ],
    rules: [],
    allowedOrigins: [],
    enabled: true,
    thanksEn: "Thanks, we will get back to you soon.",
    thanksAr: "شكرًا لك، سنرد عليك قريبًا.",
    honeypot: true,
  };
}
