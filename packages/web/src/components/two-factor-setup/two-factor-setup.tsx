"use client";

import { Download, KeyRound, ShieldCheck } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { encode } from "uqr";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { CopyButton } from "../copy-button";
import { Field, FieldDescription, FieldLabel } from "../field";
import { OtpInput } from "../otp-input";
import { PasswordInput } from "../password-input";
import { Status } from "../status";
import { groupSecret, normalizeSecret, parseOtpAuthUri, recoveryCodesText } from "./format";

export { groupSecret, normalizeSecret, parseOtpAuthUri, recoveryCodesText, type OtpAuthInfo } from "./format";

const STRINGS = {
  en: {
    title: "Two-factor authentication",
    description: "Ask for a code from an authenticator app each time you sign in.",
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    scanTitle: "Scan the QR code",
    scanBody: "Open an authenticator app such as 1Password, Authy or Google Authenticator and scan this code.",
    qrLabel: "QR code for your authenticator app",
    cantScan: "Can't scan? Enter this key instead",
    keyLabel: "Setup key",
    copyKey: "Copy setup key",
    next: "Next",
    verifyTitle: "Enter the 6-digit code",
    verifyBody: "Type the code your authenticator app shows now to confirm it is set up.",
    codeLabel: "Verification code",
    boxLabel: (i: number, n: number) => `Digit ${i + 1} of ${n}`,
    verify: "Verify and continue",
    back: "Back",
    genericError: "Something went wrong. Try again.",
    recoveryTitle: "Save your recovery codes",
    recoveryBody: "If you lose your phone, each of these codes lets you sign in once. Store them somewhere safe. They will not be shown again.",
    recoveryList: "Recovery codes",
    copyAll: "Copy all",
    download: "Download .txt",
    saved: "I saved these recovery codes",
    finish: "Finish",
    fileHeader: "Recovery codes",
    enabledTitle: "Two-factor authentication is on",
    enabledBody: "You will be asked for a code from your authenticator app when you sign in.",
    statusOn: "Enabled",
    remaining: (n: number) => (n === 1 ? "1 recovery code left" : `${n} recovery codes left`),
    regenerate: "Regenerate recovery codes",
    regenTitle: "Regenerate recovery codes?",
    regenBody: "Your current recovery codes stop working. Confirm to get a new set.",
    regenConfirm: "Regenerate",
    regenDone: "Your new recovery codes",
    disable: "Disable two-factor",
    disableTitle: "Disable two-factor authentication?",
    disableBody: "Your account will be protected by your password alone.",
    disableConfirm: "Disable",
    password: "Password",
    authCode: "Authentication code",
    confirmPassword: "Enter your password to continue.",
    confirmCode: "Enter a code from your authenticator app to continue.",
    cancel: "Cancel",
  },
  ar: {
    title: "المصادقة الثنائية",
    description: "اطلب رمزًا من تطبيق المصادقة في كل مرة تسجّل فيها الدخول.",
    step: (n: number, total: number) => `الخطوة ${n} من ${total}`,
    scanTitle: "امسح رمز QR",
    scanBody: "افتح تطبيق مصادقة مثل 1Password أو Authy أو Google Authenticator وامسح هذا الرمز.",
    qrLabel: "رمز QR لتطبيق المصادقة",
    cantScan: "لا يمكنك المسح؟ أدخل هذا المفتاح بدلًا من ذلك",
    keyLabel: "مفتاح الإعداد",
    copyKey: "نسخ مفتاح الإعداد",
    next: "التالي",
    verifyTitle: "أدخل الرمز المكوّن من 6 أرقام",
    verifyBody: "اكتب الرمز الذي يعرضه تطبيق المصادقة الآن للتأكد من اكتمال الإعداد.",
    codeLabel: "رمز التحقق",
    boxLabel: (i: number, n: number) => `الخانة ${i + 1} من ${n}`,
    verify: "تحقّق وتابع",
    back: "رجوع",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    recoveryTitle: "احفظ رموز الاسترداد",
    recoveryBody: "إذا فقدت هاتفك، يتيح لك كل رمز من هذه الرموز تسجيل الدخول مرة واحدة. احفظها في مكان آمن. لن تُعرض مرة أخرى.",
    recoveryList: "رموز الاسترداد",
    copyAll: "نسخ الكل",
    download: "تنزيل .txt",
    saved: "لقد حفظت رموز الاسترداد",
    finish: "إنهاء",
    fileHeader: "رموز الاسترداد",
    enabledTitle: "المصادقة الثنائية مفعّلة",
    enabledBody: "سيُطلب منك رمز من تطبيق المصادقة عند تسجيل الدخول.",
    statusOn: "مفعّلة",
    remaining: (n: number) => (n === 1 ? "بقي رمز استرداد واحد" : `بقي ${n} رموز استرداد`),
    regenerate: "إعادة إنشاء رموز الاسترداد",
    regenTitle: "إعادة إنشاء رموز الاسترداد؟",
    regenBody: "ستتوقف رموز الاسترداد الحالية عن العمل. أكّد للحصول على مجموعة جديدة.",
    regenConfirm: "إعادة الإنشاء",
    regenDone: "رموز الاسترداد الجديدة",
    disable: "تعطيل المصادقة الثنائية",
    disableTitle: "تعطيل المصادقة الثنائية؟",
    disableBody: "سيُحمى حسابك بكلمة المرور وحدها.",
    disableConfirm: "تعطيل",
    password: "كلمة المرور",
    authCode: "رمز المصادقة",
    confirmPassword: "أدخل كلمة المرور للمتابعة.",
    confirmCode: "أدخل رمزًا من تطبيق المصادقة للمتابعة.",
    cancel: "إلغاء",
  },
};

