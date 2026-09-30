"use client";

import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { AuthErrorSummary, type AuthSubmitResult, useAuthForm, useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";
import { PasswordInput } from "../password-input";

export interface ResetPasswordValues {
  password: string;
}

export interface ResetPasswordFormLabels {
  password: string;
  /** Use `{min}` for the minimum length. */
  passwordHint: string;
  confirm: string;
  submit: string;
  passwordShort: string;
  confirmMismatch: string;
  errorTitle: string;
  failed: string;
}

const STRINGS: Record<"en" | "ar", ResetPasswordFormLabels> = {
  en: {
    password: "New password",
    passwordHint: "At least {min} characters.",
    confirm: "Confirm new password",
    submit: "Reset password",
    passwordShort: "Use at least {min} characters.",
    confirmMismatch: "The passwords do not match.",
    errorTitle: "Fix these to reset your password",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    password: "كلمة المرور الجديدة",
    passwordHint: "{min} أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور الجديدة",
    submit: "إعادة تعيين كلمة المرور",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    confirmMismatch: "كلمتا المرور غير متطابقتين.",
    errorTitle: "صحّح ما يلي لإعادة تعيين كلمة المرور",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export interface ResetPasswordFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Resolve with nothing on success, or `{ error, fieldErrors }` (keys: password, confirm). An expired link is a good `error`. */
  onSubmit: (values: ResetPasswordValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Minimum length checked before `onSubmit`. Default 8. */
  minPasswordLength?: number;
  labels?: Partial<ResetPasswordFormLabels>;
}

/** Choose a new password after following a reset link: new and confirm fields, a strength meter, and the shared error handling. */
export function ResetPasswordForm({ onSubmit, minPasswordLength = 8, labels: labelsProp, className, ...props }: ResetPasswordFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const min = String(minPasswordLength);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const form = useAuthForm<ResetPasswordValues, "password" | "confirm">({
    onSubmit,
    fallbackError: t.failed,
    validate: (v) => ({
      password: v.password.length >= minPasswordLength ? undefined : t.passwordShort.replace("{min}", min),
      confirm: confirm === v.password ? undefined : t.confirmMismatch,
    }),
  });
  const { fieldErrors: fe, pending } = form;

  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="reset-password-form"
      aria-busy={pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ password });
      }}
    >
      <AuthErrorSummary
        ref={form.summaryRef}
        error={form.error}
        fieldErrors={fe}
        fieldLabels={{ password: t.password, confirm: t.confirm }}
        title={t.errorTitle}
        onFocusField={form.focusField}
      />
      <Field name="password" invalid={Boolean(fe.password)}>
        <FieldLabel>{t.password}</FieldLabel>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          showStrength
          value={password}
          aria-invalid={fe.password ? true : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            form.clear("password");
          }}
        />
        {fe.password ? <FieldError match>{fe.password}</FieldError> : <FieldDescription>{t.passwordHint.replace("{min}", min)}</FieldDescription>}
      </Field>
      <Field name="confirm" invalid={Boolean(fe.confirm)}>
        <FieldLabel>{t.confirm}</FieldLabel>
        <PasswordInput
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          aria-invalid={fe.confirm ? true : undefined}
          onChange={(e) => {
            setConfirm(e.target.value);
            form.clear("confirm");
          }}
        />
        {fe.confirm ? <FieldError match>{fe.confirm}</FieldError> : null}
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
