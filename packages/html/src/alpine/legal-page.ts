// nqLegalPage: the behaviour of a legal document page: scroll-spy for the "On this page" rail, copy-link buttons that announce the result,
// the document switcher and opening on the section a URL hash points to. The markup is the React LegalPage's, rendered by Blade.
//
//   <div data-slot="legal-page" x-data="nqLegalPage({ ids: ['payments'], offset: 96 })">
//     <button x-on:click="selectDocument('privacy')">Privacy</button>
//     <h2 id="payments">…</h2><button x-on:click="copyLink('payments')"><svg x-show="copied !== 'payments'">…</svg></button>
//     <a href="#payments" data-id="payments" x-on:click="go($event)" x-bind:aria-current="isActive($el) ? 'location' : null">Payments</a>
//     <p role="status" x-text="copied ? 'Link copied' : ''"></p>
//   </div>
//
// `active` is the heading in view, `copied` the id of the section whose link was just copied (cleared after 1.8 s). copyLink() fires
// `nq:copy-link` ({ url }) and selectDocument() fires `nq:select-document` ({ id }) from the root.

import { activeHeadingId } from "./blog-post";
import { copyText } from "./copy-button";
import type { Magics, Register } from "./types";

/** The section a URL hash points to (`#data-we-collect`, percent-encoded Arabic too), or `undefined`. */
export function legalHashTarget(hash: string, ids: readonly string[]): string | undefined {
  const raw = hash.replace(/^#/, "");
  if (!raw) return undefined;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* Malformed escapes: compare the raw text. */
  }
  return ids.find((id) => id === decoded || id === raw);
}

/** The link to a section for sharing: the page's own URL with the section's hash. */
export function legalSectionUrl(href: string, id: string): string {
  const base = href.split("#")[0] as string;
  return `${base}#${encodeURIComponent(id)}`;
}

interface Config {
  ids?: string[];
  offset?: number;
}

interface State extends Magics {
  active: string | null;
  copied: string | null;
  ids: string[];
  offset: number;
  raf: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  root: HTMLElement | null;
  off: (() => void) | null;
  update(): void;
  schedule(): void;
  isActive(el: HTMLElement): boolean;
  go(event: Event): void;
  copyLink(id: string): Promise<void>;
  selectDocument(id: string): void;
}

export const legalPage: Register = (Alpine) => {
  Alpine.data("nqLegalPage", (config: Config = {}) => ({
    active: null as string | null,
    copied: null as string | null,
    ids: config.ids ?? [],
    offset: config.offset ?? 96,
    raf: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    root: null as HTMLElement | null,
    off: null as (() => void) | null,
    init(this: State) {
      this.root = this.$el;
      const onScroll = () => this.schedule();
      this.update();
      document.addEventListener("scroll", onScroll, { capture: true, passive: true });
      window.addEventListener("resize", onScroll);
      this.off = () => {
        document.removeEventListener("scroll", onScroll, { capture: true });
        window.removeEventListener("resize", onScroll);
      };
      // Open on the section the URL points to.
      const target = legalHashTarget(window.location.hash, this.ids);
      if (target) this.$nextTick(() => document.getElementById(target)?.scrollIntoView?.({ block: "start" }));
    },
    destroy(this: State) {
      if (this.raf) cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
      this.off?.();
    },
    schedule(this: State) {
      if (!this.raf) this.raf = requestAnimationFrame(() => this.update());
    },
    update(this: State) {
      this.raf = 0;
      const root = this.root ?? this.$el;
      const tops = this.ids.flatMap((id) => {
        const el = root.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
        return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
      });
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && window.scrollY > 0;
      this.active = atBottom && tops.length ? (tops[tops.length - 1] as { id: string }).id : activeHeadingId(tops, this.offset);
    },
    /** For a table of contents link: `data-id` holds the heading id. */
    isActive(this: State, el: HTMLElement) {
      return this.active !== null && el.dataset.id === this.active;
    },
    go(this: State, event: Event) {
      const link = event.currentTarget as HTMLElement;
      const id = link.dataset.id;
      const target = id ? document.getElementById(id) : null;
      if (!id || !target) return;
      event.preventDefault();
      const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "start" });
      try {
        history.replaceState(null, "", `#${encodeURIComponent(id)}`);
      } catch {
        /* Sandboxed frames may forbid it. */
      }
      this.active = id;
    },
    async copyLink(this: State, id: string) {
      const url = legalSectionUrl(window.location.href, id);
      if (await copyText(url)) {
        this.copied = id;
        (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq:copy-link", { bubbles: true, detail: { url } }));
        clearTimeout(this.timer);
        this.timer = setTimeout(() => (this.copied = null), 1800);
      }
    },
    selectDocument(this: State, id: string) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq:select-document", { bubbles: true, detail: { id } }));
    },
  }));
};