export type TwoFactorLabels = (typeof STRINGS)["en"];

/** What a callback returns: nothing on success, or a message to show. */
export type TwoFactorResult = void | { error?: string };

export interface TwoFactorSetupProps extends Omit<ComponentProps<"div">, "children"> {
  /** The `otpauth://totp/...` URI the QR code encodes. Your server creates it with a fresh secret. */
  otpauthUri: string;
  /** The base32 secret shown for manual entry. Default: read from `otpauthUri`. */
  secret?: string;
  /** Show the enabled state. Controlled; omit to let the component switch after the last step. */
  enabled?: boolean;
  /** Called with the 6-digit code. Resolve with `{ recoveryCodes }` on success or `{ error }` when the code is wrong. */
  onVerify: (code: string) => Promise<void | { error?: string; recoveryCodes?: readonly string[] }>;
  /** Recovery codes to show in step 3, when you already have them. Otherwise return them from `onVerify`. */
  recoveryCodes?: readonly string[];
  /** Called when the user finishes step 3 (after confirming they saved the codes). */
  onComplete?: () => void;
  /** Enabled state: how many recovery codes are unused. Fewer than 3 shows a warning. */
  recoveryCodesRemaining?: number;
  /** How to confirm dangerous actions (regenerate, disable). Default "password". */
  confirmWith?: "password" | "code";
  /** Enabled state: make a new set. Receives the password or code; resolve with the new codes or `{ error }`. */
  onRegenerateRecoveryCodes?: (credential: string) => Promise<readonly string[] | { error?: string }>;
  /** Enabled state: turn two-factor off. Receives the password or code. */
  onDisable?: (credential: string) => Promise<TwoFactorResult>;
  /** File name of the downloaded codes. Default "recovery-codes.txt". */
  downloadFilename?: string;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<TwoFactorLabels>;
}

function useLabels(labels?: Partial<TwoFactorLabels>): TwoFactorLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

const QUIET = 4;

/** A QR code drawn client-side as one SVG path. Dark on light in both themes: scanners need the contrast. */
function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 0 });
    let d = "";
    qr.data.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (!row[x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < row.length && row[x]) x++;
        d += `M${start + QUIET} ${y + QUIET}h${x - start}v1h-${x - start}z`;
      }
    });
    return { path: d, size: qr.size + QUIET * 2 };
  }, [value]);
  return (
    <svg
      data-slot="two-factor-qr"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={cn("aspect-square w-full max-w-48 rounded-control border border-border bg-white", className)}
    >
      <path d={path} className="fill-black" />
    </svg>
  );
}

