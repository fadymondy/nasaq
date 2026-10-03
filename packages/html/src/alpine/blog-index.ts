// nqBlogIndex: search, category and tag filters and paging for the blog archive. The markup is the React BlogIndex's, rendered by
// Blade with every article in it; this module decides which ones are visible (the helpers below are blog-model.ts of
// packages/web, trimmed to what the archive needs).
//
//   <section data-slot="blog-index" x-data="nqBlogIndex({ pageSize: 6, showFeatured: true, posts: [{ slug, category, tags, time, featured, hay }], labels })">
//     <input x-model="query"> <div x-model="category" …chips…> <div x-model="tag" …chips…>
//     <div x-show="visible['my-slug']">…card…</div>   <p x-text="resultsText">   <nav x-model="pageNo" x-effect="pageCount = pageTotal">
//   </section>
//
// It dispatches `nq:filter` ({ query, category, tag }) and `nq:page` ({ page }) from the root. A change of filter returns to page 1. The
// featured article shows above the list on page 1 while no filter is active, and is left out of the grid then.

import type { Magics, Register } from "./types";

const MARKS = /[̀-ًͯ-ٰٟـ]/g;

/** Lower-cases and strips Latin accents and Arabic tashkeel and tatweel, so "Résumé" finds "resume" and "كِتَاب" finds "كتاب". */
function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .trim();
}

interface Post {
  slug: string;
  category: string;
  tags: string[];
  /** Milliseconds. */
  time: number;
  featured?: boolean;
  /** Title, excerpt, category, tags and author joined: what the search looks in. */
  hay: string;
}

interface Config {
  posts: Post[];
  pageSize?: number;
  showFeatured?: boolean;
  labels?: { results?: string; resultsOne?: string };
}

const byNewest = (a: Post, b: Post) => b.time - a.time;

interface State extends Magics {
  query: string;
  category: string;
  tag: string;
  /** The page the pagination binds to. */
  pageNo: number;
  visible: Record<string, boolean>;
  featuredShown: boolean;
  shownCount: number;
  count: number;
  pageTotal: number;
  resultsText: string;
  recompute(): void;
}

export const blogIndex: Register = (Alpine) => {
  Alpine.data("nqBlogIndex", (config: Config) => {
    const posts = [...config.posts].sort(byNewest);
    const size = Math.max(1, Math.floor(config.pageSize ?? 6));
    const showFeatured = config.showFeatured ?? true;
    const ar = (document.documentElement.lang || "en").toLowerCase().startsWith("ar");
    const nf = new Intl.NumberFormat(`${ar ? "ar" : "en"}-u-nu-latn`);
    const labels = { results: "{n} articles", resultsOne: "1 article", ...config.labels };
    const featuredPost = showFeatured ? (posts.find((p) => p.featured) ?? posts[0]) : undefined;

    return {
      query: "",
      category: "",
      tag: "",
      pageNo: 1,
      visible: {} as Record<string, boolean>,
      featuredShown: false,
      shownCount: 0,
      count: posts.length,
      pageTotal: 1,
      resultsText: "",
      init(this: State) {
        for (const key of ["query", "category", "tag"] as const) {
          this.$watch(key, () => {
            this.pageNo = 1;
            this.recompute();
            this.$dispatch("nq:filter", { query: this.query, category: this.category, tag: this.tag });
          });
        }
        this.$watch("pageNo", (page: number) => {
          this.recompute();
          this.$dispatch("nq:page", { page });
        });
        this.recompute();
      },
      clearFilters(this: State) {
        this.query = "";
        this.category = "";
        this.tag = "";
      },
      recompute(this: State) {
        const words = normalizeText(this.query)
          .split(/\s+/)
          .filter(Boolean);
        const filtered = posts.filter((p) => {
          if (this.category && p.category !== this.category) return false;
          if (this.tag && !p.tags.includes(this.tag)) return false;
          return !words.length || words.every((w) => normalizeText(p.hay).includes(w));
        });
        const active = Boolean(this.query.trim() || this.category || this.tag);
        const featured = !active ? featuredPost : undefined;
        const list = featured ? filtered.filter((p) => p.slug !== featured.slug) : filtered;
        const pageCount = Math.max(1, Math.ceil(list.length / size));
        const page = Math.min(Math.max(1, Math.floor(this.pageNo) || 1), pageCount);
        const shown = list.slice((page - 1) * size, page * size);
        if (page !== this.pageNo) this.pageNo = page;
        const visible: Record<string, boolean> = {};
        for (const p of shown) visible[p.slug] = true;
        this.visible = visible;
        this.featuredShown = Boolean(featured) && page === 1;
        this.shownCount = shown.length;
        this.count = filtered.length;
        this.pageTotal = pageCount;
        this.resultsText = filtered.length === 1 ? labels.resultsOne : labels.results.replace("{n}", nf.format(filtered.length));
      },
    };
  });
};
