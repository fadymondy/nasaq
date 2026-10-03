"use client";

import { ArrowLeft, Building2, KeyRound, Link2, Mail, MailCheck, ShieldOff, TriangleAlert, UserPlus } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import {
  AuthErrorSummary,
  type AuthSubmitFailure,
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
import { ForgotPasswordForm } from "../forgot-password-form";
import { LastUsed, OAuthButtons, OAuthDivider, type OAuthProvider } from "../oauth-buttons";
import { PasswordInput } from "../password-input";
import { TwoFactorChallenge, type TwoFactorValues } from "../two-factor-challenge";
import { VerifyOtpForm } from "../verify-otp-form";

/** Where the flow goes after the email step. Your backend decides it from the address (account, domain, policy). */
/** Another way in, offered on the password step. */
export type SignInAlternative = "code" | "magic-link";

export type SignInNext =
  /**
   * Ask for the password. `alternatives` limits the other ways in for this address (policy, account type);
   * default: every one you passed a handler for. `[]` hides them.
   */
  | { step: "password"; alternatives?: readonly SignInAlternative[] }
  /** A one-time code was sent to the email. */
  | { step: "code"; length?: number }
  /** The domain belongs to an organisation with single sign-on. `connection` is its display name. */
  | { step: "sso"; connection?: string }
  /** No account uses this address. */
  | { step: "register" }
  /** A sign-in link was already sent to the email. */
  | { step: "link-sent" }
  /** This address may not sign in here (suspended, wrong tenant, no allowed method). `message` replaces the default text. */
  | { step: "blocked"; message?: string };

/** What `onPassword` may resolve to: nothing on success, a failure, or `{ twoFactor: true }` to ask for a second factor. */
export type SignInPasswordResult = AuthSubmitResult | { twoFactor: true; length?: number };

export type SignInStep = "email" | SignInNext["step"] | "two-factor" | "forgot";

export interface SignInFlowLabels {
  email: string;
  emailPlaceholder: string;
  continue: string;
  divider: string;
  passkey: string;
  change: string;
  password: string;
  remember: string;
  signIn: string;
  useCode: string;
  ssoTitle: string;
  /** `{connection}` is replaced by the organisation's connection name. */
  ssoWith: string;
  ssoBody: string;
  ssoContinue: string;
  registerTitle: string;
  registerBody: string;
  register: string;
  otherEmail: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  capsLock: string;
  lastUsed: string;
  errorTitle: string;
  failed: string;
  magicLink: string;
  linkSentTitle: string;
  /** `{email}` is replaced by the address. */
  linkSentBody: string;
  resend: string;
  /** `{time}` is replaced by the countdown. */
  resendIn: string;
  resent: string;
  blockedTitle: string;
  blockedBody: string;
  forgotPassword: string;
  backToSignIn: string;
}

const STRINGS: Record<"en" | "ar", SignInFlowLabels> = {
  en: {
    email: "Email",
    emailPlaceholder: "you@company.com",
    continue: "Continue",
    divider: "or",
    passkey: "Sign in with a passkey",
    change: "Change",
    password: "Password",
    remember: "Keep me signed in",
    signIn: "Sign in",
    useCode: "Email me a code instead",
    ssoTitle: "Your organisation uses single sign-on",
    ssoWith: "Continue with {connection}",
    ssoBody: "You will sign in with your organisation's identity provider and come back here.",
    ssoContinue: "Continue with SSO",
    registerTitle: "No account uses this email",
    registerBody: "Create one in a minute, or try another address.",
    register: "Create an account",
    otherEmail: "Use another email",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    capsLock: "Caps Lock is on.",
    lastUsed: "Last used",
    errorTitle: "Fix these to continue",
    failed: "Something went wrong. Try again.",
    magicLink: "Email me a sign-in link",
    linkSentTitle: "Check your email",
    linkSentBody: "We sent a sign-in link to {email}. Open it on this device to finish signing in.",
    resend: "Send the link again",
    resendIn: "Send again in {time}",
    resent: "We sent a new link.",
    blockedTitle: "This account can't sign in here",
    blockedBody: "Contact your administrator, or try another address.",
    forgotPassword: "Forgot password?",
    backToSignIn: "Back to sign in",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@company.com",
    continue: "متابعة",
    divider: "أو",
    passkey: "تسجيل الدخول بمفتاح المرور",
    change: "تغيير",
    password: "كلمة المرور",
    remember: "إبقائي مسجّلًا",
    signIn: "تسجيل الدخول",
    useCode: "أرسل لي رمزًا بالبريد بدلًا من ذلك",
    ssoTitle: "مؤسستك تستخدم الدخول الموحّد",
    ssoWith: "المتابعة باستخدام {connection}",
    ssoBody: "ستسجّل الدخول عبر مزوّد الهوية في مؤسستك ثم تعود إلى هنا.",
    ssoContinue: "المتابعة بالدخول الموحّد",
    registerTitle: "لا يوجد حساب بهذا البريد",
    registerBody: "أنشئ حسابًا في دقيقة، أو جرّب بريدًا آخر.",
    register: "إنشاء حساب",
    otherEmail: "استخدام بريد آخر",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordRequired: "أدخل كلمة المرور.",
    capsLock: "مفتاح الأحرف الكبيرة (Caps Lock) مفعّل.",
    lastUsed: "آخر استخدام",
    errorTitle: "صحّح ما يلي للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    magicLink: "أرسل لي رابط تسجيل الدخول",
    linkSentTitle: "تحقّق من بريدك",
    linkSentBody: "أرسلنا رابط تسجيل الدخول إلى {email}. افتحه على هذا الجهاز لإكمال تسجيل الدخول.",
    resend: "أرسل الرابط مرة أخرى",
    resendIn: "أعد الإرسال بعد {time}",
    resent: "أرسلنا رابطًا جديدًا.",
    blockedTitle: "لا يمكن لهذا الحساب تسجيل الدخول هنا",
    blockedBody: "تواصل مع المسؤول، أو جرّب بريدًا آخر.",
    forgotPassword: "نسيت كلمة المرور؟",
    backToSignIn: "العودة لتسجيل الدخول",
  },
};

export interface SignInFlowProps extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The email step. Resolve with the next step (`{ step: "password" }`, `"code"`, `"sso"`, `"register"`), or a failure
   * (`{ error, fieldErrors }`) to stay on the email step. Resolving with nothing goes to the default step.
   * Optional: without it every address goes to the default step, the password step when `onPassword` is set,
   * otherwise the code step (email-only, passwordless sign-in through `onRequestCode` and `onCode`).
   */
  onIdentify?: (email: string) => Promise<SignInNext | AuthSubmitResult> | SignInNext | AuthSubmitResult;
  /** The password step. Resolve with nothing on success, or `{ twoFactor: true }` to ask for a second factor. */
  onPassword?: (values: { email: string; password: string; remember: boolean }) => Promise<SignInPasswordResult> | SignInPasswordResult;
  /** The two-factor step after a password, with `TwoFactorChallenge`. */
  onTwoFactor?: (values: TwoFactorValues & { email: string }) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Passkey as the second factor. Shows "Use a passkey" on the two-factor step. */
  onTwoFactorPasskey?: () => void | Promise<unknown>;
  /**
   * Sends a one-time sign-in link. Adds "Email me a sign-in link" to the password step and powers "Send the link again".
   * Without `onPassword` and `onRequestCode` it is the default step: every address gets a link.
   */
  onMagicLink?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds before a link or reset email can be sent again. Default 30. */
  resendSeconds?: number;
  /**
   * Sends a reset email. Adds "Forgot password?" to the password step (unless you pass the `forgotPassword` slot),
   * which opens `ForgotPasswordForm` in place with the email filled in. The reset itself happens on the link's page,
   * with `ResetPasswordForm`.
   */
  onForgotPassword?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Sends a one-time code to the email. Adds "Email me a code instead" to the password step and powers "Resend". */
  onRequestCode?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The code step. */
  onCode?: (values: { email: string; code: string }) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The SSO step: redirect to the organisation's identity provider. */
  onSso?: (email: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The register step: go to sign-up with the email filled in. */
  onRegister?: (email: string) => void;
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  /** Shows "Sign in with a passkey" on the email step when the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Passkey autofill (conditional UI) on the email field. */
  onPasskeyAutofill?: (signal: AbortSignal) => void | Promise<unknown>;
  /** Slot beside the password label, usually a "Forgot password?" link. */
  forgotPassword?: ReactNode;
  /** Show "Keep me signed in" on the password step. Default true. */
  showRemember?: boolean;
  defaultEmail?: string;
  /**
   * The method this person used last time: `"passkey"` or an OAuth provider id. It gets a "Last used" badge, so
   * returning people pick the same way in and do not create a second account. Read it from your own cookie.
   */
  lastUsed?: string | null;
  /** Called on every step change, so the page can swap its title. */
  onStepChange?: (step: SignInStep, email: string) => void;
  labels?: Partial<SignInFlowLabels>;
}

/**
 * Identifier-first sign-in. The page starts with only an email field and the provider buttons; the backend then
 * picks the next step for that address: a password, a one-time code, a sign-in link, the organisation's SSO, sign-up,
 * or a "can't sign in here" notice. After a password it can ask for a second factor, and "Forgot password?" opens the
 * reset request in place.
 * Asking for the email first keeps the first screen calm and lets SSO domains skip the password entirely.
 */
export function SignInFlow({
  onIdentify,
  onPassword,
  onTwoFactor,
  onTwoFactorPasskey,
  onMagicLink,
  resendSeconds = 30,
  onForgotPassword,
  onRequestCode,
  onCode,
  onSso,
  onRegister,
  oauthProviders,
  onOAuth,
  onPasskey,
  onPasskeyAutofill,
  forgotPassword,
  showRemember = true,
  defaultEmail = "",
  lastUsed,
  onStepChange,
  labels: labelsProp,
  className,
  ...props
}: SignInFlowProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const [step, setStepState] = useState<SignInStep>("email");
  const [next, setNext] = useState<SignInNext | null>(null);
  const [twoFactor, setTwoFactor] = useState<{ length?: number }>({});
  const [email, setEmail] = useState(defaultEmail);
  const [moved, setMoved] = useState(false);
  const stepChange = useRef(onStepChange);
  stepChange.current = onStepChange;
  const move = (to: SignInStep, address = email) => {
    setMoved(true);
    setStepState(to);
    stepChange.current?.(to, address);
  };
  const go = (to: SignInNext | null, address = email) => {
    setNext(to);
    move(to ? to.step : "email", address);
  };
  const sendLink = async (address: string) => {
    const failure = await onMagicLink?.(address);
    if (!failure || (!failure.error && !failure.fieldErrors)) go({ step: "link-sent" }, address);
    return failure;
  };
  const allowed = (alt: SignInAlternative) => next?.step !== "password" || !next.alternatives || next.alternatives.includes(alt);

  return (
    <div data-slot="sign-in-flow" data-step={step} data-moved={moved ? "" : undefined} className={cn("flex w-full flex-col", className)} {...props}>
      {/* The key replays the entrance on every step, so a step change reads as a move forward, not a flicker. */}
      <div key={step} data-slot="sign-in-flow-step" className="flex flex-col gap-4">
        {step === "email" ? (
          <EmailStep
            t={t}
            email={email}
            setEmail={setEmail}
            onIdentify={onIdentify}
            fallback={
              onPassword || (!onRequestCode && !onMagicLink)
                ? () => ({ step: "password" })
                : onRequestCode
                  ? async (address) => {
                      const failure = await onRequestCode(address);
                      return failure || { step: "code" };
                    }
                  : async (address) => {
                      const failure = await onMagicLink?.(address);
                      return failure || { step: "link-sent" };
                    }
            }
            onNext={(n, address) => go(n, address)}
            oauthProviders={oauthProviders}
            onOAuth={onOAuth}
            onPasskey={onPasskey}
            onPasskeyAutofill={onPasskeyAutofill}
            lastUsed={lastUsed}
          />
        ) : step === "forgot" ? (
          <div data-slot="sign-in-flow-forgot" className="flex flex-col gap-4">
            <ForgotPasswordForm defaultEmail={email} resendSeconds={resendSeconds} onSubmit={(v) => onForgotPassword?.(v.email)} />
            <Button type="button" variant="ghost" size="lg" onClick={() => move("password")}>
              <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
              {t.backToSignIn}
            </Button>
          </div>
        ) : (
          <>
            <Identity email={email} change={t.change} onChange={() => go(null)} />
            {step === "password" ? (
              <PasswordStep
                t={t}
                email={email}
                onPassword={onPassword}
                forgotPassword={
                  forgotPassword ??
                  (onForgotPassword ? (
                    <Button type="button" variant="link" size="sm" onClick={() => move("forgot")} data-slot="sign-in-flow-forgot-link">
                      {t.forgotPassword}
                    </Button>
                  ) : null)
                }
                showRemember={showRemember}
                onTwoFactor={(challenge) => {
                  setTwoFactor({ length: challenge.length });
                  move("two-factor");
                }}
                onMagicLink={onMagicLink && allowed("magic-link") ? () => sendLink(email) : undefined}
                onUseCode={
                  onRequestCode && allowed("code")
                    ? async () => {
                        const failure = await onRequestCode(email);
                        if (!failure) go({ step: "code" });
                        return failure;
                      }
                    : undefined
                }
              />
            ) : null}
            {step === "code" ? (
              <VerifyOtpForm
                destination={email}
                channel="email"
                length={next?.step === "code" ? next.length : undefined}
                onSubmit={(v) => onCode?.({ email, code: v.code })}
                onResend={onRequestCode ? () => onRequestCode(email) : undefined}
              />
            ) : null}
            {step === "two-factor" ? (
              <TwoFactorChallenge length={twoFactor.length} onPasskey={onTwoFactorPasskey} onSubmit={(v) => onTwoFactor?.({ ...v, email })} />
            ) : null}
            {step === "link-sent" ? <LinkSentStep t={t} email={email} seconds={resendSeconds} onResend={onMagicLink ? () => onMagicLink(email) : undefined} /> : null}
            {step === "blocked" ? (
              <div data-slot="sign-in-flow-blocked" className="flex flex-col gap-4">
                <Notice icon={<ShieldOff aria-hidden />} title={t.blockedTitle} body={(next?.step === "blocked" && next.message) || t.blockedBody} />
                <Button type="button" variant="secondary" size="lg" onClick={() => go(null)}>
                  {t.otherEmail}
                </Button>
              </div>
            ) : null}
            {step === "sso" ? <SsoStep t={t} email={email} connection={next?.step === "sso" ? next.connection : undefined} onSso={onSso} /> : null}
            {step === "register" ? (
              <div data-slot="sign-in-flow-register" className="flex flex-col gap-4">
                <Notice icon={<UserPlus aria-hidden />} title={t.registerTitle} body={t.registerBody} />
                <Button type="button" variant="primary" size="lg" onClick={() => onRegister?.(email)}>
                  {t.register}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => go(null)}>
                  {t.otherEmail}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

type Strings = SignInFlowLabels;

function EmailStep({
  t,
  email,
  setEmail,
  onIdentify,
  fallback,
  onNext,
  oauthProviders,
  onOAuth,
  onPasskey,
  onPasskeyAutofill,
  lastUsed,
}: {
  t: Strings;
  email: string;
  setEmail: (v: string) => void;
  onIdentify: SignInFlowProps["onIdentify"];
  /** The step for an address when `onIdentify` is missing or resolves with nothing. */
  fallback: (email: string) => SignInNext | AuthSubmitFailure | Promise<SignInNext | AuthSubmitFailure>;
  onNext: (next: SignInNext, email: string) => void;
  oauthProviders?: OAuthProvider[];
  onOAuth?: (id: string) => void | Promise<unknown>;
  onPasskey?: () => void | Promise<unknown>;
  onPasskeyAutofill?: (signal: AbortSignal) => void | Promise<unknown>;
  lastUsed?: string | null;
}) {
  const passkeySupported = usePasskeySupport();
  const withPasskey = Boolean(onPasskey) && passkeySupported;
  useConditionalPasskey(withPasskey ? onPasskeyAutofill : undefined);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const form = useAuthForm<{ email: string }, "email">({
    fallbackError: t.failed,
    validate: (v) => ({ email: v.email ? (isEmail(v.email) ? undefined : t.emailInvalid) : t.emailRequired }),
    onSubmit: async (v) => {
      const result = (await onIdentify?.(v.email)) || (await fallback(v.email));
      if ("step" in result) {
        onNext(result, v.email);
        return;
      }
      return result;
    },
  });
  const fe = form.fieldErrors;
  const busy = form.pending || passkeyPending;
  const hasAlternatives = withPasskey || Boolean(oauthProviders?.length);

  return (
    <>
      <form
        ref={form.formRef}
        noValidate
        data-slot="sign-in-flow-email"
        aria-busy={form.pending || undefined}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void form.submit({ email: email.trim() });
        }}
      >
        <AuthErrorSummary ref={form.summaryRef} error={form.error} fieldErrors={fe} fieldLabels={{ email: t.email }} title={t.errorTitle} onFocusField={form.focusField} />
        <Field name="email" invalid={Boolean(fe.email)}>
          <FieldLabel>{t.email}</FieldLabel>
          <Input
            type="email"
            name="email"
            ltr
            autoFocus
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
        <Button type="submit" variant="primary" size="lg" loading={form.pending} disabled={passkeyPending}>
          {t.continue}
        </Button>
      </form>
      {hasAlternatives ? <OAuthDivider>{t.divider}</OAuthDivider> : null}
      {oauthProviders?.length ? <OAuthButtons providers={oauthProviders} intent="continue" onSelect={(id) => onOAuth?.(id)} disabled={busy} lastUsed={lastUsed} labels={{ lastUsed: t.lastUsed }} /> : null}
      {withPasskey ? (
        <Button
          type="button"
          variant="secondary"
          loading={passkeyPending}
          disabled={form.pending}
          data-slot="sign-in-flow-passkey"
          className="relative"
          onClick={async () => {
            setPasskeyPending(true);
            try {
              await onPasskey?.();
            } finally {
              setPasskeyPending(false);
            }
          }}
        >
          <KeyRound aria-hidden="true" />
          {t.passkey}
          {lastUsed === "passkey" ? <LastUsed>{t.lastUsed}</LastUsed> : null}
        </Button>
      ) : null}
    </>
  );
}

/** The address being signed in, with a way back. Keeps later steps anchored to who is signing in. */
function Identity({ email, change, onChange }: { email: string; change: string; onChange: () => void }) {
  return (
    <div data-slot="sign-in-flow-identity" className="flex items-center gap-2 rounded-control border border-border bg-muted/60 py-1 ps-3 pe-1">
      <Mail aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <bdi dir="ltr" className="min-w-0 flex-1 truncate text-start text-body-sm text-foreground">
        {email}
      </bdi>
      <Button type="button" variant="ghost" size="sm" onClick={onChange}>
        <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
        {change}
      </Button>
    </div>
  );
}

function PasswordStep({
  t,
  email,
  onPassword,
  forgotPassword,
  showRemember,
  onTwoFactor,
  onMagicLink,
  onUseCode,
}: {
  t: Strings;
  email: string;
  onPassword?: SignInFlowProps["onPassword"];
  forgotPassword?: ReactNode;
  showRemember: boolean;
  onTwoFactor: (challenge: { length?: number }) => void;
  onMagicLink?: () => Promise<AuthSubmitResult>;
  onUseCode?: () => Promise<AuthSubmitResult>;
}) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [codePending, setCodePending] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [caps, setCaps] = useState(false);
  const readCaps = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState("CapsLock"));
  const form = useAuthForm<{ password: string }, "password">({
    fallbackError: t.failed,
    validate: (v) => ({ password: v.password ? undefined : t.passwordRequired }),
    onSubmit: async (v) => {
      const result = await onPassword?.({ email, password: v.password, remember });
      if (result && "twoFactor" in result) {
        onTwoFactor(result);
        return;
      }
      return result;
    },
  });
  const alternative = async (run: () => Promise<AuthSubmitResult>, setPending: (v: boolean) => void) => {
    setPending(true);
    try {
      const failure = await run();
      if (failure) form.setError(failure.error ?? t.failed);
    } catch {
      form.setError(t.failed);
    } finally {
      setPending(false);
    }
  };
  const altPending = codePending || linkPending;
  const fe = form.fieldErrors;
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="sign-in-flow-password"
      aria-busy={form.pending || undefined}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ password });
      }}
    >
      {/* Password managers pair the saved password with this username. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <AuthErrorSummary ref={form.summaryRef} error={form.error} fieldErrors={fe} fieldLabels={{ password: t.password }} title={t.errorTitle} onFocusField={form.focusField} />
      <Field name="password" invalid={Boolean(fe.password)}>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>{t.password}</FieldLabel>
          {forgotPassword ? <span className="text-caption">{forgotPassword}</span> : null}
        </div>
        <PasswordInput
          ref={input}
          name="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={fe.password ? true : undefined}
          onKeyDown={readCaps}
          onKeyUp={readCaps}
          onBlur={() => setCaps(false)}
          onChange={(e) => {
            setPassword(e.target.value);
            form.clear("password");
          }}
        />
        {fe.password ? <FieldError match>{fe.password}</FieldError> : null}
        {/* Always in the DOM, so screen readers hear the warning when it appears. */}
        <p data-slot="sign-in-flow-caps" role="status" className="empty:hidden flex items-center gap-1.5 text-caption text-nq-warning-text">
          {caps ? (
            <>
              <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
              {t.capsLock}
            </>
          ) : null}
        </p>
      </Field>
      {showRemember ? (
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Checkbox name="remember" checked={remember} onCheckedChange={(checked) => setRemember(checked)} />
          {t.remember}
        </label>
      ) : null}
      <Button type="submit" variant="primary" size="lg" loading={form.pending} disabled={altPending}>
        {t.signIn}
      </Button>
      {onMagicLink ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          loading={linkPending}
          disabled={form.pending || codePending}
          data-slot="sign-in-flow-magic-link"
          onClick={() => alternative(onMagicLink, setLinkPending)}
        >
          <Link2 aria-hidden />
          {t.magicLink}
        </Button>
      ) : null}
      {onUseCode ? (
        <Button type="button" variant="ghost" size="lg" loading={codePending} disabled={form.pending || linkPending} onClick={() => alternative(onUseCode, setCodePending)}>
          <Mail aria-hidden />
          {t.useCode}
        </Button>
      ) : null}
    </form>
  );
}

