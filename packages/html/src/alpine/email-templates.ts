// nqEmailTemplates: a gallery of email templates with an editor and a sandboxed live preview. The markup is the React EmailTemplates'
// (see the Blade component); templates, variables and every string come from the options.
//
//   <div data-slot="email-templates" x-data="nqEmailTemplates({ templates: [...], variables: [{ key: 'first_name', label: 'First name', sample: 'Sara' }], labels: {...} })"> … </div>
//
// Options: templates, variables, sender { name, email }, recipient, selectedId (open this template first), locale, canSave, canDuplicate,
// canDelete, canSendTest, labels (every string of the Blade component; {name}, {key}, {keys} are placeholders).
// Events (bubbling, detail.promise may be set to a Promise, or one resolving to { error }):
//   nq-email-template-save       { template }          on success the template is added or replaced in the list
//   nq-email-template-duplicate  { template }          resolve { template } to add the copy to the list
//   nq-email-template-delete     { template }          on success it leaves the list
//   nq-email-template-send-test  { template, email }
// With no listener each action succeeds on the spot. `templates` is x-modelable.

import type { Magics, Register } from "./types";

/* ------------------------------------------------------------ pure helpers (same as the React email-render.ts) */

export interface EmailVariable {
  key: string;
  label: string;
  sample: string;
}
type Dir = "ltr" | "rtl";
const VARIABLE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const findVariables = (text: string): string[] => {
  const seen = new Set<string>();
  for (const m of text.matchAll(VARIABLE)) seen.add(m[1]!);
  return [...seen];
};

const fillVariables = (text: string, variables: readonly EmailVariable[], html = false): string => {
  const byKey = new Map(variables.map((v) => [v.key, v.sample]));
  return text.replace(VARIABLE, (whole, key: string) => {
    const value = byKey.get(key);
    if (value === undefined) return whole;
    return html ? escapeHtml(value) : value;
  });
};

const INK = "rgb(24, 24, 27)";
const MUTED = "rgb(113, 113, 122)";
const PAPER = "rgb(255, 255, 255)";
const DESK = "rgb(244, 244, 245)";
const LINE = "rgb(228, 228, 231)";

