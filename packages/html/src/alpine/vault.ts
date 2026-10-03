// nqVault: reveal / copy with auto-hide, the secret filter, the add / edit form and the delete confirmation of the vault.
// The markup is the React Vault's, the secret list is server-rendered (never with a value), the state lives here.
//
//   <section x-data="nqVault({ ids: ['s1'], groups: [['s1']], search: { s1: 'stripe_key payments' }, secrets: { s1: { name, group, kind, description, expires } }, hideMs: 15000, labels: {…} })">
//
// It is presentational: the host holds the values. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   reveal  { id, purpose: 'reveal' | 'copy', wait }  resolve { value } or { error }
//   save    { input, id, wait }                       resolve, or resolve { error }   (id is null when adding)
//   delete  { id, wait }                              resolve, or resolve { error }
// e.g. @reveal="$event.detail.wait(fetch('/secrets/' + $event.detail.id).then(r => r.json()))".
// A rejected promise, or nobody listening, shows a generic error.

import { copyText } from "./copy-button";
import type { Magics, Register } from "./types";

interface VaultConfig {
  ids: string[];
  groups: string[][];
  search: Record<string, string>;
  secrets: Record<string, { name: string; group: string; kind: string; description: string; expires: string }>;
  hideMs: number;
  labels: {
    revealFailed: string;
    copyFailed: string;
    copied: string;
    genericError: string;
    autoHide: string;
    addTitle: string;
    editTitle: string;
    deleteTitle: string;
    nameEmpty: string;
    nameDuplicate: string;
    valueEmpty: string;
  };
}

type Outcome = { value?: string; error?: string } | void | undefined;

interface Draft {
  name: string;
  group: string;
  kind: string;
  value: string;
  note: string;
  expires: string;
}

interface VaultState extends Magics {
  config: VaultConfig;
  root: HTMLElement | null;
  filter: string;
  shown: Record<string, string>;
  busy: string | null;
  copiedId: string | null;
  notice: string | null;
  remaining: number;
  formOpen: boolean;
  editId: string | null;
  draft: Draft;
  showValue: boolean;
  nameInvalid: boolean;
  valueInvalid: boolean;
  nameMessage: string;
  formError: string | null;
  deleteOpen: boolean;
  deleteId: string | null;
  deleteError: string | null;
  pending: boolean;
  alive: boolean;
  timers: Record<string, ReturnType<typeof setTimeout>>;
  copyTimer: ReturnType<typeof setTimeout> | undefined;
  ticker: ReturnType<typeof setInterval> | undefined;
  lastReveal: number;
  resetForm(): void;
  hide(id: string): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  matches(id: string): boolean;
}

const emptyDraft = (): Draft => ({ name: "", group: "", kind: "api-key", value: "", note: "", expires: "" });

