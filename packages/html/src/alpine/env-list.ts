// nqEnvList: a .env manager. The markup is the React EnvList's, the rows are rendered here from state, because a secret's value must
// only be in the DOM while it is revealed.
//
//   <section data-slot="env-list" x-data="nqEnvList({ variables, environment, revealTimeout, strings })"
//            @nq-save="$event.detail.wait(api.save($event.detail.variable, $event.detail.previousKey))"> … </section>
//
// It is presentational: the host does the work. Each action fires a bubbling event on the root with detail `{ …, wait(promise) }`:
//   nq-save         { variable, previousKey, wait }   add (previousKey undefined) or edit one variable
//   nq-delete       { key, wait }                     after the confirm
//   nq-import       { variables, overwrite, wait }    parsed variables; keys meant to be public (NEXT_PUBLIC_*, VITE_*) come unmasked
//   nq-environment  { id, wait }                      another environment tab; resolve { variables } to load its list
//   nq-export       { variables }                     cancelable: call preventDefault() to handle the download yourself
// Pass a promise to wait() to show the pending state; resolve `{ error }` (or reject) to keep the dialog open with a message, otherwise the
// list is updated. Nobody calling wait() means nobody is handling it, and nothing changes. Values are never logged.

import { copyText } from "./copy-button";
import { checkEnvKey, conflictingKeys, looksPublic, MASK, parseEnv, serializeEnv, type EnvKeyProblem, type EnvParseIssue, type EnvVariable } from "./env-list-logic";
import type { Magics, Register } from "./types";

interface Strings {
  reveal: string;
  hide: string;
  copyValue: string;
  edit: string;
  remove: string;
  emptyValue: string;
  countOne: string;
  countMany: string;
  editTitle: string;
  addTitle: string;
  keyEmpty: string;
  keyInvalid: string;
  keyDuplicate: string;
  genericError: string;
  foundOne: string;
  foundMany: string;
  conflictsOne: string;
  conflictsMany: string;
  importOne: string;
  importMany: string;
  pasteDuplicates: string;
  issueInvalidKey: string;
  issueUnterminatedQuote: string;
  issueNoEquals: string;
  deleteTitle: string;
  copied: string;
}

interface Init {
  variables?: EnvVariable[];
  environment?: string | null;
  revealTimeout?: number;
  exportFilename?: string;
  strings: Strings;
}

type Result = { error?: string; variables?: EnvVariable[] } | void | undefined;
type Form = { key: string; value: string; note: string; secret: boolean };

interface EnvState extends Magics {
  variables: EnvVariable[];
  environment: string | null;
  revealTimeout: number;
  exportFilename: string;
  strings: Strings;
  root: HTMLElement;
  revealed: Record<string, boolean>;
  filter: string;
  copied: string | null;
  hideTimer: ReturnType<typeof setTimeout> | undefined;
  copyTimer: ReturnType<typeof setTimeout> | undefined;
  editOpen: boolean;
  editPrevious: string | null;
  form: Form;
  showValue: boolean;
  touched: boolean;
  formError: string | null;
  formPending: boolean;
  importOpen: boolean;
  importText: string;
  overwrite: boolean;
  importError: string | null;
  importPending: boolean;
  deleteOpen: boolean;
  deleteKey: string | null;
  deleteError: string | null;
  deletePending: boolean;
  keyProblem: EnvKeyProblem | null;
  showProblem: boolean;
  parsed: ReturnType<typeof parseEnv>;
  conflicts: string[];
  importable: { key: string; value: string }[];
  ask(event: string, detail: Record<string, unknown>, cancelable?: boolean): Promise<Result> | null;
  clearReveals(): void;
  isVisible(v: EnvVariable): boolean;
  copyToClipboard(id: string, text: string): Promise<void>;
  scheduleHide(): void;
}

const fill = (text: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), text);

