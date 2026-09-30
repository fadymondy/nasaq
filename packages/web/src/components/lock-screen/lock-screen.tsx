"use client";

import { BellOff, ChevronDown, Delete, Fingerprint, Hash, KeyRound, LockKeyhole, UserPlus, UserRoundCog } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { type AuthSubmitResult, formatCountdown, useAuthForm, useAuthLocale, useCooldown } from "../auth-layout/auth-utils";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldLabel } from "../field";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { OtpInput } from "../otp-input";
import { PasswordInput } from "../password-input";
import { ProductMark } from "../product-mark";
import { type LockMethod, PIN_KEYS, pinAppend, pinBackspace, registerFailure } from "./lock-model";

const STRINGS = {
  en: {
    lockedTitle: "Locked",
    lockedDescription: "Enter your credentials to continue.",
    idleTitle: "Locked after inactivity",
    idleDescription: "You were away, so we locked the app to protect your data.",
    quietTitle: "Quiet mode is on",
    quietDescription: "Notifications are paused. Enter your PIN to look inside.",
    pinLabel: "PIN",
    pinGroup: "PIN keypad",
    digit: "Digit {digit}",
    backspace: "Delete last digit",
    entered: "{count} of {length} digits entered",
    passwordLabel: "Password",
    codeLabel: "Authenticator code",
    box: "Digit {index} of {length}",
    unlock: "Unlock",
    biometric: "Use biometrics",
    biometricHint: "Use your fingerprint or face to unlock.",
    biometricPrompt: "Waiting for your device",
    passkey: "Use a passkey",
    passkeyHint: "Confirm with the passkey on this device.",
    passkeyPrompt: "Waiting for your passkey",
    usePasskey: "Use a passkey",
    switchAccount: "Switch account",
    switchAccountMenu: "Accounts on this device",
    anotherAccount: "Sign in to another account",
    usePin: "Use PIN",
    usePassword: "Use password",
    useBiometric: "Use biometrics",
    signOut: "Not you? Sign out",
    passwordRequired: "Enter your password.",
    codeRequired: "Enter all {length} digits of the code.",
    wrongPin: "That PIN is not right. {left} tries left.",
    lockout: "Too many attempts. Try again in {time}.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    lockedTitle: "مقفل",
    lockedDescription: "أدخل بياناتك للمتابعة.",
    idleTitle: "أُقفل بعد فترة خمول",
    idleDescription: "كنت بعيدًا، فأقفلنا التطبيق لحماية بياناتك.",
    quietTitle: "الوضع الهادئ مفعّل",
    quietDescription: "الإشعارات متوقفة. أدخل الرقم السري لتصفّح المحتوى.",
    pinLabel: "الرقم السري",
    pinGroup: "لوحة الرقم السري",
    digit: "الرقم {digit}",
    backspace: "حذف آخر رقم",
    entered: "أُدخل {count} من {length} أرقام",
    passwordLabel: "كلمة المرور",
    codeLabel: "رمز تطبيق المصادقة",
    box: "الخانة {index} من {length}",
    unlock: "فتح القفل",
    biometric: "استخدم البصمة أو الوجه",
    biometricHint: "استخدم بصمتك أو وجهك لفتح القفل.",
    biometricPrompt: "بانتظار جهازك",
    passkey: "استخدم مفتاح المرور",
    passkeyHint: "أكّد بمفتاح المرور على هذا الجهاز.",
    passkeyPrompt: "بانتظار مفتاح المرور",
    usePasskey: "استخدم مفتاح المرور",
    switchAccount: "تبديل الحساب",
    switchAccountMenu: "الحسابات على هذا الجهاز",
    anotherAccount: "سجّل الدخول بحساب آخر",
    usePin: "استخدم الرقم السري",
    usePassword: "استخدم كلمة المرور",
    useBiometric: "استخدم البصمة أو الوجه",
    signOut: "لست أنت؟ سجّل الخروج",
    passwordRequired: "أدخل كلمة المرور.",
    codeRequired: "أدخل الأرقام الـ {length} كاملة للرمز.",
    wrongPin: "الرقم السري غير صحيح. تبقّت {left} محاولات.",
    lockout: "محاولات كثيرة. حاول مرة أخرى بعد {time}.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type LockScreenLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface LockUser {
  name: string;
  email?: string;
  avatar?: string;
}

/** What the person entered. `secret` is the PIN or password; empty for biometrics. `code` is the authenticator code, when required. */
export interface LockAttempt {
  method: LockMethod;
  secret: string;
  code?: string;
}

export type LockReason = "locked" | "idle" | "quiet";

export interface LockScreenProps extends Omit<ComponentProps<"div">, "children"> {
  user: LockUser;
  /** Ways to unlock, in the order offered. Default `["pin"]`. */
  methods?: LockMethod[];
  /** Which method to open on. Default: the first of `methods`. */
  defaultMethod?: LockMethod;
  /** PIN digits. Default 6. */
  pinLength?: number;
  /** Ask for an authenticator code with the password. */
  requireCode?: boolean;
  /** Why the screen is up. `quiet` is the quiet-mode gate: notifications are paused until you unlock. Default `locked`. */
  reason?: LockReason;
  /** Resolve with nothing to unlock, or `{ error }` for a wrong secret. The host owns verification and session. */
  onUnlock: (attempt: LockAttempt) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows "Not you? Sign out". */
  onSignOut?: () => void;
  /** Other accounts signed in on this device, listed under "Switch account". */
  accounts?: LockUser[];
  /** Shows "Switch account". Called with the chosen account, or `null` for "Sign in to another account". */
  onSwitchAccount?: (account: LockUser | null) => void;
  /** The host's official mark above the user. Default: the provider brand's `ProductMark`. Pass `null` to hide it. */
  mark?: ReactNode;
  /** A full-bleed backdrop (an image, a gradient). It sits under a readable scrim. */
  wallpaper?: ReactNode;
  /** Show the big clock and date. Default true. */
  showClock?: boolean;
  /** Freeze the clock at this time (docs, tests). Default: now, ticking. */
  now?: Date | number;
  /** Wrong PINs or passwords in a row before a timed lockout. Default 5. */
  maxAttempts?: number;
  /** Seconds of lockout. Default 30. */
  lockoutSeconds?: number;
  /** Small print at the bottom. */
  footer?: ReactNode;
  labels?: Partial<LockScreenLabels>;
}

/** A clock that ticks each second, or stays on `frozen`. */
function useClock(frozen?: Date | number) {
  const [now, setNow] = useState<number | null>(frozen === undefined ? null : new Date(frozen).getTime());
  useEffect(() => {
    if (frozen !== undefined) {
      setNow(new Date(frozen).getTime());
      return;
    }
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [frozen]);
  return now;
}

/**
 * An OS-style lock screen: a wallpaper with the clock, the person's avatar and one way to unlock at a
 * time: PIN keypad, password (with an optional authenticator code) or biometrics. It counts wrong
 * attempts and locks out for a while. It verifies nothing itself; `onUnlock` does.
 */
export function LockScreen({
  user,
  methods = ["pin"],
  defaultMethod,
  pinLength = 6,
  requireCode = false,
  reason = "locked",
  onUnlock,
  onSignOut,
  accounts,
  onSwitchAccount,
  mark,
  wallpaper,
  showClock = true,
  now: frozenNow,
  maxAttempts = 5,
  lockoutSeconds = 30,
  footer,
  labels: labelsProp,
  className,
  ...props
}: LockScreenProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [method, setMethod] = useState<LockMethod>(defaultMethod && methods.includes(defaultMethod) ? defaultMethod : (methods[0] ?? "pin"));
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [failures, setFailures] = useState(0);
  const cooldown = useCooldown(0);
  const locked = cooldown.remaining > 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const clock = useClock(frozenNow);

  const form = useAuthForm<LockAttempt, "secret" | "code">({
    fallbackError: t.failed,
    validate: (v) => ({
      secret: v.method === "password" && !v.secret ? t.passwordRequired : undefined,
      code: v.method === "password" && requireCode && (v.code ?? "").length !== 6 ? fill(t.codeRequired, { length: 6 }) : undefined,
    }),
    onSubmit: async (attempt) => {
      let result: AuthSubmitResult;
      try {
        result = await onUnlock(attempt);
      } catch (error) {
        setPin("");
        throw error;
      }
      if (result?.error || result?.fieldErrors) {
        setPin("");
        setPassword("");
        setCode("");
        if (attempt.method !== "biometric") {
          const next = registerFailure(failures, maxAttempts);
          setFailures(next.failures);
          if (next.lockedOut) {
            cooldown.start(lockoutSeconds);
            return { error: fill(t.lockout, { time: formatCountdown(lockoutSeconds) }) };
          }
          if (attempt.method === "pin" && !result.error) return { error: fill(t.wrongPin, { left: maxAttempts - next.failures }) };
        }
      }
      return result;
    },
  });

  const switchMethod = (next: LockMethod) => {
    setMethod(next);
    setPin("");
    setPassword("");
    setCode("");
    form.setError(undefined);
    form.setFieldErrors({});
  };

  useEffect(() => {
    if (!locked) form.setError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const pressKey = (key: string) => {
    if (form.pending || locked) return;
    if (form.error) form.setError(undefined);
    const next = pinAppend(pin, key, pinLength);
    setPin(next);
    if (next.length === pinLength && next !== pin) void form.submit({ method: "pin", secret: next });
  };
  const backspace = () => {
    if (form.pending || locked) return;
    setPin(pinBackspace(pin));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (method !== "pin" || event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      pressKey(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      backspace();
    }
  };

  useEffect(() => {
    if (method === "pin") rootRef.current?.querySelector<HTMLElement>('[data-slot="lock-screen-pad"]')?.focus({ preventScroll: true });
  }, [method]);

  const title = reason === "quiet" ? t.quietTitle : reason === "idle" ? t.idleTitle : t.lockedTitle;
  const description = reason === "quiet" ? t.quietDescription : reason === "idle" ? t.idleDescription : t.lockedDescription;
  const message = locked ? fill(t.lockout, { time: formatCountdown(cooldown.remaining) }) : (form.error ?? form.fieldErrors.secret ?? form.fieldErrors.code);
  const markNode = mark === undefined ? <ProductMark size={28} title="" /> : mark;
  const others = methods.filter((m) => m !== method);
  const otherLabel: Record<LockMethod, string> = { pin: t.usePin, password: t.usePassword, biometric: t.useBiometric, passkey: t.usePasskey };
  const otherIcon: Record<LockMethod, ReactNode> = { pin: <Hash aria-hidden="true" />, password: <KeyRound aria-hidden="true" />, biometric: <Fingerprint aria-hidden="true" />, passkey: <UserRoundCog aria-hidden="true" /> };

  const time = clock === null ? "" : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: false, numberingSystem: "latn" }).format(clock);
  const date = clock === null ? "" : new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", numberingSystem: "latn" }).format(clock);

  return (
    <div
      ref={rootRef}
      data-slot="lock-screen"
      data-reason={reason}
      data-method={method}
      aria-busy={form.pending || undefined}
      className={cn("relative isolate flex min-h-dvh flex-col overflow-hidden bg-muted text-foreground", className)}
      {...props}
    >
      <div aria-hidden="true" data-slot="lock-screen-wallpaper" className="absolute inset-0 -z-10">
        {wallpaper}
        <div className="absolute inset-0 bg-background/55 backdrop-blur-sm" />
      </div>

      {showClock ? (
        <div data-slot="lock-screen-clock" className="flex flex-col items-center gap-1 px-4 pt-10 text-center sm:pt-14">
          <time dir="ltr" className="text-[clamp(3rem,10vw,5rem)] leading-none font-light tabular-nums text-foreground">
            {time || " "}
          </time>
          <p className="text-body text-muted-foreground first-letter:uppercase">{date || " "}</p>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
        {markNode ? <div data-slot="lock-screen-mark">{markNode}</div> : null}
        <div className="flex flex-col items-center gap-2">
          <Avatar name={user.name} src={user.avatar} size="lg" />
          <div className="flex flex-col gap-0.5">
            <h1 className="text-h3 text-foreground">{user.name}</h1>
            {user.email ? (
              <p dir="ltr" className="text-caption text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="inline-flex items-center gap-1.5 text-label text-foreground">
            {reason === "quiet" ? <BellOff aria-hidden="true" className="size-4" /> : <LockKeyhole aria-hidden="true" className="size-4" />}
            {title}
          </p>
          <p className="text-body-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex w-full flex-col items-center gap-4" onKeyDown={onKeyDown}>
          {method === "pin" ? (
            <PinEntry
              pin={pin}
              length={pinLength}
              disabled={form.pending || locked}
              invalid={Boolean(message)}
              labels={t}
              onKey={pressKey}
              onBackspace={backspace}
            />
          ) : null}

          {method === "password" ? (
            <form
              ref={form.formRef}
              noValidate
              data-slot="lock-screen-password"
              className="flex w-full flex-col gap-3 text-start"
              onSubmit={(e) => {
                e.preventDefault();
                void form.submit({ method: "password", secret: password, code: requireCode ? code : undefined });
              }}
            >
              <Field name="secret" invalid={Boolean(form.fieldErrors.secret ?? form.error)}>
                <FieldLabel>{t.passwordLabel}</FieldLabel>
                <PasswordInput
                  name="secret"
                  autoFocus
                  autoComplete="current-password"
                  disabled={locked}
                  value={password}
                  aria-invalid={form.fieldErrors.secret || form.error ? true : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    form.clear("secret");
                    if (form.error) form.setError(undefined);
                  }}
                />
              </Field>
              {requireCode ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="self-start text-label text-foreground">{t.codeLabel}</span>
                  <OtpInput
                    name="code"
                    length={6}
                    value={code}
                    disabled={locked}
                    invalid={Boolean(form.fieldErrors.code)}
                    aria-label={t.codeLabel}
                    getBoxLabel={(i, n) => fill(t.box, { index: i + 1, length: n })}
                    onValueChange={(v) => {
                      setCode(v);
                      form.clear("code");
                    }}
                  />
                </div>
              ) : null}
              <Button type="submit" variant="primary" size="lg" loading={form.pending} disabled={locked}>
                {t.unlock}
              </Button>
            </form>
          ) : null}

          {method === "biometric" ? (
            <div data-slot="lock-screen-biometric" className="flex flex-col items-center gap-3">
              <span className="inline-flex size-20 items-center justify-center rounded-full border border-border bg-card text-foreground">
                <Fingerprint aria-hidden="true" className="size-10" />
              </span>
              <p className="text-body-sm text-muted-foreground">{form.pending ? t.biometricPrompt : t.biometricHint}</p>
              <Button variant="primary" size="lg" loading={form.pending} disabled={locked} onClick={() => void form.submit({ method: "biometric", secret: "" })}>
                {t.biometric}
              </Button>
            </div>
          ) : null}

          {method === "passkey" ? (
            <div data-slot="lock-screen-passkey" className="flex flex-col items-center gap-3">
              <span className="inline-flex size-20 items-center justify-center rounded-full border border-border bg-card text-foreground">
                <KeyRound aria-hidden="true" className="size-10" />
              </span>
              <p className="text-body-sm text-muted-foreground">{form.pending ? t.passkeyPrompt : t.passkeyHint}</p>
              <Button variant="primary" size="lg" loading={form.pending} disabled={locked} onClick={() => void form.submit({ method: "passkey", secret: "" })}>
                {t.passkey}
              </Button>
            </div>
          ) : null}

          <div className="min-h-5 w-full" aria-live="polite">
            {message && method !== "password" ? (
              <p role="alert" className="text-caption text-nq-danger-text">
                {message}
              </p>
            ) : null}
            {message && method === "password" ? <Alert tone="danger">{message}</Alert> : null}
          </div>
        </div>

        {others.length ? (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {others.map((m) => (
              <Button key={m} type="button" variant="link" size="sm" disabled={form.pending} onClick={() => switchMethod(m)}>
                {otherIcon[m]}
                {otherLabel[m]}
              </Button>
            ))}
          </div>
        ) : null}
        {onSwitchAccount ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="link" size="sm" disabled={form.pending} data-slot="lock-screen-switch" />}>
              <UserPlus aria-hidden="true" />
              {t.switchAccount}
              <ChevronDown aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" className="w-64" aria-label={t.switchAccountMenu}>
              {(accounts ?? []).map((account) => (
                <DropdownMenuItem key={account.email ?? account.name} onClick={() => onSwitchAccount(account)}>
                  <Avatar name={account.name} src={account.avatar} size="sm" />
                  <span className="flex min-w-0 flex-col text-start">
                    <span className="truncate text-label">{account.name}</span>
                    {account.email ? (
                      <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                        {account.email}
                      </bdi>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              ))}
              {accounts?.length ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => onSwitchAccount(null)}>
                <UserPlus />
                {t.anotherAccount}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {onSignOut ? (
          <Button type="button" variant="link" size="sm" onClick={onSignOut} disabled={form.pending}>
            {t.signOut}
          </Button>
        ) : null}
      </main>
      {footer ? <div className="px-4 pb-4 text-center text-caption text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

function PinEntry({
  pin,
  length,
  disabled,
  invalid,
  labels: t,
  onKey,
  onBackspace,
}: {
  pin: string;
  length: number;
  disabled: boolean;
  invalid: boolean;
  labels: LockScreenLabels;
  onKey: (key: string) => void;
  onBackspace: () => void;
}) {
  const keyClass = "h-14 w-full text-h3 font-normal tabular-nums pointer-coarse:h-16";
  return (
    <div
      data-slot="lock-screen-pad"
      role="group"
      aria-label={t.pinGroup}
      tabIndex={0}
      dir="ltr"
      className="flex w-full max-w-64 flex-col items-center gap-5 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nq-focus"
    >
      <div className="flex gap-3" aria-hidden="true" data-invalid={invalid || undefined}>
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            data-filled={i < pin.length || undefined}
            className={cn(
              "size-3 rounded-full border transition-colors duration-150 ease-nq motion-reduce:transition-none",
              i < pin.length ? "border-transparent bg-foreground" : "border-nq-line-strong bg-transparent",
              invalid && "border-nq-danger",
              invalid && i < pin.length && "bg-nq-danger",
            )}
          />
        ))}
      </div>
      <span role="status" className="sr-only">
        {t.entered.replace("{count}", String(pin.length)).replace("{length}", String(length))}
      </span>
      <div className="grid w-full grid-cols-3 gap-2">
        {PIN_KEYS.map((key) => (
          <Button key={key} type="button" variant="secondary" tabIndex={-1} aria-label={fill(t.digit, { digit: key })} disabled={disabled} className={keyClass} onClick={() => onKey(key)}>
            {key}
          </Button>
        ))}
        <span aria-hidden="true" />
        <Button type="button" variant="secondary" tabIndex={-1} aria-label={fill(t.digit, { digit: "0" })} disabled={disabled} className={keyClass} onClick={() => onKey("0")}>
          0
        </Button>
        <Button type="button" variant="ghost" tabIndex={-1} aria-label={t.backspace} disabled={disabled || pin.length === 0} className={keyClass} onClick={onBackspace}>
          <Delete aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </div>
  );
}
