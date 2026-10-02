// nqStatusPageManager: the staged settings, the services list (switch and reorder) and the post-incident dialog of <x-nq::status-page-manager>.
// The markup is the React StatusPageManager's; the draft lives here until Save.
//
//   <div x-data="nqStatusPageManager({ settings: { title, slug, domain, services: [{ id, name, visible }] }, labels: { genericError, show, up, down } })"
//        @save="$event.detail.wait(…)" @post-incident="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   save           { settings: { title, slug, domain?, services }, wait }   resolve, or resolve { error } (shown above the form)
//   post-incident  { input: { title, body, impact, status, serviceIds }, wait }   resolve, or resolve { error } (shown in the dialog)
// After a successful save the staged copy becomes the saved copy. A rejected promise, or nobody listening, shows the generic error.

import { isValidStatusSlug, moveStatusItem, type StatusServiceDraft } from "./status-page-manager-logic";
import type { Magics, Register } from "./types";

interface Settings {
  title: string;
  slug: string;
  domain?: string;
  services: StatusServiceDraft[];
}

interface Config {
  settings: Settings;
  labels: { genericError: string; show: string; up: string; down: string };
}

type Outcome = { error?: string } | void | undefined;

interface State extends Magics {
  config: Config;
  original: string;
  draft: Settings;
  tried: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
  titleInvalid: boolean;
  slugInvalid: boolean;
  incOpen: boolean;
  incTitle: string;
  incBody: string;
  incImpact: string;
  incStatus: string;
  incIds: string[];
  incTried: boolean;
  incTitleInvalid: boolean;
  incBodyInvalid: boolean;
  busy: boolean;
  incError: string | null;
  alive: boolean;
  root: HTMLElement | null;
  dirty: boolean;
  validate(): void;
  validateIncident(): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
}

const snapshot = (s: Settings): string => JSON.stringify({ title: s.title, slug: s.slug, domain: s.domain || "", services: s.services.map((x) => ({ id: x.id, name: x.name, visible: x.visible })) });

export const statusPageManager: Register = (Alpine) => {
  Alpine.data("nqStatusPageManager", (config: Config) => ({
    config,
    original: snapshot(config.settings),
    draft: { ...config.settings, domain: config.settings.domain ?? "", services: config.settings.services.map((s) => ({ ...s })) } as Settings,
    tried: false,
    saving: false,
    error: null as string | null,
    saved: false,
    titleInvalid: false,
    slugInvalid: false,
    incOpen: false,
    incTitle: "",
    incBody: "",
    incImpact: "minor",
    incStatus: "investigating",
    incIds: [] as string[],
    incTried: false,
    incTitleInvalid: false,
    incBodyInvalid: false,
    busy: false,
    incError: null as string | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
      this.$watch("draft", () => this.validate());
      this.$watch("incTitle", () => this.validateIncident());
      this.$watch("incBody", () => this.validateIncident());
    },
    destroy(this: State) {
      this.alive = false;
    },
    get dirty(): boolean {
      const s = this as unknown as State;
      return snapshot(s.draft) !== s.original;
    },
    validate(this: State) {
      this.titleInvalid = this.tried && !this.draft.title.trim();
      this.slugInvalid = this.tried && !isValidStatusSlug(this.draft.slug);
    },
    validateIncident(this: State) {
      this.incTitleInvalid = this.incTried && !this.incTitle.trim();
      this.incBodyInvalid = this.incTried && !this.incBody.trim();
    },
    showLabel(this: State, s: StatusServiceDraft): string {
      return this.config.labels.show.replace("{name}", s.name);
    },
    upLabel(this: State, s: StatusServiceDraft): string {
      return this.config.labels.up.replace("{name}", s.name);
    },
    downLabel(this: State, s: StatusServiceDraft): string {
      return this.config.labels.down.replace("{name}", s.name);
    },
    move(this: State, index: number, delta: number) {
      this.draft.services = moveStatusItem(this.draft.services, index, delta);
    },
    discard(this: State) {
      const s: Settings = JSON.parse(this.original);
      this.draft = { ...s, domain: s.domain ?? "" };
      this.tried = false;
      this.validate();
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async save(this: State) {
      this.tried = true;
      this.validate();
      if (this.titleInvalid || this.slugInvalid) return;
      this.saving = true;
      this.error = null;
      this.saved = false;
      const settings: Settings = {
        title: this.draft.title.trim(),
        slug: this.draft.slug,
        services: this.draft.services.map((s) => ({ id: s.id, name: s.name, visible: s.visible })),
      };
      const domain = (this.draft.domain ?? "").trim();
      if (domain) settings.domain = domain;
      try {
        const r = await this.ask("save", { settings });
        if (!this.alive) return;
        if (r && r.error) {
          this.error = r.error;
        } else {
          this.original = snapshot(settings);
          this.draft = { ...settings, domain: settings.domain ?? "", services: settings.services.map((s) => ({ ...s })) };
          this.saved = true;
        }
      } catch {
        if (this.alive) this.error = this.config.labels.genericError;
      } finally {
        if (this.alive) this.saving = false;
      }
    },
    openIncident(this: State) {
      this.incTitle = "";
      this.incBody = "";
      this.incImpact = "minor";
      this.incStatus = "investigating";
      this.incIds = [];
      this.incTried = false;
      this.incTitleInvalid = false;
      this.incBodyInvalid = false;
      this.incError = null;
      this.incOpen = true;
    },
    async post(this: State) {
      if (this.busy) return;
      this.incTried = true;
      this.validateIncident();
      if (this.incTitleInvalid || this.incBodyInvalid) return;
      this.busy = true;
      this.incError = null;
      const input = { title: this.incTitle.trim(), body: this.incBody.trim(), impact: this.incImpact, status: this.incStatus, serviceIds: [...this.incIds] };
      try {
        const r = await this.ask("post-incident", { input });
        if (!this.alive) return;
        if (r && r.error) this.incError = r.error;
        else this.incOpen = false;
      } catch {
        if (this.alive) this.incError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
  }));
};
