// nqMarketplace, nqMarketplaceDetail, nqPublishForm, nqTemplateGallery: the Alpine side of the marketplace. The markup is the
// React Marketplace's (server-rendered); the nested catalog store (nqCatalogStore) owns the installed state.
//
// Events (all bubble; detail.wait(promise) keeps a button busy until it settles, a promise resolving to { error } shows the failure,
// and without a wait the change shows at once):
//   nq-install / nq-uninstall  { id, item, wait }   nq-open { id }   nq-use-template { id, template, wait }
//   nq-publish { draft, wait }   nq-cancel   nq-selected-change { id | null }

import { fire, firstError, hostOf, messageOf, storeOf, validateDraft, type Draft, type DraftErrors } from "./marketplace-logic";
import type { Magics, Register } from "./types";

type Kind = "install" | "uninstall";
type Ctx<T> = T & Magics;

const FIELDS = ["name", "summary", "category", "version", "repository", "price"] as const;

export const marketplace: Register = (Alpine) => {
  Alpine.data("nqMarketplace", (options: { view?: string } = {}) => ({
    view: options.view ?? "extensions",
    selected: null as string | null,
    publishing: false,
    mRoot: null as HTMLElement | null,
    viewSel: [options.view ?? "extensions"] as string[],

    init(this: Ctx<{ mRoot: HTMLElement | null; viewSel: string[]; view: string }>) {
      this.mRoot = this.$el;
      this.$watch<string[]>("viewSel", (v) => {
        if (v[0]) this.view = v[0];
        else this.viewSel = [this.view];
      });
    },
    /** Open a listing page (null goes back to the store). */
    pick(this: { selected: string | null; mRoot: HTMLElement | null }, id: string | null) {
      this.selected = id;
      this.mRoot?.dispatchEvent(new CustomEvent("nq-selected-change", { detail: { id }, bubbles: true }));
    },
    /** Mirror an install made on a detail page into the store, so cards and pages agree. */
    sync(this: { mRoot: HTMLElement | null }, id: string, installed: boolean) {
      const store = this.mRoot ? storeOf(this.mRoot) : null;
      if (store) store.override = { ...store.override, [id]: installed };
    },
  }));

  Alpine.data("nqMarketplaceDetail", (options: { id: string; name: string; installed?: boolean; state?: string | null; failed?: string } = { id: "", name: "" }) => ({
    installed: Boolean(options.installed),
    busy: null as Kind | null,
    error: null as string | null,
    dRoot: null as HTMLElement | null,

    init(this: { dRoot: HTMLElement | null; installed: boolean; $el: HTMLElement }) {
      this.dRoot = this.$el;
      const store = storeOf(this.$el);
      if (store) this.installed = store.installed(options.id);
    },
    get current(): string {
      const s = this as unknown as { busy: Kind | null; installed: boolean };
      return options.state ?? (s.busy === "install" ? "installing" : s.installed ? "installed" : "available");
    },
    install() {
      (this as unknown as { run(k: Kind): void }).run("install");
    },
    uninstall() {
      (this as unknown as { run(k: Kind): void }).run("uninstall");
    },
    run(this: { dRoot: HTMLElement | null; installed: boolean; busy: Kind | null; error: string | null }, kind: Kind) {
      const item = { id: options.id, name: options.name };
      this.error = null;
      const pending = fire(this.dRoot, `nq-${kind}`, { id: options.id, item });
      const done = (results: unknown) => {
        this.busy = null;
        const failure = firstError(results);
        if (failure) {
          this.error = failure;
          return;
        }
        this.installed = kind === "install";
        this.dRoot?.dispatchEvent(new CustomEvent("nq-marketplace-state", { detail: { id: options.id, installed: this.installed }, bubbles: true }));
      };
      if (!pending) return done(undefined);
      this.busy = kind;
      pending.then(done, (e: unknown) => done({ error: options.failed || messageOf(e) }));
    },
    openApp(this: { dRoot: HTMLElement | null }) {
      this.dRoot?.dispatchEvent(new CustomEvent("nq-open", { detail: { id: options.id }, bubbles: true }));
    },
    goBack(this: { dRoot: HTMLElement | null }) {
      this.dRoot?.dispatchEvent(new CustomEvent("nq-back", { detail: { id: options.id }, bubbles: true }));
    },
  }));

  Alpine.data("nqPublishForm", (options: { summaryMax?: number; failed?: string; errors?: Record<string, string>; permissionIds?: string[] } = {}) => ({
    draft: { name: "", summary: "", description: "", category: "", version: "1.0.0", repository: "", price: 0, tags: [] as string[], permissions: [] as string[] },
    permPicked: {} as Record<number, boolean>,
    pricingSel: ["free"] as string[],
    lastPricing: "free",
    bad: { name: false, summary: false, category: false, version: false, repository: false, price: false } as Record<string, boolean>,
    codes: {} as DraftErrors,
    pending: false,
    formError: null as string | null,
    done: false,
    fRoot: null as HTMLElement | null,

    init(this: Ctx<{ pricingSel: string[]; lastPricing: string; fRoot: HTMLElement | null }>) {
      this.fRoot = this.$el;
      this.$watch<string[]>("pricingSel", (v) => {
        if (v[0]) this.lastPricing = v[0];
        else this.pricingSel = [this.lastPricing];
      });
    },
    get paid(): boolean {
      return (this as unknown as { pricingSel: string[] }).pricingSel[0] === "paid";
    },
    get count(): number {
      return (this as unknown as { draft: Draft }).draft.summary.trim().length;
    },
    errText(this: { codes: DraftErrors }, field: (typeof FIELDS)[number]): string {
      const code = this.codes[field];
      return code ? (options.errors?.[code] ?? code) : "";
    },
    submit(this: { draft: Draft; permPicked: Record<number, boolean>; paid: boolean; codes: DraftErrors; bad: Record<string, boolean>; pending: boolean; formError: string | null; done: boolean; fRoot: HTMLElement | null }) {
      const sent: Draft = {
        ...this.draft,
        tags: [...this.draft.tags],
        permissions: (options.permissionIds ?? []).filter((_, i) => this.permPicked[i]),
        price: this.paid ? Number(this.draft.price) : 0,
      };
      const found = validateDraft(sent, options.summaryMax ?? 140);
      this.codes = found;
      for (const f of FIELDS) this.bad[f] = Boolean(found[f]);
      if (Object.keys(found).length > 0) return;
      this.formError = null;
      const pending = fire(hostOf(this.fRoot!), "nq-publish", { draft: sent });
      const finish = (results: unknown) => {
        this.pending = false;
        const failure = firstError(results);
        if (failure) this.formError = failure;
        else this.done = true;
      };
      if (!pending) return finish(undefined);
      this.pending = true;
      pending.then(finish, (e: unknown) => {
        this.pending = false;
        this.formError = options.failed || messageOf(e);
      });
    },
    cancel(this: { fRoot: HTMLElement | null }) {
      hostOf(this.fRoot!).dispatchEvent(new CustomEvent("nq-cancel", { bubbles: true }));
    },
  }));

  Alpine.data("nqTemplateGallery", (options: { templates?: { id: string; category: string }[]; failed?: string } = {}) => ({
    category: "all",
    busy: null as string | null,
    error: null as { id: string; message: string } | null,
    gRoot: null as HTMLElement | null,
    templates: options.templates ?? [],

    init(this: { gRoot: HTMLElement | null; $el: HTMLElement }) {
      this.gRoot = this.$el;
    },
    get shown(): string[] {
      const s = this as unknown as { category: string; templates: { id: string; category: string }[] };
      return s.templates.filter((t) => s.category === "all" || t.category === s.category).map((t) => t.id);
    },
    visible(id: string): boolean {
      return (this as unknown as { shown: string[] }).shown.includes(id);
    },
    use(this: { gRoot: HTMLElement | null; busy: string | null; error: { id: string; message: string } | null; templates: { id: string }[] }, id: string) {
      this.error = null;
      const pending = fire(this.gRoot, "nq-use-template", { id, template: this.templates.find((t) => t.id === id) });
      const done = (results: unknown) => {
        this.busy = null;
        const failure = firstError(results);
        if (failure) this.error = { id, message: failure };
      };
      if (!pending) return done(undefined);
      this.busy = id;
      pending.then(done, (e: unknown) => {
        this.busy = null;
        this.error = { id, message: options.failed || messageOf(e) };
      });
    },
  }));
};
