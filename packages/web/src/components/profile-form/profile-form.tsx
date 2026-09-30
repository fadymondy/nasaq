"use client";

import { CircleCheck, CircleX, MailCheck, TriangleAlert } from "lucide-react";
import { type ComponentProps, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { DEFAULT_LOCALES, useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AvatarUpload, type AvatarUploadProps } from "../avatar-upload";
import { Badge } from "../badge";
import { Button } from "../button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../input-group";
import { formatNumber } from "../numeric";
import { PasswordInput } from "../password-input";
import { PhoneInput } from "../phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Spinner } from "../spinner";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    name: "Display name",
    nameHelp: "Shown on your profile and next to your activity.",
    nameRequired: "Enter your name.",
    username: "Username",
    usernameHelp: "3 to 30 letters, numbers, dots, dashes or underscores.",
    usernameFormat: "Use 3 to 30 letters, numbers, dots, dashes or underscores. Start and end with a letter or number.",
    usernameChecking: "Checking availability",
    usernameAvailable: (username: string) => `⁦${username}⁩ is available.`,
    usernameTaken: "That username is taken. Try another one.",
    usernameCheckFailed: "Availability could not be checked. It will be verified when you save.",
    email: "Email",
    emailHelp: "Used to sign in and for account notices.",
    verified: "Verified",
    unverified: "Not verified",
    resend: "Resend verification email",
    resending: "Sending",
    resent: (email: string) => `Verification email sent to ⁦${email}⁩.`,
    resendFailed: "The email could not be sent. Try again.",
    changeEmail: "Change email",
    changeEmailTitle: "Change your email",
    changeEmailDescription: "We send a confirmation link to the new address. Enter your password to continue.",
    newEmail: "New email",
    emailInvalid: "Enter a valid email address.",
    emailSame: "That is already your email.",
    currentPassword: "Current password",
    passwordRequired: "Enter your password.",
    sendConfirmation: "Send confirmation link",
    changeEmailFailed: "Your email could not be changed. Try again.",
    pendingEmail: (email: string) => `We sent a confirmation link to ⁦${email}⁩. Your email changes once you confirm it.`,
    phone: "Phone",
    phoneHelp: "Used to recover your account. Never shown to others.",
    bio: "Bio",
    bioHelp: "A short line about you.",
    language: "Language",
    timezone: "Time zone",
    timezoneSearch: "Search time zones",
    timezoneEmpty: "No time zone found.",
    clear: "Clear",
    open: "Open list",
    unsaved: "You have unsaved changes",
    discard: "Discard",
    save: "Save changes",
    cancel: "Cancel",
    saved: "Profile updated.",
    saveFailed: "Your profile could not be saved. Try again.",
    dismiss: "Dismiss",
  },
  ar: {
    name: "الاسم المعروض",
    nameHelp: "يظهر في ملفك الشخصي وبجانب نشاطك.",
    nameRequired: "أدخل اسمك.",
    username: "اسم المستخدم",
    usernameHelp: "من 3 إلى 30 حرفًا أو رقمًا أو نقطة أو شرطة أو شرطة سفلية.",
    usernameFormat: "استخدم من 3 إلى 30 حرفًا أو رقمًا أو نقطة أو شرطة أو شرطة سفلية، وابدأ وانتهِ بحرف أو رقم.",
    usernameChecking: "جارٍ التحقق من التوفر",
    usernameAvailable: (username: string) => `⁦${username}⁩ متاح.`,
    usernameTaken: "اسم المستخدم هذا مستخدم بالفعل. جرّب اسمًا آخر.",
    usernameCheckFailed: "تعذّر التحقق من التوفر. سيتم التحقق منه عند الحفظ.",
    email: "البريد الإلكتروني",
    emailHelp: "يُستخدم لتسجيل الدخول وإشعارات الحساب.",
    verified: "موثّق",
    unverified: "غير موثّق",
    resend: "إعادة إرسال رسالة التوثيق",
    resending: "جارٍ الإرسال",
    resent: (email: string) => `أُرسلت رسالة التوثيق إلى ⁦${email}⁩.`,
    resendFailed: "تعذّر إرسال الرسالة. حاول مرة أخرى.",
    changeEmail: "تغيير البريد",
    changeEmailTitle: "تغيير بريدك الإلكتروني",
    changeEmailDescription: "نرسل رابط تأكيد إلى العنوان الجديد. أدخل كلمة المرور للمتابعة.",
    newEmail: "البريد الجديد",
    emailInvalid: "أدخل بريدًا إلكترونيًا صحيحًا.",
    emailSame: "هذا هو بريدك الحالي بالفعل.",
    currentPassword: "كلمة المرور الحالية",
    passwordRequired: "أدخل كلمة المرور.",
    sendConfirmation: "إرسال رابط التأكيد",
    changeEmailFailed: "تعذّر تغيير بريدك. حاول مرة أخرى.",
    pendingEmail: (email: string) => `أرسلنا رابط تأكيد إلى ⁦${email}⁩. يتغير بريدك بعد أن تؤكده.`,
    phone: "الهاتف",
    phoneHelp: "يُستخدم لاستعادة حسابك. لا يظهر للآخرين.",
    bio: "نبذة",
    bioHelp: "سطر قصير عنك.",
    language: "اللغة",
    timezone: "المنطقة الزمنية",
    timezoneSearch: "ابحث عن منطقة زمنية",
    timezoneEmpty: "لا توجد منطقة زمنية مطابقة.",
    clear: "مسح",
    open: "فتح القائمة",
    unsaved: "لديك تغييرات غير محفوظة",
    discard: "تجاهل",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    saved: "تم تحديث الملف الشخصي.",
    saveFailed: "تعذّر حفظ ملفك الشخصي. حاول مرة أخرى.",
    dismiss: "تجاهل",
  },
};