const renderEmailDocument = (input: { body: string; preheader?: string; dir?: Dir; variables?: readonly EmailVariable[]; footer?: string }): string => {
  const { body, preheader, dir = "ltr", variables = [], footer } = input;
  const filled = fillVariables(body, variables, true);
  const pre = preheader ? fillVariables(preheader, variables, true) : "";
  const foot = footer ? fillVariables(footer, variables, true) : "";
  const font = dir === "rtl" ? "'Segoe UI', Tahoma, Arial, sans-serif" : "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  return `<!doctype html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;padding:0;background:${DESK};color:${INK};font-family:${font};font-size:15px;line-height:1.6}
.wrap{max-width:600px;margin:0 auto;padding:24px 12px}
.card{background:${PAPER};border:1px solid ${LINE};border-radius:8px;padding:32px 28px}
.pre{display:none;max-height:0;overflow:hidden;opacity:0}
h1,h2,h3{margin:0 0 12px;line-height:1.25;color:${INK}}
h1{font-size:24px}h2{font-size:20px}h3{font-size:17px}
p{margin:0 0 14px}
a{color:${INK};text-decoration:underline}
blockquote{margin:0 0 14px;padding-inline-start:14px;border-inline-start:3px solid ${LINE};color:${MUTED}}
ul,ol{margin:0 0 14px;padding-inline-start:22px}
li p{margin:0}
code{background:${DESK};padding:1px 4px;border-radius:3px;font-family:ui-monospace,Consolas,monospace;font-size:13px}
.foot{padding:16px 8px 0;color:${MUTED};font-size:12px;text-align:center}
</style>
</head>
<body>
${pre ? `<span class="pre">${pre}</span>` : ""}
<div class="wrap"><div class="card">${filled}</div>${foot ? `<div class="foot">${foot}</div>` : ""}</div>
</body>
</html>`;
};

/* ------------------------------------------------------------ component */

type Category = "welcome" | "transactional" | "marketing" | "notification";
const CATEGORY_ORDER: Category[] = ["welcome", "transactional", "marketing", "notification"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Template {
  id: string;
  name: string;
  category: Category;
  status: "draft" | "active";
  subject: string;
  preheader?: string;
  body: string;
  dir?: Dir;
  footer?: string;
  updatedAt?: string | number;
}

interface Options {
  templates?: Template[];
  variables?: EmailVariable[];
  sender?: { name: string; email: string };
  recipient?: string;
  selectedId?: string;
  locale?: string;
  canSave?: boolean;
  canDuplicate?: boolean;
  canDelete?: boolean;
  canSendTest?: boolean;
  labels?: Record<string, unknown>;
}

interface Message {
  tone: "danger" | "success";
  text: string;
}

type Result = { error?: string; template?: Template } | undefined | void;

interface State extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
  templates: Template[];
  variables: EmailVariable[];
  sender: { name: string; email: string } | null;
  recipient: string;
  locale: string;
  rtl: boolean;
  canSave: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  canSendTest: boolean;
  labels: Record<string, string> & { categories: Record<Category, string>; statuses: Record<string, string> };
  query: string;
  category: "all" | Category;
  pane: "edit" | "preview";
  device: "desktop" | "mobile";
  draft: Template | null;
  baseline: string;
  touched: boolean;
  saving: boolean;
  message: Message | null;
  error: string | null;
  busy: boolean;
  pendingDelete: Template | null;
  deleteOpen: boolean;
  testOpen: boolean;
  testEmail: string;
  testPending: boolean;
  testMessage: Message | null;
  root: HTMLElement | null;
}

export const emailTemplates: Register = (Alpine) => {
  Alpine.data("nqEmailTemplates", (options: Options = {}) => ({
    templates: (options.templates ?? []).map((t) => ({ ...t })),
    variables: options.variables ?? [],
    sender: options.sender ?? null,
    recipient: options.recipient ?? "",
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    rtl: (options.locale ?? "").startsWith("ar"),
    canSave: options.canSave !== false,
    canDuplicate: options.canDuplicate !== false,
    canDelete: options.canDelete !== false,
    canSendTest: options.canSendTest !== false,
    labels: (options.labels ?? {}) as State["labels"],
    query: "",
    category: "all" as "all" | Category,
    pane: "edit" as "edit" | "preview",
    device: "desktop" as "desktop" | "mobile",
    draft: null as Template | null,
    baseline: "",
    touched: false,
    saving: false,
    message: null as Message | null,
    error: null as string | null,
    busy: false,
    pendingDelete: null as Template | null,
    deleteOpen: false,
    testOpen: false,
    testEmail: options.recipient ?? "",
    testPending: false,
    testMessage: null as Message | null,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      const first = options.selectedId ? this.templates.find((t) => t.id === options.selectedId) : undefined;
      if (first) this.edit(first);
      // The rich text editor rewrites the body into its own schema on mount. Treat that as the baseline, not as an edit.
      this.$watch("draft?.body", (body: string) => {
        if (this.draft && !this.touched) {
          const base = JSON.parse(this.baseline) as Template;
          if (base.body !== body) this.baseline = JSON.stringify({ ...base, body });
        }
      });
      this.$watch("testOpen", (open: boolean) => {
        if (!open) this.testMessage = null;
      });
      this.$watch("deleteOpen", (open: boolean) => {
        if (!open) this.pendingDelete = null;
      });
    },

    /* strings */
    fmt(this: State, key: string, vars: Record<string, string> = {}): string {
      return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), String(this.labels[key] ?? ""));
    },

    /* gallery */
    get shown(): Template[] {
      const s = this as unknown as State;
      const q = s.query.trim().toLowerCase();
      return s.templates.filter((t) => (s.category === "all" || t.category === s.category) && (!q || `${t.name} ${t.subject}`.toLowerCase().includes(q)));
    },
    get present(): Category[] {
      const s = this as unknown as State;
      return CATEGORY_ORDER.filter((c) => s.templates.some((t) => t.category === c));
    },
    srcdocOf(this: State, t: Pick<Template, "body" | "preheader" | "dir" | "footer">): string {
      return renderEmailDocument({ body: t.body, preheader: t.preheader, dir: t.dir, variables: this.variables, footer: t.footer });
    },
    fill(this: State, text: string): string {
      return fillVariables(text ?? "", this.variables);
    },
    dateOf(this: State, v: string | number | undefined): string {
      return v == null ? "" : new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { dateStyle: "medium" }).format(new Date(v));
    },
    cardName(t: Template): string {
      return t.name;
    },

    /* editor */
    blank(this: State): Template {
      return { id: `new-${Date.now()}`, name: "", category: "transactional", status: "draft", subject: "", preheader: "", body: "<p></p>", dir: this.rtl ? "rtl" : "ltr" };
    },
    edit(this: State, t: Template) {
      this.draft = { ...t, dir: t.dir ?? "ltr" };
      this.baseline = JSON.stringify(this.draft);
      this.touched = false;
      this.pane = "edit";
      this.message = null;
    },
    create(this: State) {
      this.edit(this.blank());
    },
    back(this: State) {
      this.draft = null;
      this.message = null;
    },
    get dirty(): boolean {
      const s = this as unknown as State;
      return s.draft !== null && JSON.stringify(s.draft) !== s.baseline;
    },
    get unknown(): string[] {
      const s = this as unknown as State;
      if (!s.draft) return [];
      const known = new Set(s.variables.map((v) => v.key));
      return findVariables(`${s.draft.subject} ${s.draft.preheader ?? ""} ${s.draft.body}`).filter((k) => !known.has(k));
    },
    get unknownText(): string {
      const s = this as unknown as State & { unknown: string[] };
      return s.fmt("unknown", { keys: s.unknown.join(", ") });
    },
    tag(key: string): string {
      return "{{" + key + "}}";
    },

    /* async actions */
    async ask(this: State, event: string, detail: Record<string, unknown>): Promise<Result> {
      const d: { promise?: unknown } & Record<string, unknown> = { ...detail };
      this.root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: d }));
      return (await d.promise) as Result;
    },
    async save(this: State) {
      if (!this.draft || !this.canSave || this.saving) return;
      const draft = { ...this.draft };
      this.saving = true;
      this.message = null;
      try {
        const r = await this.ask("nq-email-template-save", { template: draft });
        if (r && r.error) this.message = { tone: "danger", text: r.error };
        else {
          const at = this.templates.findIndex((t) => t.id === draft.id);
          this.templates = at < 0 ? [...this.templates, draft] : this.templates.map((t) => (t.id === draft.id ? draft : t));
          this.baseline = JSON.stringify(draft);
          this.message = { tone: "success", text: this.labels.saved ?? "" };
        }
      } catch {
        this.message = { tone: "danger", text: this.labels.failed ?? "" };
      }
      this.saving = false;
    },
    async duplicate(this: State, t: Template) {
      if (this.busy) return;
      this.busy = true;
      this.error = null;
      try {
        const r = await this.ask("nq-email-template-duplicate", { template: { ...t } });
        if (r && r.error) this.error = r.error;
        else if (r && r.template) this.templates = [...this.templates, r.template];
      } catch {
        this.error = this.labels.failed ?? "";
      }
      this.busy = false;
    },
    askDelete(this: State, t: Template) {
      this.pendingDelete = t;
      this.deleteOpen = true;
    },
    async confirmDelete(this: State) {
      const t = this.pendingDelete;
      if (!t || this.busy) return;
      this.busy = true;
      this.error = null;
      try {
        const r = await this.ask("nq-email-template-delete", { template: { ...t } });
        if (r && r.error) this.error = r.error;
        else {
          this.templates = this.templates.filter((x) => x.id !== t.id);
          this.deleteOpen = false;
        }
      } catch {
        this.error = this.labels.failed ?? "";
      }
      this.busy = false;
    },
    openTest(this: State) {
      this.testEmail = this.testEmail || this.recipient;
      this.testOpen = true;
    },
    async sendTest(this: State) {
      if (!this.draft || this.testPending) return;
      if (!EMAIL_RE.test(this.testEmail.trim())) {
        this.testMessage = { tone: "danger", text: this.labels.invalidEmail ?? "" };
        return;
      }
      this.testPending = true;
      this.testMessage = null;
      try {
        const r = await this.ask("nq-email-template-send-test", { template: { ...this.draft }, email: this.testEmail.trim() });
        this.testMessage = r && r.error ? { tone: "danger", text: r.error } : { tone: "success", text: this.labels.sent ?? "" };
      } catch {
        this.testMessage = { tone: "danger", text: this.labels.failed ?? "" };
      }
      this.testPending = false;
    },
  }));
};
