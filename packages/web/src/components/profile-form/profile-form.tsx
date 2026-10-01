"use client";

import { CircleCheck, CircleX, ExternalLink, Globe, MailCheck, MapPin, TriangleAlert } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { DEFAULT_LOCALES, useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Avatar } from "../avatar";
import { AvatarUpload, type AvatarUploadProps } from "../avatar-upload";
import { Badge } from "../badge";
import { Button } from "../button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { Icon } from "../icon";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../input-group";
import { formatNumber } from "../numeric";
import { PasswordInput } from "../password-input";
import { PhoneInput } from "../phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Separator } from "../separator";
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
    publicProfile: "Public profile",
    publicProfileHint: "Everyone can see this on your profile page.",
    account: "Account",
    accountHint: "Private. Used to sign in and to recover your account.",
    preferences: "Preferences",
    preferencesHint: "How dates, times and the interface are shown to you.",
    location: "Location",
    locationHelp: "City and country, as you want it shown.",
    website: "Website",
    websiteHelp: "Your site or portfolio.",
    websiteInvalid: "Enter a full link that starts with https://.",
    viewProfile: "View public profile",
    preview: "Profile preview",
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
    publicProfile: "الملف العام",
    publicProfileHint: "يراه الجميع في صفحة ملفك الشخصي.",
    account: "الحساب",
    accountHint: "خاص. يُستخدم لتسجيل الدخول واستعادة حسابك.",
    preferences: "التفضيلات",
    preferencesHint: "كيف تظهر لك التواريخ والأوقات والواجهة.",
    location: "الموقع",
    locationHelp: "المدينة والبلد، كما تريد أن يظهرا.",
    website: "الموقع الإلكتروني",
    websiteHelp: "موقعك أو معرض أعمالك.",
    websiteInvalid: "أدخل رابطًا كاملًا يبدأ بـ https://.",
    viewProfile: "عرض الملف العام",
    preview: "معاينة الملف",
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
  /** Shown on the public profile. Include the key (even as "") to show the field. */
  location?: string;
  /** A full https:// link shown on the public profile. Include the key (even as "") to show the field. */
  website?: string;
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
  /** Link to the public profile, shown under the preview as "View public profile". */
  profileHref?: string;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<ProfileLabels>;
}

/* ------------------------------------------------------------------ helpers */

const USERNAME = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const DIRTY_KEYS = ["name", "username", "phone", "bio", "locale", "timezone", "location", "website"] as const;

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
 * The "Profile" settings form, laid out like the public profile page: an identity column with the photo and a live
 * preview of the name, username, location, website and bio, beside grouped fields: Public profile (display name,
 * username with a live availability check, bio, and optional location and website), Account (email with verification
 * and a password-protected change, phone) and Preferences (language, time zone). The columns stack below 48rem of
 * container width. It tracks changes and shows a sticky Save / Discard bar only while something differs from the saved
 * values. Nothing is sent by the component: every action is an async callback you provide.
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
  profileHref,
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
  if (attempted && draft.website && !WEBSITE.test(draft.website.trim())) localErrors.website = t.websiteInvalid;
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
    if (blocked || !draft.name.trim() || !draft.username || (draft.website && !WEBSITE.test(draft.website.trim()))) return;
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
  const hasLocation = draft.location !== undefined;
  const hasWebsite = draft.website !== undefined;
  const shownName = draft.name.trim() || baseline.name;
  const site = draft.website?.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

  return (
    <form
      data-slot="profile-form"
      noValidate
      aria-busy={saving || undefined}
      className={cn("@container flex flex-col gap-6", className)}
      onSubmit={submit}
      {...props}
    >
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

      <div className="grid grid-cols-1 gap-8 @3xl:grid-cols-[16rem_minmax(0,1fr)] @3xl:gap-10">
        {/* The identity column: the photo and a live preview of what the public profile shows. */}
        <aside aria-label={t.preview} data-slot="profile-form-preview" className="flex min-w-0 flex-col gap-4 @3xl:sticky @3xl:top-6 @3xl:self-start">
          {avatar?.onChange ? (
            <AvatarUpload layout="stacked" name={shownName} disabled={disabled || saving} {...avatar} onChange={avatar.onChange} />
          ) : (
            <Avatar name={shownName} src={avatar?.src} className="size-32 text-h1 ring-1 ring-border @3xl:size-56 @3xl:text-display" />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p dir="auto" className="truncate text-h2 text-foreground">
              {shownName}
            </p>
            {draft.username ? (
              <p dir="ltr" className="truncate text-start font-mono text-body-sm text-muted-foreground">
                @{draft.username}
              </p>
            ) : null}
          </div>
          {draft.location?.trim() || site ? (
            <ul className="flex list-none flex-col gap-2 p-0 text-body-sm text-foreground">
              {draft.location?.trim() ? (
                <li className="flex min-w-0 items-center gap-2">
                  <Icon icon={MapPin} className="size-4 shrink-0 text-muted-foreground" />
                  <bdi className="truncate">{draft.location.trim()}</bdi>
                </li>
              ) : null}
              {site ? (
                <li className="flex min-w-0 items-center gap-2">
                  <Icon icon={Globe} className="size-4 shrink-0 text-muted-foreground" />
                  <span dir="ltr" className="truncate">
                    {site}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : null}
          {profileHref ? (
            <Button variant="secondary" className="w-full" nativeButton={false} render={<a href={profileHref} />}>
              {t.viewProfile}
              <Icon icon={ExternalLink} />
            </Button>
          ) : null}
          {draft.bio.trim() ? (
            <>
              <Separator />
              <p dir="auto" className="whitespace-pre-line text-pretty text-body-sm text-nq-fg-body">
                {draft.bio.trim()}
              </p>
            </>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <FormGroup title={t.publicProfile} description={t.publicProfileHint}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 @xl:grid-cols-2">
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

            {hasLocation || hasWebsite ? (
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 @xl:grid-cols-2">
                {hasLocation ? (
                  <Field invalid={!!errors.location}>
                    <FieldLabel>{t.location}</FieldLabel>
                    <Input
                      name="location"
                      autoComplete="address-level2"
                      disabled={disabled}
                      value={draft.location ?? ""}
                      onChange={(e) => set("location", e.target.value)}
                    />
                    {errors.location ? <FieldError match>{errors.location}</FieldError> : <FieldDescription>{t.locationHelp}</FieldDescription>}
                  </Field>
                ) : null}
                {hasWebsite ? (
                  <Field invalid={!!errors.website}>
                    <FieldLabel>{t.website}</FieldLabel>
                    <Input
                      ltr
                      type="url"
                      name="website"
                      autoComplete="url"
                      inputMode="url"
                      spellCheck={false}
                      placeholder="https://"
                      disabled={disabled}
                      value={draft.website ?? ""}
                      onChange={(e) => set("website", e.target.value)}
                    />
                    {errors.website ? <FieldError match>{errors.website}</FieldError> : <FieldDescription>{t.websiteHelp}</FieldDescription>}
                  </Field>
                ) : null}
              </div>
            ) : null}
          </FormGroup>

          <FormGroup title={t.account} description={t.accountHint}>
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
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 @xl:grid-cols-2">
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
          </FormGroup>

          <FormGroup title={t.preferences} description={t.preferencesHint}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 @xl:grid-cols-2">
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
          </FormGroup>
        </div>
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

/** A titled card of related fields, labelled by its heading. */
function FormGroup({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} data-slot="profile-form-group" className="flex flex-col gap-5 rounded-card border border-border bg-card p-4 @xl:p-6">
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-h3 text-foreground">
          {title}
        </h3>
        {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
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
