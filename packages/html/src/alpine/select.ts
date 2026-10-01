// nqSelect: pick one (or several) values from a list. The markup is the React Select's, the state lives here.
//
//   <div x-data="nqSelect('bug')" x-id="['nq-select']" class="contents">
//     <button x-ref="trigger" x-bind="trigger" class="… data-popup-open:border-nq-focus">
//       <span data-slot="select-value" x-text="label ?? 'Choose'"></span>
//     </button>
//     <template x-teleport="body">
//       <div data-slot="select-content" x-ref="popup" x-bind="popup" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.trigger" class="…">
//         <div data-slot="select-item" x-bind="item('bug')">Bug</div>
//       </div>
//     </template>
//     <input type="hidden" name="type" :value="value">
//   </div>
//
// Keyboard: Arrow keys, Home/End move, Enter or Space picks, Escape closes (focus returns to the trigger),
// typing jumps to the next label starting with those letters. value is x-modelable (x-model="$wire.type").
// Items mark themselves with data-highlighted, data-selected and data-disabled, as Base UI does.

import type { Magics, Register } from "./types";

type Value = string | number;

interface SelectState extends Magics {
  value: Value | Value[] | null;
  multiple: boolean;
  open: boolean;
  highlighted: string | null;
  labels: Record<string, string>;
  query: string;
  queryTimer: ReturnType<typeof setTimeout> | undefined;
  show(): void;
  close(refocus?: boolean): void;
  toggle(): void;
  reg(value: Value, label: string): void;
  isSelected(value: Value): boolean;
  choose(value: Value): void;
  label(): string | null;
  empty(): boolean;
  options(): HTMLElement[];
  focusOption(el: HTMLElement | undefined): void;
}

const key = (v: unknown) => String(v);

