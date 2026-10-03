// nqCookieConsent: the consent banner and its preferences dialog. The markup is server-rendered (<x-nq::cookie-consent>);
// the state lives here. Every choice fires `save` on the root with detail `{ state, source, wait(promise) }`:
//
//   save   state: { [categoryId]: boolean }, source: "accept-all" | "reject-all" | "custom"
//          resolve nothing to accept the choice, or { error } to show it and keep the banner open.
//
// A rejected promise, or nobody listening, shows the generic error. `prefs` (the preferences dialog) is x-modelable, and
// a window `nq-cookie-settings` event opens it, for a "Cookie settings" link.

import type { Magics, Register } from "./types";

type Source = "accept-all" | "reject-all" | "custom";
type Consent = Record<string, boolean>;
type Config = { categories: { id: string; required: boolean }[]; consent: Consent | null; labels: { failed: string } };
type Outcome = { error?: string } | void | undefined;

interface State extends Magics {
  config: Config;
  saved: Consent | null;
  prefs: boolean;
  pending: Source | null;
  error: string | null;
  draft: Consent;
  root: HTMLElement | null;
  ids: string[];
  busy: boolean;
  normalize(state?: Consent | null): Consent;
  blocked(source: Source): boolean;
  openPrefs(): void;
  commit(state: Consent, source: Source): Promise<void>;
  accept(): Promise<void>;
  reject(): Promise<void>;
  saveDraft(): Promise<void>;
}

async function ask(root: HTMLElement, detail: Record<string, unknown>): Promise<Outcome> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent("save", { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

export const cookieConsent: Register = (Alpine) => {
  Alpine.data("nqCookieConsent", (config: Config) => ({
    config,
    saved: (config.consent ?? null) as Consent | null,
    prefs: false,
    pending: null as Source | null,
    error: null as string | null,
    draft: {} as Consent,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      this.draft = this.normalize(this.saved);
      this.$watch("prefs", (open: boolean) => {
        if (open) this.draft = this.normalize(this.saved);
      });
    },

    get ids() {
      const s = this as unknown as State;
      return s.config.categories.map((c) => c.id);
    },
    get busy() {
      const s = this as unknown as State;
      return s.pending !== null;
    },
    normalize(this: State, state?: Consent | null) {
      return Object.fromEntries(this.config.categories.map((c) => [c.id, c.required ? true : Boolean(state?.[c.id])]));
    },
    blocked(this: State, source: Source) {
      return this.pending !== null && this.pending !== source;
    },
    openPrefs(this: State) {
      this.prefs = true;
    },

    async commit(this: State, state: Consent, source: Source) {
      this.pending = source;
      this.error = null;
      try {
        const result = await ask(this.root!, { state, source });
        if (result && result.error) {
          this.error = result.error;
          return;
        }
        this.saved = state;
        this.prefs = false;
      } catch {
        this.error = this.config.labels.failed;
      } finally {
        this.pending = null;
      }
    },
    accept(this: State) {
      return this.commit(Object.fromEntries(this.config.categories.map((c) => [c.id, true])), "accept-all");
    },
    reject(this: State) {
      return this.commit(Object.fromEntries(this.config.categories.map((c) => [c.id, c.required])), "reject-all");
    },
    saveDraft(this: State) {
      const state = this.normalize(this.draft);
      const cats = this.config.categories;
      const source: Source = cats.every((c) => state[c.id]) ? "accept-all" : cats.every((c) => state[c.id] === c.required) ? "reject-all" : "custom";
      return this.commit(state, source);
    },
  }));
};
