"use client";

import { CalendarClock, Lock, Mail, MoonStar, Plus, Send, Trash2, Webhook } from "lucide-react";
import { type ComponentProps, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { SettingsSection } from "../account-settings";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { TimePicker } from "../date-picker";
import type { DesktopPermission } from "../desktop-notification";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { formatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import {
  type Batching,
  capProblem,
  channelState,
  DEFAULT_PREFS,
  type DestinationKind,
  destinationProblem,
  effectiveOn,
  isLocked,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationDestination,
  type NotificationKind,
  type NotificationPrefs,
  nextDigest,
  quietMinutes,
  setCell,
  setChannel,
} from "./notification-rules";

export { DEFAULT_PREFS, NOTIFICATION_CHANNELS, channelState, isQuietNow, nextDigest, quietMinutes, setCell, setChannel } from "./notification-rules";
export type { Batching, DestinationKind, DigestSchedule, NotificationChannel, NotificationDestination, NotificationKind, NotificationMatrix, NotificationPrefs, QuietHours } from "./notification-rules";

const STRINGS = {
  en: {
    matrixTitle: "What to notify me about",
    matrixBody: "Choose where each kind of notification reaches you.",
    matrixLabel: "Notifications by kind and channel",
    kind: "Notification",
    channels: { email: "Email", push: "Push", whatsapp: "WhatsApp", desktop: "Desktop" } as Record<NotificationChannel, string>,
    cell: (kind: string, channel: string) => `${kind}: ${channel}`,
    all: (channel: string) => `Turn ${channel} on or off for every kind`,
    locked: "Always on, it cannot be turned off",
    unavailable: "Not available",
    // push
    pushAsking: "Waiting for your browser to answer",
    pushBlocked: "Browser notifications are blocked. Allow them in your browser's site settings, then try again.",
    pushDenied: "Push was not turned on because the browser permission was not granted.",
    pushUnsupported: "This browser does not support push notifications.",
    pushNeeded: "The browser will ask for permission the first time you turn push on.",
    // saving
    saving: "Saving",
    saved: "Saved",
    failed: "That did not save, so it was put back. Try again.",
    dismiss: "Dismiss",
    // quiet hours
    quietTitle: "Quiet hours",
    quietBody: "Hold notifications while you are away. They arrive when the quiet hours end.",
    quietSwitch: "Turn on quiet hours",
    from: "From",
    to: "Until",
    quietLength: (h: string) => `${h} quiet each day`,
    quietOvernight: "Ends the next day",
    quietNone: "Start and end are the same, so nothing is held.",
    quietUrgent: "Security notices always come through.",
    // limits
    limitsTitle: "Volume",
    limitsBody: "Keep the number of notifications under control.",
    capSwitch: "Limit notifications per day",
    capLabel: "Most per day",
    capHelp: "Beyond this, the rest wait for your digest.",
    capError: "Enter a whole number from 1 to 1,000.",
    batching: "Delivery",
    batchingOptions: { instant: "Send each one at once", hourly: "Group them every hour", daily: "Group them once a day" } as Record<Batching, string>,
    // digest
    digestTitle: "Digest",
    digestBody: "One summary of what you missed.",
    digestSwitch: "Send me a digest",
    frequency: "How often",
    daily: "Every day",
    weekly: "Every week",
    day: "Day",
    at: "Time",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    nextDigest: "Next digest",
    // destinations
    destTitle: "Delivery destinations",
    destBody: "Send notifications to an extra email address or a webhook.",
    destEmpty: "No extra destinations yet.",
    destKind: "Type",
    destTarget: "Address",
    destEmail: "Email",
    destWebhook: "Webhook",
    destEmailPlaceholder: "team@example.com",
    destWebhookPlaceholder: "https://hooks.example.com/nasaq",
    add: "Add destination",
    remove: "Remove",
    removeTitle: (target: string) => `Remove ${target}?`,
    removeBody: "Notifications stop going there right away.",
    verified: "Verified",
    pending: "Waiting for confirmation",
    test: "Send a test",
    testing: "Sending",
    testOk: "The test was delivered.",
    testFailed: "The test failed.",
    problem: {
      empty: "Enter an address.",
      email: "Enter a valid email address.",
      url: "Enter a valid URL.",
      https: "Webhooks must use https.",
    } as Record<string, string>,
    destFailed: "That destination could not be changed. Try again.",
  },
  ar: {
    matrixTitle: "بماذا نُنبّهك",
    matrixBody: "اختر أين يصلك كل نوع من الإشعارات.",
    matrixLabel: "الإشعارات حسب النوع والقناة",
    kind: "الإشعار",
    channels: { email: "البريد", push: "الدفع", whatsapp: "واتساب", desktop: "سطح المكتب" } as Record<NotificationChannel, string>,
    cell: (kind: string, channel: string) => `${kind}: ${channel}`,
    all: (channel: string) => `تشغيل أو إيقاف ${channel} لكل الأنواع`,
    locked: "مفعّل دائمًا ولا يمكن إيقافه",
    unavailable: "غير متاح",
    pushAsking: "بانتظار ردّ المتصفح",
    pushBlocked: "إشعارات المتصفح محظورة. اسمح بها من إعدادات الموقع في متصفحك ثم حاول مرة أخرى.",
    pushDenied: "لم يُفعَّل الدفع لأن إذن المتصفح لم يُمنح.",
    pushUnsupported: "هذا المتصفح لا يدعم إشعارات الدفع.",
    pushNeeded: "سيطلب المتصفح الإذن أول مرة تفعّل فيها الدفع.",
    saving: "جارٍ الحفظ",
    saved: "تم الحفظ",
    failed: "لم يُحفظ ذلك فأُعيد كما كان. حاول مرة أخرى.",
    dismiss: "إغلاق",
    quietTitle: "ساعات الهدوء",
    quietBody: "احتفظ بالإشعارات أثناء غيابك. تصلك عند انتهاء ساعات الهدوء.",
    quietSwitch: "تشغيل ساعات الهدوء",
    from: "من",
    to: "حتى",
    quietLength: (h: string) => `${h} هدوء كل يوم`,
    quietOvernight: "تنتهي في اليوم التالي",
    quietNone: "البداية والنهاية متساويتان فلا يُحتجز شيء.",
    quietUrgent: "إشعارات الأمان تصل دائمًا.",
    limitsTitle: "الكمية",
    limitsBody: "تحكّم في عدد الإشعارات.",
    capSwitch: "تحديد عدد الإشعارات يوميًا",
    capLabel: "الحد الأقصى يوميًا",
    capHelp: "ما زاد عن ذلك ينتظر ملخّصك.",
    capError: "أدخل عددًا صحيحًا من 1 إلى 1000.",
    batching: "طريقة التسليم",
    batchingOptions: { instant: "أرسل كل إشعار فورًا", hourly: "اجمعها كل ساعة", daily: "اجمعها مرة في اليوم" } as Record<Batching, string>,
    digestTitle: "الملخّص",
    digestBody: "ملخص واحد لما فاتك.",
    digestSwitch: "أرسل لي ملخصًا",
    frequency: "التكرار",
    daily: "كل يوم",
    weekly: "كل أسبوع",
    day: "اليوم",
    at: "الوقت",
    weekdays: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    nextDigest: "الملخّص القادم",
    destTitle: "وجهات التسليم",
    destBody: "أرسل الإشعارات إلى بريد إضافي أو إلى webhook.",
    destEmpty: "لا توجد وجهات إضافية بعد.",
    destKind: "النوع",
    destTarget: "العنوان",
    destEmail: "بريد إلكتروني",
    destWebhook: "Webhook",
    destEmailPlaceholder: "team@example.com",
    destWebhookPlaceholder: "https://hooks.example.com/nasaq",
    add: "إضافة وجهة",
    remove: "إزالة",
    removeTitle: (target: string) => `إزالة ${target}؟`,
    removeBody: "تتوقف الإشعارات عن الذهاب إليها فورًا.",
    verified: "موثّق",
    pending: "بانتظار التأكيد",
    test: "إرسال اختبار",
    testing: "جارٍ الإرسال",
    testOk: "وصل الاختبار.",
    testFailed: "فشل الاختبار.",
    problem: {
      empty: "أدخل عنوانًا.",
      email: "أدخل بريدًا إلكترونيًا صحيحًا.",
      url: "أدخل رابطًا صحيحًا.",
      https: "يجب أن يستخدم الـ webhook بروتوكول https.",
    } as Record<string, string>,
    destFailed: "تعذّر تغيير هذه الوجهة. حاول مرة أخرى.",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type NotificationPreferencesLabels = Partial<typeof STRINGS.en>;
type T = ReturnType<typeof strings>;

export type NotificationSaveResult = void | { error?: string };

export interface NotificationPreferencesProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  kinds: readonly NotificationKind[];
  /** Channels to show, in order. Default email, push, WhatsApp and desktop. */
  channels?: readonly NotificationChannel[];
  /** A channel that cannot be used yet, with the reason, for example `{ whatsapp: "Add a WhatsApp number first" }`. Its column is locked. */
  unavailable?: Partial<Record<NotificationChannel, string>>;
  value: NotificationPrefs;
  /**
   * Save the new preferences. The screen updates at once and goes back to the last saved state if this
   * rejects or resolves `{ error }`. Saves run one after another.
   */
  onChange: (next: NotificationPrefs) => Promise<NotificationSaveResult>;
  /** The browser permission for push. When it is not `"granted"`, turning push on asks for it first. */
  pushPermission?: DesktopPermission;
  /** Ask the browser for permission (call `Notification.requestPermission()`), resolving the answer. */
  onRequestPush?: () => Promise<DesktopPermission>;
  /** Extra delivery destinations. Omit to hide the section. */
  destinations?: readonly NotificationDestination[];
  onAddDestination?: (values: { kind: DestinationKind; target: string }) => Promise<void | { error?: string }>;
  onRemoveDestination?: (destination: NotificationDestination) => Promise<void | { error?: string }>;
  /** Send a test to one destination. Resolve `{ ok: false, message }` when it fails. */
  onTestDestination?: (destination: NotificationDestination) => Promise<{ ok: boolean; message?: string }>;
  /** Show the sections. Default all of them. */
  sections?: readonly ("matrix" | "quiet" | "limits" | "digest" | "destinations")[];
  /** Clock used for the "Next digest" line. Default the current time. */
  now?: Date;
  labels?: NotificationPreferencesLabels;
}

/**
 * Notification preferences: a matrix of kinds by channel (email, push, WhatsApp, desktop), quiet hours, a
 * daily cap with batching, a digest schedule and extra destinations (email or webhook) with a test send.
 * Every change saves at once and is rolled back if saving fails. Turning push on asks the browser first.
 */
export function NotificationPreferences({
  kinds,
  channels = NOTIFICATION_CHANNELS,
  unavailable,
  value,
  onChange,
  pushPermission,
  onRequestPush,
  destinations,
  onAddDestination,
  onRemoveDestination,
  onTestDestination,
  sections = ["matrix", "quiet", "limits", "digest", "destinations"],
  now,
  labels,
  className,
  ...props
}: NotificationPreferencesProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [draft, setDraft] = useState<NotificationPrefs>({ ...DEFAULT_PREFS, ...value });
  const savedRef = useRef<NotificationPrefs>(draft);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const pending = useRef(0);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [notice, setNotice] = useState<{ tone: "danger" | "warning" | "info"; text: string } | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (pending.current === 0) {
      const next = { ...DEFAULT_PREFS, ...value };
      savedRef.current = next;
      setDraft(next);
    }
  }, [value]);

  const commit = (next: NotificationPrefs) => {
    setDraft(next);
    setNotice(null);
    setState("saving");
    const gen = generation.current;
    pending.current += 1;
    chain.current = chain.current.then(async () => {
      let ok = true;
      try {
        if (gen !== generation.current) return; // an earlier save failed and this one was rolled back with it
        const result = await onChange(next);
        if (result && typeof result === "object" && result.error) throw new Error(result.error);
        savedRef.current = next;
      } catch (e) {
        ok = false;
        generation.current += 1;
        setDraft(savedRef.current);
        setNotice({ tone: "danger", text: e instanceof Error && e.message ? e.message : t.failed });
      } finally {
        pending.current -= 1;
        if (pending.current === 0) setState(ok && gen === generation.current ? "saved" : "idle");
      }
    });
  };

  const pushBlocked = pushPermission === "denied" || pushPermission === "unsupported";
  const reasonFor = (channel: NotificationChannel) =>
    unavailable?.[channel] ?? (channel === "push" && pushPermission === "denied" ? t.pushBlocked : channel === "push" && pushPermission === "unsupported" ? t.pushUnsupported : undefined);
  const needsAsk = pushPermission !== undefined && pushPermission !== "granted" && !pushBlocked && !!onRequestPush;

  /** Turning any push cell on asks the browser first; if it says no, nothing changes. */
  const change = async (channel: NotificationChannel, on: boolean, apply: (p: NotificationPrefs) => NotificationPrefs) => {
    if (channel === "push" && on && needsAsk) {
      setAsking(true);
      setNotice({ tone: "info", text: t.pushAsking });
      try {
        const answer = await onRequestPush!();
        if (answer !== "granted") {
          setNotice({ tone: "warning", text: answer === "denied" ? t.pushBlocked : t.pushDenied });
          return;
        }
      } catch {
        setNotice({ tone: "warning", text: t.pushDenied });
        return;
      } finally {
        setAsking(false);
      }
    }
    commit(apply(draftRef.current));
  };
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const has = (s: (typeof sections)[number]) => sections.includes(s);
  const status = state === "saving" ? t.saving : state === "saved" ? t.saved : "";

  return (
    <div data-slot="notification-preferences" className={cn("flex flex-col gap-6", className)} {...props}>
      <div role="status" aria-live="polite" className="-mb-3 h-4 text-end text-caption text-muted-foreground">
        {status}
      </div>
      {notice ? (
        <Alert tone={notice.tone} role={notice.tone === "danger" ? "alert" : "status"} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}

      {has("matrix") ? (
        <SettingsSection title={t.matrixTitle} description={t.matrixBody}>
          <div className="overflow-x-auto">
            <table data-slot="notification-matrix" aria-label={t.matrixLabel} className="w-full min-w-[30rem] border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pe-3 text-start text-caption font-medium text-muted-foreground">
                    {t.kind}
                  </th>
                  {channels.map((c) => {
                    const reason = reasonFor(c);
                    const cs = channelState(draft, kinds, c);
                    return (
                      <th key={c} scope="col" className="w-24 px-2 py-2 text-center align-bottom font-medium">
                        <span className="flex flex-col items-center gap-1.5">
                          <span className="text-label text-foreground">{t.channels[c]}</span>
                          <Checkbox
                            checked={cs === "all"}
                            indeterminate={cs === "some"}
                            disabled={!!reason || asking}
                            aria-label={t.all(t.channels[c])}
                            onCheckedChange={(on) => void change(c, on, (p) => setChannel(p, kinds, c, on))}
                          />
                          {reason ? <span className="text-caption font-normal text-muted-foreground">{reason}</span> : null}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {kinds.map((k, i) => (
                  <Fragment key={k.id}>
                    {k.group && k.group !== kinds[i - 1]?.group ? (
                      <tr>
                        <th scope="colgroup" colSpan={channels.length + 1} className="pb-1 pt-4 text-start text-caption font-medium uppercase tracking-wide text-muted-foreground">
                          {k.group}
                        </th>
                      </tr>
                    ) : null}
                    <tr className="border-b border-border last:border-b-0">
                      <th scope="row" className="py-3 pe-3 text-start font-normal">
                        <span className="block text-label text-foreground">{k.label}</span>
                        {k.description ? <span className="block text-caption text-muted-foreground">{k.description}</span> : null}
                      </th>
                      {channels.map((c) => {
                        const locked = isLocked(k, c);
                        const reason = reasonFor(c);
                        return (
                          <td key={c} className="px-2 py-3 text-center">
                            <span className="inline-flex items-center justify-center" title={locked ? t.locked : reason}>
                              <Checkbox
                                checked={effectiveOn(draft, k, c)}
                                disabled={locked || !!reason || asking}
                                aria-label={t.cell(k.label, t.channels[c])}
                                onCheckedChange={(on) => void change(c, on, (p) => setCell(p, k, c, on))}
                              />
                              {locked ? <Lock aria-hidden className="ms-1 size-3 text-muted-foreground" /> : null}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {needsAsk && channels.includes("push") ? <p className="mt-3 text-caption text-muted-foreground">{t.pushNeeded}</p> : null}
        </SettingsSection>
      ) : null}

      {has("quiet") ? <QuietHoursSection t={t} locale={locale} prefs={draft} commit={commit} /> : null}
      {has("limits") ? <LimitsSection t={t} locale={locale} prefs={draft} commit={commit} /> : null}
      {has("digest") ? <DigestSection t={t} locale={locale} prefs={draft} commit={commit} now={now} /> : null}
      {has("destinations") && destinations ? (
        <DestinationsSection t={t} destinations={destinations} onAdd={onAddDestination} onRemove={onRemoveDestination} onTest={onTestDestination} />
      ) : null}
    </div>
  );
}

interface SectionProps {
  t: T;
  locale: string;
  prefs: NotificationPrefs;
  commit: (next: NotificationPrefs) => void;
}

function QuietHoursSection({ t, locale, prefs, commit }: SectionProps) {
  const q = prefs.quietHours;
  const minutes = quietMinutes(q);
  const hours = minutes / 60;
  const set = (patch: Partial<typeof q>) => commit({ ...prefs, quietHours: { ...q, ...patch } });
  return (
    <SettingsSection title={t.quietTitle} description={t.quietBody}>
      <div className="flex flex-col gap-4">
        <label className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-label text-foreground">
            <MoonStar aria-hidden className="size-4 text-muted-foreground" />
            {t.quietSwitch}
          </span>
          <Switch checked={q.enabled} onCheckedChange={(on) => set({ enabled: on })} />
        </label>
        {q.enabled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.from}</FieldLabel>
                <TimePicker value={q.from} onValueChange={(v) => v && set({ from: v })} aria-label={t.from} />
              </Field>
              <Field>
                <FieldLabel>{t.to}</FieldLabel>
                <TimePicker value={q.to} onValueChange={(v) => v && set({ to: v })} aria-label={t.to} />
              </Field>
            </div>
            <p className="text-body-sm text-muted-foreground" data-slot="quiet-summary">
              {minutes === 0 ? t.quietNone : `${t.quietLength(formatNumber(Math.round(hours * 10) / 10, locale))}${q.from > q.to ? `. ${t.quietOvernight}` : ""}`}
              {minutes === 0 ? "" : `. ${t.quietUrgent}`}
            </p>
          </>
        ) : null}
      </div>
    </SettingsSection>
  );
}

function LimitsSection({ t, prefs, commit }: SectionProps) {
  const [text, setText] = useState(prefs.dailyCap === null ? "" : String(prefs.dailyCap));
  const [touched, setTouched] = useState(false);
  useEffect(() => setText(prefs.dailyCap === null ? "" : String(prefs.dailyCap)), [prefs.dailyCap]);
  const on = prefs.dailyCap !== null;
  const bad = capProblem(text) !== null || (on && text.trim() === "");
  const save = () => {
    setTouched(true);
    if (bad) return;
    const n = Number(text);
    if (n !== prefs.dailyCap) commit({ ...prefs, dailyCap: n });
  };
  return (
    <SettingsSection title={t.limitsTitle} description={t.limitsBody}>
      <div className="flex flex-col gap-4">
        <label className="flex items-center justify-between gap-4">
          <span className="text-label text-foreground">{t.capSwitch}</span>
          <Switch
            checked={on}
            onCheckedChange={(next) => {
              setTouched(false);
              commit({ ...prefs, dailyCap: next ? 20 : null });
            }}
          />
        </label>
        {on ? (
          <Field invalid={touched && bad}>
            <FieldLabel>{t.capLabel}</FieldLabel>
            <Input
              dir="ltr"
              inputMode="numeric"
              value={text}
              className="w-32"
              onChange={(e) => setText(e.currentTarget.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            {touched && bad ? <FieldError match>{t.capError}</FieldError> : <FieldDescription>{t.capHelp}</FieldDescription>}
          </Field>
        ) : null}
        <Field>
          <FieldLabel>{t.batching}</FieldLabel>
          <Select
            items={(["instant", "hourly", "daily"] as const).map((b) => ({ value: b, label: t.batchingOptions[b] }))}
            value={prefs.batching}
            onValueChange={(v) => v && commit({ ...prefs, batching: v as Batching })}
          >
            <SelectTrigger aria-label={t.batching} className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["instant", "hourly", "daily"] as const).map((b) => (
                <SelectItem key={b} value={b}>
                  {t.batchingOptions[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </SettingsSection>
  );
}

function DigestSection({ t, locale, prefs, commit, now }: SectionProps & { now?: Date }) {
  const d = prefs.digest;
  const set = (patch: Partial<typeof d>) => commit({ ...prefs, digest: { ...d, ...patch } });
  const next = useMemo(() => nextDigest(d, now ?? new Date()), [d, now]);
  return (
    <SettingsSection title={t.digestTitle} description={t.digestBody}>
      <div className="flex flex-col gap-4">
        <label className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-label text-foreground">
            <CalendarClock aria-hidden className="size-4 text-muted-foreground" />
            {t.digestSwitch}
          </span>
          <Switch checked={d.enabled} onCheckedChange={(on) => set({ enabled: on })} />
        </label>
        {d.enabled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t.frequency}</FieldLabel>
                <Select
                  items={[
                    { value: "daily", label: t.daily },
                    { value: "weekly", label: t.weekly },
                  ]}
                  value={d.frequency}
                  onValueChange={(v) => v && set({ frequency: v as "daily" | "weekly" })}
                >
                  <SelectTrigger aria-label={t.frequency}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t.daily}</SelectItem>
                    <SelectItem value="weekly">{t.weekly}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {d.frequency === "weekly" ? (
                <Field>
                  <FieldLabel>{t.day}</FieldLabel>
                  <Select items={t.weekdays.map((w, i) => ({ value: String(i), label: w }))} value={String(d.day)} onValueChange={(v) => v !== null && set({ day: Number(v) })}>
                    <SelectTrigger aria-label={t.day}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {t.weekdays.map((w, i) => (
                        <SelectItem key={w} value={String(i)}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field>
                <FieldLabel>{t.at}</FieldLabel>
                <TimePicker value={d.time} onValueChange={(v) => v && set({ time: v })} aria-label={t.at} />
              </Field>
            </div>
            {next ? (
              <p className="text-body-sm text-muted-foreground">
                {t.nextDigest}:{" "}
                <time dateTime={next.toISOString()} className="text-foreground">
                  {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(next)}
                </time>
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </SettingsSection>
  );
}

function DestinationsSection({
  t,
  destinations,
  onAdd,
  onRemove,
  onTest,
}: {
  t: T;
  destinations: readonly NotificationDestination[];
  onAdd?: NotificationPreferencesProps["onAddDestination"];
  onRemove?: NotificationPreferencesProps["onRemoveDestination"];
  onTest?: NotificationPreferencesProps["onTestDestination"];
}) {
  const [kind, setKind] = useState<DestinationKind>("email");
  const [target, setTarget] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [error, setError] = useState<string | null>(null);

  const problem = destinationProblem(kind, target);
  const shown = serverError ?? (attempted && problem ? t.problem[problem] : undefined);

  const add = async () => {
    setAttempted(true);
    setServerError(null);
    if (problem || !onAdd) return;
    setAdding(true);
    try {
      const result = await onAdd({ kind, target: target.trim() });
      if (result && typeof result === "object" && result.error) setServerError(result.error);
      else {
        setTarget("");
        setAttempted(false);
      }
    } catch {
      setServerError(t.destFailed);
    } finally {
      setAdding(false);
    }
  };

  const test = async (d: NotificationDestination) => {
    setTesting(d.id);
    try {
      const r = await onTest!(d);
      setResults((s) => ({ ...s, [d.id]: { ok: r.ok, text: r.ok ? t.testOk : (r.message ?? t.testFailed) } }));
    } catch {
      setResults((s) => ({ ...s, [d.id]: { ok: false, text: t.testFailed } }));
    } finally {
      setTesting(null);
    }
  };

  const remove = async (d: NotificationDestination) => {
    setError(null);
    try {
      const r = await onRemove?.(d);
      if (r && typeof r === "object" && r.error) setError(r.error);
    } catch {
      setError(t.destFailed);
    }
  };

  return (
    <SettingsSection title={t.destTitle} description={t.destBody}>
      <div className="flex flex-col gap-4" data-slot="notification-destinations">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {destinations.length ? (
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
            {destinations.map((d) => {
              const Icon = d.kind === "email" ? Mail : Webhook;
              const r = results[d.id];
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <bdi dir="ltr" className="truncate text-body-sm text-foreground">
                      {d.target}
                    </bdi>
                    <span className="text-caption text-muted-foreground">{d.label ?? (d.kind === "email" ? t.destEmail : t.destWebhook)}</span>
                  </div>
                  {d.kind === "email" ? <Badge variant={d.verified ? "success" : "warning"}>{d.verified ? t.verified : t.pending}</Badge> : null}
                  {onTest ? (
                    <Button size="sm" variant="secondary" loading={testing === d.id} onClick={() => void test(d)}>
                      <Send className="rtl:-scale-x-100" />
                      {t.test}
                    </Button>
                  ) : null}
                  {onRemove ? (
                    <ConfirmButton size="sm" variant="ghost" title={t.removeTitle(d.target)} description={t.removeBody} confirmLabel={t.remove} onConfirm={() => remove(d)}>
                      <Trash2 />
                      {t.remove}
                    </ConfirmButton>
                  ) : null}
                  {r ? (
                    <p role="status" className={cn("basis-full text-caption", r.ok ? "text-nq-success-text" : "text-nq-danger-text")}>
                      {r.text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.destEmpty}</p>
        )}
        {onAdd ? (
          <form
            noValidate
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Field className="sm:w-40">
              <FieldLabel>{t.destKind}</FieldLabel>
              <Select
                items={[
                  { value: "email", label: t.destEmail },
                  { value: "webhook", label: t.destWebhook },
                ]}
                value={kind}
                onValueChange={(v) => {
                  if (v) {
                    setKind(v as DestinationKind);
                    setServerError(null);
                  }
                }}
              >
                <SelectTrigger aria-label={t.destKind}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">{t.destEmail}</SelectItem>
                  <SelectItem value="webhook">{t.destWebhook}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field invalid={!!shown} className="flex-1">
              <FieldLabel>{t.destTarget}</FieldLabel>
              <Input
                dir="ltr"
                value={target}
                autoCapitalize="none"
                spellCheck={false}
                placeholder={kind === "email" ? t.destEmailPlaceholder : t.destWebhookPlaceholder}
                disabled={adding}
                onChange={(e) => {
                  setTarget(e.currentTarget.value);
                  setServerError(null);
                }}
              />
              {shown ? <FieldError match>{shown}</FieldError> : null}
            </Field>
            <Button type="submit" variant="secondary" loading={adding} className="sm:mt-6">
              <Plus />
              {t.add}
            </Button>
          </form>
        ) : null}
      </div>
    </SettingsSection>
  );
}

