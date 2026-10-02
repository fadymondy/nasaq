// nqCannedReplies: the library behind a composer's "/" menu. The list is an <x-nq::entity-list> fed through x-model; the editor dialog,
// the variable buttons with the live preview and the delete confirmation live here. The markup is the React CannedRepliesManager's.
//
//   <div x-data="nqCannedReplies({ replies, variables, can, locale, labels })" @save-reply="$event.detail.wait(…)" @delete-reply="…"> … </div>
//
// It is presentational: every action fires an event on the root with detail `{ …, wait(promise) }`; resolve, or resolve `{ error }` to show it.
// A rejected promise, or nobody listening, shows the generic error. After a success the list is updated here (a new reply takes the `id`
// the handler returns, or a generated one).
//   save-reply    { reply: { id, shortcut, title, body, uses?, updatedAt }, isNew }   -> { error?, id? }   (a new reply has an id that starts with "new-"; a duplicate is a new reply)
//   delete-reply  { id, reply }                                                       -> { error? }

import { nextFreeCannedShortcut, normalizeCannedShortcut, validateCannedReply, type CannedReplyIssue } from "./canned-replies-logic";
import type { Magics, Register } from "./types";

type When = string | number | undefined | null;

interface Reply {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  uses?: number;
  updatedAt?: When;
}
interface Variable {
  key: string;
  label: string;
  sample: string;
}
interface Labels {
  failed: string;
  duplicate: string;
  removeTitle: string;
  issues: Record<CannedReplyIssue, string>;
}
interface Config {
  replies: Reply[];
  variables: Variable[];
  can: { save: boolean; delete: boolean };
  locale: string;
  labels: Labels;
}
type Row = Record<string, unknown>;
type Outcome = { error?: string; id?: string } | void | undefined;

interface Form {
  open: boolean;
  isNew: boolean;
  id: string;
  shortcut: string;
  title: string;
  body: string;
  uses: number | undefined;
  touched: boolean;
  pending: boolean;
  error: string | null;
  invalid: { title: boolean; shortcut: boolean; body: boolean };
  shortcutMessage: string;
  bodyMessage: string;
}