/** Codes in a two-column grid, always left-to-right, with copy, download and a confirmation. */
function RecoveryCodes({
  codes,
  t,
  filename,
  onConfirm,
}: {
  codes: readonly string[];
  t: TwoFactorLabels;
  filename: string;
  onConfirm: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const id = useId();
  const download = () => {
    const blob = new Blob([recoveryCodesText(codes, t.fileHeader)], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  };
  return (
    <div className="flex flex-col gap-4" data-slot="two-factor-recovery">
      <ul
        dir="ltr"
        aria-label={t.recoveryList}
        className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-card border border-border bg-secondary p-4 font-mono text-body tabular-nums text-foreground"
      >
        {codes.map((code) => (
          <li key={code} data-slot="two-factor-recovery-code" className="select-all">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={codes.join("\n")} variant="secondary" label={t.copyAll}>
          {t.copyAll}
        </CopyButton>
        <Button type="button" size="sm" onClick={download}>
          <Download aria-hidden />
          {t.download}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
        <label htmlFor={id} className="text-body-sm text-foreground">
          {t.saved}
        </label>
      </div>
      <div>
        <Button type="button" variant="primary" disabled={!saved} onClick={onConfirm}>
          {t.finish}
        </Button>
      </div>
    </div>
  );
}

/** An alert dialog that asks for a password or a code, runs an async action, and stays open on error. */
function CredentialDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  mode,
  t,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  mode: "password" | "code";
  t: TwoFactorLabels;
  onSubmit: (credential: string) => Promise<TwoFactorResult>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
    }
  }, [open]);
  const ready = mode === "code" ? value.length === 6 : value.length > 0;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onSubmit(value);
      if (result && result.error) setError(result.error);
      else onOpenChange(false);
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <Field invalid={error !== null}>
            <FieldLabel>{mode === "code" ? t.authCode : t.password}</FieldLabel>
            {mode === "code" ? (
              <OtpInput value={value} onValueChange={setValue} invalid={error !== null} getBoxLabel={t.boxLabel} />
            ) : (
              <PasswordInput autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
            )}
            <FieldDescription>{mode === "code" ? t.confirmCode : t.confirmPassword}</FieldDescription>
            {error ? (
              <p role="alert" className="text-caption text-nq-danger-text">
                {error}
              </p>
            ) : null}
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t.cancel}</AlertDialogCancel>
            <Button type="submit" variant={danger ? "danger" : "primary"} loading={pending} disabled={!ready}>
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StepHeader({ step, t }: { step: number; t: TwoFactorLabels }) {
  return (
    <ol data-slot="two-factor-steps" className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          aria-current={n === step ? "step" : undefined}
          className={cn("h-1 flex-1 rounded-full", n <= step ? "bg-primary" : "bg-secondary")}
        >
          <span className="sr-only">{t.step(n, 3)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Turn on TOTP two-factor authentication in three steps: scan the QR code (or type the key), confirm a
 * 6-digit code, save the recovery codes. Once on, it shows the status with regenerate and disable. It is
 * presentational: your callbacks talk to the server. The QR, key and codes stay left-to-right in Arabic.
 */
export function TwoFactorSetup({
  otpauthUri,
  secret,
  enabled: enabledProp,
  onVerify,
  recoveryCodes: recoveryProp,
  onComplete,
  recoveryCodesRemaining,
  confirmWith = "password",
  onRegenerateRecoveryCodes,
  onDisable,
  downloadFilename = "recovery-codes.txt",
  labels,
  className,
  ...props
}: TwoFactorSetupProps) {
  const t = useLabels(labels);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<readonly string[]>([]);
  const [enabledState, setEnabledState] = useState(false);
  const [fresh, setFresh] = useState<readonly string[] | null>(null);
  const [dialog, setDialog] = useState<"regenerate" | "disable" | null>(null);
  const enabled = enabledProp ?? enabledState;
  const key = normalizeSecret(secret ?? parseOtpAuthUri(otpauthUri)?.secret ?? "");
  const codes = recoveryProp ?? issued;

  async function verify(value: string) {
    if (pending || value.length !== 6) return;
    setPending(true);
    setError(null);
    try {
      const result = (await onVerify(value)) ?? {};
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.recoveryCodes) setIssued(result.recoveryCodes);
      setStep(3);
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  const finish = () => {
    setEnabledState(true);
    setStep(1);
    setCode("");
    onComplete?.();
  };

  const body: ReactNode = enabled ? (
    <>
      <CardHeader>
        <CardTitle as="h2">{t.enabledTitle}</CardTitle>
        <CardDescription>{t.enabledBody}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Status tone="success" icon={ShieldCheck}>
            {t.statusOn}
          </Status>
          {recoveryCodesRemaining !== undefined ? (
            <Status tone={recoveryCodesRemaining < 3 ? "warning" : "neutral"} icon={KeyRound}>
              {t.remaining(recoveryCodesRemaining)}
            </Status>
          ) : null}
        </div>
        {fresh ? (
          <div className="flex flex-col gap-3">
            <p className="text-label text-foreground">{t.regenDone}</p>
            <RecoveryCodes codes={fresh} t={t} filename={downloadFilename} onConfirm={() => setFresh(null)} />
          </div>
        ) : null}
      </CardContent>
      {fresh ? null : (
        <CardFooter className="flex flex-wrap gap-2">
          {onRegenerateRecoveryCodes ? (
            <Button type="button" onClick={() => setDialog("regenerate")}>
              {t.regenerate}
            </Button>
          ) : null}
          {onDisable ? (
            <Button type="button" variant="danger" onClick={() => setDialog("disable")}>
              {t.disable}
            </Button>
          ) : null}
        </CardFooter>
      )}
      {onRegenerateRecoveryCodes ? (
        <CredentialDialog
          open={dialog === "regenerate"}
          onOpenChange={(o) => setDialog(o ? "regenerate" : null)}
          title={t.regenTitle}
          description={t.regenBody}
          confirmLabel={t.regenConfirm}
          mode={confirmWith}
          t={t}
          onSubmit={async (credential) => {
            const result = await onRegenerateRecoveryCodes(credential);
            if (Array.isArray(result)) {
              setFresh(result as readonly string[]);
              return;
            }
            return result as { error?: string };
          }}
        />
      ) : null}
      {onDisable ? (
        <CredentialDialog
          open={dialog === "disable"}
          onOpenChange={(o) => setDialog(o ? "disable" : null)}
          title={t.disableTitle}
          description={t.disableBody}
          confirmLabel={t.disableConfirm}
          danger
          mode={confirmWith}
          t={t}
          onSubmit={async (credential) => {
            const result = await onDisable(credential);
            if (!result?.error) setEnabledState(false);
            return result;
          }}
        />
      ) : null}
    </>
  ) : (
    <>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <StepHeader step={step} t={t} />
        {step === 1 ? (
          <div className="flex flex-col gap-4" data-slot="two-factor-scan">
            <div className="flex flex-col gap-1">
              <h3 className="text-label text-foreground">{t.scanTitle}</h3>
              <p className="text-body-sm text-muted-foreground">{t.scanBody}</p>
            </div>
            <QrCode value={otpauthUri} label={t.qrLabel} />
            {key ? (
              <details className="rounded-control border border-border px-3 py-2">
                <summary className="cursor-pointer text-body-sm text-foreground">{t.cantScan}</summary>
                <div className="mt-2 flex items-center gap-2" data-slot="two-factor-key">
                  <code dir="ltr" aria-label={t.keyLabel} className="min-w-0 flex-1 select-all break-all font-mono text-body tabular-nums text-foreground">
                    {groupSecret(key)}
                  </code>
                  <CopyButton value={key} label={t.copyKey} />
                </div>
              </details>
            ) : null}
            <div>
              <Button type="button" variant="primary" onClick={() => setStep(2)}>
                {t.next}
              </Button>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <form
            className="flex flex-col gap-4"
            data-slot="two-factor-verify"
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-label text-foreground">{t.verifyTitle}</h3>
              <p className="text-body-sm text-muted-foreground">{t.verifyBody}</p>
            </div>
            <Field invalid={error !== null} className="w-fit">
              <FieldLabel>{t.codeLabel}</FieldLabel>
              <OtpInput
                name="code"
                autoFocus
                value={code}
                invalid={error !== null}
                disabled={pending}
                getBoxLabel={t.boxLabel}
                onValueChange={(v) => {
                  setCode(v);
                  setError(null);
                }}
                onComplete={(v) => void verify(v)}
              />
              {error ? (
                <p role="alert" className="text-caption text-nq-danger-text">
                  {error}
                </p>
              ) : null}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
              >
                {t.back}
              </Button>
              <Button type="submit" variant="primary" loading={pending} disabled={code.length !== 6}>
                {t.verify}
              </Button>
            </div>
          </form>
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-label text-foreground">{t.recoveryTitle}</h3>
              <p className="text-body-sm text-muted-foreground">{t.recoveryBody}</p>
            </div>
            {codes.length ? (
              <RecoveryCodes codes={codes} t={t} filename={downloadFilename} onConfirm={finish} />
            ) : (
              <Alert tone="warning">{t.genericError}</Alert>
            )}
          </div>
        ) : null}
      </CardContent>
    </>
  );

  return (
    <Card data-slot="two-factor-setup" data-state={enabled ? "enabled" : `step-${step}`} className={cn("w-full max-w-lg", className)} {...props}>
      {body}
    </Card>
  );
}