function SsoStep({ t, email, connection, onSso }: { t: Strings; email: string; connection?: string; onSso?: SignInFlowProps["onSso"] }) {
  const form = useAuthForm<{ email: string }>({ fallbackError: t.failed, onSubmit: (v) => onSso?.(v.email) });
  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="sign-in-flow-sso"
      aria-busy={form.pending || undefined}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ email });
      }}
    >
      <AuthErrorSummary ref={form.summaryRef} error={form.error} fieldErrors={form.fieldErrors} title={t.errorTitle} />
      <Notice icon={<Building2 aria-hidden />} title={t.ssoTitle} body={t.ssoBody} />
      <Button type="submit" variant="primary" size="lg" loading={form.pending} autoFocus>
        {connection ? t.ssoWith.replace("{connection}", connection) : t.ssoContinue}
      </Button>
    </form>
  );
}

function LinkSentStep({ t, email, seconds, onResend }: { t: Strings; email: string; seconds: number; onResend?: () => Promise<AuthSubmitResult> | AuthSubmitResult }) {
  const cooldown = useCooldown(seconds);
  const [state, setState] = useState<{ pending: boolean; error?: string; done?: boolean }>({ pending: false });
  const heading = useRef<HTMLParagraphElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const [before = "", after = ""] = t.linkSentBody.split("{email}");
  const resend = async () => {
    if (!onResend || cooldown.remaining > 0 || state.pending) return;
    setState({ pending: true });
    try {
      const result = await onResend();
      if (result?.error) setState({ pending: false, error: result.error });
      else {
        setState({ pending: false, done: true });
        cooldown.start(seconds);
      }
    } catch {
      setState({ pending: false, error: t.failed });
    }
  };
  return (
    <div data-slot="sign-in-flow-link-sent" className="flex flex-col gap-4">
      <div role="status" className="flex gap-3 rounded-card border border-border bg-muted/50 p-4">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text [&_svg]:size-4">
          <MailCheck aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p ref={heading} tabIndex={-1} className="text-label text-foreground outline-none">
            {t.linkSentTitle}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {before}
            <bdi dir="ltr" className="font-medium text-foreground">
              {email}
            </bdi>
            {after}
          </p>
        </div>
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <span role="status" className="sr-only">
        {state.done && cooldown.remaining > 0 ? t.resent : ""}
      </span>
      {onResend ? (
        <Button type="button" variant="secondary" size="lg" loading={state.pending} disabled={cooldown.remaining > 0} onClick={resend} data-slot="sign-in-flow-resend">
          {cooldown.remaining > 0 ? t.resendIn.replace("{time}", formatCountdown(cooldown.remaining)) : t.resend}
        </Button>
      ) : null}
    </div>
  );
}

function Notice({ icon, title, body }: { icon: ReactNode; title: ReactNode; body: ReactNode }) {
  return (
    <div data-slot="sign-in-flow-notice" className="flex gap-3 rounded-card border border-border bg-muted/50 p-4">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card text-foreground [&_svg]:size-4">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-label text-foreground">{title}</p>
        <p className="text-body-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
