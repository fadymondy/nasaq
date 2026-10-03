// nqCheckbox: a choice applied on submit, or a row in a selection. The markup is the React Checkbox's, the state lives here.
//
//   <button x-data="nqCheckbox(false)" x-modelable="checked" x-bind="root" data-slot="checkbox" class="… data-checked:bg-primary">
//     <span data-slot="checkbox-indicator" x-show="checked || indeterminate">✓</span>
//   </button>
//
// checked is x-modelable: <button x-data="nqCheckbox()" x-model="$wire.copy">. indeterminate shows a dash and reports
// aria-checked="mixed"; clicking an indeterminate box checks it. Space toggles; Enter does not (as Base UI).

import type { Register } from "./types";

interface CheckboxState {
  checked: boolean;
  indeterminate: boolean;
  toggle(): void;
}

export const checkbox: Register = (Alpine) => {
  Alpine.data("nqCheckbox", (initial: boolean = false, indeterminate: boolean = false) => ({
    checked: Boolean(initial),
    indeterminate: Boolean(indeterminate),
    toggle(this: CheckboxState) {
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = true;
      } else {
        this.checked = !this.checked;
      }
    },
    /** Bind on the checkbox button. */
    root: {
      role: "checkbox",
      type: "button",
      ":aria-checked"(this: CheckboxState) {
        return this.indeterminate ? "mixed" : String(this.checked);
      },
      ":data-checked"(this: CheckboxState) {
        return this.checked && !this.indeterminate ? "" : undefined;
      },
      ":data-unchecked"(this: CheckboxState) {
        return !this.checked && !this.indeterminate ? "" : undefined;
      },
      ":data-indeterminate"(this: CheckboxState) {
        return this.indeterminate ? "" : undefined;
      },
      "x-on:click"(this: CheckboxState) {
        this.toggle();
      },
      "x-on:keydown.enter.prevent"() {},
    },
  }));
};
