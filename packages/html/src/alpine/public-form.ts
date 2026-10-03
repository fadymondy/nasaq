// nqPublicForm: the behaviour of a form drawn from a definition: fields that show, hide or become required as answers change,
// validation in the visitor's language, a honeypot and a thank-you. The markup is the React PublicForm's (see the Blade
// public-form component); the shared submit plumbing is login-form-logic.ts.
//
//   <form data-slot="public-form" x-data="nqPublicForm({ fields, rules, honeypot, defaults, errors, failed })"
//         x-on:nq-public-form="$event.detail.waitUntil(send($event.detail.data))">
//
// nq-public-form { data, waitUntil(promise) } bubbles from the form. Resolve nothing for success or { error } to keep the form.
// `answers` holds the value of each field by id (controls bind with x-model), `done` shows the thank-you. With no listener and an
// action attribute the form submits natively.

import { authBase, type AuthConfig, type AuthState } from "./login-form-logic";
import { buildFormSubmission, formFieldStates, validateFormValues, type FormErrorCode, type FormFieldLite, type FormRuleLite, type FormValues } from "./public-form-logic";
import type { Register } from "./types";

interface Config {
  fields?: FormFieldLite[];
  rules?: FormRuleLite[];
  honeypot?: boolean;
  preview?: boolean;
  defaults?: FormValues;
  errors?: Partial<Record<FormErrorCode, string>>;
  failed?: string;
}
interface FormState extends AuthState {
  answers: FormValues;
  done: boolean;
  snapshot: FormValues;
  isVisible(id: string): boolean;
  isRequired(id: string): boolean;
  onSubmit(): Promise<void>;
  again(): void;
}

const ERRORS: Record<FormErrorCode, string> = {
  required: "This field is required.",
  email: "Enter a valid email address.",
  phone: "Enter a phone number with its country code.",
  number: "Enter a number.",
};

export const publicForm: Register = (Alpine) => {
  Alpine.data("nqPublicForm", (config: Config = {}) => {
    const fields = config.fields ?? [];
    const rules = config.rules ?? [];
    const form = { fields, rules, honeypot: Boolean(config.honeypot) };
    const messages = { ...ERRORS, ...config.errors };
    const defaults = (): FormValues => ({ ...config.defaults });
    return {
      ...authBase({ names: fields.map((f) => f.id), failed: config.failed }),
      answers: defaults(),
      done: false,
      snapshot: defaults(),
      init(this: FormState) {
        this.authInit(this.$el);
        // An edited answer clears its own error.
        this.$watch("answers", (now: FormValues) => {
          for (const f of fields) if (now[f.id] !== this.snapshot[f.id]) this.clear(f.id);
          this.snapshot = { ...now };
        });
      },
      destroy(this: FormState) {
        this.authDestroy();
      },
      isVisible(this: FormState, id: string) {
        return formFieldStates(form, this.answers)[id]?.visible ?? false;
      },
      isRequired(this: FormState, id: string) {
        return formFieldStates(form, this.answers)[id]?.required ?? false;
      },
      async onSubmit(this: FormState) {
        const found = validateFormValues(form, this.answers);
        const local = Object.fromEntries(Object.entries(found).map(([id, code]) => [id, messages[code]]));
        if (config.preview) {
          this.error = "";
          this.setErrors(local);
          if (Object.keys(local).length) this.focusProblem();
          return;
        }
        if (!Object.keys(local).length && buildFormSubmission(form, this.answers).spam) {
          this.setErrors({});
          this.error = "";
          this.done = true;
          return;
        }
        const { data } = buildFormSubmission(form, this.answers);
        await this.submitWith("nq-public-form", { data }, local, { onOk: () => (this.done = true) });
      },
      again(this: FormState) {
        this.answers = defaults();
        this.snapshot = defaults();
        this.done = false;
      },
    };
  });
};
