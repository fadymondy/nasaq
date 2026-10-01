// nqRadioGroup: pick exactly one option. The markup is the React RadioGroup's, the state lives here.
//
//   <div role="radiogroup" x-data="nqRadioGroup('email')" x-modelable="value" x-bind="root" aria-label="Contact by">
//     <button x-bind="radio('email')" data-slot="radio" class="… data-checked:bg-primary">
//       <span data-slot="radio-indicator" x-show="isChecked('email')"></span>
//     </button>
//   </div>
//
// Arrow keys move and select, following the reading direction (flipped in RTL); Home and End jump. Only the selected
// radio (or the first, with none selected) is in the tab order. value is x-modelable: x-model="$wire.contact".

import type { Register } from "./types";

type Value = string | number;

interface RadioGroupState {
  value: Value | null;
  $el: HTMLElement;
  isChecked(value: string): boolean;
}

function allRadios(group: Element): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>('[role="radio"]')].filter((r) => r.closest('[role="radiogroup"]') === group);
}

function enabled(radios: HTMLElement[]): HTMLElement[] {
  return radios.filter((r) => !r.hasAttribute("disabled") && !r.hasAttribute("data-disabled"));
}

export const radioGroup: Register = (Alpine) => {
  Alpine.data("nqRadioGroup", (initial: Value | null = null) => ({
    value: initial,
    isChecked(this: RadioGroupState, value: string) {
      return this.value !== null && this.value !== undefined && String(this.value) === value;
    },
    /** Bind on the group. */
    root: {
      role: "radiogroup",
      "x-on:keydown"(this: RadioGroupState, event: KeyboardEvent) {
        const group = event.currentTarget as HTMLElement;
        const radios = enabled(allRadios(group));
        const at = radios.indexOf((event.target as HTMLElement).closest<HTMLElement>('[role="radio"]')!);
        if (at < 0 || !radios.length) return;
        const rtl = getComputedStyle(group).direction === "rtl";
        const next = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
        const prev = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
        let to = -1;
        if (next.includes(event.key)) to = (at + 1) % radios.length;
        else if (prev.includes(event.key)) to = (at - 1 + radios.length) % radios.length;
        else if (event.key === "Home") to = 0;
        else if (event.key === "End") to = radios.length - 1;
        if (to < 0) return;
        event.preventDefault();
        radios[to]!.focus();
        this.value = radios[to]!.dataset.value ?? null;
      },
    },
    /** Bind on one radio. */
    radio(value: string) {
      return {
        role: "radio",
        type: "button",
        "data-value": value,
        ":aria-checked"(this: RadioGroupState) {
          return String(this.isChecked(value));
        },
        ":data-checked"(this: RadioGroupState) {
          return this.isChecked(value) ? "" : undefined;
        },
        ":data-unchecked"(this: RadioGroupState) {
          return this.isChecked(value) ? undefined : "";
        },
        ":tabindex"(this: RadioGroupState) {
          if (this.isChecked(value)) return 0;
          const group = this.$el.closest('[role="radiogroup"]');
          if (!group) return -1;
          const radios = allRadios(group);
          const chosen = radios.some((r) => r.dataset.value !== undefined && this.isChecked(r.dataset.value));
          // Nothing selected: the first enabled radio is the way in.
          return !chosen && enabled(radios)[0] === this.$el ? 0 : -1;
        },
        "x-on:click"(this: RadioGroupState) {
          this.value = value;
        },
      };
    },
  }));
};
