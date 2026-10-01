// nqIconPicker: search, category tabs, a keyboard grid, "Show more" and recent icons over server-rendered tiles.
//
//   <div x-data="nqIconPicker(null, 8, 96, 'nasaq:icon-picker:recent')" x-modelable="value">
//     <input x-model="query" x-on:keydown="onSearchKey($event)">
//     <button role="tab" x-on:click="category = null" x-bind:aria-selected="category === null">All</button>
//     <div role="listbox" x-ref="grid" x-on:keydown="onGridKey($event)">
//       <button data-slot="icon-picker-tile" data-name="house" data-category="general" data-keywords="home house start رئيسية" role="option">…svg…</button>
//     </div>
//     <button x-show="remaining > 0" x-on:click="showMore()">…</button>
//   </div>
//
// The tiles are all in the page; this module shows the matching ones (best matches first, one page at a time) by setting
// display, order, data-index and the roving tabindex on them. Every word of the query must start a word in the icon's name or
// keywords (English or Arabic, diacritics and alef/yeh/teh-marbuta variants folded). value is the chosen kebab-case name
// (x-modelable). A choice is kept in recent (localStorage, `recentKey`, or memory when the key is empty) and dispatches `select`.

import type { Magics, Register } from "./types";

interface Tile {
  el: HTMLElement;
  name: string;
  category: string;
  nameWords: string[];
  extra: string[];
  plain: string;
}

interface PickerState extends Magics {
  value: string | null;
  query: string;
  category: string | null;
  limit: number;
  page: number;
  columns: number;
  recentKey: string;
  recent: string[];
  total: number;
  remaining: number;
  tiles: Tile[];
  shown: HTMLElement[];
  apply(): void;
  focusTile(index: number): void;
  choose(name: string): void;
  showMore(): void;
}

/** Lower-case, drop Arabic diacritics and tatweel, fold alef / yeh / teh marbuta variants. */
export function normalizeIconQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ̀-ͯ]/g, "")
    .replace(/[آأإ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[-_\s]+/g, " ")
    .trim();
}

/** The index the grid focus moves to; `rtl` swaps left and right. Returns the same index when the key does nothing. */
export function nextGridIndex(key: string, index: number, count: number, columns: number, rtl = false): number {
  if (count <= 0) return -1;
  const step = key === "ArrowRight" ? (rtl ? -1 : 1) : key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
  let next = index;
  switch (key) {
    case "ArrowRight":
    case "ArrowLeft":
      next = index + step;
      break;
    case "ArrowDown":
      next = index + columns;
      if (next >= count) next = index;
      break;
    case "ArrowUp":
      next = index - columns;
      break;
    case "Home":
      next = index - (index % columns);
      break;
    case "End":
      next = Math.min(count - 1, index - (index % columns) + columns - 1);
      break;
    case "PageDown":
      next = Math.min(count - 1, index + columns * 4);
      break;
    case "PageUp":
      next = Math.max(0, index - columns * 4);
      break;
    default:
      return index;
  }
  return next < 0 || next >= count ? index : next;
}