export type ProfileLabels = (typeof STRINGS)["en"];

/* ------------------------------------------------------------------ types */

export interface ProfileValues {
  name: string;
  username: string;
  email: string;
  /** E.164, for example "+966501234567", or "". */
  phone: string;
  bio: string;
  /** A locale code such as "en" or "ar". */
  locale: string;
  /** An IANA time zone such as "Asia/Riyadh". */
  timezone: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileValues | "password", string>>;

/** What `onSubmit` and `onChangeEmail` may resolve with to report a failure. Resolve with nothing for success. */
export interface ProfileSubmitResult {
  /** A message for the whole form. */
  error?: string;
  /** Messages shown under the matching fields. */
  fieldErrors?: ProfileFieldErrors;
}

/** `true` when free, or an object to add a message. */
export type UsernameCheck = boolean | { available: boolean; message?: string };

export interface ProfileOption {
  value: string;
  label: string;
}

export interface ProfileFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** The saved values. A new object with different content resets the form to it. */
  values: ProfileValues;
  /** Save. Resolve with nothing on success, or `{ error, fieldErrors }` to show a failure. Throwing shows a generic error. */
  onSubmit: (values: ProfileValues) => Promise<void | ProfileSubmitResult>;
  /** Photo upload. Omit `onChange` to hide the photo section. */
  avatar?: Pick<AvatarUploadProps, "src" | "onChange" | "onRemove" | "accept" | "maxSize" | "outputSize" | "outputType">;
  /** Is this username free? Called after typing pauses, only for a valid username that differs from the saved one. */
  checkUsername?: (username: string) => Promise<UsernameCheck>;
  /** Milliseconds of quiet before `checkUsername` runs. Default 400. */
  usernameDebounce?: number;
  /** Shows a Verified or Not verified badge next to the email. Omit to hide the badge. */
  emailVerified?: boolean;
  /** Shown when the email is not verified. Resolve when the message is sent. */
  onResendVerification?: () => Promise<void>;
  /** Shows the "Change email" button and dialog. Called with the new email and the current password. */
  onChangeEmail?: (input: { email: string; password: string }) => Promise<void | ProfileSubmitResult>;
  /** Language choices. Default: the locales of the NasaqProvider. */
  languages?: readonly ProfileOption[];
  /** Time zone choices. Default: every IANA zone the browser knows, with its UTC offset. */
  timezones?: readonly ProfileOption[];
  /** Largest bio length. Default 160. */
  bioMaxLength?: number;
  /** Country preselected in the phone field when there is no number. Default "SA". */
  defaultCountry?: string;
  disabled?: boolean;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<ProfileLabels>;
}

