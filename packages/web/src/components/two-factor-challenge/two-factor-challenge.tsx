"use client";

import { KeyRound } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { type AuthSubmitResult, useAuthForm, useAuthLocale, usePasskeySupport } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { OtpInput } from "../otp-input";

export type TwoFactorMethod = "totp" | "recovery";

export interface TwoFactorValues {
  code: string;
  method: TwoFactorMethod;
  /** The "Trust this device" checkbox. */
  trustDevice: boolean;
}

export interface TwoFactorChallengeLabels {
  totpDescription: string;
  recoveryDescription: string;
  totpGroup: string;
  /** Use `{index}` and `{length}`. */
  box: string;
  recoveryLabel: string;
  recoveryPlaceholder: string;
  trust: string;
  submit: string;
  useRecovery: string;
  useTotp: string;
  usePasskey: string;
  incomplete: string;
  recoveryRequired: string;
  failed: string;
}

const STRINGS: Record<"en" | "ar", TwoFactorChallengeLabels> = {
  en: {
    totpDescription: "Open your authenticator app and enter the {length}-digit code.",
    recoveryDescription: "Enter one of the recovery codes you saved when you turned on two-step verification. Each code works once.",
    totpGroup: "Authenticator code",
    box: "Digit {index} of {length}",
    recoveryLabel: "Recovery code",
    recoveryPlaceholder: "xxxx-xxxx",
    trust: "Trust this device for 30 days",
    submit: "Verify",
    useRecovery: "Use a recovery code instead",
    useTotp: "Use your authenticator app instead",
    usePasskey: "Use a passkey instead",
    incomplete: "Enter all {length} digits.",
    recoveryRequired: "Enter a recovery code.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    totpDescription: "افتح تطبيق المصادقة وأدخل الرمز المكوّن من {length} أرقام.",
    recoveryDescription: "أدخل أحد رموز الاسترداد التي حفظتها عند تفعيل التحقق بخطوتين. كل رمز يعمل مرة واحدة.",
    totpGroup: "رمز تطبيق المصادقة",
    box: "الخانة {index} من {length}",
    recoveryLabel: "رمز الاسترداد",
    recoveryPlaceholder: "xxxx-xxxx",
    trust: "الوثوق بهذا الجهاز لمدة 30 يومًا",
    submit: "تحقّق",
    useRecovery: "استخدم رمز استرداد بدلًا من ذلك",
    useTotp: "استخدم تطبيق المصادقة بدلًا من ذلك",
    usePasskey: "استخدم مفتاح مرور بدلًا من ذلك",
    incomplete: "أدخل الأرقام الـ {length} كاملة.",
    recoveryRequired: "أدخل رمز استرداد.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export interface TwoFactorChallengeProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Resolve with nothing on success, or `{ error }` for a wrong code (the input clears and refocuses). */
  onSubmit: (values: TwoFactorValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows "Use a passkey instead" when set and the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Which method to start on. Default `totp`. */
  defaultMethod?: TwoFactorMethod;
  /** Show the "Trust this device" checkbox. Default true. */
  showTrustDevice?: boolean;
  /** Authenticator code length. Default 6. */
  length?: number;
  /** A slot under the actions, such as "Back to sign in". */
  footer?: ReactNode;
  labels?: Partial<TwoFactorChallengeLabels>;
}

/**
 * The second step of sign-in: an authenticator code (auto-submits on the last digit), a switch to a
 * one-time recovery code, a "trust this device" checkbox and an optional passkey alternative.
 */
export function TwoFactorChallenge({
  onSubmit,
  onPasskey,
  defaultMethod = "totp",
  showTrustDevice = true,
  length = 6,
  footer,
  labels: labelsProp,
  className,
  ...props
}: TwoFactorChallengeProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
  const [method, setMethod] = useState<TwoFactorMethod>(defaultMethod);
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const passkeySupported = usePasskeySupport();
  const messageId = useId();

  const form = useAuthForm<TwoFactorValues, "code">({
    fallbackError: t.failed,
    validate: (v) => ({
      code:
        v.method === "totp"
          ? v.code.length === length
            ? undefined
            : fill(t.incomplete, { length })
          : v.code.trim()
            ? undefined
            : t.recoveryRequired,
    }),
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
  const message = form.error ?? form.fieldErrors.code;
  const send = (value: string) => void form.submit({ code: value.trim(), method, trustDevice: trust });

  const switchMethod = () => {
    setMethod((m) => (m === "totp" ? "recovery" : "totp"));
    setCode("");
    form.setError(undefined);
    form.setFieldErrors({});
  };

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
      data-slot="two-factor-challenge"
      data-method={method}
      aria-busy={form.pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        send(code);
      }}
    >
      <p className="text-body-sm text-muted-foreground">{method === "totp" ? fill(t.totpDescription, { length }) : t.recoveryDescription}</p>
      {method === "totp" ? (
        <div className="flex flex-col gap-2">
          <OtpInput
            key="totp"
            name="code"
            length={length}
            autoFocus
            value={code}
            invalid={Boolean(message)}
            aria-label={t.totpGroup}
            aria-describedby={message ? messageId : undefined}
            getBoxLabel={(i, n) => fill(t.box, { index: i + 1, length: n })}
            onValueChange={(value) => {
              setCode(value);
              form.clear("code");
              if (form.error) form.setError(undefined);
            }}
            onComplete={(value) => send(value)}
            className="self-center"
          />
          <p id={messageId} role="alert" className={cn("text-center text-caption text-nq-danger-text", !message && "sr-only")}>
            {message}
          </p>
        </div>
      ) : (
        <Field name="code" invalid={Boolean(message)}>
          <FieldLabel>{t.recoveryLabel}</FieldLabel>
          <Input
            key="recovery"
            name="code"
            ltr
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t.recoveryPlaceholder}
            className="font-mono"
            value={code}
            aria-invalid={message ? true : undefined}
            onChange={(e) => {
              setCode(e.target.value);
              form.clear("code");
              if (form.error) form.setError(undefined);
            }}
          />
          {message ? <FieldError match>{message}</FieldError> : null}
        </Field>
      )}
      {showTrustDevice ? (
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Checkbox name="trustDevice" checked={trust} onCheckedChange={(checked) => setTrust(checked)} />
          {t.trust}
        </label>
      ) : null}
      <Button type="submit" variant="primary" size="lg" loading={form.pending} disabled={passkeyPending}>
        {t.submit}
      </Button>
      <div className="flex flex-col items-center gap-1">
        <Button type="button" variant="link" size="sm" onClick={switchMethod} disabled={form.pending}>
          {method === "totp" ? t.useRecovery : t.useTotp}
        </Button>
        {onPasskey && passkeySupported ? (
          <Button type="button" variant="link" size="sm" loading={passkeyPending} disabled={form.pending} onClick={passkey} data-slot="two-factor-passkey">
            <KeyRound aria-hidden="true" />
            {t.usePasskey}
          </Button>
        ) : null}
      </div>
      {footer ? <div className="text-center text-body-sm">{footer}</div> : null}
    </form>
  );
}
