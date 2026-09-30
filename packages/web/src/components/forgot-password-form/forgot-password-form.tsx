"use client";

import { MailCheck } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { AuthErrorSummary, type AuthSubmitResult, formatCountdown, isEmail, useAuthForm, useAuthLocale, useCooldown } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Field, FieldError, FieldLabel, Input } from "../field";

export interface ForgotPasswordValues {
  email: string;
}

export interface ForgotPasswordFormLabels {
  email: string;
  emailPlaceholder: string;
  submit: string;
  emailRequired: string;
  emailInvalid: string;
  errorTitle: string;
  failed: string;
  sentTitle: string;
  /** Use `{email}` where the address goes. */
  sentBody: string;
  resend: string;
  /** Use `{time}` for the countdown, e.g. "Resend in 0:27". */
  resendIn: string;
  resent: string;
  changeEmail: string;
}

const STRINGS: Record<"en" | "ar", ForgotPasswordFormLabels> = {
  en: {
    email: "Email",
    emailPlaceholder: "you@example.com",
    submit: "Send reset link",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    errorTitle: "Fix this to continue",
    failed: "Something went wrong. Try again.",
    sentTitle: "Check your inbox",
    sentBody: "If an account exists for {email}, we sent a link to reset the password.",
    resend: "Resend email",
    resendIn: "Resend in {time}",
    resent: "We sent the email again.",
    changeEmail: "Use a different email",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    submit: "إرسال رابط إعادة التعيين",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    errorTitle: "صحّح هذا للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    sentTitle: "تحقق من بريدك",
    sentBody: "إن كان هناك حساب مرتبط بـ {email} فقد أرسلنا رابطًا لإعادة تعيين كلمة المرور.",
    resend: "إعادة إرسال الرسالة",
    resendIn: "إعادة الإرسال بعد {time}",
    resent: "أرسلنا الرسالة مرة أخرى.",
    changeEmail: "استخدام بريد آخر",
  },
};

export interface ForgotPasswordFormProps extends Omit<ComponentProps<"div">, "onSubmit" | "children"> {
  /** Called with the email. Resolve with nothing on success (the form then shows "Check your inbox"). */
  onSubmit: (values: ForgotPasswordValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Called by "Resend email" with the same address. Default: `onSubmit` again. */
  onResend?: (values: ForgotPasswordValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds before the email can be resent. Default 30. */
  resendSeconds?: number;
  defaultEmail?: string;
  labels?: Partial<ForgotPasswordFormLabels>;
}

/**
 * Ask for an email, then show "Check your inbox" with a resend button on a cooldown. The response never
 * says whether the address has an account, so it does not leak which emails are registered.
 */
export function ForgotPasswordForm({ onSubmit, onResend, resendSeconds = 30, defaultEmail = "", labels: labelsProp, className, ...props }: ForgotPasswordFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const [email, setEmail] = useState(defaultEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const cooldown = useCooldown();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [resendState, setResendState] = useState<{ pending: boolean; error?: string; done?: boolean }>({ pending: false });

  const form = useAuthForm<ForgotPasswordValues, "email">({
    fallbackError: t.failed,
    validate: (v) => ({ email: v.email.trim() ? (isEmail(v.email) ? undefined : t.emailInvalid) : t.emailRequired }),
    onSubmit: async (values) => {
      const result = await onSubmit(values);
      if (!result || (!result.error && !result.fieldErrors)) {
        setSentTo(values.email);
        cooldown.start(resendSeconds);
      }
      return result;
    },
  });
  const { fieldErrors: fe, pending } = form;

  useEffect(() => {
    if (sentTo) headingRef.current?.focus();
  }, [sentTo]);

  const resend = async () => {
    if (!sentTo || cooldown.remaining > 0 || resendState.pending) return;
    setResendState({ pending: true });
    try {
      const result = await (onResend ?? onSubmit)({ email: sentTo });
      if (result?.error) setResendState({ pending: false, error: result.error });
      else {
        setResendState({ pending: false, done: true });
        cooldown.start(resendSeconds);
      }
    } catch {
      setResendState({ pending: false, error: t.failed });
    }
  };

  if (sentTo) {
    const [before = "", after = ""] = t.sentBody.split("{email}");
    return (
      <div data-slot="forgot-password-form" data-state="sent" className={cn("flex w-full flex-col gap-4 text-start", className)} {...props}>
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
        <Button type="button" variant="secondary" size="lg" loading={resendState.pending} disabled={cooldown.remaining > 0} onClick={resend} data-slot="forgot-password-resend">
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

  return (
    <div data-slot="forgot-password-form" data-state="idle" className={cn("w-full", className)} {...props}>
      <form
        ref={form.formRef}
        noValidate
        aria-busy={pending || undefined}
        className="flex w-full flex-col gap-4"
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
        <Button type="submit" variant="primary" size="lg" loading={pending}>
          {t.submit}
        </Button>
      </form>
    </div>
  );
}