export const iconPicker: Register = (Alpine) => {
  Alpine.data("nqIconPicker", (initial: string | null = null, columns = 8, pageSize = 96, recentKey = "nasaq:icon-picker:recent") => ({
    value: initial as string | null,
    query: "",
    category: null as string | null,
    limit: pageSize,
    page: pageSize,
    columns,
    recentKey,
    recent: [] as string[],
    total: 0,
    remaining: 0,
    tiles: [] as Tile[],
    shown: [] as HTMLElement[],

    init(this: PickerState) {
      this.tiles = [...this.$el.querySelectorAll<HTMLElement>('[data-slot="icon-picker-tile"]')].map((el) => {
        const name = el.dataset.name ?? "";
        return {
          el,
          name,
          category: el.dataset.category ?? "",
          nameWords: normalizeIconQuery(name).split(" "),
          extra: normalizeIconQuery(el.dataset.keywords ?? "").split(" "),
          plain: normalizeIconQuery(name),
        };
      });
      if (this.recentKey) {
        try {
          const raw = JSON.parse(localStorage.getItem(this.recentKey) ?? "[]");
          if (Array.isArray(raw)) this.recent = raw.filter((n): n is string => typeof n === "string");
        } catch {
          // storage unavailable or junk: start empty
        }
      }
      // A new search or category starts from the top.
      this.$watch("query", () => {
        this.limit = this.page;
        this.apply();
      });
      this.$watch("category", () => {
        this.limit = this.page;
        this.apply();
      });
      this.$watch("limit", () => this.apply());
      this.$watch("value", () => this.apply());
      this.apply();
    },

    /** Matches, best first. */
    matching(this: PickerState): Tile[] {
      const pool = this.category ? this.tiles.filter((t) => t.category === this.category) : this.tiles;
      const words = normalizeIconQuery(this.query).split(" ").filter(Boolean);
      if (!words.length) return pool;
      const scored: { tile: Tile; score: number }[] = [];
      for (const tile of pool) {
        let score = 0;
        let all = true;
        for (const w of words) {
          if (tile.nameWords.some((n) => n.startsWith(w))) score += 2;
          else if (tile.extra.some((n) => n.startsWith(w))) score += 1;
          else if (tile.plain.includes(w)) score += 0.5;
          else {
            all = false;
            break;
          }
        }
        if (all) scored.push({ tile, score });
      }
      return scored.sort((a, b) => b.score - a.score).map((s) => s.tile);
    },

    apply(this: PickerState & { matching(): Tile[] }) {
      const matches = this.matching();
      const visible = new Set(matches.slice(0, this.limit));
      for (const tile of this.tiles) {
        const on = visible.has(tile);
        tile.el.style.display = on ? "" : "none";
        const selected = this.value === tile.name;
        tile.el.setAttribute("aria-selected", selected ? "true" : "false");
        if (selected) tile.el.setAttribute("data-selected", "");
        else tile.el.removeAttribute("data-selected");
        if (!on) tile.el.setAttribute("tabindex", "-1");
      }
      this.shown = matches.slice(0, this.limit).map((t, i) => {
        t.el.style.order = String(i);
        t.el.setAttribute("data-index", String(i));
        t.el.setAttribute("tabindex", i === 0 ? "0" : "-1");
        return t.el;
      });
      this.total = matches.length;
      this.remaining = Math.max(0, matches.length - this.shown.length);
    },

    /** The SVG of a tile by name, for the recent row. */
    glyph(this: PickerState, name: string): string {
      return this.tiles.find((t) => t.name === name)?.el.innerHTML ?? "";
    },
    known(this: PickerState, name: string): boolean {
      return this.tiles.some((t) => t.name === name);
    },

    choose(this: PickerState, name: string) {
      this.value = name;
      this.recent = [name, ...this.recent.filter((n) => n !== name)].slice(0, 8);
      if (this.recentKey) {
        try {
          localStorage.setItem(this.recentKey, JSON.stringify(this.recent));
        } catch {
          // quota or privacy mode: keep it in memory
        }
      }
      this.$dispatch("select", { name });
    },

    showMore(this: PickerState) {
      this.limit += this.page;
    },

    focusTile(this: PickerState, index: number) {
      this.shown.forEach((el, i) => el.setAttribute("tabindex", i === index ? "0" : "-1"));
      this.shown[index]?.focus();
    },

    onGridKey(this: PickerState, event: KeyboardEvent) {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!target) return;
      const index = Number(target.dataset.index);
      const rtl = this.$el.closest("[dir]")?.getAttribute("dir") === "rtl" || document.documentElement.dir === "rtl";
      if (event.key === "ArrowDown" && index + this.columns >= this.shown.length && this.remaining > 0) {
        // Down from the last visible row reveals the next page.
        event.preventDefault();
        const to = Math.min(index + this.columns, this.total - 1);
        this.limit += this.page;
        this.$nextTick(() => this.focusTile(to));
        return;
      }
      if (event.key === "ArrowUp" && index < this.columns) {
        event.preventDefault();
        this.$refs.search?.focus();
        return;
      }
      const next = nextGridIndex(event.key, index, this.shown.length, this.columns, rtl);
      if (next !== index && next >= 0) {
        event.preventDefault();
        this.focusTile(next);
      }
    },

    onSearchKey(this: PickerState, event: KeyboardEvent) {
      if (event.key === "ArrowDown" && this.shown.length) {
        event.preventDefault();
        this.focusTile(0);
      }
    },
  }));
};
