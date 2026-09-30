"use client";

import { type ComponentProps, type FormEvent, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";
import { PasswordInput } from "../password-input";

const STRINGS = {
  en: {
    current: "Current password",
    next: "New password",
    nextHint: "At least 8 characters.",
    confirm: "Confirm new password",
    signOutOthers: "Sign out of all other sessions",
    signOutOthersHint: "Recommended if you think someone else knows your old password.",
    submit: "Change password",
    success: "Your password was changed.",
    required: "Enter this to continue.",
    tooShort: (n: number) => `Use at least ${n} characters.`,
    mismatch: "The passwords do not match.",
    same: "Choose a password different from your current one.",
    genericError: "Could not change your password. Try again.",
  },
  ar: {
    current: "كلمة المرور الحالية",
    next: "كلمة المرور الجديدة",
    nextHint: "8 أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور الجديدة",
    signOutOthers: "تسجيل الخروج من كل الجلسات الأخرى",
    signOutOthersHint: "يُنصح بذلك إذا كنت تظن أن أحدًا يعرف كلمة المرور القديمة.",
    submit: "تغيير كلمة المرور",
    success: "تم تغيير كلمة المرور.",
    required: "أدخل هذا الحقل للمتابعة.",
    tooShort: (n: number) => `استخدم ${n} أحرف على الأقل.`,
    mismatch: "كلمتا المرور غير متطابقتين.",
    same: "اختر كلمة مرور مختلفة عن الحالية.",
    genericError: "تعذر تغيير كلمة المرور. حاول مرة أخرى.",
  },
};

export type ChangePasswordLabels = (typeof STRINGS)["en"];

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  /** True when the user asked to sign out of every other session. */
  signOutOthers: boolean;
}

export type ChangePasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export type ChangePasswordResult = void | { error?: string; fieldErrors?: Partial<Record<ChangePasswordField, string>> };

export interface ChangePasswordFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Runs when the form is valid. Resolve for success, or `{ error, fieldErrors }` to show messages (a wrong current password goes in `fieldErrors.currentPassword`). */
  onSubmit: (values: ChangePasswordValues) => Promise<ChangePasswordResult>;
  /** Minimum length of the new password. Default 8. */
  minLength?: number;
  /** Show the "sign out other sessions" checkbox. Default true. */
  showSignOutOthers?: boolean;
  /** Initial state of that checkbox. Default true. */
  defaultSignOutOthers?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ChangePasswordLabels>;
}

/**
 * Change the password of the signed-in account: current, new (with the strength meter) and confirm,
 * plus an option to sign out other sessions. Validates on the client, then hands the values to your async
 * `onSubmit`. On success it clears the fields and shows a confirmation.
 */
export function ChangePasswordForm({
  onSubmit,
  minLength = 8,
  showSignOutOthers = true,
  defaultSignOutOthers = true,
  labels,
  className,
  ...props
}: ChangePasswordFormProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const checkId = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(defaultSignOutOthers);
  const [errors, setErrors] = useState<Partial<Record<ChangePasswordField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const found: Partial<Record<ChangePasswordField, string>> = {};
    if (!current) found.currentPassword = t.required;
    if (!next) found.newPassword = t.required;
    else if ([...next].length < minLength) found.newPassword = t.tooShort(minLength);
    else if (next === current) found.newPassword = t.same;
    if (!confirm) found.confirmPassword = t.required;
    else if (confirm !== next) found.confirmPassword = t.mismatch;
    setErrors(found);
    setFormError(null);
    setDone(false);
    if (Object.keys(found).length) return;

    setPending(true);
    try {
      const result = await onSubmit({ currentPassword: current, newPassword: next, signOutOthers: showSignOutOthers && signOutOthers });
      if (result && (result.error || result.fieldErrors)) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch {
      setFormError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      data-slot="change-password-form"
      noValidate
      onSubmit={submit}
      className={cn("flex w-full max-w-md flex-col gap-4", className)}
      {...props}
    >
      {done ? <Alert tone="success">{t.success}</Alert> : null}
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <Field invalid={!!errors.currentPassword}>
        <FieldLabel>{t.current}</FieldLabel>
        <PasswordInput
          name="currentPassword"
          autoComplete="current-password"
          required
          disabled={pending}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        {errors.currentPassword ? <FieldError match>{errors.currentPassword}</FieldError> : null}
      </Field>
      <Field invalid={!!errors.newPassword}>
        <FieldLabel>{t.next}</FieldLabel>
        <PasswordInput
          name="newPassword"
          autoComplete="new-password"
          minLength={minLength}
          required
          showStrength
          disabled={pending}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        {errors.newPassword ? <FieldError match>{errors.newPassword}</FieldError> : <FieldDescription>{t.nextHint}</FieldDescription>}
      </Field>
      <Field invalid={!!errors.confirmPassword}>
        <FieldLabel>{t.confirm}</FieldLabel>
        <PasswordInput
          name="confirmPassword"
          autoComplete="new-password"
          required
          disabled={pending}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {errors.confirmPassword ? <FieldError match>{errors.confirmPassword}</FieldError> : null}
      </Field>
      {showSignOutOthers ? (
        <div className="flex items-start gap-2">
          <Checkbox id={checkId} className="mt-0.5" checked={signOutOthers} disabled={pending} onCheckedChange={(v) => setSignOutOthers(v === true)} />
          <div className="flex flex-col gap-0.5">
            <label htmlFor={checkId} className="text-body-sm text-foreground">
              {t.signOutOthers}
            </label>
            <p className="text-caption text-muted-foreground">{t.signOutOthersHint}</p>
          </div>
        </div>
      ) : null}
      <div>
        <Button type="submit" variant="primary" loading={pending}>
          {t.submit}
        </Button>
      </div>
    </form>
  );
}
