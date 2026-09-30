"use client";

import { type ComponentProps, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { type AuthSubmitResult, formatCountdown, useAuthForm, useAuthLocale, useCooldown } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { OtpInput } from "../otp-input";

export interface VerifyOtpValues {
  code: string;
}

export interface VerifyOtpFormLabels {
  /** Use `{length}` and `{destination}`. */
  descriptionEmail: string;
  descriptionSms: string;
  group: string;
  /** Use `{index}` and `{length}`. */
  box: string;
  submit: string;
  noCode: string;
  resend: string;
  /** Use `{time}`. */
  resendIn: string;
  resent: string;
  incomplete: string;
  failed: string;
}

const STRINGS: Record<"en" | "ar", VerifyOtpFormLabels> = {
  en: {
    descriptionEmail: "Enter the {length}-digit code we sent to {destination}.",
    descriptionSms: "Enter the {length}-digit code we texted to {destination}.",
    group: "Verification code",
    box: "Digit {index} of {length}",
    submit: "Verify",
    noCode: "Did not get a code?",
    resend: "Resend code",
    resendIn: "Resend in {time}",
    resent: "We sent a new code.",
    incomplete: "Enter all {length} digits.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    descriptionEmail: "أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه إلى {destination}.",
    descriptionSms: "أدخل الرمز المكوّن من {length} أرقام الذي أرسلناه برسالة نصية إلى {destination}.",
    group: "رمز التحقق",
    box: "الخانة {index} من {length}",
    submit: "تحقّق",
    noCode: "لم يصلك الرمز؟",
    resend: "إعادة إرسال الرمز",
    resendIn: "إعادة الإرسال بعد {time}",
    resent: "أرسلنا رمزًا جديدًا.",
    incomplete: "أدخل الأرقام الـ {length} كاملة.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

/**
 * Hides most of an email or phone number: `fady@example.com` becomes `f•••y@example.com`, `+966501234567`
 * becomes `••••••••••67`. The domain stays visible so people recognise which inbox to open.
 */
export function maskDestination(destination: string, channel: "email" | "sms" = "email"): string {
  const value = destination.trim();
  if (channel === "email" && value.includes("@")) {
    const at = value.lastIndexOf("@");
    const local = value.slice(0, at);
    const domain = value.slice(at);
    return local.length <= 2 ? `${local.slice(0, 1)}•••${domain}` : `${local.slice(0, 1)}•••${local.slice(-1)}${domain}`;
  }
  const digits = value.replace(/[^\d]/g, "");
  return `${"•".repeat(Math.max(4, digits.length - 2))}${digits.slice(-2)}`;
}

export interface VerifyOtpFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** The email address or phone number the code went to. It is masked before it is shown. */
  destination: string;
  channel?: "email" | "sms";
  /** Code length. Default 6. */
  length?: number;
  /** Called with the code. Resolve with `{ error }` for a wrong or expired code (the boxes clear and refocus). */
  onSubmit: (values: VerifyOtpValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Called by "Resend code". Resolve with `{ error }` to show why it failed. Omit to hide the resend button. */
  onResend?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Seconds between resends; also the wait before the first one. Default 30. */
  resendSeconds?: number;
  /** Submit as soon as the last digit is entered. Default true. */
  autoSubmit?: boolean;
  /** A slot under the form, such as "Use a different email". */
  footer?: ReactNode;
  labels?: Partial<VerifyOtpFormLabels>;
}

/**
 * Verify an emailed or texted one-time code. It shows a masked destination, submits when the last digit
 * lands (or on paste), clears and refocuses on a wrong code, and rate-limits the resend button with a countdown.
 */
export function VerifyOtpForm({
  destination,
  channel = "email",
  length = 6,
  onSubmit,
  onResend,
  resendSeconds = 30,
  autoSubmit = true,
  footer,
  labels: labelsProp,
  className,
  ...props
}: VerifyOtpFormProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
  const [code, setCode] = useState("");
  const messageId = useId();
  const cooldown = useCooldown(onResend ? resendSeconds : 0);
  const [resend, setResend] = useState<{ pending: boolean; error?: string; sent?: boolean }>({ pending: false });
  const groupRef = useRef<HTMLDivElement>(null);

  const form = useAuthForm<VerifyOtpValues, "code">({
    fallbackError: t.failed,
    validate: (v) => ({ code: v.code.length === length ? undefined : fill(t.incomplete, { length }) }),
    onSubmit: async (values) => {
      try {
        const result = await onSubmit(values);
        if (result?.error || result?.fieldErrors) setCode("");
        return result;
      } catch (error) {
        setCode("");
        throw error;
      }
    },
  });
  const message = form.error ?? form.fieldErrors.code ?? resend.error;

  const doResend = async () => {
    if (!onResend || cooldown.remaining > 0 || resend.pending) return;
    setResend({ pending: true });
    try {
      const result = await onResend();
      if (result?.error) setResend({ pending: false, error: result.error });
      else {
        setResend({ pending: false, sent: true });
        cooldown.start(resendSeconds);
        setCode("");
        groupRef.current?.querySelector("input")?.focus();
      }
    } catch {
      setResend({ pending: false, error: t.failed });
    }
  };

  const text = fill(channel === "sms" ? t.descriptionSms : t.descriptionEmail, { length, destination: "\u0000" });
  const [before = "", after = ""] = text.split("\u0000");

  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="verify-otp-form"
      aria-busy={form.pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ code });
      }}
    >
      <p className="text-body-sm text-muted-foreground">
        {before}
        <bdi dir="ltr" className="font-medium text-foreground">
          {maskDestination(destination, channel)}
        </bdi>
        {after}
      </p>
      <div className="flex flex-col gap-2">
        <OtpInput
          ref={groupRef}
          name="code"
          length={length}
          autoFocus
          value={code}
          invalid={Boolean(message)}
          aria-label={t.group}
          aria-describedby={message ? messageId : undefined}
          getBoxLabel={(i, n) => fill(t.box, { index: i + 1, length: n })}
          onValueChange={(value) => {
            setCode(value);
            form.clear("code");
            if (form.error) form.setError(undefined);
            if (resend.error) setResend((s) => ({ ...s, error: undefined }));
          }}
          onComplete={(value) => {
            if (autoSubmit) void form.submit({ code: value });
          }}
          className="self-center"
        />
        <p id={messageId} role="alert" className={cn("text-center text-caption text-nq-danger-text", !message && "sr-only")}>
          {message}
        </p>
      </div>
      <Button type="submit" variant="primary" size="lg" loading={form.pending}>
        {t.submit}
      </Button>
      {onResend ? (
        <div className="flex flex-wrap items-center justify-center gap-x-1 text-body-sm text-muted-foreground">
          <span>{t.noCode}</span>
          <Button type="button" variant="link" size="sm" loading={resend.pending} disabled={cooldown.remaining > 0} onClick={doResend} data-slot="verify-otp-resend">
            {cooldown.remaining > 0 ? fill(t.resendIn, { time: formatCountdown(cooldown.remaining) }) : t.resend}
          </Button>
        </div>
      ) : null}
      <span role="status" className="sr-only">
        {resend.sent ? t.resent : ""}
      </span>
      {footer ? <div className="text-center text-body-sm">{footer}</div> : null}
    </form>
  );
}
