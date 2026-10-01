"use client";

import { CircleCheck, LinkIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { AuthErrorSummary, type AuthSubmitFailure, useAuthForm, useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";
import { PasswordInput, type PasswordPolicy, computePasswordRules, computeRuleScore, passwordMeetsPolicy } from "../password-input";

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
  /** Shown when `rules` is on and a rule is not met. */
  passwordWeak: string;
  confirmMismatch: string;
  errorTitle: string;
  failed: string;
  successTitle: string;
  successBody: string;
  signIn: string;
  expiredTitle: string;
  expiredBody: string;
  requestLink: string;
}

const STRINGS: Record<"en" | "ar", ResetPasswordFormLabels> = {
  en: {
    password: "New password",
    passwordHint: "At least {min} characters.",
    confirm: "Confirm new password",
    submit: "Reset password",
    passwordShort: "Use at least {min} characters.",
    passwordWeak: "Meet every requirement below.",
    confirmMismatch: "The passwords do not match.",
    errorTitle: "Fix these to reset your password",
    failed: "Something went wrong. Try again.",
    successTitle: "Password changed",
    successBody: "You can now sign in with your new password.",
    signIn: "Sign in",
    expiredTitle: "This link has expired",
    expiredBody: "Reset links work once and only for a short time. Ask for a new one.",
    requestLink: "Send a new link",
  },
  ar: {
    password: "كلمة المرور الجديدة",
    passwordHint: "{min} أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور الجديدة",
    submit: "إعادة تعيين كلمة المرور",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    passwordWeak: "استوفِ كل المتطلبات أدناه.",
    confirmMismatch: "كلمتا المرور غير متطابقتين.",
    errorTitle: "صحّح ما يلي لإعادة تعيين كلمة المرور",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    successTitle: "تم تغيير كلمة المرور",
    successBody: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    signIn: "تسجيل الدخول",
    expiredTitle: "انتهت صلاحية هذا الرابط",
    expiredBody: "روابط إعادة التعيين تعمل مرة واحدة ولمدة قصيرة. اطلب رابطًا جديدًا.",
    requestLink: "أرسل رابطًا جديدًا",
  },
};

/** What `onSubmit` may resolve to: nothing on success, a failure to show, or `{ expired: true }` for a used or old link. */
export type ResetPasswordResult = void | AuthSubmitFailure | { expired: true };

export type ResetPasswordState = "idle" | "success" | "expired";

/** A button target: a URL, or a handler. */
export type ResetPasswordTarget = string | (() => void);

export interface ResetPasswordFormProps extends Omit<ComponentProps<"div">, "onSubmit" | "children"> {
  onSubmit: (values: ResetPasswordValues) => Promise<ResetPasswordResult> | ResetPasswordResult;
  /** Minimum length checked before `onSubmit`. Default 8, or the policy's minimum when `rules` is a policy. */
  minPasswordLength?: number;
  /** Show the requirement checklist and require every rule. `true` is 12 characters with upper, lower, digit and symbol. */
  rules?: boolean | PasswordPolicy;
  /** Start in a state, e.g. `"expired"` when the token was checked on load. Uncontrolled after that. */
  defaultState?: ResetPasswordState;
  /** Controlled state. */
  state?: ResetPasswordState;
  onStateChange?: (state: ResetPasswordState) => void;
  /** The Sign in button on success. Without it the button is hidden. */
  signIn?: ResetPasswordTarget;
  /** The Send a new link button on an expired link. Without it the button is hidden. */
  requestLink?: ResetPasswordTarget;
  labels?: Partial<ResetPasswordFormLabels>;
}

function Target({ to, children, variant }: { to: ResetPasswordTarget; children: ReactNode; variant: "primary" | "secondary" }) {
  return typeof to === "string" ? (
    <Button variant={variant} size="lg" nativeButton={false} render={<a href={to} />}>
      {children}
    </Button>
  ) : (
    <Button type="button" variant={variant} size="lg" onClick={to}>
      {children}
    </Button>
  );
}

/**
 * Choose a new password after following a reset link: new and confirm fields, a strength meter and an optional
 * requirement checklist. After submit it shows "Password changed" with a Sign in button, or "This link has expired"
 * with a Send a new link button.
 */
export function ResetPasswordForm({
  onSubmit,
  minPasswordLength,
  rules,
  defaultState = "idle",
  state: stateProp,
  onStateChange,
  signIn,
  requestLink,
  labels: labelsProp,
  className,
  ...props
}: ResetPasswordFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const policy: PasswordPolicy | null = rules ? (rules === true ? {} : rules) : null;
  const minLength = minPasswordLength ?? (policy ? (policy.minLength ?? 12) : 8);
  const min = String(minLength);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [own, setOwn] = useState<ResetPasswordState>(defaultState);
  const state = stateProp ?? own;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const setState = (next: ResetPasswordState) => {
    if (stateProp === undefined) setOwn(next);
    onStateChange?.(next);
  };
  const checks = policy ? computePasswordRules(password, { ...policy, minLength }) : null;

  const form = useAuthForm<ResetPasswordValues, "password" | "confirm">({
    fallbackError: t.failed,
    validate: (v) => ({
      password:
        v.password.length < minLength ? t.passwordShort.replace("{min}", min) : checks && !passwordMeetsPolicy(checks) ? t.passwordWeak : undefined,
      confirm: confirm === v.password ? undefined : t.confirmMismatch,
    }),
    onSubmit: async (values) => {
      const result = await onSubmit(values);
      if (result && "expired" in result && result.expired) {
        setState("expired");
        return;
      }
      const failure = result as AuthSubmitFailure | void;
      if (!failure || (!failure.error && !failure.fieldErrors)) setState("success");
      return failure;
    },
  });
  const { fieldErrors: fe, pending } = form;

  useEffect(() => {
    if (state !== "idle") headingRef.current?.focus();
  }, [state]);

  if (state !== "idle") {
    const success = state === "success";
    return (
      <div data-slot="reset-password-form" data-state={state} className={cn("flex w-full flex-col gap-4 text-start", className)} {...props}>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            success ? "bg-nq-success-soft text-nq-success-text" : "bg-nq-warning-soft text-nq-warning-text",
          )}
        >
          {success ? <CircleCheck aria-hidden="true" className="size-5" /> : <LinkIcon aria-hidden="true" className="size-5" />}
        </div>
        <div role="status" className="flex flex-col gap-1.5">
          <h2 ref={headingRef} tabIndex={-1} className="text-h3 text-foreground outline-none">
            {success ? t.successTitle : t.expiredTitle}
          </h2>
          <p className="text-body-sm text-muted-foreground">{success ? t.successBody : t.expiredBody}</p>
        </div>
        {success && signIn ? (
          <Target to={signIn} variant="primary">
            {t.signIn}
          </Target>
        ) : null}
        {!success && requestLink ? (
          <Target to={requestLink} variant="primary">
            {t.requestLink}
          </Target>
        ) : null}
      </div>
    );
  }

  return (
    <div data-slot="reset-password-form" data-state="idle" className={cn("w-full", className)} {...props}>
      <form
        ref={form.formRef}
        noValidate
        aria-busy={pending || undefined}
        className="flex w-full flex-col gap-4"
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
            {...(checks ? { score: computeRuleScore(checks), rules: checks } : {})}
            value={password}
            aria-invalid={fe.password ? true : undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              form.clear("password");
            }}
          />
          {fe.password ? <FieldError match>{fe.password}</FieldError> : checks ? null : <FieldDescription>{t.passwordHint.replace("{min}", min)}</FieldDescription>}
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
    </div>
  );
}
