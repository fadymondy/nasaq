"use client";

import { Clock, KeyRound } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { AuthErrorSummary, type AuthSubmitResult, useAuthForm, useAuthLocale, usePasskeySupport } from "../auth-layout/auth-utils";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Field, FieldError, FieldLabel } from "../field";
import type { LockUser } from "../lock-screen/lock-screen";
import { OtpInput } from "../otp-input";
import { PasswordInput } from "../password-input";

const STRINGS = {
  en: {
    expired: "Your session expired",
    expiredHint: "For your security we signed you out after a while. Sign in again to pick up where you left off.",
    revoked: "You were signed out",
    revokedHint: "This session was ended from another device or by an admin. Sign in again to continue.",
    passwordChanged: "Your password changed",
    passwordChangedHint: "Sign in with your new password to continue.",
    password: "Password",
    passwordRequired: "Enter your password.",
    codeLabel: "Authenticator code",
    codeRequired: "Enter all 6 digits of the code.",
    box: "Digit {index} of 6",
    submit: "Sign in again",
    passkey: "Use a passkey",
    divider: "or",
    switchAccount: "Use a different account",
    signOut: "Sign out",
    errorTitle: "Fix these to continue",
    failed: "Something went wrong. Try again.",
    lostWork: "Your unsaved changes are kept in this tab.",
  },
  ar: {
    expired: "انتهت جلستك",
    expiredHint: "لأمانك سجّلنا خروجك بعد فترة. سجّل الدخول مرة أخرى لتكمل من حيث توقفت.",
    revoked: "تم تسجيل خروجك",
    revokedHint: "أُنهيت هذه الجلسة من جهاز آخر أو بواسطة مسؤول. سجّل الدخول مرة أخرى للمتابعة.",
    passwordChanged: "تغيّرت كلمة مرورك",
    passwordChangedHint: "سجّل الدخول بكلمة المرور الجديدة للمتابعة.",
    password: "كلمة المرور",
    passwordRequired: "أدخل كلمة المرور.",
    codeLabel: "رمز تطبيق المصادقة",
    codeRequired: "أدخل الأرقام الـ 6 كاملة للرمز.",
    box: "الخانة {index} من 6",
    submit: "سجّل الدخول مرة أخرى",
    passkey: "استخدم مفتاح المرور",
    divider: "أو",
    switchAccount: "استخدم حسابًا آخر",
    signOut: "تسجيل الخروج",
    errorTitle: "أصلح هذه الحقول للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    lostWork: "تغييراتك غير المحفوظة محفوظة في هذا التبويب.",
  },
};

export type SessionExpiredLabels = (typeof STRINGS)["en"];

export type SessionExpiredReason = "expired" | "revoked" | "password-changed";

export interface SessionExpiredValues {
  password: string;
  /** The authenticator code, when `requireCode` is set. */
  code?: string;
}

export interface SessionExpiredProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Who was signed in. The email is not asked again. */
  user: LockUser;
  /** Why the session ended. Default `expired`. */
  reason?: SessionExpiredReason;
  /** Ask for an authenticator code with the password. */
  requireCode?: boolean;
  /** Resolve with nothing once the session is back, or `{ error }` / `{ fieldErrors }`. */
  onSubmit: (values: SessionExpiredValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows the passkey button when the browser supports WebAuthn. */
  onPasskey?: () => void | Promise<unknown>;
  /** Shows "Use a different account". */
  onSwitchAccount?: () => void;
  onSignOut?: () => void;
  /** Tells people their unsaved work is safe (true) or not mentioned (default). */
  keepsWork?: boolean;
  /** Extra content under the buttons. */
  footer?: ReactNode;
  labels?: Partial<SessionExpiredLabels>;
}

/**
 * The re-authentication screen for a session that ended: the same person, one password (and code) or a
 * passkey away from continuing. Put it in an `AuthLayout`, like the other auth forms. It verifies nothing:
 * `onSubmit` does. Use `LockScreen` for a session that is still valid but locked.
 */
