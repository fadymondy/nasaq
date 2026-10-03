// nqChangePasswordForm: validates the change-password form, then hands the values to you. The markup is the React
// ChangePasswordForm's; the form is server-rendered, the state lives here.
//
//   <form x-data="nqChangePasswordForm({ minLength: 8, labels })" x-on:submit.prevent="submit()"
//         x-on:nq-change-password="$event.detail.waitUntil(save($event.detail))">
//     <div data-slot="field" x-data="nqField(false)" x-modelable="invalid" x-model="bad.currentPassword">
//       <input name="currentPassword"> <div data-slot="field-error"><span x-text="errors.currentPassword"></span></div>
//     </div>
//     …
//   </form>
//
// The password inputs are read by name on submit (currentPassword, newPassword, confirmPassword, signOutOthers).
// It dispatches nq-change-password from the form with { currentPassword, newPassword, signOutOthers, waitUntil(promise) }.
// Resolve nothing for success, or { error, fieldErrors } to show messages; a rejection shows the generic error. With no
// listener and an action attribute the form is submitted natively after it validates.

import type { Magics, Register } from "./types";

const STRINGS = {
  en: {
    required: "Enter this to continue.",
    tooShort: "Use at least {n} characters.",
    mismatch: "The passwords do not match.",
    same: "Choose a password different from your current one.",
    genericError: "Could not change your password. Try again.",
  },
  ar: {
    required: "أدخل هذا الحقل للمتابعة.",
    tooShort: "استخدم {n} أحرف على الأقل.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    same: "اختر كلمة مرور مختلفة عن الحالية.",
    genericError: "تعذر تغيير كلمة المرور. حاول مرة أخرى.",
  },
};

type FieldName = "currentPassword" | "newPassword" | "confirmPassword";
interface Config {
  minLength?: number;
  showSignOutOthers?: boolean;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface Result {
  error?: string;
  fieldErrors?: Partial<Record<FieldName, string>>;
}

interface FormState extends Magics {
  errors: Record<FieldName, string>;
  bad: Record<FieldName, boolean>;
  formError: string;
  done: boolean;
  pending: boolean;
  signOutOthers: boolean;
  setErrors(found: Partial<Record<FieldName, string>>): void;
}

const NAMES: FieldName[] = ["currentPassword", "newPassword", "confirmPassword"];

export const changePasswordForm: Register = (Alpine) => {
  Alpine.data("nqChangePasswordForm", (config: Config = {}) => {
    const minLength = config.minLength ?? 8;
    const labels = { ...STRINGS[(document.documentElement.lang || "en").startsWith("ar") ? "ar" : "en"], ...config.labels };
    let form: HTMLFormElement | undefined;
    const read = (name: FieldName) => (form?.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    const clear = () => {
      for (const n of NAMES) {
        const input = form?.elements.namedItem(n) as HTMLInputElement | null;
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };
    return {
      errors: { currentPassword: "", newPassword: "", confirmPassword: "" } as Record<FieldName, string>,
      bad: { currentPassword: false, newPassword: false, confirmPassword: false } as Record<FieldName, boolean>,
      formError: "",
      done: false,
      pending: false,
      signOutOthers: true,
      init(this: FormState) {
        form = this.$el as HTMLFormElement;
        this.signOutOthers = form.querySelector('[data-slot="checkbox"]')?.getAttribute("aria-checked") === "true";
      },
      setErrors(this: FormState, found: Partial<Record<FieldName, string>>) {
        for (const n of NAMES) {
          this.errors[n] = found[n] ?? "";
          this.bad[n] = Boolean(found[n]);
        }
      },
      async submit(this: FormState) {
        if (this.pending) return;
        const current = read("currentPassword");
        const next = read("newPassword");
        const confirm = read("confirmPassword");
        const found: Partial<Record<FieldName, string>> = {};
        if (!current) found.currentPassword = labels.required;
        if (!next) found.newPassword = labels.required;
        else if (Array.from(next).length < minLength) found.newPassword = labels.tooShort.replace("{n}", String(minLength));
        else if (next === current) found.newPassword = labels.same;
        if (!confirm) found.confirmPassword = labels.required;
        else if (confirm !== next) found.confirmPassword = labels.mismatch;
        this.setErrors(found);
        this.formError = "";
        this.done = false;
        if (Object.keys(found).length) return;

        const pending: unknown[] = [];
        const detail = {
          currentPassword: current,
          newPassword: next,
          signOutOthers: (config.showSignOutOthers ?? true) && this.signOutOthers,
          waitUntil: (p: unknown) => void pending.push(p),
        };
        form?.dispatchEvent(new CustomEvent("nq-change-password", { bubbles: true, detail }));
        if (!pending.length && form?.getAttribute("action")) {
          form.submit();
          return;
        }
        this.pending = true;
        try {
          const results = (await Promise.all(pending)) as unknown[];
          const failed = results.find((r) => r && typeof r === "object" && ((r as Result).error || (r as Result).fieldErrors)) as Result | undefined;
          if (failed) {
            this.setErrors(failed.fieldErrors ?? {});
            this.formError = failed.error ?? "";
            return;
          }
          clear();
          this.done = true;
        } catch {
          this.formError = labels.genericError;
        } finally {
          this.pending = false;
        }
      },
    };
  });
};
