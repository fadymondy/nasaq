"use client";

import { KeyRound, MailCheck, Terminal } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import {
  AuthErrorSummary,
  type AuthSubmitResult,
  formatCountdown,
  isEmail,
  useAuthForm,
  useAuthLocale,
  useConditionalPasskey,
  useCooldown,
  usePasskeySupport,
} from "../auth-layout/auth-utils";
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

/** A way to sign in with the email field: a password, or a one-time link sent by email. */
export type LoginMethod = "password" | "magic-link";

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
  /** The magic-link button. */
  magicLink: string;
  sentTitle: string;
  /** Use `{email}` for the address. */
  sentBody: string;
  resend: string;
  /** Use `{time}` for the countdown. */
  resendIn: string;
  /** Announced after a resend. */
  resent: string;
  changeEmail: string;
  devLogin: string;
  /** Shown when `onDevLogin` throws. */
  devFailed: string;
  blockedTitle: string;
  blockedBody: string;
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
    magicLink: "Email me a sign-in link",
    sentTitle: "Check your email",
    sentBody: "We sent a sign-in link to {email}. It works once and expires soon.",
    resend: "Send the link again",
    resendIn: "Send again in {time}",
    resent: "We sent a new link.",
    changeEmail: "Use a different email",
    devLogin: "Dev login",
    devFailed: "Dev login failed.",
    blockedTitle: "Sign-in is not available",
    blockedBody: "This account can't sign in here. Contact your administrator.",
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
    magicLink: "أرسل لي رابط تسجيل الدخول",
    sentTitle: "تحقّق من بريدك",
    sentBody: "أرسلنا رابط تسجيل الدخول إلى {email}. يعمل مرة واحدة وتنتهي صلاحيته قريبًا.",
    resend: "أرسل الرابط مرة أخرى",
    resendIn: "أعد الإرسال بعد {time}",
    resent: "أرسلنا رابطًا جديدًا.",
    changeEmail: "استخدم بريدًا آخر",
    devLogin: "دخول المطوّر",
    devFailed: "فشل دخول المطوّر.",
    blockedTitle: "تسجيل الدخول غير متاح",
    blockedBody: "لا يمكن لهذا الحساب تسجيل الدخول هنا. تواصل مع المسؤول.",
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
  /**
   * Send a one-time sign-in link. Adds "Email me a sign-in link"; on success the form shows "Check your email"
   * with a resend timer. Resolve with `{ error }` or `{ fieldErrors: { email } }` to show a failure.
   */
  onMagicLink?: (values: { email: string }) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds before the link can be sent again. Default 30. */
  magicLinkSeconds?: number;
  /**
   * Which email methods to offer. Default: password, plus magic link when `onMagicLink` is set. `["magic-link"]`
   * drops the password field. An empty list means this account or tenant may not sign in here: the form shows a
   * notice and nothing else.
   */
  methods?: readonly LoginMethod[];
  /** A "Dev login" button for local development. Never pass it in production builds. */
  onDevLogin?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  labels?: Partial<LoginFormLabels>;
}

type Intent = LoginMethod;

