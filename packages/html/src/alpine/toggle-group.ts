// nqToggleGroup: a row of toggle buttons. The markup is the React ToggleGroup's, the state lives here.
//
//   <div role="group" x-data="nqToggleGroup(['list'], false)" x-modelable="value" x-bind="root" data-orientation="horizontal">
//     <button x-bind="toggle('list')" data-slot="toggle" class="… data-pressed:bg-card">List</button>
//     <button x-bind="toggle('grid')" data-slot="toggle" class="… data-pressed:bg-card">Grid</button>
//   </div>
//
// value is always an array. One item is pressed at a time unless multiple; pressing the pressed item clears it.
// Arrow keys move focus in reading order (flipped in RTL; Up/Down when vertical), Home and End jump, focus loops;
// Space or Enter presses. A single toggle on its own is nqToggle(false) with x-bind="root".
// value is x-modelable: x-model="$wire.view".

import type { Register } from "./types";

interface GroupState {
  value: string[];
  multiple: boolean;
  current: string | null;
  $el: HTMLElement;
  isPressed(value: string): boolean;
}

function itemsOf(group: Element): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].filter(
    (t) => t.closest('[data-slot="toggle-group"]') === group && !t.hasAttribute("disabled") && !t.hasAttribute("data-disabled"),
  );
}

export const toggleGroup: Register = (Alpine) => {
  Alpine.data("nqToggleGroup", (initial: string[] = [], multiple: boolean = false) => ({
    value: [...(initial ?? [])].map(String),
    multiple: Boolean(multiple),
    current: null as string | null,
    isPressed(this: GroupState, value: string) {
      return (this.value ?? []).map(String).includes(value);
    },
    /** Bind on the group. */
    root: {
      role: "group",
      "x-on:keydown"(this: GroupState, event: KeyboardEvent) {
        const group = event.currentTarget as HTMLElement;
        const items = itemsOf(group);
        const at = items.indexOf((event.target as HTMLElement).closest<HTMLElement>('[data-slot="toggle"]')!);
        if (at < 0 || !items.length) return;
        const vertical = group.getAttribute("data-orientation") === "vertical";
        const rtl = getComputedStyle(group).direction === "rtl";
        const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        const prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        let to = -1;
        if (event.key === next) to = (at + 1) % items.length;
        else if (event.key === prev) to = (at - 1 + items.length) % items.length;
        else if (event.key === "Home") to = 0;
        else if (event.key === "End") to = items.length - 1;
        if (to < 0) return;
        event.preventDefault();
        items[to]!.focus();
      },
    },
    /** Bind on one toggle. */
    toggle(value: string) {
      return {
        type: "button",
        "data-value": value,
        ":aria-pressed"(this: GroupState) {
          return String(this.isPressed(value));
        },
        ":data-pressed"(this: GroupState) {
          return this.isPressed(value) ? "" : undefined;
        },
        // Roving tabindex: the last focused item, else the first pressed one, else the first.
        ":tabindex"(this: GroupState) {
          const group = this.$el.closest('[data-slot="toggle-group"]');
          const items = group ? itemsOf(group) : [];
          const known = this.current !== null && items.some((i) => i.dataset.value === this.current);
          const pressed = items.find((i) => this.isPressed(i.dataset.value ?? ""))?.dataset.value;
          const tab = known ? this.current : (pressed ?? items[0]?.dataset.value);
          return tab === value ? 0 : -1;
        },
        "x-on:focus"(this: GroupState) {
          this.current = value;
        },
        "x-on:click"(this: GroupState) {
          if (this.isPressed(value)) this.value = this.value.filter((v) => String(v) !== value);
          else this.value = this.multiple ? [...this.value, value] : [value];
        },
      };
    },
  }));

  // A toggle on its own: pressed is x-modelable.
  Alpine.data("nqToggle", (initial: boolean = false) => ({
    pressed: Boolean(initial),
    root: {
      type: "button",
      ":aria-pressed"(this: { pressed: boolean }) {
        return String(this.pressed);
      },
      ":data-pressed"(this: { pressed: boolean }) {
        return this.pressed ? "" : undefined;
      },
      "x-on:click"(this: { pressed: boolean }) {
        this.pressed = !this.pressed;
      },
    },
  }));
};
