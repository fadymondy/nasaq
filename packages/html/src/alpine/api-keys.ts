// nqApiKeys: the create form, the one-time secret dialog and the rotate / revoke actions of the API keys card.
// The markup is the React ApiKeys', the key list is server-rendered, the state lives here.
//
//   <div x-data="nqApiKeys({ scopes: ['read','write'], defaultScopes: [], expiry: '90', names: { k1: 'Prod' }, labels: {…} })">
//     <button x-on:click="openCreate()">Create key</button> …
//   </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   create  { input: { name, scopes, expiresInDays }, wait }  resolve { secret } or { error }
//   rotate  { id, wait }                                      resolve { secret } or { error }
//   revoke  { id, wait }                                      resolve, or resolve { error }
// e.g. @create="$event.detail.wait(fetch('/keys', { method: 'POST', body: … }).then(r => r.json()))".
// A rejected promise, or nobody listening, shows the generic error. After a success the host re-renders the list.

import { copyText } from "./copy-button";
import type { Magics, Register } from "./types";

interface ApiKeysConfig {
  scopes: string[];
  defaultScopes?: string[];
  expiry?: string;
  names?: Record<string, string>;
  labels: { revealTitle: string; revealRotated: string; genericError: string };
}

type Outcome = { secret?: string; error?: string } | void | undefined;

interface ApiKeysState extends Magics {
  config: ApiKeysConfig;
  root: HTMLElement | null;
  createOpen: boolean;
  revealOpen: boolean;
  draftName: string;
  picked: boolean[];
  expiry: string;
  nameInvalid: boolean;
  scopesInvalid: boolean;
  formError: string | null;
  pageError: string | null;
  pending: boolean;
  secret: string;
  secretTitle: string;
  copied: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  alive: boolean;
  resetForm(): void;
  showSecret(title: string, secret: string): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
}

export const apiKeys: Register = (Alpine) => {
  Alpine.data("nqApiKeys", (config: ApiKeysConfig) => ({
    config,
    root: null as HTMLElement | null,
    createOpen: false,
    revealOpen: false,
    draftName: "",
    picked: config.scopes.map((s) => (config.defaultScopes ?? []).includes(s)),
    expiry: config.expiry ?? "90",
    nameInvalid: false,
    scopesInvalid: false,
    formError: null as string | null,
    pageError: null as string | null,
    pending: false,
    secret: "",
    secretTitle: "",
    copied: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    alive: true,
    init(this: ApiKeysState) {
      this.root = this.$el;
      // The reveal dialog closes through x-model; drop the secret once it has animated out.
      this.$watch("revealOpen", (open: boolean) => {
        if (open) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          if (!this.revealOpen) this.secret = "";
        }, 300);
      });
    },
    destroy(this: ApiKeysState) {
      this.alive = false;
      clearTimeout(this.timer);
    },
    resetForm(this: ApiKeysState) {
      this.draftName = "";
      this.picked = this.config.scopes.map((s) => (this.config.defaultScopes ?? []).includes(s));
      this.expiry = this.config.expiry ?? "90";
      this.nameInvalid = false;
      this.scopesInvalid = false;
      this.formError = null;
    },
    openCreate(this: ApiKeysState) {
      this.resetForm();
      this.createOpen = true;
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: ApiKeysState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async submit(this: ApiKeysState) {
      if (this.pending) return;
      this.nameInvalid = !this.draftName.trim();
      const scopes = this.config.scopes.filter((_, i) => this.picked[i]);
      this.scopesInvalid = scopes.length === 0;
      this.formError = null;
      if (this.nameInvalid || this.scopesInvalid) return;
      this.pending = true;
      try {
        const result = await this.ask("create", {
          input: { name: this.draftName.trim(), scopes, expiresInDays: this.expiry === "never" ? null : Number(this.expiry) },
        });
        if (!this.alive) return;
        if (result && result.error !== undefined) this.formError = result.error;
        else if (result && typeof result.secret === "string") {
          this.createOpen = false;
          this.showSecret(this.config.labels.revealTitle, result.secret);
        } else this.formError = this.config.labels.genericError;
      } catch {
        if (this.alive) this.formError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
    showSecret(this: ApiKeysState, title: string, secret: string) {
      this.secretTitle = title;
      this.secret = secret;
      this.copied = false;
      this.revealOpen = true;
    },
    async rotate(this: ApiKeysState, id: string) {
      this.pageError = null;
      try {
        const result = await this.ask("rotate", { id });
        if (!this.alive || !result) return;
        if (result.error !== undefined) this.pageError = result.error;
        else if (typeof result.secret === "string") {
          const name = this.config.names?.[id] ?? id;
          this.showSecret(this.config.labels.revealRotated.replace("{name}", name), result.secret);
        }
      } catch {
        if (this.alive) this.pageError = this.config.labels.genericError;
      }
    },
    async revoke(this: ApiKeysState, id: string) {
      this.pageError = null;
      try {
        const result = await this.ask("revoke", { id });
        if (this.alive && result && result.error) this.pageError = result.error;
      } catch {
        if (this.alive) this.pageError = this.config.labels.genericError;
      }
    },
    async copySecret(this: ApiKeysState) {
      const ok = await copyText(this.secret);
      if (!this.alive) return;
      this.copied = ok;
      this.root?.dispatchEvent(new CustomEvent(ok ? "nq:copy" : "nq:copy-error", { bubbles: true, detail: ok ? { text: this.secret } : undefined }));
      clearTimeout(this.timer);
      if (ok) this.timer = setTimeout(() => (this.copied = false), 1500);
    },
  }));
};