/**
 * Email sign-in with a password, a magic link or both, plus remember me, a forgot-password slot, an optional passkey
 * button, provider buttons and a dev-only shortcut. Presentational: it validates the shape, calls your handler, and
 * shows what comes back.
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
  onMagicLink,
  magicLinkSeconds = 30,
  methods: methodsProp,
  onDevLogin,
  labels: labelsProp,
  className,
  ...props
}: LoginFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const methods = methodsProp ?? (onMagicLink ? ["password", "magic-link"] : ["password"]);
  const withPassword = methods.includes("password");
  const withMagic = methods.includes("magic-link") && Boolean(onMagicLink);
  const blocked = !withPassword && !withMagic;
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const passkeySupported = usePasskeySupport();
  const withPasskey = Boolean(onPasskey) && passkeySupported && !blocked;
  useConditionalPasskey(withPasskey ? onPasskeyAutofill : undefined);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [devPending, setDevPending] = useState(false);
  const [intent, setIntent] = useState<Intent>("password");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const cooldown = useCooldown();
  const [resendState, setResendState] = useState<{ pending: boolean; error?: string; done?: boolean }>({ pending: false });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const form = useAuthForm<LoginValues & { intent: Intent }, "email" | "password">({
    fallbackError: t.failed,
    validate: (v) => ({
      email: v.email.trim() ? (isEmail(v.email) ? undefined : t.emailInvalid) : t.emailRequired,
      password: v.intent === "password" && !v.password ? t.passwordRequired : undefined,
    }),
    onSubmit: async ({ intent: how, ...values }) => {
      if (how === "password") return onSubmit(values);
      const result = await onMagicLink?.({ email: values.email });
      if (!result || (!result.error && !result.fieldErrors)) {
        setSentTo(values.email);
        cooldown.start(magicLinkSeconds);
      }
      return result;
    },
  });
  const { fieldErrors: fe, pending } = form;
  const busy = pending || passkeyPending || devPending;

  useEffect(() => {
    if (sentTo) headingRef.current?.focus();
  }, [sentTo]);

  const send = (how: Intent) => {
    setIntent(how);
    void form.submit({ email: email.trim(), password, remember, intent: how });
  };

  const passkey = async () => {
    setPasskeyPending(true);
    try {
      await onPasskey?.();
    } finally {
      setPasskeyPending(false);
    }
  };

  const devLogin = async () => {
    if (busy) return;
    setDevPending(true);
    form.setError(undefined);
    try {
      const result = await onDevLogin?.();
      if (result?.error) form.setError(result.error);
    } catch {
      form.setError(t.devFailed);
    } finally {
      setDevPending(false);
    }
  };

  const resend = async () => {
    if (!sentTo || cooldown.remaining > 0 || resendState.pending) return;
    setResendState({ pending: true });
    try {
      const result = await onMagicLink?.({ email: sentTo });
      if (result?.error) setResendState({ pending: false, error: result.error });
      else {
        setResendState({ pending: false, done: true });
        cooldown.start(magicLinkSeconds);
      }
    } catch {
      setResendState({ pending: false, error: t.failed });
    }
  };

  const divProps = props as ComponentProps<"div">;

  if (sentTo) {
    const [before = "", after = ""] = t.sentBody.split("{email}");
    return (
      <div data-slot="login-form" data-state="sent" {...divProps} className={cn("flex w-full flex-col gap-4 text-start", className)}>
        <div className="flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
          <MailCheck aria-hidden="true" className="size-5" />
        </div>
        <div role="status" className="flex flex-col gap-1.5">
          <h2 ref={headingRef} tabIndex={-1} className="text-h3 text-foreground outline-none">
            {t.sentTitle}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {before}
            <bdi dir="ltr" className="font-medium text-foreground">
              {sentTo}
            </bdi>
            {after}
          </p>
        </div>
        {resendState.error ? <Alert tone="danger">{resendState.error}</Alert> : null}
        <span role="status" className="sr-only">
          {resendState.done && cooldown.remaining > 0 ? t.resent : ""}
        </span>
        <Button type="button" variant="secondary" size="lg" loading={resendState.pending} disabled={cooldown.remaining > 0} onClick={resend} data-slot="login-form-resend">
          {cooldown.remaining > 0 ? t.resendIn.replace("{time}", formatCountdown(cooldown.remaining)) : t.resend}
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="self-start"
          onClick={() => {
            setSentTo(null);
            setResendState({ pending: false });
          }}
        >
          {t.changeEmail}
        </Button>
      </div>
    );
  }

  const devButton = onDevLogin ? (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      loading={devPending}
      disabled={pending || passkeyPending}
      onClick={devLogin}
      data-slot="login-form-dev"
      className="border border-dashed border-border text-muted-foreground"
    >
      <Terminal aria-hidden="true" />
      {t.devLogin}
    </Button>
  ) : null;

  if (blocked) {
    return (
      <div data-slot="login-form" data-state="blocked" {...divProps} className={cn("flex w-full flex-col gap-4", className)}>
        <Alert tone="warning" title={t.blockedTitle}>
          {t.blockedBody}
        </Alert>
        {form.error ? <Alert tone="danger">{form.error}</Alert> : null}
        {devButton}
      </div>
    );
  }

  const magicPrimary = withMagic && !withPassword;
  const primaryIntent: Intent = magicPrimary ? "magic-link" : "password";

  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="login-form"
      data-state="idle"
      aria-busy={pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        send(withPassword ? "password" : "magic-link");
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
          autoComplete={withPasskey && onPasskeyAutofill ? "username webauthn" : withPassword ? "username" : "email"}
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
      {withPassword ? (
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
      ) : null}
      {showRemember && withPassword ? (
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Checkbox name="remember" checked={remember} onCheckedChange={(checked) => setRemember(checked)} />
          {t.remember}
        </label>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={pending && intent === primaryIntent}
        disabled={(busy && !pending) || (pending && intent !== primaryIntent)}
      >
        {magicPrimary ? t.magicLink : t.submit}
      </Button>
      {withMagic && withPassword ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          loading={pending && intent === "magic-link"}
          disabled={(busy && !pending) || (pending && intent !== "magic-link")}
          onClick={() => send("magic-link")}
          data-slot="login-form-magic-link"
        >
          <MailCheck aria-hidden="true" />
          {t.magicLink}
        </Button>
      ) : null}
      {withPasskey || oauthProviders?.length ? <OAuthDivider>{t.divider}</OAuthDivider> : null}
      {withPasskey ? (
        <Button type="button" variant="secondary" size="lg" loading={passkeyPending} disabled={pending || devPending} onClick={passkey} data-slot="login-form-passkey">
          <KeyRound aria-hidden="true" />
          {t.passkey}
        </Button>
      ) : null}
      {oauthProviders?.length ? <OAuthButtons providers={oauthProviders} intent="signin" onSelect={(id) => onOAuth?.(id)} disabled={busy} /> : null}
      {devButton}
    </form>
  );
}