export const vault: Register = (Alpine) => {
  Alpine.data("nqVault", (config: VaultConfig) => ({
    config,
    root: null as HTMLElement | null,
    filter: "",
    shown: {} as Record<string, string>,
    busy: null as string | null,
    copiedId: null as string | null,
    notice: null as string | null,
    remaining: 0,
    formOpen: false,
    editId: null as string | null,
    draft: emptyDraft(),
    showValue: false,
    nameInvalid: false,
    valueInvalid: false,
    nameMessage: "",
    formError: null as string | null,
    deleteOpen: false,
    deleteId: null as string | null,
    deleteError: null as string | null,
    pending: false,
    alive: true,
    timers: {} as Record<string, ReturnType<typeof setTimeout>>,
    copyTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    ticker: undefined as ReturnType<typeof setInterval> | undefined,
    lastReveal: 0,
    init(this: VaultState) {
      this.root = this.$el;
    },
    destroy(this: VaultState) {
      this.alive = false;
      for (const id of Object.keys(this.timers)) clearTimeout(this.timers[id]);
      clearTimeout(this.copyTimer);
      clearInterval(this.ticker);
    },

    // Row state, read by the server-rendered rows.
    isShown(this: VaultState, id: string) {
      return this.shown[id] !== undefined;
    },
    valueFor(this: VaultState, id: string) {
      return this.shown[id] ?? "";
    },
    busyOn(this: VaultState, id: string) {
      return this.busy === id;
    },
    eyeOn(this: VaultState, id: string) {
      return this.busy !== id && this.shown[id] === undefined;
    },
    eyeOffOn(this: VaultState, id: string) {
      return this.busy !== id && this.shown[id] !== undefined;
    },
    isCopied(this: VaultState, id: string) {
      return this.copiedId === id;
    },
    autoHide(this: VaultState) {
      return this.config.labels.autoHide.replace("{n}", String(this.remaining));
    },
    matches(this: VaultState, id: string) {
      const q = this.filter.trim().toLowerCase();
      return !q || (this.config.search[id] ?? "").includes(q);
    },
    groupShown(this: VaultState, index: number) {
      return (this.config.groups[index] ?? []).some((id) => this.matches(id));
    },
    noneMatch(this: VaultState) {
      return this.config.ids.length > 0 && !this.config.ids.some((id) => this.matches(id));
    },

    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: VaultState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },

    hide(this: VaultState, id: string) {
      clearTimeout(this.timers[id]);
      delete this.timers[id];
      if (this.shown[id] === undefined) return;
      const { [id]: _gone, ...rest } = this.shown;
      this.shown = rest;
      if (Object.keys(rest).length === 0) {
        clearInterval(this.ticker);
        this.ticker = undefined;
      }
    },
    startTicker(this: VaultState & { startTicker(): void }) {
      clearInterval(this.ticker);
      const tick = () => (this.remaining = Math.max(0, Math.ceil((this.lastReveal + this.config.hideMs - Date.now()) / 1000)));
      tick();
      this.ticker = setInterval(tick, 1000);
    },
    async toggle(this: VaultState & { startTicker(): void }, id: string) {
      if (this.shown[id] !== undefined) return this.hide(id);
      this.busy = id;
      this.notice = null;
      try {
        const result = await this.ask("reveal", { id, purpose: "reveal" });
        if (!this.alive) return;
        if (!result || result.error !== undefined || typeof result.value !== "string") {
          this.notice = (result && result.error) || this.config.labels.revealFailed;
          return;
        }
        this.lastReveal = Date.now();
        this.shown = { ...this.shown, [id]: result.value };
        clearTimeout(this.timers[id]);
        this.timers[id] = setTimeout(() => this.hide(id), this.config.hideMs);
        this.startTicker();
      } catch {
        if (this.alive) this.notice = this.config.labels.revealFailed;
      } finally {
        if (this.alive) this.busy = null;
      }
    },
    async copy(this: VaultState, id: string) {
      this.notice = null;
      this.busy = id;
      try {
        const known = this.shown[id];
        const result: Outcome = known !== undefined ? { value: known } : await this.ask("reveal", { id, purpose: "copy" });
        if (!this.alive) return;
        if (!result || result.error !== undefined || typeof result.value !== "string") {
          this.notice = (result && result.error) || this.config.labels.revealFailed;
          return;
        }
        const ok = await copyText(result.value);
        if (!this.alive) return;
        clearTimeout(this.copyTimer);
        if (ok) {
          this.copiedId = id;
          this.copyTimer = setTimeout(() => (this.copiedId = null), 1500);
          this.root?.dispatchEvent(new CustomEvent("nq:copy", { bubbles: true, detail: { id } }));
        } else this.notice = this.config.labels.copyFailed;
      } catch {
        if (this.alive) this.notice = this.config.labels.revealFailed;
      } finally {
        if (this.alive) this.busy = null;
      }
    },

    // Add / edit
    resetForm(this: VaultState) {
      this.showValue = false;
      this.nameInvalid = false;
      this.valueInvalid = false;
      this.nameMessage = "";
      this.formError = null;
    },
    openAdd(this: VaultState) {
      this.resetForm();
      this.editId = null;
      this.draft = emptyDraft();
      this.formOpen = true;
    },
    openEdit(this: VaultState, id: string) {
      const s = this.config.secrets[id];
      if (!s) return;
      this.resetForm();
      this.editId = id;
      this.draft = { name: s.name, group: s.group, kind: s.kind, value: "", note: s.description, expires: s.expires };
      this.formOpen = true;
    },
    formTitle(this: VaultState) {
      const s = this.editId ? this.config.secrets[this.editId] : undefined;
      return s ? this.config.labels.editTitle.replace("{name}", s.name) : this.config.labels.addTitle;
    },
    async submit(this: VaultState) {
      if (this.pending) return;
      const name = this.draft.name.trim();
      const group = this.draft.group.trim();
      this.nameMessage = "";
      if (name === "") this.nameMessage = this.config.labels.nameEmpty;
      else if (Object.entries(this.config.secrets).some(([id, s]) => id !== this.editId && s.name === name && s.group.trim() === group)) this.nameMessage = this.config.labels.nameDuplicate;
      this.nameInvalid = this.nameMessage !== "";
      this.valueInvalid = !this.editId && this.draft.value === "";
      this.formError = null;
      if (this.nameInvalid || this.valueInvalid) return;
      this.pending = true;
      try {
        const note = this.draft.note.trim();
        const input: Record<string, string> = { name, group, kind: this.draft.kind, value: this.draft.value };
        if (note) input.description = note;
        if (this.draft.expires) input.expiresAt = this.draft.expires;
        const result = await this.ask("save", { input, id: this.editId });
        if (!this.alive) return;
        if (result && result.error) this.formError = result.error;
        else this.formOpen = false;
      } catch {
        if (this.alive) this.formError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },

    // Delete
    deleteTitle(this: VaultState) {
      const s = this.deleteId ? this.config.secrets[this.deleteId] : undefined;
      return this.config.labels.deleteTitle.replace("{name}", s?.name ?? "");
    },
    askDelete(this: VaultState, id: string) {
      this.deleteId = id;
      this.deleteError = null;
      this.deleteOpen = true;
    },
    async confirmDelete(this: VaultState) {
      const id = this.deleteId;
      if (this.pending || !id) return;
      this.pending = true;
      this.deleteError = null;
      try {
        const result = await this.ask("delete", { id });
        if (!this.alive) return;
        if (result && result.error) this.deleteError = result.error;
        else {
          this.hide(id);
          this.deleteOpen = false;
        }
      } catch {
        if (this.alive) this.deleteError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
  }));
};
