// The pure builder helpers of the form builder, copied from the React form-model.ts (the public form logic lives in public-form-logic.ts).
// No Register export, so the generated index skips it; form-builder.ts imports it.

import type { FormFieldLite, FormRuleLite } from "./public-form-logic";

export const FORM_FIELD_KINDS = ["text", "email", "phone", "number", "textarea", "select", "radio", "checkbox"] as const;
export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number];

export interface FormFieldOption {
  value: string;
  label: string;
  labelAr?: string;
}
export interface FormFieldDef extends FormFieldLite {
  kind: FormFieldKind;
  label: string;
  labelAr?: string;
  help?: string;
  helpAr?: string;
  placeholder?: string;
  placeholderAr?: string;
  required?: boolean;
  options?: FormFieldOption[];
}
export interface FormRuleDef extends FormRuleLite {
  event?: string;
  conditions: FormRuleLite["conditions"] & { id?: string };
  actions: { id?: string; type: string; config?: { target?: unknown } }[];
}
export interface FormDefinition {
  name: string;
  kind: string;
  fields: FormFieldDef[];
  rules: FormRuleDef[];
  allowedOrigins: string[];
  enabled: boolean;
  thanksEn: string;
  thanksAr: string;
  honeypot: boolean;
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

/** "https://Example.com/path" to "https://example.com". `https://*.example.com` allows subdomains. Null for anything that is not an http(s) origin. */
export function normalizeFormOrigin(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  const m = /^(https?):\/\/(\*\.)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*)(:\d{1,5})?(?:[/?#].*)?$/.exec(text);
  if (!m) return null;
  if (m[2] && !m[3]?.includes(".")) return null;
  return `${m[1]}://${m[2] ?? ""}${m[3]}${m[4] ?? ""}`;
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

let nextRuleId = 0;
/** A blank rule that shows, hides or requires a field. Give it a target and a condition. */
export function newFormRule(action: "show" | "hide" | "require" = "show"): FormRuleDef {
  nextRuleId += 1;
  return {
    event: "change",
    conditions: { kind: "group", id: `fg${nextRuleId}`, join: "and", children: [] },
    actions: [{ id: `fa${nextRuleId}`, type: action, config: { target: "" } }],
  };
}
