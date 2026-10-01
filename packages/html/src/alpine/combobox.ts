// nqCombobox: a typeahead over a list of choices, one value or several (chips). The markup is the React Combobox's, the state lives here.
//
//   <div data-slot="combobox" x-data="nqCombobox('sa', false)" x-modelable="value" x-id="['nq-combobox']" class="contents">
//     <div data-slot="combobox-input-group" x-ref="anchor" class="…">
//       <input data-slot="combobox-input" x-bind="input" class="…">
//       <button data-slot="combobox-clear" x-bind="clear">…</button> <button data-slot="combobox-trigger" x-bind="trigger">…</button>
//     </div>
//     <template x-teleport="body">
//       <div data-slot="combobox-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.anchor" class="…">
//         <div data-slot="combobox-empty" x-bind="emptyState">No results</div>
//         <div data-slot="combobox-item" x-bind="item('sa')"><span>…</span><span data-slot="combobox-item-text">Saudi Arabia</span></div>
//       </div>
//     </template>
//   </div>
//
// Typing filters the items (Arabic-aware fold: case, diacritics, tatweel, alef / yeh / teh-marbuta); the empty message shows when none match.
// Focus stays in the input: ArrowDown / ArrowUp move the highlight (aria-activedescendant), Enter picks it, Escape closes,
// Backspace on an empty input removes the last chip. Single mode shows the chosen label in the input; multiple mode shows chips
// (data-slot="combobox-chip") and keeps the list open. value is x-modelable (x-model="$wire.country"). Filtering is client side
// only (no async search) and groups hide themselves when none of their items match.

import type { Magics, Register } from "./types";

type Value = string | number;

interface ComboState extends Magics {
  value: Value | Value[] | null;
  multiple: boolean;
  open: boolean;
  text: string;
  filter: string;
  highlighted: string | null;
  labels: Record<string, string>;
  show(): void;
  close(refocus?: boolean): void;
  reg(value: Value, label: string): void;
  labelOf(value: Value): string;
  selected(): Value[];
  isSelected(value: Value): boolean;
  hasValue(): boolean;
  visible(value: Value): boolean;
  anyVisible(): boolean;
  choose(value: Value): void;
  remove(value: Value): void;
  clearAll(): void;
  options(): HTMLElement[];
  highlight(el: HTMLElement | undefined): void;
  syncText(): void;
  inputEl(): HTMLInputElement | undefined;
}

const key = (v: unknown) => String(v);

