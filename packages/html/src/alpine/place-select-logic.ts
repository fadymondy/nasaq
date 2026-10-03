// nqPlaceSelect: a single-choice typeahead over a list the host supplies (countries, cities, areas). It is the data-driven
// sibling of nqCombobox: the options are not read from the DOM, so they can load later and change. The markup is the React
// Combobox's (see the country-select and address-input Blade components); country-select and address-input nest it.
//
//   <div x-data="nqPlaceSelect({ options: () => items, value: () => iso, set: (v) => pick(v), disabled: () => false, empty: () => 'No results.' })" class="contents">
//     <div data-slot="combobox-input-group" x-ref="anchor" …>
//       <input data-slot="combobox-input" x-ref="input" x-bind="input" …>
//       <button data-slot="combobox-clear" x-bind="clear">…</button> <button data-slot="combobox-trigger" x-bind="trigger">…</button>
//     </div>
//     <template x-teleport="body"><div data-slot="combobox-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor" …>
//       <template x-if="open"><div class="contents"><div data-slot="combobox-empty" x-bind="emptyState"></div>
//         <template x-for="o in matches()" :key="o.value"><div data-slot="combobox-item" x-bind="item(o)">…</div></template></div></template>
//     </div></template>
//   </div>
//
// An option is { value, label, search, iso? }; typing filters on `search` with the Arabic-aware fold. Focus stays in the
// input: ArrowDown / ArrowUp move the highlight, Enter picks it, Escape closes. `set(undefined)` is called when cleared.

import type { Magics, Register } from "./types";

export type PlaceValue = string | number;

export interface PlaceOption {
  value: PlaceValue;
  label: string;
  search: string;
  iso?: string;
}

export interface PlaceSelectConfig {
  options(): PlaceOption[];
  value(): PlaceValue | null | undefined;
  set(value: PlaceValue | undefined): void;
  disabled?(): boolean;
  /** The message shown when no option matches (and while a list loads). */
  empty?(): string;
}

/** Same fold as the React `normalizeForSearch`. */
export const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

interface PlaceState extends Magics {
  cfg: PlaceSelectConfig;
  open: boolean;
  query: string | null;
  active: number;
  selected(): PlaceOption | undefined;
  hasValue(): boolean;
  isDisabled(): boolean;
  text(): string;
  matches(): PlaceOption[];
  show(): void;
  close(refocus?: boolean): void;
  pick(option: PlaceOption): void;
  inputEl(): HTMLInputElement | undefined;
  scrollActive(): void;
}

