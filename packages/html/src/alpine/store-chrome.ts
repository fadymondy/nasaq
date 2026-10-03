/* eslint-disable @typescript-eslint/no-explicit-any */
// nqStoreAnnouncements, nqStoreSearch, nqStoreNewsletter: the behaviour of the storefront chrome (announcement bar, search box with
// suggestions, footer newsletter). The markup is the React kit's (see the Blade store-chrome components); the header, mega menu and
// mobile menu reuse nqNavigationMenu, nqDialog and nqAccordion, so they need nothing here.
//
//   <div data-slot="store-announcement-bar" x-data='nqStoreAnnouncements({ items, interval, labels })'> … </div>
//   <div data-slot="store-search" x-data='nqStoreSearch({ products, tree, currency, recent, popular, labels })'> … </div>
//   <form data-slot="store-newsletter" x-data='nqStoreNewsletter({ labels })'> … </form>
//
// React's callbacks are events, bubbling from the element that caused them:
//   nq-store-dismiss          detail { id }                  (announcement bar)
//   nq-store-search           detail { query }               Enter, the "Search for" row, a query suggestion
//   nq-store-select-product   detail { product }, cancelable: preventDefault() says the page handled it; otherwise the product's `href`
//                             is followed, or its name is searched
//   nq-store-select-category  detail { categoryId, label }, cancelable the same way
//   nq-store-recent-change    detail { recent }
//   nq-store-subscribe        detail { email, promise }: set detail.promise to a Promise; a rejection shows the failure message
// Every string comes in through `labels` (the Blade component fills the en/ar table); money is minor units, USD or SAR by locale.

import { formatMoney } from "../core/money";
import {
  chromeFlattenCategories,
  chromeHighlight,
  chromeLiveAnnouncements,
  chromeMoveActive,
  chromeRecordRecent,
  chromeStep,
  chromeSuggest,
  type ChromeAnnouncement,
  type ChromeSegment,
  type ChromeSuggestion,
} from "./store-chrome-logic";
import { listingMinPrice, type CommerceProduct, type ListingCategoryNode } from "./store-listing-model";
import type { Magics, Register } from "./types";

const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface AnnouncementItem extends ChromeAnnouncement {
  content: string;
  href?: string;
}

interface AnnouncementState extends Magics {
  items: AnnouncementItem[];
  interval: number;
  dismissible: boolean;
  dismissed: string[];
  index: number;
  hold: boolean;
  manual: boolean;
  reduced: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  root: HTMLElement | null;
  locale: string;
  labels: Record<string, string>;
  live: AnnouncementItem[];
  at: number;
  current: AnnouncementItem | undefined;
  arm(): void;
  step(s: 1 | -1): void;
}

type Row = {
  key: string;
  i: number;
  kind: ChromeSuggestion["kind"] | "submit";
  label: string;
  segments: ChromeSegment[];
  note: string;
  brand: string;
  image: string;
  priceText: string;
  hasProduct: boolean;
  isRow: true;
};

interface SearchState extends Magics {
  products: CommerceProduct[];
  tree: ListingCategoryNode[];
  currency: string | null;
  exponent: number;
  popular: string[];
  recent: string[];
  query: string;
  open: boolean;
  active: number;
  loading: boolean;
  hrefs: Record<string, string>;
  uid: string;
  locale: string;
  labels: Record<string, string>;
  root: HTMLElement | null;
  suggestions: ChromeSuggestion[];
  rows: Row[];
  groups: { kind: string; title: string; rows: Row[] }[];
  showList: boolean;
  t(key: string, vars?: Record<string, string | number>): string;
  tell(name: string, detail: Record<string, unknown>, cancelable?: boolean): CustomEvent;
  setRecent(next: string[]): void;
  run(q: string): void;
  choose(index: number): void;
}

interface NewsletterState extends Magics {
  email: string;
  state: "idle" | "busy" | "done" | "failed" | "invalid";
  labels: Record<string, string>;
  message: string;
}

