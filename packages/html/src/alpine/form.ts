// nqForm: field errors and the pending state of a server-rendered form. The markup is the React Form's.
//
//   <form data-slot="form" x-data="nqForm({ errors: { email: 'Taken.' }, formError: null })" x-on:submit="submit($event)" novalidate>
//     <div data-slot="alert" x-show="formError"><span x-text="formError"></span></div>
//     <div data-slot="field" x-data="nqField(true)" x-effect="invalid = Boolean(errors['email'])" x-on:input="clear('email')" x-on:change="clear('email')">
//       … <div data-slot="field-error" x-show="invalid"><span x-text="errors['email'] ?? ''"></span></div>
//     </div>
//   </form>
//
// errors maps a field name to its message (empty messages are dropped). Editing a field clears its error, like React's NqForm;
// the form fires `clear-errors` ({ errors }) when that happens. submit() sets `submitting` (bind it to the button) and ignores a
// second submit while one is pending; the host (Livewire, fetch, a normal post) resets it with done().

import type { Magics, Register } from "./types";

interface FormState extends Magics {
  errors: Record<string, string>;
  formError: string | null;
  submitting: boolean;
  root: HTMLElement | null;
}

const clean = (errors: Record<string, string | null | undefined> | undefined) =>
  Object.fromEntries(Object.entries(errors ?? {}).filter(([, v]) => v)) as Record<string, string>;

export const form: Register = (Alpine) => {
  Alpine.data("nqForm", ({ errors = {}, formError = null }: { errors?: Record<string, string | null>; formError?: string | null } = {}) => ({
    errors: clean(errors),
    formError: (formError || null) as string | null,
    submitting: false,
    root: null as HTMLElement | null,
    init(this: FormState) {
      this.root = this.$el;
    },
    /** Replaces the errors (a response from the server) and ends the pending state. */
    setErrors(this: FormState, next: Record<string, string | null>, general: string | null = null) {
      this.errors = clean(next);
      this.formError = general || null;
      this.submitting = false;
    },
    /** Drops one field's error after the user edits it. */
    clear(this: FormState, name: string) {
      if (!(name in this.errors)) return;
      const next = { ...this.errors };
      delete next[name];
      this.errors = next;
      this.root?.dispatchEvent(new CustomEvent("clear-errors", { detail: { errors: next }, bubbles: true }));
    },
    submit(this: FormState, event: Event) {
      if (this.submitting) {
        event.preventDefault();
        return;
      }
      this.formError = null;
      this.submitting = true;
    },
    /** Ends the pending state (after a fetch or Livewire call that kept the page). */
    done(this: FormState) {
      this.submitting = false;
    },
  }));
};
