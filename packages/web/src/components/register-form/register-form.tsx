"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { AuthErrorSummary, type AuthSubmitResult, isEmail, useAuthForm, useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { OAuthButtons, OAuthDivider, type OAuthProvider } from "../oauth-buttons";
import { PasswordInput } from "../password-input";

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export interface RegisterFormLabels {
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  /** Hint under the password. Use `{min}` for the minimum length. */
  passwordHint: string;
  confirm: string;
  /** Default "I agree to the terms of service and privacy policy". Prefer the `terms` prop to add links. */
  terms: string;
  submit: string;
  divider: string;
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  passwordShort: string;
  confirmMismatch: string;
  termsRequired: string;
  errorTitle: string;
  failed: string;
}

const STRINGS: Record<"en" | "ar", RegisterFormLabels> = {
  en: {
    name: "Full name",
    namePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordHint: "At least {min} characters.",
    confirm: "Confirm password",
    terms: "I agree to the terms of service and privacy policy",
    submit: "Create account",
    divider: "or sign up with email",
    nameRequired: "Enter your name.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordShort: "Use at least {min} characters.",
    confirmMismatch: "The passwords do not match.",
    termsRequired: "Accept the terms to continue.",
    errorTitle: "Fix these to create your account",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    name: "الاسم الكامل",
    namePlaceholder: "اسمك",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    password: "كلمة المرور",
    passwordHint: "{min} أحرف على الأقل.",
    confirm: "تأكيد كلمة المرور",
    terms: "أوافق على شروط الخدمة وسياسة الخصوصية",
    submit: "إنشاء حساب",
    divider: "أو سجّل بالبريد الإلكتروني",
    nameRequired: "أدخل اسمك.",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    confirmMismatch: "كلمتا المرور غير متطابقتين.",
    termsRequired: "وافق على الشروط للمتابعة.",
    errorTitle: "صحّح ما يلي لإنشاء حسابك",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export interface RegisterFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Resolve with nothing on success, or `{ error, fieldErrors }` (keys: name, email, password, confirm, terms). */
  onSubmit: (values: RegisterValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Minimum password length checked before `onSubmit`. Default 8. */
  minPasswordLength?: number;
  /** Require the terms checkbox. Default true. */
  requireTerms?: boolean;
  /** The terms sentence, with links: `<>I agree to the <a href="/terms">Terms</a></>`. */
  terms?: ReactNode;
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  labels?: Partial<RegisterFormLabels>;
}

/**
 * Sign-up: name, email, a password with a strength meter, confirmation, a terms checkbox and optional
 * provider buttons. The confirmation match and minimum length are checked before `onSubmit` runs.
 */
export function RegisterForm({
  onSubmit,
  minPasswordLength = 8,
  requireTerms = true,
  terms,
  oauthProviders,
  onOAuth,
  labels: labelsProp,
  className,
  ...props
}: RegisterFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const min = String(minPasswordLength);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);

  const form = useAuthForm<RegisterValues, "name" | "email" | "password" | "confirm" | "terms">({
    onSubmit,
    fallbackError: t.failed,
    validate: (v) => ({
      name: v.name.trim() ? undefined : t.nameRequired,
      email: v.email.trim() ? (isEmail(v.email) ? undefined : t.emailInvalid) : t.emailRequired,
      password: v.password.length >= minPasswordLength ? undefined : t.passwordShort.replace("{min}", min),
      confirm: confirm === v.password ? undefined : t.confirmMismatch,
      terms: !requireTerms || v.acceptTerms ? undefined : t.termsRequired,
    }),
  });
  const { fieldErrors: fe, pending } = form;

  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="register-form"
      aria-busy={pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ name: name.trim(), email: email.trim(), password, acceptTerms: accepted });
      }}
    >
      {oauthProviders?.length ? (
        <>
          <OAuthButtons providers={oauthProviders} intent="signup" onSelect={(id) => onOAuth?.(id)} disabled={pending} />
          <OAuthDivider>{t.divider}</OAuthDivider>
        </>
      ) : null}
      <AuthErrorSummary
        ref={form.summaryRef}
        error={form.error}
        fieldErrors={fe}
        fieldLabels={{ name: t.name, email: t.email, password: t.password, confirm: t.confirm }}
        title={t.errorTitle}
        onFocusField={form.focusField}
      />
      <Field name="name" invalid={Boolean(fe.name)}>
        <FieldLabel>{t.name}</FieldLabel>
        <Input
          name="name"
          autoComplete="name"
          placeholder={t.namePlaceholder}
          value={name}
          aria-invalid={fe.name ? true : undefined}
          onChange={(e) => {
            setName(e.target.value);
            form.clear("name");
          }}
        />
        {fe.name ? <FieldError match>{fe.name}</FieldError> : null}
      </Field>
      <Field name="email" invalid={Boolean(fe.email)}>
        <FieldLabel>{t.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          ltr
          autoComplete="email"
          inputMode="email"
          placeholder={t.emailPlaceholder}
          value={email}
          aria-invalid={fe.email ? true : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            form.clear("email");
          }}
        />
        {fe.email ? <FieldError match>{fe.email}</FieldError> : null}
      </Field>
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
      {requireTerms ? (
        <Field name="terms" invalid={Boolean(fe.terms)}>
          <label className="flex items-start gap-2 text-body-sm text-foreground">
            <Checkbox
              name="terms"
              className="mt-0.5"
              checked={accepted}
              aria-invalid={fe.terms ? true : undefined}
              onCheckedChange={(checked) => {
                setAccepted(checked);
                form.clear("terms");
              }}
            />
            <span>{terms ?? t.terms}</span>
          </label>
          {fe.terms ? <FieldError match>{fe.terms}</FieldError> : null}
        </Field>
      ) : null}
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