export const storeChrome: Register = (Alpine) => {
  Alpine.data(
    "nqStoreAnnouncements",
    (options: { items?: AnnouncementItem[]; interval?: number; dismissible?: boolean; now?: number | null; locale?: string; labels?: Record<string, string> } = {}) => ({
      items: options.items ?? [],
      interval: options.interval ?? 5000,
      dismissible: options.dismissible ?? true,
      dismissed: [] as string[],
      index: 0,
      hold: false,
      manual: false,
      reduced: false,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      root: null as HTMLElement | null,
      locale: options.locale ?? "en",
      labels: options.labels ?? {},

      init(this: AnnouncementState) {
        this.root = this.$el;
        this.reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        for (const key of ["index", "hold", "dismissed"]) this.$watch(key, () => this.arm());
        this.arm();
      },
      destroy(this: AnnouncementState) {
        clearTimeout(this.timer);
      },

      get live(): AnnouncementItem[] {
        const s = this as unknown as AnnouncementState;
        return chromeLiveAnnouncements(s.items, s.dismissed, options.now ?? Date.now());
      },
      get many(): boolean {
        return (this as unknown as AnnouncementState).live.length > 1;
      },
      get at(): number {
        const s = this as unknown as AnnouncementState;
        return Math.min(s.index, Math.max(s.live.length - 1, 0));
      },
      get current(): AnnouncementItem {
        const s = this as unknown as AnnouncementState;
        return s.live[s.at] ?? ({ id: "", content: "" } as AnnouncementItem);
      },
      get visible(): boolean {
        return (this as unknown as AnnouncementState).live.length > 0;
      },
      get position(): string {
        const s = this as unknown as AnnouncementState;
        const n = (v: number) => new Intl.NumberFormat(`${s.locale}-u-nu-latn`).format(v);
        return fill(s.labels.announcementOf ?? "", { n: n(s.at + 1), total: n(s.live.length) });
      },
      arm(this: AnnouncementState) {
        clearTimeout(this.timer);
        if (this.live.length > 1 && this.interval > 0 && !this.reduced && !this.hold) {
          this.timer = setTimeout(() => (this.index = chromeStep(this.index, this.live.length, 1)), this.interval);
        }
      },
      step(this: AnnouncementState, s: 1 | -1) {
        this.manual = true;
        this.index = chromeStep(this.index, this.live.length, s);
      },
      dismiss(this: AnnouncementState) {
        const c = this.live[this.at];
        if (!c) return;
        this.dismissed = [...this.dismissed, c.id];
        (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-store-dismiss", { bubbles: true, detail: { id: c.id } }));
      },
    }),
  );

  Alpine.data(
    "nqStoreSearch",
    (
      options: {
        products?: CommerceProduct[];
        tree?: ListingCategoryNode[];
        currency?: string | null;
        exponent?: number;
        popular?: string[];
        recent?: string[];
        query?: string;
        loading?: boolean;
        hrefs?: Record<string, string>;
        locale?: string;
        labels?: Record<string, string>;
      } = {},
    ) => ({
      products: options.products ?? [],
      tree: options.tree ?? [],
      currency: options.currency ?? null,
      exponent: options.exponent ?? 2,
      popular: options.popular ?? [],
      recent: [...(options.recent ?? [])],
      query: options.query ?? "",
      open: false,
      active: -1,
      loading: options.loading ?? false,
      hrefs: options.hrefs ?? {},
      uid: `nq-store-search-${Math.random().toString(36).slice(2, 8)}`,
      locale: options.locale ?? "en",
      labels: options.labels ?? {},
      root: null as HTMLElement | null,

      init(this: SearchState) {
        this.root = this.$el;
        this.$watch("query", () => (this.active = -1));
        this.$watch("open", () => (this.active = -1));
      },

      t(this: SearchState, key: string, vars: Record<string, string | number> = {}): string {
        return fill(String(this.labels[key] ?? ""), vars);
      },
      tell(this: SearchState, name: string, detail: Record<string, unknown>, cancelable = false) {
        const event = new CustomEvent(name, { bubbles: true, cancelable, detail });
        (this.root ?? this.$el).dispatchEvent(event);
        return event;
      },

      get listId(): string {
        return `${(this as unknown as SearchState).uid}-list`;
      },
      get q(): string {
        return (this as unknown as SearchState).query.trim();
      },
      get suggestions(): ChromeSuggestion[] {
        const s = this as unknown as SearchState;
        return chromeSuggest(s.products, s.query, { categories: chromeFlattenCategories(s.tree), recent: s.recent, popular: s.popular });
      },
      get rows(): Row[] {
        const s = this as unknown as SearchState;
        const money = (p: CommerceProduct) =>
          s.currency ? formatMoney(listingMinPrice(p) / 10 ** s.exponent, { locale: s.locale, currency: s.currency, compact: true }) : "";
        const q = s.query.trim();
        const rows: Row[] = s.suggestions.map((g, i) => {
          const p = g.kind === "product" ? s.products.find((x) => x.id === g.productId) : undefined;
          const parent = g.path ? g.path.split(" / ").slice(0, -1).join(" / ") : "";
          return {
            key: g.id,
            i,
            kind: g.kind,
            label: g.label,
            segments: chromeHighlight(g.label, q),
            note: g.kind === "category" && parent ? fill(String(s.labels.inCategory ?? ""), { category: parent }) : "",
            brand: p?.brand ?? "",
            image: p?.images[0]?.src ?? "",
            priceText: p ? money(p) : "",
            hasProduct: !!p,
            isRow: true,
          };
        });
        if (q) {
          rows.push({
            key: "submit",
            i: rows.length,
            kind: "submit",
            label: fill(String(s.labels.searchFor ?? ""), { query: q }),
            segments: [],
            note: "",
            brand: "",
            image: "",
            priceText: "",
            hasProduct: false,
            isRow: true,
          });
        }
        return rows;
      },
      get groups(): { kind: string; title: string; rows: Row[] }[] {
        const s = this as unknown as SearchState;
        const titles: [string, string][] = [
          ["category", s.labels.categoriesGroup ?? ""],
          ["product", s.labels.productsGroup ?? ""],
          ["recent", s.labels.recentGroup ?? ""],
          ["popular", s.labels.popularGroup ?? ""],
        ];
        return titles.map(([kind, title]) => ({ kind, title, rows: s.rows.filter((r) => r.kind === kind) })).filter((g) => g.rows.length > 0);
      },
      get submitRow(): Row | null {
        const s = this as unknown as SearchState;
        return s.rows.find((r) => r.kind === "submit") ?? null;
      },
      get showList(): boolean {
        const s = this as unknown as SearchState;
        return s.open && s.rows.length > 0;
      },
      get noSuggestions(): boolean {
        const s = this as unknown as SearchState;
        return !!s.query.trim() && s.suggestions.length === 0;
      },
      get noSuggestionsText(): string {
        const s = this as unknown as SearchState;
        return fill(String(s.labels.noSuggestions ?? ""), { query: s.query.trim() });
      },
      get liveText(): string {
        const s = this as unknown as SearchState;
        return s.showList ? fill(String(s.labels.suggestionsCount ?? ""), { n: new Intl.NumberFormat(`${s.locale}-u-nu-latn`).format(s.suggestions.length) }) : "";
      },
      get activeId(): string | null {
        const s = this as unknown as SearchState;
        return s.showList && s.active >= 0 ? `${s.uid}-opt-${s.active}` : null;
      },

      setRecent(this: SearchState, next: string[]) {
        this.recent = next;
        this.tell("nq-store-recent-change", { recent: [...next] });
      },
      clearRecent(this: SearchState) {
        this.setRecent([]);
      },
      run(this: SearchState, q: string) {
        const text = q.trim();
        if (!text) return;
        this.setRecent(chromeRecordRecent(this.recent, text));
        this.query = text;
        this.open = false;
        this.tell("nq-store-search", { query: text });
      },
      choose(this: SearchState, index: number) {
        const row = this.rows[index];
        if (!row || row.kind === "submit") return this.run(this.query);
        const g = this.suggestions[index];
        if (!g) return;
        if (g.kind === "product") {
          const product = this.products.find((x) => x.id === g.productId);
          if (product) {
            const event = this.tell("nq-store-select-product", { product }, true);
            const href = this.hrefs[product.id];
            if (event.defaultPrevented || href) {
              this.setRecent(chromeRecordRecent(this.recent, this.query.trim() || g.label));
              this.open = false;
              this.query = "";
              if (!event.defaultPrevented && href) window.location.assign(href);
              return;
            }
          }
        }
        if (g.kind === "category" && g.categoryId) {
          const event = this.tell("nq-store-select-category", { categoryId: g.categoryId, label: g.label }, true);
          if (event.defaultPrevented) {
            this.open = false;
            this.query = "";
            return;
          }
        }
        this.run(g.query);
      },
      submit(this: SearchState) {
        this.run(this.query);
      },
      onInput(this: SearchState) {
        this.open = true;
      },
      onKeydown(this: SearchState, event: KeyboardEvent) {
        const k = event.key;
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End") {
          if (!this.rows.length) return;
          if ((k === "Home" || k === "End") && !this.showList) return;
          event.preventDefault();
          this.open = true;
          this.active = chromeMoveActive(this.active, this.rows.length, k);
        } else if (k === "Enter") {
          event.preventDefault();
          if (this.showList && this.active >= 0) this.choose(this.active);
          else this.run(this.query);
        } else if (k === "Escape") {
          if (this.showList) {
            event.preventDefault();
            event.stopPropagation();
            this.open = false;
          } else if (this.query) this.query = "";
        }
      },
      onFocusout(this: SearchState, event: FocusEvent) {
        if (!(this.root ?? this.$el).contains(event.relatedTarget as Node | null)) this.open = false;
      },
      clear(this: SearchState) {
        this.query = "";
        (this.$refs.input as HTMLInputElement | undefined)?.focus();
      },
    }),
  );

  Alpine.data("nqStoreNewsletter", (options: { labels?: Record<string, string> } = {}) => ({
    email: "",
    state: "idle" as NewsletterState["state"],
    labels: options.labels ?? {},

    get message(): string {
      const s = this as unknown as NewsletterState;
      const L = s.labels;
      return s.state === "done" ? (L.subscribed ?? "") : s.state === "invalid" ? (L.invalidEmail ?? "") : s.state === "failed" ? (L.subscribeFailed ?? "") : "";
    },
    get busy(): boolean {
      return (this as unknown as NewsletterState).state === "busy";
    },
    get invalid(): boolean {
      return (this as unknown as NewsletterState).state === "invalid";
    },
    get done(): boolean {
      return (this as unknown as NewsletterState).state === "done";
    },
    onInput(this: NewsletterState) {
      if (this.state !== "busy") this.state = "idle";
    },
    async submit(this: NewsletterState) {
      const email = this.email.trim();
      if (!EMAIL.test(email)) {
        this.state = "invalid";
        return;
      }
      this.state = "busy";
      const event = new CustomEvent("nq-store-subscribe", { bubbles: true, detail: { email, promise: undefined as Promise<unknown> | undefined } });
      this.$el.dispatchEvent(event);
      try {
        await (event.detail as { promise?: Promise<unknown> }).promise;
        this.state = "done";
        this.email = "";
      } catch {
        this.state = "failed";
      }
    },
  }));
};
