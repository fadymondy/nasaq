// nqCommandPalette: the Cmd+K spotlight search. The markup is in the Blade component command-palette; the state lives here.
//
//   <div x-data="nqCommandPalette(commands, { hotkey: true, sources: [{ url: '/search', minQuery: 2 }] })" x-modelable="open" x-on:keydown.window="onHotkey($event)">…</div>
//
// commands: id, label, section (context | search | create | navigation | products | ai | system, or your own with sectionLabel and sectionOrder), iconHtml, keywords, shortcut, hint,
// priority, disabled, searchOnly, keepOpen, href, children (a nested page; Backspace on an empty field and Escape go back). Running a command fires a bubbling "nq-command" { id, command }
// from the root and then follows href unless that event was cancelled. "nq-command-palette-open" and "nq-command-palette-toggle" on window open or toggle it (the search trigger uses them).
// options: hotkey (Cmd+K / Ctrl+K, default true), sectionLabels, sources [{ url, param (default q), minQuery, debounce }] (async results from a JSON endpoint returning commands), open.
// open is x-modelable: x-model="$wire.paletteOpen". Not ported: a shared commands registry (register commands by passing them as props) and per-command shortcut binding.

import { DEFAULT_SECTION_LABELS, isApplePlatform, normalizeForSearch, scoreCommand, sectionOrder, type PaletteCommand } from "./command-palette-logic";
import type { Magics, Register } from "./types";

export interface PaletteSource {
  url: string;
  param?: string;
  minQuery?: number;
  debounce?: number;
}
export interface PaletteOptions {
  hotkey?: boolean;
  sectionLabels?: Record<string, string>;
  sources?: PaletteSource[];
  open?: boolean;
}
interface Row {
  c: PaletteCommand;
  i: number;
}
interface Section {
  id: string;
  label: string;
  items: Row[];
}
interface View {
  sections: Section[];
  flat: PaletteCommand[];
}

interface Nq {
  locale: string;
}
interface PaletteState extends Magics {
  $nq: Nq;
  commands: PaletteCommand[];
  sectionLabels: Record<string, string>;
  sources: PaletteSource[];
  hotkey: boolean;
  open: boolean;
  query: string;
  pages: PaletteCommand[];
  remote: PaletteCommand[];
  searching: boolean;
  highlighted: number;
  mod: string;
  root: HTMLElement;
  view(): View;
  close(): void;
  show(): void;
  ar(): boolean;
  run(c: PaletteCommand): void;
  move(delta: number, absolute?: boolean): void;
  input(): HTMLInputElement | null;
}

const optionId = (i: number) => `nq-cp-opt-${i}`;