export const select: Register = (Alpine) => {
  Alpine.data("nqSelect", (initial: Value | Value[] | null = null, multiple = false) => ({
    value: initial === "" ? null : initial,
    multiple: Boolean(multiple),
    open: false,
    highlighted: null as string | null,
    labels: {} as Record<string, string>,
    query: "",
    queryTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: SelectState) {
      if (this.multiple && !Array.isArray(this.value)) this.value = this.value === null ? [] : [this.value];
    },
    show(this: SelectState) {
      if (this.open) return;
      this.open = true;
      this.$nextTick(() => {
        const trigger = this.$refs.trigger;
        const popup = this.$refs.popup;
        if (trigger && popup) {
          popup.style.setProperty("--anchor-width", `${trigger.offsetWidth}px`);
          popup.style.setProperty("--available-height", `${Math.max(120, window.innerHeight - trigger.getBoundingClientRect().bottom - 16)}px`);
        }
        const items = this.options();
        this.focusOption(items.find((i) => i.hasAttribute("data-selected")) ?? items[0]);
      });
    },
    close(this: SelectState, refocus = true) {
      if (!this.open) return;
      this.open = false;
      this.highlighted = null;
      if (refocus) this.$refs.trigger?.focus();
    },
    toggle(this: SelectState) {
      if (this.open) this.close();
      else this.show();
    },
    /** An item announces its label so the trigger can show it before the list has ever opened. */
    reg(this: SelectState, value: Value, label: string) {
      this.labels[key(value)] = label;
    },
    isSelected(this: SelectState, value: Value) {
      return Array.isArray(this.value) ? this.value.some((v) => key(v) === key(value)) : this.value !== null && key(this.value) === key(value);
    },
    choose(this: SelectState, value: Value) {
      if (this.multiple) {
        const list = (Array.isArray(this.value) ? this.value : []).filter((v) => key(v) !== key(value));
        this.value = this.isSelected(value) ? list : [...list, value];
        return;
      }
      this.value = value;
      this.close();
    },
    /** The text for the trigger: the selected item's label (several are joined), or null. */
    label(this: SelectState) {
      const picked = Array.isArray(this.value) ? this.value : this.value === null ? [] : [this.value];
      if (!picked.length) return null;
      return picked.map((v) => this.labels[key(v)] ?? key(v)).join(", ");
    },
    empty(this: SelectState) {
      return Array.isArray(this.value) ? this.value.length === 0 : this.value === null || this.value === undefined || this.value === "";
    },
    options(this: SelectState) {
      const popup = this.$refs.popup;
      return popup ? [...popup.querySelectorAll<HTMLElement>('[data-slot="select-item"]:not([data-disabled])')] : [];
    },
    focusOption(this: SelectState, el: HTMLElement | undefined) {
      if (!el) return;
      this.highlighted = el.dataset.value ?? null;
      el.focus({ preventScroll: true });
      el.scrollIntoView?.({ block: "nearest" });
    },
    /** Bind on the trigger button. */
    trigger: {
      type: "button",
      role: "combobox",
      "aria-haspopup": "listbox",
      ":aria-expanded"(this: SelectState) {
        return String(this.open);
      },
      ":aria-controls"(this: SelectState) {
        return this.open ? this.$id("nq-select", "listbox") : undefined;
      },
      ":data-popup-open"(this: SelectState) {
        return this.open ? "" : undefined;
      },
      ":data-placeholder"(this: SelectState) {
        return this.empty() ? "" : undefined;
      },
      "x-on:click"(this: SelectState) {
        this.toggle();
      },
      "x-on:keydown"(this: SelectState, event: KeyboardEvent) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          this.show();
        }
      },
    },
    /** Bind on the list: a listbox that moves focus between its items. */
    popup: {
      role: "listbox",
      tabindex: "-1",
      ":id"(this: SelectState) {
        return this.$id("nq-select", "listbox");
      },
      ":aria-multiselectable"(this: SelectState) {
        return this.multiple ? "true" : undefined;
      },
      "x-on:keydown"(this: SelectState, event: KeyboardEvent) {
        const items = this.options();
        const at = items.indexOf(document.activeElement as HTMLElement);
        let to: HTMLElement | undefined;
        if (event.key === "ArrowDown") to = items[Math.min(items.length - 1, at + 1)];
        else if (event.key === "ArrowUp") to = items[Math.max(0, at - 1)];
        else if (event.key === "Home") to = items[0];
        else if (event.key === "End") to = items[items.length - 1];
        else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          this.close();
          return;
        } else if (event.key === "Tab") {
          this.close(false);
          return;
        } else if (event.key === "Enter" || (event.key === " " && !this.query)) {
          event.preventDefault();
          const current = items[at];
          if (current) this.choose(current.dataset.value as string);
          return;
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          // Type-ahead: the next label that starts with what was typed.
          this.query += event.key.toLowerCase();
          clearTimeout(this.queryTimer);
          this.queryTimer = setTimeout(() => (this.query = ""), 500);
          const ordered = [...items.slice(at + 1), ...items.slice(0, at + 1)];
          this.focusOption(ordered.find((i) => (i.textContent ?? "").trim().toLowerCase().startsWith(this.query)));
          return;
        } else return;
        event.preventDefault();
        this.focusOption(to);
      },
      /** Pointer down anywhere outside the list and the trigger closes it. */
      "x-on:pointerdown.document"(this: SelectState, event: PointerEvent) {
        if (!this.open) return;
        const target = event.target as Node;
        if (this.$refs.popup?.contains(target) || this.$refs.trigger?.contains(target)) return;
        this.close(false);
      },
    },
    /** Bind on one item; `value` is what it picks. */
    item(this: SelectState, value: Value, disabled = false) {
      return {
        role: "option",
        tabindex: "-1",
        "data-value": key(value),
        ...(disabled ? { "aria-disabled": "true", "data-disabled": "" } : {}),
        "x-init"(this: SelectState) {
          const text = this.$el.querySelector('[data-slot="select-item-text"]') ?? this.$el;
          this.reg(value, (text.textContent ?? "").trim());
        },
        ":aria-selected"(this: SelectState) {
          return String(this.isSelected(value));
        },
        ":data-selected"(this: SelectState) {
          return this.isSelected(value) ? "" : undefined;
        },
        ":data-highlighted"(this: SelectState) {
          return this.highlighted === key(value) ? "" : undefined;
        },
        "x-on:pointermove"(this: SelectState, event: PointerEvent) {
          if (!disabled && this.highlighted !== key(value)) this.focusOption(event.currentTarget as HTMLElement);
        },
        "x-on:click"(this: SelectState) {
          if (!disabled) this.choose(value);
        },
      };
    },
  }));
};
