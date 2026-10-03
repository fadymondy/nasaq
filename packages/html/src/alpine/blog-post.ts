// nqBlogPost: the behaviour of an article page: reading progress, the scroll-spy for the table of contents and its smooth jump links.
// The markup is the React BlogPost's, rendered by Blade; the helpers below are blog-model.ts of packages/web, trimmed.
//
//   <div data-slot="blog-post" x-data="nqBlogPost({ ids: ['setup', 'usage'], offset: 96 })">
//     <div role="progressbar" :aria-valuenow="Math.round(progress * 100)"><div :style="{ width: progress * 100 + '%' }"></div></div>
//     <a href="#setup" data-id="setup" :aria-current="isActive($el) ? 'location' : null" x-on:click="go($event)">Setup</a>
//     <article x-ref="article"><h2 id="setup">Setup</h2></article>
//   </div>
//
// `active` is the id of the heading in view (the last one whose top passed `offset`; at the page bottom the last heading wins),
// `progress` is 0..1 through the article, `tocOpen` is the state of the narrow-screen table of contents. go() scrolls smoothly (not with
// reduced motion), updates the URL hash and closes the narrow table of contents.

import type { Magics, Register } from "./types";

/** The heading the reader is in: the last one whose top edge has passed `offset` px from the viewport top. */
export function activeHeadingId(tops: { id: string; top: number }[], offset = 96): string | null {
  let active: string | null = null;
  for (const t of tops) {
    if (t.top <= offset + 1) active = t.id;
    else break;
  }
  return active;
}

/** 0..1 through an article. `top` and `height` are the article's bounding box, `viewport` the window height. */
export function readingProgress(top: number, height: number, viewport: number): number {
  const scrollable = height - viewport;
  if (scrollable <= 0) return top <= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, -top / scrollable));
}

interface Config {
  ids?: string[];
  offset?: number;
}

interface State extends Magics {
  progress: number;
  active: string | null;
  tocOpen: boolean;
  ids: string[];
  offset: number;
  raf: number;
  root: HTMLElement | null;
  off: (() => void) | null;
  update(): void;
  schedule(): void;
  isActive(el: HTMLElement): boolean;
  go(event: Event): void;
}

export const blogPost: Register = (Alpine) => {
  Alpine.data("nqBlogPost", (config: Config = {}) => ({
    progress: 0,
    active: null as string | null,
    tocOpen: false,
    ids: config.ids ?? [],
    offset: config.offset ?? 96,
    raf: 0,
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
    },
    destroy(this: State) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.off?.();
    },
    schedule(this: State) {
      if (!this.raf) this.raf = requestAnimationFrame(() => this.update());
    },
    update(this: State) {
      this.raf = 0;
      const root = this.root ?? this.$el;
      const article = root.querySelector<HTMLElement>("article");
      if (article) {
        const r = article.getBoundingClientRect();
        this.progress = readingProgress(r.top, r.height, window.innerHeight);
      }
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
      this.tocOpen = false;
      this.active = id;
    },
  }));
};