export const commandPalette: Register = (Alpine) => {
  Alpine.data("nqCommandPalette", (commands: PaletteCommand[] = [], options: PaletteOptions = {}) => {
    // Outside the reactive state: the memoised view and the running search.
    let cacheKey = "";
    let cache: View = { sections: [], flat: [] };
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    return {
      commands,
      sectionLabels: options.sectionLabels ?? ({} as Record<string, string>),
      sources: options.sources ?? ([] as PaletteSource[]),
      hotkey: options.hotkey !== false,
      open: Boolean(options.open),
      query: "",
      pages: [] as PaletteCommand[],
      remote: [] as PaletteCommand[],
      searching: false,
      highlighted: 0,
      mod: "Ctrl",
      root: null as unknown as HTMLElement,

      init(this: PaletteState & { search(): void }) {
        this.root = this.$el;
        this.mod = isApplePlatform() ? "⌘" : "Ctrl";
        this.$watch("open", (isOpen: boolean) => {
          this.root.dispatchEvent(new CustomEvent("nq-open-change", { bubbles: true, detail: { open: isOpen } }));
          if (isOpen) {
            this.$nextTick(() => this.input()?.focus());
          } else {
            // Every open starts fresh at the root.
            this.query = "";
            this.pages = [];
            this.remote = [];
          }
          this.search();
        });
        this.$watch("query", () => this.search());
        this.$watch("pages", () => this.search());
        // The first result is highlighted whenever the list changes.
        this.$watch("listKey", () => {
            this.highlighted = Math.max(
              0,
              this.view().flat.findIndex((c) => !c.disabled),
            );
        });
      },
      destroy() {
        controller?.abort();
        clearTimeout(timer);
      },

      ar(this: PaletteState) {
        return String(this.$nq?.locale ?? document.documentElement.lang ?? "").startsWith("ar");
      },
      show(this: PaletteState) {
        this.open = true;
      },
      close(this: PaletteState) {
        this.open = false;
      },
      toggle(this: PaletteState) {
        this.open = !this.open;
      },
      input(): HTMLInputElement | null {
        return document.querySelector<HTMLInputElement>('[data-slot="command-palette"] input[role="combobox"]');
      },
      onHotkey(this: PaletteState, event: KeyboardEvent) {
        if (!this.hotkey) return;
        const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
        if (!mod || event.altKey || event.shiftKey) return;
        if (event.code !== "KeyK" && event.key.toLowerCase() !== "k") return;
        event.preventDefault();
        this.open = !this.open;
      },
      optionId,
      /** Changes whenever the visible list does (so the first result is highlighted again). */
      get listKey(): string {
        const flat = (this as unknown as PaletteState).view().flat;
        return flat.length + "|" + flat.map((c) => c.id).join(",");
      },

      // The list: ranked and grouped.
      page(this: PaletteState) {
        return this.pages[this.pages.length - 1];
      },
      labelOf(this: PaletteState & { page(): PaletteCommand | undefined }, c: PaletteCommand) {
        const id = c.section ?? "context";
        if (this.sectionLabels[id]) return this.sectionLabels[id]!;
        const std = DEFAULT_SECTION_LABELS[id];
        if (std) return std[this.ar() ? "ar" : "en"];
        return c.sectionLabel ?? id;
      },
      arrange(this: PaletteState & { labelOf(c: PaletteCommand): string }, list: PaletteCommand[], raw: string): { id: string; label: string; items: PaletteCommand[] }[] {
        const q = normalizeForSearch(raw);
        const ranked = list
          .map((c, index) => ({ c, index, score: q ? scoreCommand(c, q) : c.searchOnly ? 0 : 1 }))
          .filter((r) => r.score > 0)
          .sort((a, b) => sectionOrder(a.c) - sectionOrder(b.c) || b.score - a.score || (b.c.priority ?? 0) - (a.c.priority ?? 0) || a.index - b.index);
        const sections = new Map<string, { id: string; label: string; items: PaletteCommand[] }>();
        for (const { c } of ranked) {
          const id = c.section ?? "context";
          if (!sections.has(id)) sections.set(id, { id, label: this.labelOf(c), items: [] });
          sections.get(id)!.items.push(c);
        }
        return [...sections.values()];
      },
      view(this: PaletteState & { page(): PaletteCommand | undefined; arrange(l: PaletteCommand[], q: string): { id: string; label: string; items: PaletteCommand[] }[] }): View {
        const key = [this.query, this.pages.map((p) => p.id).join("/"), this.remote.length, this.commands.length, this.ar() ? "ar" : "en"].join("|");
        if (key === cacheKey) return cache;
        let groups: { id: string; label: string; items: PaletteCommand[] }[];
        const p = this.page();
        if (p) {
          groups = this.arrange((p.children ?? []).map((c) => ({ ...c, section: p.id, sectionLabel: p.label, sectionOrder: 0 })), this.query);
        } else {
          const local = this.arrange(this.commands, this.query);
          // Remote results are already matched by their source; keep them whatever the local score.
          const found = this.remote.length ? this.arrange(this.remote.map((c) => ({ ...c, keywords: [...(c.keywords ?? []), this.query] })), this.query) : [];
          groups = [...local, ...found].sort((a, b) => sectionOrder(a.items[0]!) - sectionOrder(b.items[0]!));
        }
        const flat: PaletteCommand[] = [];
        const sections: Section[] = groups.map((g) => ({ id: g.id, label: g.label, items: g.items.map((c) => ({ c, i: flat.push(c) - 1 })) }));
        cacheKey = key;
        cache = { sections, flat };
        return cache;
      },

      // Async sources: debounced, aborted when the query changes, root page only.
      search(this: PaletteState & { page(): PaletteCommand | undefined }) {
        controller?.abort();
        clearTimeout(timer);
        const q = this.query.trim();
        if (!this.open || this.page() || this.sources.length === 0) {
          this.searching = false;
          return;
        }
        const active = this.sources.filter((s) => q.length >= (s.minQuery ?? 1));
        if (active.length === 0) {
          this.remote = [];
          this.searching = false;
          return;
        }
        const own = new AbortController();
        controller = own;
        this.searching = true;
        timer = setTimeout(
          async () => {
            const results = await Promise.allSettled(
              active.map(async (s) => {
                const url = new URL(s.url, window.location.href);
                url.searchParams.set(s.param ?? "q", q);
                const res = await fetch(url, { signal: own.signal, headers: { Accept: "application/json" } });
                return (await res.json()) as PaletteCommand[];
              }),
            );
            if (own.signal.aborted) return;
            this.remote = results.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value.map((c) => ({ section: "search", ...c })) : []));
            this.searching = false;
          },
          Math.max(...active.map((s) => s.debounce ?? 150)),
        );
      },

      run(this: PaletteState, c: PaletteCommand) {
        if (c.disabled) return;
        if (c.children) {
          this.pages = [...this.pages, c];
          this.query = "";
          return;
        }
        if (!c.keepOpen) this.open = false;
        const { children: _children, ...plain } = c;
        const event = new CustomEvent("nq-command", { bubbles: true, cancelable: true, detail: { id: c.id, command: plain } });
        const proceed = this.root.dispatchEvent(event);
        if (proceed && c.href) window.location.href = c.href;
      },
      back(this: PaletteState, to?: number) {
        this.pages = to === undefined ? this.pages.slice(0, -1) : this.pages.slice(0, to + 1);
        this.query = "";
        this.$nextTick(() => this.input()?.focus());
      },
      move(this: PaletteState, delta: number, absolute = false) {
        const flat = this.view().flat;
        const n = flat.length;
        if (!n) return;
        let i = absolute ? (delta < 0 ? 0 : n - 1) : this.highlighted;
        const step = absolute ? (delta < 0 ? 1 : -1) : delta;
        for (let tries = 0; tries < n; tries++) {
          if (!absolute) i = (i + step + n) % n;
          if (!flat[i]!.disabled) break;
          if (absolute) i += step;
        }
        this.highlighted = i;
        this.$nextTick(() => document.getElementById(optionId(i))?.scrollIntoView?.({ block: "nearest" }));
      },
      onKey(this: PaletteState & { back(): void }, e: KeyboardEvent) {
        if (e.isComposing) return;
        if (e.key === "ArrowDown") (e.preventDefault(), this.move(1));
        else if (e.key === "ArrowUp") (e.preventDefault(), this.move(-1));
        else if (e.key === "Home") (e.preventDefault(), this.move(-1, true));
        else if (e.key === "End") (e.preventDefault(), this.move(1, true));
        else if (e.key === "Enter") {
          const c = this.view().flat[this.highlighted];
          if (c) (e.preventDefault(), this.run(c));
        } else if (e.key === "Backspace" && this.query === "" && this.pages.length) {
          e.preventDefault();
          this.back();
        }
      },
      /** Escape on a nested page steps back one level; only Escape at the root closes. */
      onEscape(this: PaletteState & { back(): void }, e: KeyboardEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this.pages.length) this.back();
        else this.open = false;
      },
      /** A shortcut as keys: "Mod K" becomes the Command or Ctrl glyph and K. */
      keys(this: PaletteState, shortcut: string): string[] {
        const names: Record<string, string> = { mod: this.mod, cmd: "⌘", ctrl: "Ctrl", alt: this.mod === "⌘" ? "⌥" : "Alt", shift: this.mod === "⌘" ? "⇧" : "Shift" };
        return shortcut
          .split(/[\s+]+/)
          .filter(Boolean)
          .map((k) => names[k.toLowerCase()] ?? k);
      },
    };
  });

  /** The "Search... Cmd+K" button: shows Command or Ctrl by platform and opens the palette through a window event. */
  Alpine.data("nqSearchTrigger", () => ({
    mod: "Ctrl",
    init() {
      this.mod = isApplePlatform() ? "⌘" : "Ctrl";
    },
    press(this: Magics, event: MouseEvent) {
      if (event.defaultPrevented) return;
      window.dispatchEvent(new CustomEvent("nq-command-palette-open"));
    },
  }));
};
