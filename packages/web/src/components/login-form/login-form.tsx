"use client";

import { KeyRound } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { AuthErrorSummary, type AuthSubmitResult, isEmail, useAuthForm, useAuthLocale, useConditionalPasskey, usePasskeySupport } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { OAuthButtons, OAuthDivider, type OAuthProvider } from "../oauth-buttons";
import { PasswordInput } from "../password-input";

export interface LoginValues {
  email: string;
  password: string;
  remember: boolean;
}

export interface LoginFormLabels {
  email: string;
  emailPlaceholder: string;
  password: string;
  remember: string;
  submit: string;
  passkey: string;
  /** Between the form and the passkey / provider buttons. Default "or". */
  divider: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  /** Heading of the error summary when fields need fixing. */
  errorTitle: string;
  /** Shown when `onSubmit` throws. */
  failed: string;
}

const STRINGS: Record<"en" | "ar", LoginFormLabels> = {
  en: {
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    remember: "Remember me",
    submit: "Sign in",
    passkey: "Sign in with a passkey",
    divider: "or",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    errorTitle: "Fix these to sign in",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    password: "كلمة المرور",
    remember: "تذكّرني",
    submit: "تسجيل الدخول",
    passkey: "تسجيل الدخول بمفتاح المرور",
    divider: "أو",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordRequired: "أدخل كلمة المرور.",
    errorTitle: "صحّح ما يلي لتسجيل الدخول",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export interface LoginFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Resolve with nothing on success, or `{ error, fieldErrors }` to show a failure. Throwing shows `labels.failed`. */
  onSubmit: (values: LoginValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  defaultEmail?: string;
  /** Slot beside the password label, usually a link: `<a href="/forgot-password">Forgot password?</a>`. */
  forgotPassword?: ReactNode;
  /** Show the "Remember me" checkbox. Default true. */
  showRemember?: boolean;
  /** Provider buttons under the form. Omit to hide them. */
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  /** Shows "Sign in with a passkey" when set and the browser supports WebAuthn (`PublicKeyCredential`). */
  onPasskey?: () => void | Promise<unknown>;
  /** Passkey autofill (conditional UI): called with an AbortSignal when the browser supports it. Also sets `autocomplete="username webauthn"` on the email field. */
  onPasskeyAutofill?: (signal: AbortSignal) => void | Promise<unknown>;
  labels?: Partial<LoginFormLabels>;
}

/**
 * Email and password sign-in with remember me, a forgot-password slot, an optional passkey button and
 * provider buttons. Presentational: it validates the shape, calls `onSubmit`, and shows what comes back.
 */
export function LoginForm({
  onSubmit,
  defaultEmail = "",
  forgotPassword,
  showRemember = true,
  oauthProviders,
  onOAuth,
  onPasskey,
  onPasskeyAutofill,
  labels: labelsProp,
  className,
  ...props
}: LoginFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const passkeySupported = usePasskeySupport();
  const withPasskey = Boolean(onPasskey) && passkeySupported;
  useConditionalPasskey(withPasskey ? onPasskeyAutofill : undefined);
  const [passkeyPending, setPasskeyPending] = useState(false);

  const form = useAuthForm<LoginValues, "email" | "password">({
    onSubmit,
    fallbackError: t.failed,
    validate: (v) => ({
      email: v.email.trim() ? (isEmail(v.email) ? undefined : t.emailInvalid) : t.emailRequired,
      password: v.password ? undefined : t.passwordRequired,
    }),
  });
  const { fieldErrors: fe, pending } = form;
  const busy = pending || passkeyPending;

  const passkey = async () => {
    setPasskeyPending(true);
    try {
      await onPasskey?.();
    } finally {
      setPasskeyPending(false);
    }
  };

  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="login-form"
      aria-busy={pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ email: email.trim(), password, remember });
      }}
    >
      <AuthErrorSummary
        ref={form.summaryRef}
        error={form.error}
        fieldErrors={fe}
        fieldLabels={{ email: t.email, password: t.password }}
        title={t.errorTitle}
        onFocusField={form.focusField}
      />
      <Field name="email" invalid={Boolean(fe.email)}>
        <FieldLabel>{t.email}</FieldLabel>
        <Input
          type="email"
          name="email"
          ltr
          autoComplete={withPasskey && onPasskeyAutofill ? "username webauthn" : "username"}
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
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>{t.password}</FieldLabel>
          {forgotPassword ? <span className="text-caption">{forgotPassword}</span> : null}
        </div>
        <PasswordInput
          name="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={fe.password ? true : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            form.clear("password");
          }}
        />
        {fe.password ? <FieldError match>{fe.password}</FieldError> : null}
      </Field>
      {showRemember ? (
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Checkbox name="remember" checked={remember} onCheckedChange={(checked) => setRemember(checked)} />
          {t.remember}
        </label>
      ) : null}
      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={passkeyPending}>
        {t.submit}
      </Button>
      {withPasskey || oauthProviders?.length ? <OAuthDivider>{t.divider}</OAuthDivider> : null}
      {withPasskey ? (
        <Button type="button" variant="secondary" size="lg" loading={passkeyPending} disabled={pending} onClick={passkey} data-slot="login-form-passkey">
          <KeyRound aria-hidden="true" />
          {t.passkey}
        </Button>
      ) : null}
      {oauthProviders?.length ? <OAuthButtons providers={oauthProviders} intent="signin" onSelect={(id) => onOAuth?.(id)} disabled={busy} /> : null}
    </form>
  );
}
