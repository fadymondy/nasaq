// nqFormBuilder: the admin side of public forms. The markup is the React FormBuilder's (see the Blade form-builder component);
// the definition helpers are form-builder-logic.ts (copied from form-model.ts) and the preview rules are public-form-logic.ts.
//
//   <div data-slot="form-builder" x-data="nqFormBuilder({ form, formKey, embedBaseUrl, t, p, ar })"
//        x-on:nq-form-builder-change="draft = $event.detail.form" x-on:nq-form-builder-save="$event.detail.waitUntil(save($event.detail.form))">
//
// `form` is the FormDefinition being edited (read it from the nq-form-builder-change event, { form }, or $data). The Save button fires
// nq-form-builder-save ({ form, waitUntil(promise) }); the button shows busy until the promise settles. The live preview is drawn
// from the same definition: fields show, hide and become required by the rules, and it validates but never sends.
// Row actions (move, duplicate, remove) run through act(action, id) from the row context menu.

import {
  FORM_FIELD_KINDS,
  formOriginAllowed,
  formEmbedSnippet,
  formatFormOptions,
  moveFormField,
  newFormField,
  newFormRule,
  normalizeFormOrigin,
  parseFormOptions,
  uniqueFormFieldId,
  type FormDefinition,
  type FormFieldDef,
  type FormFieldKind,
} from "./form-builder-logic";
import { formFieldStates, validateFormValues, type FormErrorCode, type FormFieldState, type FormValues } from "./public-form-logic";
import type { Magics, Register } from "./types";

interface Strings {
  untitled: string;
  originsOpen: string;
  originsClosed: string;
  originsInvalid: string;
  originTestAllowed: string;
  originTestBlocked: string;
  rule: string;
  show: string;
  hide: string;
  requireField: string;
  target: string;
  event: string;
  kinds: Record<FormFieldKind, string>;
}
interface Config {
  form?: Partial<FormDefinition>;
  formKey?: string;
  embedBaseUrl?: string;
  /** The builder's own words in the current language. */
  t: Strings;
  /** The English and Arabic kind names, for the label of a field added from the menu. */
  kindsEn?: Record<FormFieldKind, string>;
  kindsAr?: Record<FormFieldKind, string>;
  /** The preview's words: errors (by code), optional, choose. */
  p?: { errors?: Partial<Record<FormErrorCode, string>> };
  ar?: boolean;
}

const BLANK: FormDefinition = {
  name: "",
  kind: "inquiry",
  fields: [],
  rules: [],
  allowedOrigins: [],
  enabled: true,
  thanksEn: "Thank you!",
  thanksAr: "شكرًا لك!",
  honeypot: true,
};
const ERRORS: Record<FormErrorCode, string> = {
  required: "This field is required.",
  email: "Enter a valid email address.",
  phone: "Enter a phone number with its country code.",
  number: "Enter a number.",
};
const WITH_OPTIONS = ["select", "radio"];