interface State extends Magics {
  config: Config;
  replies: Reply[];
  list: { rows: Row[] };
  failure: string | null;
  form: Form;
  confirm: { open: boolean; title: string; id: string };
  alive: boolean;
  root: HTMLElement | null;
  refresh(): void;
  call(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  startEdit(id: string): void;
  askRemove(id: string): void;
  duplicate(id: string): Promise<void>;
  validateForm(): CannedReplyIssue[];
  onFormInput(): void;
  commit(reply: Reply, isNew: boolean, id?: string): void;
}

const VARIABLE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
const fill = (template: string, vars: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "");
let seq = 0;
const newId = () => `new-${Date.now().toString(36)}${++seq}`;

export const cannedReplies: Register = (Alpine) => {
  Alpine.data("nqCannedReplies", (config: Config) => ({
    config,
    replies: config.replies.map((r) => ({ ...r })),
    list: { rows: [] as Row[] },
    failure: null as string | null,
    form: { open: false, isNew: true, id: "", shortcut: "", title: "", body: "", uses: undefined, touched: false, pending: false, error: null, invalid: { title: false, shortcut: false, body: false }, shortcutMessage: "", bodyMessage: "" } as Form,
    confirm: { open: false, title: "", id: "" },
    alive: true,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      this.refresh();
    },
    destroy(this: State) {
      this.alive = false;
    },

    /* ---- rows ---- */
    dateText(this: State, v: When): string {
      if (v === undefined || v === null || v === "") return "—";
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat(`${this.config.locale}-u-nu-latn`, { dateStyle: "medium" }).format(d);
    },
    numberText(this: State, n: number | undefined): string {
      return n === undefined || n === null ? "—" : new Intl.NumberFormat(`${this.config.locale}-u-nu-latn`).format(n);
    },
    refresh(this: State) {
      const self = this as unknown as { dateText(v: When): string; numberText(n: number | undefined): string };
      this.list.rows = [...this.replies]
        .sort((a, b) => a.shortcut.localeCompare(b.shortcut))
        .map((r) => ({
          id: r.id,
          shortcut: r.shortcut,
          shortcutText: `/${r.shortcut}`,
          title: r.title,
          body: r.body,
          hasUses: r.uses !== undefined && r.uses !== null,
          usesText: self.numberText(r.uses),
          updatedText: self.dateText(r.updatedAt),
        }));
    },

    /* ---- host calls ---- */
    async call(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (x: Promise<Outcome>) => (pending = Promise.resolve(x)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return await pending;
    },

    /* ---- the row events ---- */
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      if (action === "edit") this.startEdit(row.id);
      else if (action === "duplicate") void this.duplicate(row.id);
      else if (action === "delete") this.askRemove(row.id);
    },
    onRowClick(this: State, event: CustomEvent<{ row: { id: string } }>) {
      if (this.config.can.save) this.startEdit(event.detail.row.id);
    },

    /* ---- editor ---- */
    openForm(this: State, id: string | null) {
      const r = id ? this.replies.find((x) => x.id === id) : undefined;
      this.form = {
        open: true,
        isNew: !r,
        id: r ? r.id : newId(),
        shortcut: r?.shortcut ?? "",
        title: r?.title ?? "",
        body: r?.body ?? "",
        uses: r?.uses,
        touched: false,
        pending: false,
        error: null,
        invalid: { title: false, shortcut: false, body: false },
        shortcutMessage: "",
        bodyMessage: "",
      };
    },
    startEdit(this: State, id: string) {
      (this as unknown as { openForm(id: string | null): void }).openForm(id);
    },
    get previewText(): string {
      const s = this as unknown as State;
      const byKey = new Map(s.config.variables.map((v) => [v.key, v.sample]));
      const out = s.form.body.replace(VARIABLE, (whole, key: string) => byKey.get(key) ?? whole);
      return out || "—";
    },
    /** Inserts {{key}} at the caret of the reply box, then puts the caret after it. */
    insertVar(this: State, key: string, button: HTMLElement) {
      const area = button.closest("form")?.querySelector("textarea") as HTMLTextAreaElement | null;
      const token = `{{${key}}}`;
      const body = this.form.body;
      const start = area?.selectionStart ?? body.length;
      const end = area?.selectionEnd ?? body.length;
      this.form.body = body.slice(0, start) + token + body.slice(end);
      this.onFormInput();
      void this.$nextTick(() => {
        area?.focus();
        area?.setSelectionRange(start + token.length, start + token.length);
      });
    },
    onShortcutInput(this: State) {
      this.form.shortcut = normalizeCannedShortcut(this.form.shortcut);
      this.onFormInput();
    },
    onFormInput(this: State) {
      if (this.form.touched) this.validateForm();
    },
    validateForm(this: State): CannedReplyIssue[] {
      const f = this.form;
      const issues = validateCannedReply(
        { id: f.id, shortcut: f.shortcut, title: f.title, body: f.body },
        this.replies.map((r) => ({ id: r.id, shortcut: r.shortcut, title: r.title, body: r.body })),
        this.config.variables.map((v) => v.key),
      );
      const l = this.config.labels.issues;
      f.invalid = {
        title: issues.includes("title-empty"),
        shortcut: issues.includes("shortcut-empty") || issues.includes("shortcut-duplicate"),
        body: issues.includes("body-empty") || issues.includes("variable-unknown"),
      };
      f.shortcutMessage = issues.includes("shortcut-empty") ? l["shortcut-empty"] : issues.includes("shortcut-duplicate") ? l["shortcut-duplicate"] : "";
      f.bodyMessage = issues.includes("body-empty") ? l["body-empty"] : issues.includes("variable-unknown") ? l["variable-unknown"] : "";
      return issues;
    },
    async saveForm(this: State) {
      const f = this.form;
      f.touched = true;
      if (this.validateForm().length || f.pending) return;
      f.pending = true;
      f.error = null;
      const reply: Reply = { id: f.id, shortcut: normalizeCannedShortcut(f.shortcut), title: f.title.trim(), body: f.body, ...(f.uses !== undefined ? { uses: f.uses } : {}), updatedAt: new Date().toISOString() };
      try {
        const r = await this.call("save-reply", { reply: { ...reply }, isNew: f.isNew });
        if (!this.alive) return;
        if (r && r.error) {
          f.error = r.error;
          return;
        }
        this.commit(reply, f.isNew, (r && r.id) || undefined);
        f.open = false;
      } catch {
        if (this.alive) f.error = this.config.labels.failed;
      } finally {
        if (this.alive) f.pending = false;
      }
    },
    commit(this: State, reply: Reply, isNew: boolean, id?: string) {
      if (isNew) this.replies = [...this.replies, { ...reply, id: id || reply.id }];
      else this.replies = this.replies.map((x) => (x.id === reply.id ? { ...x, ...reply } : x));
      this.refresh();
    },

    /* ---- duplicate and delete ---- */
    async duplicate(this: State, id: string) {
      const r = this.replies.find((x) => x.id === id);
      if (!r || !this.config.can.save) return;
      this.failure = null;
      const copy: Reply = {
        ...r,
        id: newId(),
        title: `${r.title} (${this.config.labels.duplicate})`,
        shortcut: nextFreeCannedShortcut(r.shortcut, this.replies),
        uses: 0,
        updatedAt: new Date().toISOString(),
      };
      try {
        const out = await this.call("save-reply", { reply: { ...copy }, isNew: true });
        if (!this.alive) return;
        if (out && out.error) this.failure = out.error;
        else this.commit(copy, true, (out && out.id) || undefined);
      } catch {
        if (this.alive) this.failure = this.config.labels.failed;
      }
    },
    askRemove(this: State, id: string) {
      const r = this.replies.find((x) => x.id === id);
      if (!r) return;
      this.confirm = { open: true, title: fill(this.config.labels.removeTitle, { title: r.title }), id };
    },
    /** Runs after the dialog's own action button has closed it; the target is held in `confirm`. */
    async runConfirm(this: State) {
      const id = this.confirm.id;
      const r = this.replies.find((x) => x.id === id);
      if (!r) return;
      this.failure = null;
      try {
        const out = await this.call("delete-reply", { id, reply: { ...r } });
        if (!this.alive) return;
        if (out && out.error) {
          this.failure = out.error;
          return;
        }
        this.replies = this.replies.filter((x) => x.id !== id);
        this.refresh();
      } catch {
        if (this.alive) this.failure = this.config.labels.failed;
      }
    },
  }));
};
