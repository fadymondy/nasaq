// nqField: wires a label, a control, descriptions and an error together. The markup is the React Field's.
//
//   <div x-data="nqField(false)" x-modelable="invalid" x-id="['nq-field']" data-slot="field">
//     <label data-slot="field-label">Project name</label>                  gets for="<control id>"
//     <input data-slot="input">                                             gets an id, aria-describedby, aria-invalid, data-invalid
//     <p data-slot="field-description">…</p>                                listed in aria-describedby
//     <div data-slot="field-error" x-show="invalid" role="alert">…</div>    shown and listed while invalid
//   </div>
//
// The control is the first input, textarea, field-control, checkbox, switch or radio group in the field. A radio
// group is named with aria-labelledby pointing at the label. invalid is x-modelable: x-model="$wire.invalid".

import type { Magics, Register } from "./types";

interface FieldState extends Magics {
  invalid: boolean;
  wire(): void;
}

const CONTROL =
  '[data-slot="input"], [data-slot="textarea"], [data-slot="field-control"], [data-slot="checkbox"], [data-slot="switch"], [data-slot="radio-group"]';

export const field: Register = (Alpine) => {
  Alpine.data("nqField", (invalid: boolean = false) => ({
    invalid: Boolean(invalid),
    init(this: FieldState) {
      this.$nextTick(() => this.wire());
      this.$watch("invalid", () => this.wire());
    },
    /** Reads the field's parts and sets the ids and aria wiring. Runs at start and whenever invalid changes. */
    wire(this: FieldState) {
      const root = this.$el;
      const own = (el: Element) => el.closest('[data-slot="field"]') === root;
      const first = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)].find(own);
      const all = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)].filter(own);

      const control = first(CONTROL);
      const label = first('[data-slot="field-label"]');
      root.toggleAttribute("data-invalid", this.invalid);
      root.toggleAttribute("data-valid", !this.invalid);
      if (!control) return;

      if (control.dataset.slot === "radio-group") {
        if (label) {
          label.id ||= this.$id("nq-field", "label");
          if (!control.hasAttribute("aria-label") && !control.hasAttribute("aria-labelledby")) control.setAttribute("aria-labelledby", label.id);
        }
      } else {
        control.id ||= this.$id("nq-field", "control");
        label?.setAttribute("for", control.id);
      }

      const ids: string[] = [];
      all('[data-slot="field-description"]').forEach((d, i) => {
        d.id ||= this.$id("nq-field", `description-${i}`);
        ids.push(d.id);
      });
      if (this.invalid) {
        all('[data-slot="field-error"]').forEach((e, i) => {
          e.id ||= this.$id("nq-field", `error-${i}`);
          ids.push(e.id);
        });
      }
      // Keep ids the author put there, replace the ones this field added last time.
      const mine = new Set((control.dataset.nqDescribed ?? "").split(" ").filter(Boolean));
      const kept = (control.getAttribute("aria-describedby") ?? "").split(" ").filter((t) => t && !mine.has(t));
      const merged = [...kept, ...ids];
      control.dataset.nqDescribed = ids.join(" ");
      if (merged.length) control.setAttribute("aria-describedby", merged.join(" "));
      else control.removeAttribute("aria-describedby");

      if (this.invalid) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
      control.toggleAttribute("data-invalid", this.invalid);
    },
  }));
};