interface State extends Magics {
  form: FormDefinition;
  selected: string | null;
  style: "iframe" | "script";
  probe: string;
  originError: boolean;
  pick: string | null;
  optionsText: string;
  answers: FormValues;
  errors: Record<string, FormErrorCode>;
  done: boolean;
  saving: boolean;
  root: HTMLElement | undefined;
  t: Strings;
  formKey: string;
  embedBaseUrl: string;
  ar: boolean;
  config: Config;
  readonly current: FormFieldDef | null;
  kindModel: string;
  label(f: FormFieldDef): string;
  shown(f: FormFieldDef): string;
  kindName(kind: string): string;
  choose(id: string): void;
  syncOptions(): void;
  addField(kind: FormFieldKind): void;
  removeField(id: string): void;
  duplicateField(id: string): void;
  move(id: string, by: -1 | 1): void;
  act(action: string, id: string): void;
  ruleFields(): unknown[];
  ruleActionTypes(): unknown[];
  closed(): boolean;
  states(): Record<string, FormFieldState>;
  clearPreview(id: string): void;
  probeState(): string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const formBuilder: Register = (Alpine) => {
  Alpine.data("nqFormBuilder", (config: Config) => ({
    form: { ...clone(BLANK), ...clone(config.form ?? {}) } as FormDefinition,
    selected: null as string | null,
    style: "iframe" as "iframe" | "script",
    probe: "",
    originError: false,
    pick: null as string | null,
    optionsText: "",
    answers: {} as FormValues,
    errors: {} as Record<string, FormErrorCode>,
    done: false,
    saving: false,
    root: undefined as HTMLElement | undefined,
    t: config.t,
    formKey: config.formKey ?? "pk_live_demo",
    embedBaseUrl: config.embedBaseUrl ?? "https://forms.example.com",
    ar: Boolean(config.ar),
    config,

    init(this: State) {
      this.root = this.$el;
      this.selected = this.form.fields[0]?.id ?? null;
      this.syncOptions();
      this.$watch("form", () => this.$dispatch("nq-form-builder-change", { form: clone(this.form) }));
      // The add menu is a one-shot picker: it adds the kind and goes back to its placeholder.
      this.$watch("pick", (kind: string | null) => {
        if (!kind) return;
        this.addField(kind as FormFieldKind);
        this.$nextTick(() => (this.pick = null));
      });
      this.$watch("selected", () => this.syncOptions());
      this.$watch("optionsText", (text: string) => {
        const field = this.current;
        if (field && WITH_OPTIONS.includes(field.kind) && text !== formatFormOptions(field.options)) field.options = parseFormOptions(text);
      });
      // Typed sites are cleaned up to their origin; the rest are dropped.
      this.$watch("form.allowedOrigins", (now: string[]) => {
        this.originError = false;
        const next: string[] = [];
        for (const tag of now) {
          const origin = normalizeFormOrigin(tag);
          if (origin && !next.includes(origin)) next.push(origin);
        }
        if (JSON.stringify(next) !== JSON.stringify(now)) this.form.allowedOrigins = next;
      });
    },

    get current(): FormFieldDef | null {
      return (this as unknown as State).form.fields.find((f) => f.id === (this as unknown as State).selected) ?? null;
    },
    /** The type of the selected field. Changing it keeps (or adds) the options a choice needs. */
    get kindModel(): string {
      return (this as unknown as State).current?.kind ?? "text";
    },
    set kindModel(value: string) {
      const self = this as unknown as State;
      const field = self.current;
      if (!field || !(FORM_FIELD_KINDS as readonly string[]).includes(value) || value === field.kind) return;
      const kind = value as FormFieldKind;
      if (WITH_OPTIONS.includes(kind) && !field.options?.length) field.options = newFormField(kind, []).options;
      field.kind = kind;
      self.syncOptions();
    },

    label(this: State, f: FormFieldDef) {
      return (this.ar ? f.labelAr || f.label : f.label || f.labelAr) || "";
    },
    shown(this: State, f: FormFieldDef) {
      return this.label(f) || this.t.untitled;
    },
    kindName(this: State, kind: string) {
      return this.t.kinds[kind as FormFieldKind] ?? kind;
    },
    choose(this: State, id: string) {
      this.selected = id;
    },
    syncOptions(this: State) {
      this.optionsText = formatFormOptions(this.current?.options);
    },

    addField(this: State, kind: FormFieldKind) {
      const field = newFormField(kind, this.form.fields, this.config.kindsEn?.[kind] ?? "", this.config.kindsAr?.[kind] ?? "");
      this.form.fields = [...this.form.fields, field];
      this.selected = field.id;
    },
    removeField(this: State, id: string) {
      const index = this.form.fields.findIndex((f) => f.id === id);
      const fields = this.form.fields.filter((f) => f.id !== id);
      this.form.rules = this.form.rules
        .map((r) => ({ ...r, actions: r.actions.filter((a) => a.config?.target !== id) }))
        .filter((r) => r.actions.length > 0);
      this.form.fields = fields;
      this.selected = fields[Math.min(index, fields.length - 1)]?.id ?? null;
    },
    duplicateField(this: State, id: string) {
      const source = this.form.fields.find((f) => f.id === id);
      if (!source) return;
      const copy = { ...clone(source), id: uniqueFormFieldId(source.id, this.form.fields) };
      const at = this.form.fields.findIndex((f) => f.id === id);
      const fields = [...this.form.fields];
      fields.splice(at + 1, 0, copy);
      this.form.fields = fields;
      this.selected = copy.id;
    },
    move(this: State, id: string, by: -1 | 1) {
      this.form.fields = moveFormField(this.form.fields, id, by);
    },
    /** A row menu item ran: up, down, dup or remove. */
    act(this: State, action: string, id: string) {
      if (action === "up") this.move(id, -1);
      else if (action === "down") this.move(id, 1);
      else if (action === "dup") this.duplicateField(id);
      else if (action === "remove") this.removeField(id);
    },

    /** The fields the rule builders can test, in the current language. */
    ruleFields(this: State) {
      return this.form.fields.map((f) => ({
        id: f.id,
        label: this.label(f) || f.id,
        kind: f.kind === "number" ? "number" : f.kind === "checkbox" ? "boolean" : f.kind === "select" || f.kind === "radio" ? "select" : "text",
        options: f.options?.map((o) => ({ value: o.value, label: (this.ar ? o.labelAr || o.label : o.label) || o.value })),
      }));
    },
    ruleActionTypes(this: State) {
      const targets = this.ruleFields().map((f) => ({ value: (f as { id: string }).id, label: (f as { label: string }).label }));
      return (["show", "hide", "require"] as const).map((id) => ({
        id,
        label: id === "require" ? this.t.requireField : this.t[id],
        fields: [{ name: "target", label: this.t.target, kind: "select", required: true, options: targets }],
        defaults: { target: "" },
      }));
    },
    ruleTitle(this: State, i: number) {
      return this.t.rule.replace("{n}", String(i + 1));
    },
    addRule(this: State) {
      this.form.rules = [...this.form.rules, newFormRule("show")];
    },
    removeRule(this: State, i: number) {
      this.form.rules = this.form.rules.filter((_, j) => j !== i);
    },

    hasPlaceholder(this: State) {
      return !!this.current && !["checkbox", "radio", "select"].includes(this.current.kind);
    },
    hasOptions(this: State) {
      return !!this.current && WITH_OPTIONS.includes(this.current.kind);
    },
    isPlain(this: State, kind: string) {
      return !["textarea", "select", "radio", "checkbox"].includes(kind);
    },
    dirOf(this: State, f: FormFieldDef) {
      return f.kind === "email" ? "ltr" : null;
    },
    noRules(this: State) {
      return this.form.rules.length === 0 && this.form.fields.length > 0;
    },
    busy(this: State) {
      return this.saving ? "true" : null;
    },
    pressed(this: State, name: string) {
      return String(this.style === name);
    },

    closed(this: State) {
      return this.form.allowedOrigins.length === 0;
    },
    originsText(this: State) {
      return this.closed() ? this.t.originsClosed : this.t.originsOpen.replace("{n}", String(this.form.allowedOrigins.length));
    },
    /** A refused site: the tag input fires "reject". */
    onReject(this: State, event: CustomEvent<{ reason: string }>) {
      this.originError = event.detail?.reason === "invalid";
    },
    isOrigin(this: State, tag: string) {
      return normalizeFormOrigin(tag) !== null;
    },
    /** "allowed", "blocked" or "" while nothing is typed. */
    probeState(this: State) {
      if (!this.probe.trim()) return "";
      return formOriginAllowed(this.form.allowedOrigins, this.probe) ? "allowed" : "blocked";
    },
    probeText(this: State) {
      const s = this.probeState();
      return s === "allowed" ? this.t.originTestAllowed : s === "blocked" ? this.t.originTestBlocked : "";
    },
    publicLink(this: State) {
      return `${this.embedBaseUrl.replace(/\/+$/, "")}/f/${this.formKey}`;
    },
    snippet(this: State) {
      return formEmbedSnippet({ baseUrl: this.embedBaseUrl, formKey: this.formKey, style: this.style, title: this.form.name || "Form" });
    },
    /** The iframe / script switch: the pressed one is marked. */
    isStyle(this: State, name: string) {
      return this.style === name;
    },
    styleMark(this: State, name: string) {
      return this.style === name ? "" : null;
    },
    setStyle(this: State, name: string) {
      this.style = name === "script" ? "script" : "iframe";
    },

    async save(this: State) {
      const pending: unknown[] = [];
      this.root?.dispatchEvent(new CustomEvent("nq-form-builder-save", { bubbles: true, detail: { form: clone(this.form), waitUntil: (p: unknown) => void pending.push(p) } }));
      this.saving = true;
      try {
        await Promise.all(pending);
      } finally {
        this.saving = false;
      }
    },

    // The live preview: the rules decide what shows; submitting only validates.
    states(this: State) {
      return formFieldStates(this.form, this.answers);
    },
    visible(this: State, id: string) {
      return this.states()[id]?.visible !== false;
    },
    needed(this: State, id: string) {
      return this.states()[id]?.required === true;
    },
    optLabel(this: State, o: { label: string; labelAr?: string }) {
      return (this.ar ? o.labelAr || o.label : o.label || o.labelAr) || "";
    },
    hint(this: State, f: FormFieldDef) {
      return (this.ar ? f.helpAr || f.help : f.help || f.helpAr) || "";
    },
    hold(this: State, f: FormFieldDef) {
      return (this.ar ? f.placeholderAr || f.placeholder : f.placeholder || f.placeholderAr) || "";
    },
    thanks(this: State) {
      return (this.ar ? this.form.thanksAr || this.form.thanksEn : this.form.thanksEn || this.form.thanksAr) || "";
    },
    problem(this: State, id: string) {
      const code = this.errors[id];
      return code ? { ...ERRORS, ...this.config.p?.errors }[code] : "";
    },
    clearPreview(this: State, id: string) {
      if (this.errors[id]) {
        const { [id]: _drop, ...rest } = this.errors;
        this.errors = rest;
      }
    },
    previewSubmit(this: State) {
      this.errors = validateFormValues(this.form, this.answers);
      if (Object.keys(this.errors).length === 0) this.done = true;
    },
    previewAgain(this: State) {
      this.answers = {};
      this.errors = {};
      this.done = false;
    },
  }));
};
