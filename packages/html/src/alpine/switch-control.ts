// nqSwitch: on/off for a setting that applies immediately. The markup is the React Switch's, the state lives here.
// (The module is named switch-control because `switch` is a reserved word and cannot be an export.)
//
//   <button x-data="nqSwitch(true)" x-modelable="checked" x-bind="root" data-slot="switch" class="… data-checked:bg-primary">
//     <span data-slot="switch-thumb" :data-checked="checked ? '' : undefined" class="… data-checked:translate-x-3.5 rtl:data-checked:-translate-x-3.5"></span>
//   </button>
//
// checked is x-modelable: <button x-data="nqSwitch()" x-model="$wire.alerts">. Space (or Enter) toggles.

import type { Register } from "./types";

interface SwitchState {
  checked: boolean;
}

export const switchControl: Register = (Alpine) => {
  Alpine.data("nqSwitch", (initial: boolean = false) => ({
    checked: Boolean(initial),
    /** Bind on the switch button. */
    root: {
      role: "switch",
      type: "button",
      ":aria-checked"(this: SwitchState) {
        return String(this.checked);
      },
      ":data-checked"(this: SwitchState) {
        return this.checked ? "" : undefined;
      },
      ":data-unchecked"(this: SwitchState) {
        return this.checked ? undefined : "";
      },
      "x-on:click"(this: SwitchState) {
        this.checked = !this.checked;
      },
    },
  }));
};