/* ------------------------------------------------------------------ helpers */

const USERNAME = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIRTY_KEYS = ["name", "username", "phone", "bio", "locale", "timezone"] as const;

const FALLBACK_ZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "UTC"];

/** Every IANA zone the runtime knows, labelled "Riyadh (GMT+3)" in the reader's language. */
function buildTimezones(locale: string): ProfileOption[] {
  const ids = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? FALLBACK_ZONES;
  const now = new Date();
  return ids.map((id) => {
    let offset = "";
    try {
      offset = new Intl.DateTimeFormat(locale, { timeZone: id, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      /* an id the runtime cannot format: show it without an offset */
    }
    const place = id.replace(/_/g, " ").replace(/\//g, " / ");
    return { value: id, label: offset ? `${place} (${offset})` : place };
  });
}

type UsernameState = { status: "idle" | "checking" | "available" | "taken" | "error"; message?: string };

/* ------------------------------------------------------------------ component */

/**
 * The "Profile" settings form: photo, display name, username with a live availability check, email with
 * verification and a password-protected change, phone, bio, language and time zone. It tracks changes and
 * shows a sticky Save / Discard bar only while something differs from the saved values. Nothing is sent
 * by the component: every action is an async callback you provide.
 */
export function ProfileForm({
  values,
  onSubmit,
  avatar,
  checkUsername,
  usernameDebounce = 400,
  emailVerified,
  onResendVerification,
  onChangeEmail,
  languages,
  timezones,
  bioMaxLength = 160,
  defaultCountry,
  disabled,
  labels,
  className,
  ...props
}: ProfileFormProps) {
  const nq = useOptionalNasaq();
  const locale = nq?.locale ?? "en";
  const t: ProfileLabels = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };

  const [baseline, setBaseline] = useState<ProfileValues>(values);
  const [draft, setDraft] = useState<ProfileValues>(values);
  const [serverErrors, setServerErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [username, setUsername] = useState<UsernameState>({ status: "idle" });
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // A host that reloads the saved values (a different object with different content) resets the form.
  const valuesKey = JSON.stringify(values);
  const lastKey = useRef(valuesKey);
  useEffect(() => {
    if (lastKey.current === valuesKey) return;
    lastKey.current = valuesKey;
    setBaseline(values);
    setDraft(values);
    setServerErrors({});
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);

  const dirty = DIRTY_KEYS.some((key) => draft[key] !== baseline[key]);

  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    setNotice(null);
  };

  /* username availability: debounced, and stale answers are dropped */
  const checkRef = useRef(checkUsername);
  checkRef.current = checkUsername;
  useEffect(() => {
    const value = draft.username;
    if (!checkRef.current || value === baseline.username || !USERNAME.test(value)) {
      setUsername({ status: "idle" });
      return;
    }
    let stale = false;
    setUsername({ status: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkRef.current?.(value);
        if (stale || result === undefined) return;
        const free = typeof result === "boolean" ? result : result.available;
        setUsername({ status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined });
      } catch {
        if (!stale) setUsername({ status: "error" });
      }
    }, usernameDebounce);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [draft.username, baseline.username, usernameDebounce]);

  /* validation: username format shows while typing, the rest after the first save attempt */
  const localErrors: ProfileFieldErrors = {};
  if (attempted && !draft.name.trim()) localErrors.name = t.nameRequired;
  if (draft.username && draft.username !== baseline.username && !USERNAME.test(draft.username)) localErrors.username = t.usernameFormat;
  if (attempted && !draft.username) localErrors.username = t.usernameFormat;
  if (username.status === "taken") localErrors.username = username.message ?? t.usernameTaken;
  const errors: ProfileFieldErrors = { ...serverErrors, ...localErrors };

  const blocked = username.status === "checking" || username.status === "taken" || !!localErrors.username;

  const discard = () => {
    setDraft(baseline);
    setServerErrors({});
    setFormError(null);
    setAttempted(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setAttempted(true);
    if (blocked || !draft.name.trim() || !draft.username) return;
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const result = await onSubmit({ ...draft, name: draft.name.trim() });
      if (result && (result.error || result.fieldErrors)) {
        setServerErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
      } else {
        setBaseline({ ...draft, name: draft.name.trim() });
        setDraft((d) => ({ ...d, name: d.name.trim() }));
        setServerErrors({});
        setAttempted(false);
        setNotice(t.saved);
      }
    } catch {
      setFormError(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const languageOptions = useMemo<readonly ProfileOption[]>(
    () => languages ?? (nq?.locales ?? DEFAULT_LOCALES).map((l) => ({ value: l.value, label: l.label })),
    [languages, nq?.locales],
  );
  const zoneOptions = useMemo<readonly ProfileOption[]>(() => {
    const list = timezones ?? buildTimezones(locale);
    if (draft.timezone && !list.some((z) => z.value === draft.timezone)) return [{ value: draft.timezone, label: draft.timezone }, ...list];
    return list;
  }, [timezones, locale, draft.timezone]);
  const zone = zoneOptions.find((z) => z.value === draft.timezone) ?? null;

  const bioLength = Array.from(draft.bio).length;

  return (
    <form
      data-slot="profile-form"
      noValidate
      aria-busy={saving || undefined}
      className={cn("flex flex-col gap-6", className)}
      onSubmit={submit}
      {...props}
    >
      {avatar?.onChange ? (
        <AvatarUpload name={draft.name || baseline.name} disabled={disabled || saving} {...avatar} onChange={avatar.onChange} />
      ) : null}

      {formError ? (
        <Alert tone="danger" onDismiss={() => setFormError(null)} dismissLabel={t.dismiss}>
          {formError}
        </Alert>
      ) : null}
      {notice && !dirty ? (
        <Alert tone="success" onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice}
        </Alert>
      ) : null}

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field invalid={!!errors.name}>
          <FieldLabel>{t.name}</FieldLabel>
          <Input
            name="name"
            autoComplete="name"
            required
            disabled={disabled}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name ? <FieldError match>{errors.name}</FieldError> : <FieldDescription>{t.nameHelp}</FieldDescription>}
        </Field>

        <Field invalid={!!errors.username}>
          <FieldLabel>{t.username}</FieldLabel>
          <InputGroup dir="ltr">
            <InputGroupAddon>
              <InputGroupText>@</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              ltr
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
              disabled={disabled}
              value={draft.username}
              onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
            />
            {username.status !== "idle" && username.status !== "error" ? (
              <InputGroupAddon align="end">
                {username.status === "checking" ? (
                  <Spinner />
                ) : username.status === "available" ? (
                  <CircleCheck aria-hidden="true" className="text-nq-success-text" />
                ) : (
                  <CircleX aria-hidden="true" className="text-nq-danger-text" />
                )}
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          {errors.username ? <FieldError match>{errors.username}</FieldError> : null}
          <FieldDescription aria-live="polite" className={cn(username.status === "available" && "text-nq-success-text")}>
            {errors.username
              ? null
              : username.status === "checking"
                ? t.usernameChecking
                : username.status === "available"
                  ? (username.message ?? t.usernameAvailable(`@${draft.username}`))
                  : username.status === "error"
                    ? t.usernameCheckFailed
                    : t.usernameHelp}
          </FieldDescription>
        </Field>
      </div>

      <EmailField
        email={baseline.email}
        verified={emailVerified}
        pending={pendingEmail}
        disabled={disabled}
        t={t}
        onResend={onResendVerification}
        onChange={
          onChangeEmail
            ? async (input) => {
                const result = await onChangeEmail(input);
                if (!result || (!result.error && !result.fieldErrors)) setPendingEmail(input.email);
                return result;
              }
            : undefined
        }
      />

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field invalid={!!errors.phone}>
          <FieldLabel>{t.phone}</FieldLabel>
          <PhoneInput
            name="phone"
            disabled={disabled}
            invalid={!!errors.phone}
            defaultCountry={defaultCountry}
            value={draft.phone}
            onValueChange={(value) => set("phone", value)}
          />
          {errors.phone ? <FieldError match>{errors.phone}</FieldError> : <FieldDescription>{t.phoneHelp}</FieldDescription>}
        </Field>
      </div>

      <Field invalid={!!errors.bio}>
        <FieldLabel>{t.bio}</FieldLabel>
        <Textarea
          name="bio"
          autoComplete="off"
          rows={3}
          disabled={disabled}
          maxLength={bioMaxLength}
          value={draft.bio}
          onChange={(e) => set("bio", e.target.value)}
        />
        <div className="flex items-start justify-between gap-3">
          {errors.bio ? <FieldError match>{errors.bio}</FieldError> : <FieldDescription>{t.bioHelp}</FieldDescription>}
          <span data-slot="profile-form-counter" dir="ltr" className="shrink-0 text-caption text-muted-foreground tabular-nums">
            {formatNumber(bioLength, locale)}/{formatNumber(bioMaxLength, locale)}
          </span>
        </div>
      </Field>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t.language}</FieldLabel>
          <Select
            name="locale"
            items={languageOptions as ProfileOption[]}
            value={draft.locale}
            disabled={disabled}
            onValueChange={(value) => value && set("locale", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>{t.timezone}</FieldLabel>
          <Combobox
            items={zoneOptions as ProfileOption[]}
            value={zone}
            disabled={disabled}
            isItemEqualToValue={(a: ProfileOption, b: ProfileOption) => a.value === b.value}
            onValueChange={(next: ProfileOption | null) => next && set("timezone", next.value)}
          >
            <ComboboxInput clearable={false} placeholder={t.timezoneSearch} triggerLabel={t.open} clearLabel={t.clear} />
            <ComboboxContent>
              <ComboboxEmpty>{t.timezoneEmpty}</ComboboxEmpty>
              <ComboboxList>
                {(item: ProfileOption) => (
                  <ComboboxItem key={item.value} value={item}>
                    <bdi>{item.label}</bdi>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <input type="hidden" name="timezone" value={draft.timezone} />
        </Field>
      </div>

      <span role="status" className="sr-only">
        {dirty ? t.unsaved : (notice ?? "")}
      </span>
      {dirty ? (
        <div
          role="region"
          aria-label={t.unsaved}
          data-slot="profile-form-savebar"
          className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-floating border border-border bg-popover p-3 text-popover-foreground shadow-floating"
        >
          <p className="flex items-center gap-2 text-body-sm">
            <TriangleAlert aria-hidden="true" className="size-4 text-nq-warning-text" />
            {t.unsaved}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={discard}>
              {t.discard}
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={disabled || blocked}>
              {t.save}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------------ email */

interface EmailFieldProps {
  email: string;
  verified?: boolean;
  pending: string | null;
  disabled?: boolean;
  t: ProfileLabels;
  onResend?: () => Promise<void>;
  onChange?: (input: { email: string; password: string }) => Promise<void | ProfileSubmitResult>;
}

function EmailField({ email, verified, pending, disabled, t, onResend, onChange }: EmailFieldProps) {
  const [sending, setSending] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [open, setOpen] = useState(false);

  // Sending again is possible after a short pause, so the link is not hammered.
  useEffect(() => {
    if (sending !== "sent") return;
    const timer = setTimeout(() => setSending("idle"), 30_000);
    return () => clearTimeout(timer);
  }, [sending]);

  const resend = async () => {
    if (!onResend || sending === "sending") return;
    setSending("sending");
    try {
      await onResend();
      setSending("sent");
    } catch {
      setSending("failed");
    }
  };

  return (
    <Field>
      <div className="flex flex-wrap items-center gap-2">
        <FieldLabel>{t.email}</FieldLabel>
        {verified === undefined ? null : verified ? (
          <Badge variant="success">
            <CircleCheck aria-hidden="true" />
            {t.verified}
          </Badge>
        ) : (
          <Badge variant="warning">
            <TriangleAlert aria-hidden="true" />
            {t.unverified}
          </Badge>
        )}
      </div>
      <Input ltr readOnly name="email" type="email" autoComplete="email" disabled={disabled} value={email} />
      <FieldDescription>{t.emailHelp}</FieldDescription>
      {verified === false && onResend ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            type="button"
            variant="link"
            loading={sending === "sending"}
            disabled={disabled || sending === "sent"}
            onClick={resend}
          >
            {sending === "sending" ? t.resending : t.resend}
          </Button>
          <span aria-live="polite" className={cn("text-caption", sending === "failed" ? "text-nq-danger-text" : "text-nq-success-text")}>
            {sending === "sent" ? t.resent(email) : sending === "failed" ? t.resendFailed : ""}
          </span>
        </div>
      ) : null}
      {pending ? (
        <Alert tone="info" icon={MailCheck}>
          {t.pendingEmail(pending)}
        </Alert>
      ) : null}
      {onChange ? (
        <div>
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
            {t.changeEmail}
          </Button>
          <ChangeEmailDialog open={open} onOpenChange={setOpen} current={email} t={t} onChange={onChange} />
        </div>
      ) : null}
    </Field>
  );
}

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string;
  t: ProfileLabels;
  onChange: NonNullable<EmailFieldProps["onChange"]>;
}

function ChangeEmailDialog({ open, onOpenChange, current, t, onChange }: ChangeEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) return;
    setEmail("");
    setPassword("");
    setErrors({});
    setFormError(null);
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    // The dialog is portalled, but React events still bubble to the profile form: keep this submit to itself.
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const next: ProfileFieldErrors = {};
    const value = email.trim();
    if (!EMAIL.test(value)) next.email = t.emailInvalid;
    else if (value.toLowerCase() === current.toLowerCase()) next.email = t.emailSame;
    if (!password) next.password = t.passwordRequired;
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    setFormError(null);
    try {
      const result = await onChange({ email: value, password });
      if (result && (result.error || result.fieldErrors)) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
      } else {
        onOpenChange(false);
      }
    } catch {
      setFormError(t.changeEmailFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form noValidate onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.changeEmailTitle}</DialogTitle>
            <DialogDescription>{t.changeEmailDescription}</DialogDescription>
          </DialogHeader>
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <Field invalid={!!errors.email}>
            <FieldLabel>{t.newEmail}</FieldLabel>
            <Input
              ltr
              type="email"
              name="new-email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {errors.email ? <FieldError match>{errors.email}</FieldError> : null}
          </Field>
          <Field invalid={!!errors.password}>
            <FieldLabel>{t.currentPassword}</FieldLabel>
            <PasswordInput
              name="current-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />
            {errors.password ? <FieldError match>{errors.password}</FieldError> : null}
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={busy} />}>{t.cancel}</DialogClose>
            <Button type="submit" variant="primary" loading={busy}>
              {t.sendConfirmation}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