/** Same fold as the React `normalizeForSearch`. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

export const combobox: Register = (Alpine) => {
  Alpine.data("nqCombobox", (initial: Value | Value[] | null = null, multiple = false) => ({
    value: initial === "" ? null : initial,
    multiple: Boolean(multiple),
    open: false,
    /** What the input shows (single mode: the chosen label while closed). */
    text: "",
    /** What narrows the list; empty until the user types. */
    filter: "",
    highlighted: null as string | null,
    labels: {} as Record<string, string>,
    init(this: ComboState) {
      if (this.multiple && !Array.isArray(this.value)) this.value = this.value === null ? [] : [this.value];
      // Labels register as items initialise; show the chosen one afterwards, and again whenever the value changes.
      this.$nextTick(() => this.syncText());
      this.$watch("value", () => this.syncText());
    },
    syncText(this: ComboState) {
      if (this.multiple) return;
      if (this.open && this.filter) return;
      this.text = this.hasValue() ? this.labelOf(this.value as Value) : "";
    },
    inputEl(this: ComboState) {
      return this.$refs.input as HTMLInputElement | undefined;
    },
    show(this: ComboState) {
      if (this.open) return;
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
    close(this: ComboState, refocus = false) {
      if (!this.open) return;
      this.open = false;
      this.highlighted = null;
      this.filter = "";
      if (this.multiple) this.text = "";
      else this.syncText();
      if (refocus) this.inputEl()?.focus();
    },
    reg(this: ComboState, value: Value, label: string) {
      this.labels[key(value)] = label;
    },
    labelOf(this: ComboState, value: Value) {
      return this.labels[key(value)] ?? key(value);
    },
    selected(this: ComboState) {
      return Array.isArray(this.value) ? this.value : this.value === null || this.value === undefined ? [] : [this.value];
    },
    isSelected(this: ComboState, value: Value) {
      return this.selected().some((v) => key(v) === key(value));
    },
    hasValue(this: ComboState) {
      return this.selected().length > 0;
    },
    visible(this: ComboState, value: Value) {
      const q = fold(this.filter);
      if (!q) return true;
      const label = this.labels[key(value)];
      return label === undefined ? true : fold(label).includes(q);
    },
    anyVisible(this: ComboState) {
      const all = Object.keys(this.labels);
      return all.length === 0 || all.some((k) => this.visible(k));
    },
    choose(this: ComboState, value: Value) {
      if (this.multiple) {
        const list = this.selected().filter((v) => key(v) !== key(value));
        this.value = this.isSelected(value) ? list : [...list, value];
        this.text = "";
        this.filter = "";
        this.inputEl()?.focus();
        return;
      }
      this.value = value;
      this.filter = "";
      this.close();
      this.syncText();
    },
    remove(this: ComboState, value: Value) {
      this.value = this.selected().filter((v) => key(v) !== key(value));
      this.inputEl()?.focus();
    },
    clearAll(this: ComboState) {
      this.value = this.multiple ? [] : null;
      this.text = "";
      this.filter = "";
      this.inputEl()?.focus();
    },
    options(this: ComboState) {
      const popup = this.$refs.popup;
      if (!popup) return [];
      return [...popup.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]:not([data-disabled])')].filter(
        (el) => el.style.display !== "none" && this.visible(el.dataset.value as string),
      );
    },
    highlight(this: ComboState, el: HTMLElement | undefined) {
      if (!el) return;
      this.highlighted = el.dataset.value ?? null;
      el.scrollIntoView?.({ block: "nearest" });
    },
    /** Bind on the text input. */
    input: {
      type: "text",
      role: "combobox",
      autocomplete: "off",
      "aria-autocomplete": "list",
      ":value"(this: ComboState) {
        return this.text;
      },
      ":aria-expanded"(this: ComboState) {
        return String(this.open);
      },
      ":aria-controls"(this: ComboState) {
        return this.open ? this.$id("nq-combobox", "listbox") : undefined;
      },
      ":aria-activedescendant"(this: ComboState) {
        return this.open && this.highlighted !== null ? this.$id("nq-combobox", `item-${this.highlighted}`) : undefined;
      },
      "x-on:input"(this: ComboState, event: Event) {
        this.text = (event.target as HTMLInputElement).value;
        this.filter = this.text;
        this.show();
        this.highlighted = null;
        this.$nextTick(() => this.highlight(this.options()[0]));
      },
      "x-on:focus"(this: ComboState) {
        if (!this.multiple && !this.open) this.inputEl()?.select();
      },
      "x-on:click"(this: ComboState) {
        this.show();
      },
      "x-on:keydown"(this: ComboState, event: KeyboardEvent) {
        if (event.defaultPrevented || event.isComposing) return;
        const items = this.options();
        const at = items.findIndex((el) => el.dataset.value === this.highlighted);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!this.open) {
            this.show();
            return;
          }
          if (!items.length) return;
          const next = event.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
          this.highlight(items[next < 0 ? items.length - 1 : next]);
        } else if (event.key === "Home" || event.key === "End") {
          if (!this.open) return;
          event.preventDefault();
          this.highlight(event.key === "Home" ? items[0] : items[items.length - 1]);
        } else if (event.key === "Enter") {
          if (!this.open || at < 0) return;
          event.preventDefault();
          this.choose(items[at]!.dataset.value as string);
        } else if (event.key === "Escape") {
          if (!this.open) return;
          event.preventDefault();
          event.stopPropagation();
          this.close();
        } else if (event.key === "Tab") {
          this.close();
        } else if (event.key === "Backspace" && this.multiple && this.text === "" && this.selected().length) {
          const list = this.selected();
          this.remove(list[list.length - 1] as Value);
        }
      },
    },
    /** Bind on the clear button; it hides itself while there is no value. */
    clear: {
      type: "button",
      tabindex: "-1",
      ":data-hidden"(this: ComboState) {
        return this.hasValue() ? undefined : "";
      },
      "x-on:click"(this: ComboState) {
        this.clearAll();
      },
    },
    /** Bind on the chevron button. */
    trigger: {
      type: "button",
      tabindex: "-1",
      "aria-haspopup": "listbox",
      ":aria-expanded"(this: ComboState) {
        return String(this.open);
      },
      ":data-popup-open"(this: ComboState) {
        return this.open ? "" : undefined;
      },
      "x-on:click"(this: ComboState) {
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
      ":id"(this: ComboState) {
        return this.$id("nq-combobox", "listbox");
      },
      ":aria-multiselectable"(this: ComboState) {
        return this.multiple ? "true" : undefined;
      },
      // Keep focus in the input while the pointer works the list.
      "x-on:mousedown.prevent"() {},
      /** Pointer down anywhere outside the control and the list closes it. */
      "x-on:pointerdown.document"(this: ComboState, event: PointerEvent) {
        if (!this.open) return;
        const target = event.target as Node;
        if (this.$refs.popup?.contains(target) || this.$refs.anchor?.contains(target)) return;
        this.close();
      },
    },
    /** Bind on the empty message: shown when the filter leaves nothing. */
    emptyState: {
      "x-show"(this: ComboState) {
        return !this.anyVisible();
      },
      "x-cloak": "",
      style: "display: none",
    },
    /** Bind on a group: hidden when none of its items match. */
    group: {
      role: "group",
      "x-show"(this: ComboState) {
        const items = [...this.$el.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')];
        const count = Object.keys(this.labels).length;
        if (!count || !items.length) return true;
        return items.some((el) => this.visible(el.dataset.value as string));
      },
    },
    /** Bind on one item; `value` is what it picks. */
    item(this: ComboState, value: Value, disabled = false) {
      return {
        role: "option",
        "data-value": key(value),
        ...(disabled ? { "aria-disabled": "true", "data-disabled": "" } : {}),
        ":id"(this: ComboState) {
          return this.$id("nq-combobox", `item-${key(value)}`);
        },
        "x-init"(this: ComboState) {
          const text = this.$el.querySelector('[data-slot="combobox-item-text"]') ?? this.$el;
          this.reg(value, (text.textContent ?? "").trim());
        },
        "x-show"(this: ComboState) {
          return this.visible(value);
        },
        ":aria-selected"(this: ComboState) {
          return String(this.isSelected(value));
        },
        ":data-selected"(this: ComboState) {
          return this.isSelected(value) ? "" : undefined;
        },
        ":data-highlighted"(this: ComboState) {
          return this.highlighted === key(value) ? "" : undefined;
        },
        "x-on:pointermove"(this: ComboState) {
          if (!disabled && this.highlighted !== key(value)) this.highlighted = key(value);
        },
        "x-on:click"(this: ComboState) {
          if (!disabled) this.choose(value);
        },
      };
    },
  }));
};