export const registerPlaceSelect: Register = (Alpine) => {
  Alpine.data("nqPlaceSelect", (cfg: PlaceSelectConfig) => {
    // Rows ask for the matches many times per render; keep the last answer while the options and the query are the same.
    let memo: { all: PlaceOption[]; q: string; hits: PlaceOption[] } | null = null;
    return {
      cfg,
      open: false,
      /** What the user typed; null shows the chosen label instead. */
      query: null as string | null,
      active: 0,
      selected(this: PlaceState) {
        const value = this.cfg.value();
        if (value === null || value === undefined || value === "") return undefined;
        return this.cfg.options().find((o) => String(o.value) === String(value));
      },
      hasValue(this: PlaceState) {
        const value = this.cfg.value();
        return value !== null && value !== undefined && value !== "";
      },
      isDisabled(this: PlaceState) {
        return Boolean(this.cfg.disabled?.());
      },
      text(this: PlaceState) {
        return this.query ?? this.selected()?.label ?? "";
      },
      matches(this: PlaceState): PlaceOption[] {
        const all = this.cfg.options();
        const q = fold(this.query ?? "");
        if (memo && memo.all === all && memo.q === q) return memo.hits;
        const hits = q ? all.filter((o) => fold(o.search).includes(q)) : all;
        memo = { all, q, hits };
        return hits;
      },
      inputEl(this: PlaceState) {
        return this.$refs.input as HTMLInputElement | undefined;
      },
      show(this: PlaceState) {
        if (this.open || this.isDisabled()) return;
        const at = this.matches().findIndex((o) => o === this.selected());
        this.active = Math.max(0, at);
        this.open = true;
        this.$nextTick(() => {
          const anchor = this.$refs.anchor;
          const popup = this.$refs.popup;
          if (anchor && popup) {
            popup.style.setProperty("--anchor-width", `${anchor.offsetWidth}px`);
            popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - anchor.getBoundingClientRect().bottom - 16)}px`);
          }
        });
      },
      close(this: PlaceState, refocus = false) {
        if (!this.open) return;
        this.open = false;
        this.query = null;
        if (refocus) this.inputEl()?.focus();
      },
      pick(this: PlaceState, option: PlaceOption) {
        this.cfg.set(option.value);
        this.query = null;
        this.close();
      },
      scrollActive(this: PlaceState) {
        this.$nextTick(() => this.$refs.popup?.querySelector("[data-highlighted]")?.scrollIntoView?.({ block: "nearest" }));
      },
      /** Bind on the text input. */
      input: {
        type: "text",
        role: "combobox",
        autocomplete: "off",
        "aria-autocomplete": "list",
        ":value"(this: PlaceState) {
          return this.text();
        },
        ":disabled"(this: PlaceState) {
          return this.isDisabled();
        },
        ":aria-expanded"(this: PlaceState) {
          return String(this.open);
        },
        "x-on:input"(this: PlaceState, event: Event) {
          this.query = (event.target as HTMLInputElement).value;
          this.active = 0;
          this.show();
        },
        "x-on:focus"(this: PlaceState) {
          if (!this.open) this.inputEl()?.select();
        },
        "x-on:click"(this: PlaceState) {
          this.show();
        },
        "x-on:keydown"(this: PlaceState, event: KeyboardEvent) {
          if (event.defaultPrevented || event.isComposing) return;
          const list = this.matches();
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!this.open) return this.show();
            if (!list.length) return;
            this.active = event.key === "ArrowDown" ? (this.active + 1) % list.length : (this.active - 1 + list.length) % list.length;
            this.scrollActive();
          } else if (event.key === "Home" || event.key === "End") {
            if (!this.open || !list.length) return;
            event.preventDefault();
            this.active = event.key === "Home" ? 0 : list.length - 1;
            this.scrollActive();
          } else if (event.key === "Enter") {
            const hit = list[this.active];
            if (!this.open || !hit) return;
            event.preventDefault();
            this.pick(hit);
          } else if (event.key === "Escape") {
            if (!this.open) return;
            event.preventDefault();
            event.stopPropagation();
            this.close();
          } else if (event.key === "Tab") {
            this.close();
          }
        },
      },
      /** Bind on the clear button; it hides itself while there is no value. */
      clear: {
        type: "button",
        tabindex: "-1",
        ":data-hidden"(this: PlaceState) {
          return this.hasValue() ? undefined : "";
        },
        ":disabled"(this: PlaceState) {
          return this.isDisabled();
        },
        "x-on:click"(this: PlaceState) {
          this.cfg.set(undefined);
          this.query = null;
          this.inputEl()?.focus();
        },
      },
      /** Bind on the chevron button. */
      trigger: {
        type: "button",
        tabindex: "-1",
        "aria-haspopup": "listbox",
        ":aria-expanded"(this: PlaceState) {
          return String(this.open);
        },
        ":data-popup-open"(this: PlaceState) {
          return this.open ? "" : undefined;
        },
        ":disabled"(this: PlaceState) {
          return this.isDisabled();
        },
        "x-on:click"(this: PlaceState) {
          if (this.open) this.close();
          else {
            this.show();
            this.inputEl()?.focus();
          }
        },
      },
      /** Bind on the list popup. */
      popup: {
        role: "listbox",
        // Keep focus in the input while the pointer works the list.
        "x-on:mousedown.prevent"() {},
        /** Pointer down anywhere outside the control and the list closes it. */
        "x-on:pointerdown.document"(this: PlaceState, event: PointerEvent) {
          if (!this.open) return;
          const target = event.target as Node;
          if (this.$refs.popup?.contains(target) || this.$refs.anchor?.contains(target)) return;
          this.close();
        },
      },
      /** Bind on the empty message: shown when nothing matches. */
      emptyState: {
        "x-show"(this: PlaceState) {
          return this.matches().length === 0;
        },
        "x-text"(this: PlaceState) {
          return this.cfg.empty?.() ?? "";
        },
        "x-cloak": "",
        style: "display: none",
      },
      /** Bind on one option row (inside x-for; `o` is the loop item). */
      item(this: PlaceState, o: PlaceOption) {
        const state = this;
        return {
          role: "option",
          "data-value": String(o.value),
          ":aria-selected"() {
            return String(String(state.cfg.value()) === String(o.value));
          },
          ":data-selected"() {
            return String(state.cfg.value()) === String(o.value) ? "" : undefined;
          },
          ":data-highlighted"() {
            return state.matches()[state.active]?.value === o.value ? "" : undefined;
          },
          "x-on:click"() {
            state.pick(o);
          },
          "x-on:pointermove"() {
            const at = state.matches().findIndex((m) => m.value === o.value);
            if (at >= 0) state.active = at;
          },
        };
      },
    };
  });
};
