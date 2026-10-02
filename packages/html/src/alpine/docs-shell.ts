// nqDocsShell: the behaviour of the documentation layout: the sidebar filter, navigation, the phone drawer and the scroll-spy of the table of contents.
// The markup is the React DocsShell's, rendered by Blade (<x-nq::docs-shell>).
//
//   <div data-slot="docs-shell" x-data="nqDocsShell({ nav: [{ id: 'intro', title: 'Intro' }], page: 'intro', ids: ['why'], navHref: '/docs/{id}' })">
//     <nav x-effect="filterTree($el, term)"> <input x-model="term" /> <div data-slot="tree-view" x-model="picked">…</div> </nav>
//     <a href="#why" data-id="why" :aria-current="isActive($el) ? 'location' : null" x-on:click="go($event)">Why</a>
//   </div>
//
// term: the filter text. picked: the tree selection (a page opens it, a section toggles). drawer: the phone navigation sheet.
// visit(id) closes the drawer and dispatches the cancelable `nq-navigate` ({ id }) from the root; unless prevented it goes to
// navHref with {id} replaced. The filter edits the tree's own `nodes` and `expanded` (via Alpine.$data) and restores them when cleared.

import { activeHeadingId } from "./blog-post";
import { docsShellIds, docsShellSectionIds, filterDocsShellTree, type DocsShellNode } from "./docs-shell-logic";
import type { Magics, Register } from "./types";

interface Config {
  nav?: DocsShellNode[];
  page?: string;
  ids?: string[];
  offset?: number;
  navHref?: string | null;
  noMatch?: string;
}

interface TreeData {
  nodes: { id: string }[];
  expanded: string[];
  toggle(id: string): void;
}

interface State extends Magics {
  host: HTMLElement | null;
  nav: DocsShellNode[];
  term: string;
  picked: string[];
  drawer: boolean;
  active: string | null;
  ids: string[];
  offset: number;
  navHref: string | null;
  noMatchTpl: string;
  raf: number;
  off: (() => void) | null;
  filterTree(el: HTMLElement, term: string): void;
  noMatch(): boolean;
  noMatchText(): string;
  visit(id: string, event?: Event): void;
  update(): void;
  isActive(el: HTMLElement): boolean;
  go(event: Event): void;
}

const originals = new WeakMap<object, { nodes: { id: string }[]; expanded: string[] }>();

/** The data of a tree-view root (Alpine.$data exists at runtime, not in AlpineLike). */
function treeData(alpine: unknown, el: Element): TreeData {
  return (alpine as { $data(el: Element): unknown }).$data(el) as TreeData;
}

export const docsShell: Register = (Alpine) => {
  Alpine.data("nqDocsShell", (config: Config = {}) => ({
    host: null as HTMLElement | null,
    nav: config.nav ?? [],
    term: "",
    picked: config.page ? [config.page] : ([] as string[]),
    drawer: false,
    active: null as string | null,
    ids: config.ids ?? [],
    offset: config.offset ?? 96,
    navHref: config.navHref ?? null,
    noMatchTpl: config.noMatch ?? "",
    raf: 0,
    off: null as (() => void) | null,
    init(this: State) {
      this.host = this.$el;
      const sections = new Set(docsShellSectionIds(this.nav));
      const pages = new Set(docsShellIds(this.nav).filter((id) => !sections.has(id)));
      this.$watch("picked", (value: string[] | string) => {
        const id = Array.isArray(value) ? value[0] : value;
        if (!id) return;
        if (id !== config.page) {
          if (pages.has(id)) this.visit(id);
          else if (sections.has(id) && this.term.trim() === "") {
            const host = this.host;
            host?.querySelectorAll<HTMLElement>("[data-slot='tree-view']").forEach((tree) => treeData(Alpine, tree).toggle(id));
            document.querySelectorAll<HTMLElement>("body > [data-slot='sheet-content'] [data-slot='tree-view'], [data-slot='sheet-content'] [data-slot='tree-view']").forEach((tree) => {
              if (!host?.contains(tree)) treeData(Alpine, tree).toggle(id);
            });
          }
        }
        this.picked = config.page ? [config.page] : [];
      });
      const onScroll = () => {
        if (!this.raf) this.raf = requestAnimationFrame(() => this.update());
      };
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
    /** Applies the filter to the tree inside `el`: only matching rows, every section open; restored when the term is blank. */
    filterTree(this: State, el: HTMLElement, term: string) {
      void term;
      this.$nextTick(() => {
        const tree = el.querySelector<HTMLElement>("[data-slot='tree-view']");
        if (!tree) return;
        const data = treeData(Alpine, tree);
        if (!originals.has(data)) originals.set(data, { nodes: data.nodes, expanded: data.expanded });
        const base = originals.get(data)!;
        const query = this.term.trim();
        if (!query) {
          if (data.nodes !== base.nodes) data.nodes = base.nodes;
          if (data.expanded !== base.expanded) data.expanded = base.expanded;
          return;
        }
        const keep = new Set(docsShellIds(filterDocsShellTree(this.nav, query)));
        data.nodes = base.nodes.filter((n) => keep.has(n.id));
        data.expanded = docsShellSectionIds(this.nav);
      });
    },
    noMatch(this: State) {
      const query = this.term.trim();
      return query !== "" && filterDocsShellTree(this.nav, query).length === 0;
    },
    noMatchText(this: State) {
      return this.noMatchTpl.replace("{query}", this.term.trim());
    },
    visit(this: State, id: string, event?: Event) {
      this.drawer = false;
      const host = this.host ?? this.$el;
      const ev = new CustomEvent("nq-navigate", { detail: { id }, bubbles: true, cancelable: true });
      host.dispatchEvent(ev);
      if (this.navHref) {
        if (event) event.preventDefault();
        if (!ev.defaultPrevented) location.assign(this.navHref.replace("{id}", encodeURIComponent(id)));
      }
    },
    update(this: State) {
      this.raf = 0;
      const host = this.host ?? this.$el;
      const tops = this.ids.flatMap((id) => {
        const el = host.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
        return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
      });
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && window.scrollY > 0;
      this.active = atBottom && tops.length ? (tops[tops.length - 1] as { id: string }).id : activeHeadingId(tops, this.offset);
    },
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
  }));
};