export const envList: Register = (Alpine) => {
  Alpine.data("nqEnvList", (init: Init) => ({
    variables: [...(init.variables ?? [])] as EnvVariable[],
    environment: init.environment ?? null,
    revealTimeout: init.revealTimeout ?? 30_000,
    exportFilename: init.exportFilename ?? ".env",
    strings: init.strings,
    mask: MASK,
    root: null as unknown as HTMLElement,
    revealed: {} as Record<string, boolean>,
    filter: "",
    copied: null as string | null,
    hideTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    copyTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    editOpen: false,
    editPrevious: null as string | null,
    form: { key: "", value: "", note: "", secret: true } as Form,
    showValue: false,
    touched: false,
    formError: null as string | null,
    formPending: false,
    importOpen: false,
    importText: "",
    overwrite: false,
    importError: null as string | null,
    importPending: false,
    deleteOpen: false,
    deleteKey: null as string | null,
    deleteError: null as string | null,
    deletePending: false,
    init(this: EnvState) {
      this.root = this.$el;
      // Another environment tab: values go back to hidden, and the host may load that environment's list.
      this.$watch("environment", async (id: string | null) => {
        this.clearReveals();
        const waiting = this.ask("nq-environment", { id });
        if (!waiting) return;
        try {
          const result = await waiting;
          if (result && result.variables) this.variables = [...result.variables];
        } catch {
          // The tab already moved; the host shows its own error.
        }
      });
    },

    // State the markup reads.
    get shown(): EnvVariable[] {
      const s = this as unknown as EnvState;
      const q = s.filter.trim().toLowerCase();
      return q ? s.variables.filter((v) => v.key.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)) : s.variables;
    },
    get countLabel(): string {
      const s = this as unknown as EnvState;
      return s.variables.length === 1 ? s.strings.countOne : fill(s.strings.countMany, { n: s.variables.length });
    },
    get copiedAll(): boolean {
      return (this as unknown as EnvState).copied === "::all";
    },
    get dialogTitle(): string {
      const s = this as unknown as EnvState;
      return s.editPrevious ? fill(s.strings.editTitle, { key: s.editPrevious }) : s.strings.addTitle;
    },
    get keyProblem(): EnvKeyProblem | null {
      const s = this as unknown as EnvState;
      return checkEnvKey(s.form.key, s.variables.filter((v) => v.key !== s.editPrevious).map((v) => v.key));
    },
    get showProblem(): boolean {
      const s = this as unknown as EnvState;
      const p = s.keyProblem;
      return p !== null && (s.touched || p === "duplicate" || p === "invalid");
    },
    get keyMessage(): string {
      const s = this as unknown as EnvState;
      const p = s.keyProblem;
      return p === "empty" ? s.strings.keyEmpty : p === "invalid" ? s.strings.keyInvalid : p === "duplicate" ? s.strings.keyDuplicate : "";
    },
    get parsed(): ReturnType<typeof parseEnv> {
      return parseEnv((this as unknown as EnvState).importText);
    },
    get conflicts(): string[] {
      const s = this as unknown as EnvState;
      return conflictingKeys(s.variables, s.parsed.variables);
    },
    get importable(): { key: string; value: string }[] {
      const s = this as unknown as EnvState;
      return s.overwrite ? s.parsed.variables : s.parsed.variables.filter((v) => !s.conflicts.includes(v.key));
    },
    get foundLabel(): string {
      const s = this as unknown as EnvState;
      const n = s.parsed.variables.length;
      return n === 1 ? s.strings.foundOne : fill(s.strings.foundMany, { n });
    },
    get conflictsLabel(): string {
      const s = this as unknown as EnvState;
      const n = s.conflicts.length;
      return n === 1 ? s.strings.conflictsOne : fill(s.strings.conflictsMany, { n });
    },
    get importLabel(): string {
      const s = this as unknown as EnvState;
      const n = s.importable.length;
      return n === 1 ? s.strings.importOne : fill(s.strings.importMany, { n });
    },
    get duplicatesLabel(): string {
      const s = this as unknown as EnvState;
      return fill(s.strings.pasteDuplicates, { keys: s.parsed.duplicates.join(", ") });
    },
    get issues(): { id: string; text: string }[] {
      const s = this as unknown as EnvState;
      return s.parsed.issues.slice(0, 5).map((i: EnvParseIssue) => ({
        id: `${i.line}-${i.problem}`,
        text:
          i.problem === "invalid-key"
            ? fill(s.strings.issueInvalidKey, { line: i.line, key: i.key ?? "" })
            : i.problem === "unterminated-quote"
              ? fill(s.strings.issueUnterminatedQuote, { line: i.line, key: i.key ? ` (${i.key})` : "" })
              : fill(s.strings.issueNoEquals, { line: i.line }),
      }));
    },
    get deleteHeading(): string {
      const s = this as unknown as EnvState;
      return s.deleteKey ? fill(s.strings.deleteTitle, { key: s.deleteKey }) : "";
    },
    isSecret(v: EnvVariable): boolean {
      return v.secret !== false;
    },
    isVisible(this: EnvState, v: EnvVariable): boolean {
      return v.secret === false || Boolean(this.revealed[v.key]);
    },
    /** The text of a visible value; hidden values never reach the DOM. */
    valueText(this: EnvState, v: EnvVariable): string {
      return this.isVisible(v) ? (v.value === "" ? this.strings.emptyValue : v.value) : "";
    },
    rowLabel(this: EnvState, kind: "reveal" | "hide" | "copyValue" | "edit" | "remove", v: EnvVariable): string {
      return fill(this.strings[kind], { key: v.key });
    },

    // Talking to the host.
    ask(this: EnvState, event: string, detail: Record<string, unknown>, cancelable = false) {
      let waiting: Promise<Result> | null = null;
      this.root.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          cancelable,
          detail: {
            ...detail,
            wait: (promise: Promise<Result> | void) => {
              if (promise && typeof (promise as Promise<unknown>).then === "function") waiting = promise as Promise<Result>;
            },
          },
        }),
      );
      return waiting;
    },

    // Reveal.
    toggle(this: EnvState, key: string) {
      this.revealed = { ...this.revealed, [key]: !this.revealed[key] };
      this.scheduleHide();
    },
    clearReveals(this: EnvState) {
      clearTimeout(this.hideTimer);
      this.revealed = {};
    },
    /** Revealed values go back to hidden after a while. */
    scheduleHide(this: EnvState) {
      clearTimeout(this.hideTimer);
      if (this.revealTimeout > 0 && Object.values(this.revealed).some(Boolean)) this.hideTimer = setTimeout(() => (this.revealed = {}), this.revealTimeout);
    },

    // Copy and download.
    async copyValue(this: EnvState, v: EnvVariable) {
      await this.copyToClipboard(v.key, v.value);
    },
    async copyAll(this: EnvState) {
      await this.copyToClipboard("::all", serializeEnv(this.variables));
    },
    async copyToClipboard(this: EnvState, id: string, text: string) {
      if (!(await copyText(text))) return;
      clearTimeout(this.copyTimer);
      this.copied = id;
      this.copyTimer = setTimeout(() => (this.copied = null), 1500);
    },
    download(this: EnvState) {
      const event = new CustomEvent("nq-export", { bubbles: true, cancelable: true, detail: { variables: this.variables.map((v) => ({ ...v })) } });
      this.root.dispatchEvent(event);
      if (event.defaultPrevented) return;
      const blob = new Blob([serializeEnv(this.variables)], { type: "text/plain;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = this.exportFilename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 0);
    },

    // Add and edit.
    openEdit(this: EnvState, previous: string | null) {
      const v = previous ? this.variables.find((x) => x.key === previous) : undefined;
      this.editPrevious = v ? v.key : null;
      this.form = { key: v?.key ?? "", value: v?.value ?? "", note: v?.description ?? "", secret: v ? v.secret !== false : true };
      this.showValue = false;
      this.touched = false;
      this.formError = null;
      this.editOpen = true;
    },
    closeEdit(this: EnvState) {
      if (!this.formPending) this.editOpen = false;
    },
    async submitEdit(this: EnvState) {
      this.touched = true;
      if (this.keyProblem || this.formPending) return;
      const variable: EnvVariable = { key: this.form.key, value: this.form.value, secret: this.form.secret, ...(this.form.note.trim() ? { description: this.form.note.trim() } : {}) };
      const previous = this.editPrevious;
      const waiting = this.ask("nq-save", { variable, previousKey: previous ?? undefined });
      if (!waiting) return;
      this.formPending = true;
      this.formError = null;
      try {
        const result = await waiting;
        if (result && result.error) this.formError = result.error;
        else {
          this.variables = previous ? this.variables.map((v) => (v.key === previous ? variable : v)) : [...this.variables, variable];
          if (previous && previous !== variable.key) this.revealed = { ...this.revealed, [previous]: false };
          this.editOpen = false;
        }
      } catch {
        this.formError = this.strings.genericError;
      } finally {
        this.formPending = false;
      }
    },

    // Import.
    openImport(this: EnvState) {
      this.importText = "";
      this.overwrite = false;
      this.importError = null;
      this.importOpen = true;
    },
    closeImport(this: EnvState) {
      if (!this.importPending) this.importOpen = false;
    },
    async readFile(this: EnvState, event: Event) {
      const input = event.target as HTMLInputElement;
      const picked = input.files?.[0];
      const content = picked ? await picked.text() : null;
      input.value = "";
      if (content !== null) this.importText = content;
    },
    async submitImport(this: EnvState) {
      const incoming = this.importable;
      if (incoming.length === 0 || this.importPending) return;
      const variables: EnvVariable[] = incoming.map((v) => ({ key: v.key, value: v.value, secret: !looksPublic(v.key) }));
      const overwrite = this.overwrite;
      const waiting = this.ask("nq-import", { variables, overwrite });
      if (!waiting) return;
      this.importPending = true;
      this.importError = null;
      try {
        const result = await waiting;
        if (result && result.error) this.importError = result.error;
        else {
          const have = new Set(this.variables.map((v) => v.key));
          const next = this.variables.map((v) => (overwrite ? (variables.find((i) => i.key === v.key) ?? v) : v));
          this.variables = [...next, ...variables.filter((i) => !have.has(i.key))];
          this.importOpen = false;
        }
      } catch {
        this.importError = this.strings.genericError;
      } finally {
        this.importPending = false;
      }
    },

    // Delete.
    askDelete(this: EnvState, key: string) {
      this.deleteKey = key;
      this.deleteError = null;
      this.deleteOpen = true;
    },
    async confirmDelete(this: EnvState) {
      const key = this.deleteKey;
      if (!key || this.deletePending) return;
      const waiting = this.ask("nq-delete", { key });
      if (!waiting) return;
      this.deletePending = true;
      this.deleteError = null;
      try {
        const result = await waiting;
        if (result && result.error) this.deleteError = result.error;
        else {
          this.variables = this.variables.filter((v) => v.key !== key);
          this.revealed = { ...this.revealed, [key]: false };
          this.deleteOpen = false;
        }
      } catch {
        this.deleteError = this.strings.genericError;
      } finally {
        this.deletePending = false;
      }
    },
  }));
};