export function SessionExpired({ user, reason = "expired", requireCode = false, onSubmit, onPasskey, onSwitchAccount, onSignOut, keepsWork = false, footer, labels: labelsProp, className, ...props }: SessionExpiredProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [passkeyPending, setPasskeyPending] = useState(false);
  const passkeySupported = usePasskeySupport();
  const withPasskey = Boolean(onPasskey) && passkeySupported;

  const form = useAuthForm<SessionExpiredValues, "password" | "code">({
    onSubmit,
    fallbackError: t.failed,
    validate: (v) => ({
      password: v.password ? undefined : t.passwordRequired,
      code: requireCode && (v.code ?? "").length !== 6 ? t.codeRequired : undefined,
    }),
  });
  const { fieldErrors: fe, pending } = form;
  const busy = pending || passkeyPending;
  const title = reason === "revoked" ? t.revoked : reason === "password-changed" ? t.passwordChanged : t.expired;
  const hint = reason === "revoked" ? t.revokedHint : reason === "password-changed" ? t.passwordChangedHint : t.expiredHint;

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
      data-slot="session-expired"
      data-reason={reason}
      aria-busy={pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit({ password, code: requireCode ? code : undefined });
      }}
    >
      <Alert tone="warning" title={title} icon={Clock}>
        {hint}
        {keepsWork ? <span className="mt-1 block">{t.lostWork}</span> : null}
      </Alert>

      <div data-slot="session-expired-user" className="flex items-center gap-3 rounded-control border border-border bg-muted/50 p-3">
        <Avatar name={user.name} src={user.avatar} />
        <div className="flex min-w-0 flex-col text-start">
          <span className="truncate text-label text-foreground">{user.name}</span>
          {user.email ? (
            <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
              {user.email}
            </bdi>
          ) : null}
        </div>
      </div>

      <AuthErrorSummary ref={form.summaryRef} error={form.error} fieldErrors={fe} fieldLabels={{ password: t.password, code: t.codeLabel }} title={t.errorTitle} onFocusField={form.focusField} />
      {/* The account is already known: a hidden username lets password managers fill the right entry. */}
      <input type="text" name="username" autoComplete="username" value={user.email ?? user.name} readOnly hidden />
      <Field name="password" invalid={Boolean(fe.password)}>
        <FieldLabel>{t.password}</FieldLabel>
        <PasswordInput
          name="password"
          autoFocus
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
      {requireCode ? (
        <div className="flex flex-col gap-2">
          <span className="text-label text-foreground">{t.codeLabel}</span>
          <OtpInput
            name="code"
            length={6}
            value={code}
            invalid={Boolean(fe.code)}
            aria-label={t.codeLabel}
            getBoxLabel={(i) => t.box.replace("{index}", String(i + 1))}
            onValueChange={(v) => {
              setCode(v);
              form.clear("code");
            }}
          />
        </div>
      ) : null}
      <Button type="submit" variant="primary" size="lg" loading={pending} disabled={passkeyPending}>
        {t.submit}
      </Button>
      {withPasskey ? (
        <Button type="button" variant="secondary" size="lg" loading={passkeyPending} disabled={pending} onClick={passkey} data-slot="session-expired-passkey">
          <KeyRound aria-hidden="true" />
          {t.passkey}
        </Button>
      ) : null}
      {onSwitchAccount || onSignOut ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onSwitchAccount ? (
            <Button type="button" variant="link" size="sm" disabled={busy} onClick={onSwitchAccount}>
              {t.switchAccount}
            </Button>
          ) : (
            <span />
          )}
          {onSignOut ? (
            <Button type="button" variant="link" size="sm" disabled={busy} onClick={onSignOut}>
              {t.signOut}
            </Button>
          ) : null}
        </div>
      ) : null}
      {footer}
    </form>
  );
}
