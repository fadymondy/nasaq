// nqPagination: numbered pages with ellipsis. The markup is the React Pagination's (the Blade component renders it),
// the page and the page list live here.
//
//   <nav data-slot="pagination" x-data="nqPagination(3, 24)" x-modelable="page">
//     <button x-on:click="go(page - 1)" :disabled="page <= 1">Previous</button>
//     <template x-for="item in items()" :key="item"> … <button x-text="num(item)" x-on:click="go(item)"> … </template>
//     <button x-on:click="go(page + 1)" :disabled="page >= pageCount">Next</button>
//   </nav>
//
// page is x-modelable (x-model / wire:model). Changing the page fires `page-change` with the new page as detail.
// Elements marked data-ssr (the server-rendered first paint) are removed when Alpine takes over.
// Self-contained: items() is getPaginationItems of @fadymondy/nasaq.

import type { Register } from "./types";

type Item = number | "start-ellipsis" | "end-ellipsis";

const range = (from: number, to: number) => Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

function paginationItems(page: number, pageCount: number, siblings = 1, boundaries = 1): Item[] {
  const startPages = range(1, Math.min(boundaries, pageCount));
  const endPages = range(Math.max(pageCount - boundaries + 1, boundaries + 1), pageCount);
  const siblingsStart = Math.max(Math.min(page - siblings, pageCount - boundaries - siblings * 2 - 1), boundaries + 2);
  const siblingsEnd = Math.min(Math.max(page + siblings, boundaries + siblings * 2 + 2), endPages.length > 0 ? (endPages[0] as number) - 2 : pageCount - 1);
  const before: Item[] = siblingsStart > boundaries + 2 ? ["start-ellipsis"] : boundaries + 1 < pageCount - boundaries ? [boundaries + 1] : [];
  const after: Item[] = siblingsEnd < pageCount - boundaries - 1 ? ["end-ellipsis"] : pageCount - boundaries > boundaries ? [pageCount - boundaries] : [];
  return [...startPages, ...before, ...range(siblingsStart, siblingsEnd), ...after, ...endPages];
}

interface PaginationScope {
  page: number;
  pageCount: number;
  siblings: number;
  boundaries: number;
  $el: HTMLElement;
  $nq: { t(en: string, ar: string): string; locale: string };
  $dispatch(event: string, detail?: unknown): void;
  current(): number;
}

export const pagination: Register = (Alpine) => {
  Alpine.data("nqPagination", (page: number = 1, pageCount: number = 1, siblings: number = 1, boundaries: number = 1) => ({
    page: Number(page),
    pageCount: Number(pageCount),
    siblings,
    boundaries,
    init(this: PaginationScope) {
      this.$el.querySelectorAll("[data-ssr]").forEach((el) => el.remove());
    },
    current(this: PaginationScope) {
      return Math.min(Math.max(this.page, 1), Math.max(this.pageCount, 1));
    },
    /** The page numbers and ellipsis to show. */
    items(this: PaginationScope): Item[] {
      return paginationItems(this.current(), this.pageCount, this.siblings, this.boundaries);
    },
    /** A page number as text: Latin digits in every locale. */
    num(this: PaginationScope, n: number) {
      return new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`).format(n);
    },
    pageLabel(this: PaginationScope & { num(n: number): string }, n: number) {
      const f = this.num(n);
      return this.$nq.t(`Page ${f}`, `الصفحة ${f}`);
    },
    go(this: PaginationScope, n: number) {
      if (n !== this.current() && n >= 1 && n <= this.pageCount) {
        this.page = n;
        this.$dispatch("page-change", n);
      }
    },
  }));
};
