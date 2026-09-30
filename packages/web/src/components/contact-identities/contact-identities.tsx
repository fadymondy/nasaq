"use client";

import { BadgeCheck, Copy, Link2, Plus, Star, Trash2 } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { ContextMenuActions } from "../context-menu";
import { Field, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Switch } from "../switch";
import {
  CONTACT_CHANNELS,
  CONTACT_CONSENT_CHANNELS,
  type ContactChannel,
  type ContactConsentStatus,
  type ContactIdentityIssue,
  contactIdentityKey,
  sortContactIdentities,
  validateContactIdentity,
} from "./contact-identities-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    title: "Linked accounts",
    description: "Every address, number and handle this person uses. A message to any of them reaches the same contact.",
    empty: "No linked accounts",
    emptyHint: "Link an email, a phone number or a chat handle.",
    link: "Link an account",
    channel: "Channel",
    value: "Account",
    valuePlaceholder: "Address, number or @handle",
    label: "Label",
    labelPlaceholder: "Work, personal…",
    add: "Link",
    cancel: "Cancel",
    primary: "Primary",
    makePrimary: "Make primary",
    verified: "Verified",
    copy: "Copy",
    remove: "Unlink",
    removeTitle: (v: string) => `Unlink ${v}?`,
    removeBody: "New messages from this account will stop being matched to this contact.",
    consentTitle: "Consent by channel",
    consentDescription: "Whether this person agreed to be written to. Consent belongs to the channel, so it covers every account on it.",
    consentGranted: "Opted in",
    consentDenied: "Opted out",
    consentUnknown: "Not asked",
    consentSwitch: (c: string) => `Allow messages on ${c}`,
    consentNoAccount: "No account linked on this channel",
    since: "Since",
    via: "via",
    failed: "That did not work. Try again.",
    issues: {
      empty: "Enter the account.",
      email: "That is not a valid email address.",
      phone: "Enter the number with its country code.",
      duplicate: "This account is already linked.",
    } as Record<ContactIdentityIssue, string>,
    channels: {
      email: "Email",
      phone: "Phone",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      slack: "Slack",
      discord: "Discord",
      messenger: "Messenger",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      x: "X",
      chat: "Chat widget",
      other: "Other",
    } as Record<ContactChannel, string>,
  },
  ar: {
    title: "الحسابات المرتبطة",
    description: "كل عنوان ورقم ومعرّف يستخدمه هذا الشخص. أي رسالة من أي منها تصل إلى جهة الاتصال نفسها.",
    empty: "لا توجد حسابات مرتبطة",
    emptyHint: "اربط بريدًا أو رقم هاتف أو معرّف محادثة.",
    link: "ربط حساب",
    channel: "القناة",
    value: "الحساب",
    valuePlaceholder: "عنوان أو رقم أو @معرّف",
    label: "التسمية",
    labelPlaceholder: "عمل، شخصي…",
    add: "ربط",
    cancel: "إلغاء",
    primary: "أساسي",
    makePrimary: "اجعله أساسيًا",
    verified: "موثّق",
    copy: "نسخ",
    remove: "فك الربط",
    removeTitle: (v: string) => `فك ربط ${v}؟`,
    removeBody: "لن تُنسب الرسائل الجديدة من هذا الحساب إلى جهة الاتصال هذه.",
    consentTitle: "الموافقة حسب القناة",
    consentDescription: "هل وافق هذا الشخص على مراسلته. الموافقة تخص القناة، فتشمل كل حساب عليها.",
    consentGranted: "موافق",
    consentDenied: "رافض",
    consentUnknown: "لم يُسأل",
    consentSwitch: (c: string) => `السماح بالرسائل على ${c}`,
    consentNoAccount: "لا يوجد حساب مرتبط على هذه القناة",
    since: "منذ",
    via: "عبر",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    issues: {
      empty: "أدخل الحساب.",
      email: "هذا ليس بريدًا إلكترونيًا صالحًا.",
      phone: "أدخل الرقم مع رمز الدولة.",
      duplicate: "هذا الحساب مرتبط بالفعل.",
    } as Record<ContactIdentityIssue, string>,
    channels: {
      email: "البريد",
      phone: "الهاتف",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      slack: "Slack",
      discord: "Discord",
      messenger: "Messenger",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      x: "X",
      chat: "ودجة الدردشة",
      other: "أخرى",
    } as Record<ContactChannel, string>,
  },
};
export type ContactIdentitiesLabels = Omit<typeof STRINGS.en, "channels" | "issues"> & {
  channels: Record<ContactChannel, string>;
  issues: Record<ContactIdentityIssue, string>;
};
export type ContactIdentitiesLabelOverrides = Partial<Omit<ContactIdentitiesLabels, "channels" | "issues">> & {
  channels?: Partial<ContactIdentitiesLabels["channels"]>;
  issues?: Partial<ContactIdentitiesLabels["issues"]>;
};

/** Brand names stay as written in both languages; only the generic channels are translated. */
export function useContactIdentitiesLabels(labels?: ContactIdentitiesLabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { locale, t: { ...base, ...labels, channels: { ...base.channels, ...labels?.channels }, issues: { ...base.issues, ...labels?.issues } } as ContactIdentitiesLabels };
}

/* ------------------------------------------------------------------ types */

export interface ContactIdentity {
  id: string;
  channel: ContactChannel;
  /** The address, number or handle. Shown left to right. */
  value: string;
  label?: string;
  /** The account used first on its channel. */
  primary?: boolean;
  verified?: boolean;
}

export interface ContactConsent {
  status: ContactConsentStatus;
  at?: Date | string | number;
  /** Where it was given: "Signup form", "WhatsApp opt-in". */
  source?: string;
}

export type ContactIdentityResult = void | { error?: string };

export interface ContactIdentitiesProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  identities: ContactIdentity[];
  /** Consent per channel. Channels missing here show "Not asked". */
  consent?: Partial<Record<ContactChannel, ContactConsent>>;
  /** Channels the "Link an account" form offers. Default all. */
  channels?: readonly ContactChannel[];
  /** Channels that show a consent switch. Default email, WhatsApp and phone. */
  consentChannels?: readonly ContactChannel[];
  onAdd?: (input: { channel: ContactChannel; value: string; label?: string }) => Promise<ContactIdentityResult>;
  onRemove?: (identity: ContactIdentity) => Promise<ContactIdentityResult>;
  onSetPrimary?: (identity: ContactIdentity) => Promise<ContactIdentityResult>;
  /** Called when the switch is turned on (`"granted"`) or off (`"denied"`). */
  onConsentChange?: (channel: ContactChannel, status: "granted" | "denied") => Promise<ContactIdentityResult>;
  readOnly?: boolean;
  labels?: ContactIdentitiesLabelOverrides;
}

/* ------------------------------------------------------------------ pieces */

/** The consent line for one channel: the state as a word, and when and how it was given. */
export function ContactConsentStatusText({ consent, labels }: { consent?: ContactConsent; labels?: ContactIdentitiesLabelOverrides }) {
  const { t } = useContactIdentitiesLabels(labels);
  const status = consent?.status ?? "unknown";
  const word = status === "granted" ? t.consentGranted : status === "denied" ? t.consentDenied : t.consentUnknown;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
      <Badge variant={status === "granted" ? "success" : status === "denied" ? "danger" : "outline"}>{word}</Badge>
      {consent?.at ? (
        <span>
          {t.since} <DateTime value={consent.at} />
        </span>
      ) : null}
      {consent?.source ? (
        <span>
          {t.via} {consent.source}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ component */

/**
 * The accounts a contact writes from (many emails, numbers, handles), one primary per channel, plus consent per
 * channel. Linking, unlinking, choosing a primary and changing consent are async callbacks; errors they return show
 * inline. Each account's actions also open as a context menu.
 */
export function ContactIdentities({
  identities,
  consent,
  channels = CONTACT_CHANNELS,
  consentChannels = CONTACT_CONSENT_CHANNELS,
  onAdd,
  onRemove,
  onSetPrimary,
  onConsentChange,
  readOnly = false,
  labels,
  className,
  ...props
}: ContactIdentitiesProps) {
  const { t } = useContactIdentitiesLabels(labels);
  const id = useId();
  const sorted = useMemo(() => sortContactIdentities(identities), [identities]);
  const [adding, setAdding] = useState(false);
  const [channel, setChannel] = useState<ContactChannel>(channels[0] ?? "email");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [issue, setIssue] = useState<ContactIdentityIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ContactIdentity | null>(null);

  const run = async (key: string, task: () => Promise<ContactIdentityResult>) => {
    setBusy(key);
    setError(null);
    try {
      const result = await task();
      if (result && result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch {
      setError(t.failed);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    const found = validateContactIdentity(channel, value, identities);
    setIssue(found);
    if (found || !onAdd) return;
    const ok = await run("add", () => onAdd({ channel, value: value.trim(), label: label.trim() || undefined }));
    if (ok) {
      setValue("");
      setLabel("");
      setAdding(false);
    }
  };

  const canPrimary = (identity: ContactIdentity) => !!onSetPrimary && !identity.primary && identities.some((i) => i.channel === identity.channel && i.id !== identity.id);

  const actionsFor = (identity: ContactIdentity) => [
    ...(canPrimary(identity) ? [{ id: "primary", label: t.makePrimary, icon: Star, onSelect: () => void run(`primary-${identity.id}`, () => onSetPrimary!(identity)) }] : []),
    { id: "copy", label: t.copy, icon: Copy, onSelect: () => void navigator.clipboard?.writeText(identity.value) },
    ...(onRemove ? [{ id: "remove", label: t.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => setRemoving(identity) }] : []),
  ];

  return (
    <section data-slot="contact-identities" aria-labelledby={`${id}-title`} className={cn("flex min-w-0 flex-col gap-6", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 id={`${id}-title`} className="text-title-sm text-foreground">
              {t.title}
            </h3>
            <p className="text-body-sm text-muted-foreground">{t.description}</p>
          </div>
          {!readOnly && onAdd && !adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              {t.link}
            </Button>
          ) : null}
        </header>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        {adding ? (
          <form
            data-slot="contact-identities-form"
            className="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-[10rem_1fr_9rem_auto] sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Field>
              <FieldLabel>{t.channel}</FieldLabel>
              <Select items={channels.map((c) => ({ value: c, label: t.channels[c] }))} value={channel} onValueChange={(v) => v && setChannel(v as ContactChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t.channels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field invalid={!!issue}>
              <FieldLabel>{t.value}</FieldLabel>
              <Input
                ltr
                autoFocus
                value={value}
                placeholder={t.valuePlaceholder}
                aria-describedby={issue ? `${id}-issue` : undefined}
                onChange={(e) => {
                  setValue(e.target.value);
                  setIssue(null);
                }}
              />
              {issue ? (
                <p id={`${id}-issue`} role="alert" className="text-caption text-destructive">
                  {t.issues[issue]}
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>{t.label}</FieldLabel>
              <Input value={label} placeholder={t.labelPlaceholder} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <div className="flex gap-2 sm:mt-6">
              <Button type="submit" variant="primary" loading={busy === "add"}>
                {t.add}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setIssue(null);
                }}
              >
                {t.cancel}
              </Button>
            </div>
          </form>
        ) : null}

        {sorted.length === 0 ? (
          <EmptyState title={t.empty} description={t.emptyHint} icon={Link2} className="border border-dashed border-border" />
        ) : (
          <ul aria-label={t.title} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {sorted.map((identity) => (
              <ContextMenuActions
                key={contactIdentityKey(identity.channel, identity.value)}
                actions={readOnly ? [] : actionsFor(identity)}
                render={<li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5" />}
              >
                <Badge variant="outline" className="min-w-20 justify-center">
                  {t.channels[identity.channel]}
                </Badge>
                <bdi dir="ltr" className="min-w-0 flex-1 truncate text-body tabular-nums text-foreground">
                  {identity.value}
                </bdi>
                {identity.label ? <span className="text-caption text-muted-foreground">{identity.label}</span> : null}
                {identity.verified ? (
                  <span className="inline-flex items-center gap-1 text-caption text-nq-success-text">
                    <BadgeCheck aria-hidden className="size-3.5" />
                    {t.verified}
                  </span>
                ) : null}
                {identity.primary ? (
                  <Badge variant="brand">
                    <Star aria-hidden />
                    {t.primary}
                  </Badge>
                ) : null}
                {!readOnly ? (
                  <span className="ms-auto flex items-center gap-1">
                    {canPrimary(identity) ? (
                      <Button size="sm" variant="ghost" loading={busy === `primary-${identity.id}`} onClick={() => void run(`primary-${identity.id}`, () => onSetPrimary!(identity))}>
                        {t.makePrimary}
                      </Button>
                    ) : null}
                    {onRemove ? (
                      <Button size="icon-sm" variant="ghost" aria-label={`${t.remove} ${identity.value}`} onClick={() => setRemoving(identity)}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </span>
                ) : null}
              </ContextMenuActions>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-col gap-0.5">
          <h3 className="text-title-sm text-foreground">{t.consentTitle}</h3>
          <p className="text-body-sm text-muted-foreground">{t.consentDescription}</p>
        </header>
        <ul aria-label={t.consentTitle} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
          {consentChannels.map((c) => {
            const state = consent?.[c];
            const hasAccount = identities.some((i) => i.channel === c);
            return (
              <li key={c} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-label text-foreground">{t.channels[c]}</span>
                  {hasAccount ? <ContactConsentStatusText consent={state} labels={labels} /> : <span className="text-caption text-muted-foreground">{t.consentNoAccount}</span>}
                </div>
                <Switch
                  aria-label={t.consentSwitch(t.channels[c])}
                  checked={state?.status === "granted"}
                  disabled={readOnly || !onConsentChange || !hasAccount || busy === `consent-${c}`}
                  onCheckedChange={(next) => void run(`consent-${c}`, async () => onConsentChange?.(c, next ? "granted" : "denied"))}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.removeTitle(removing?.value ?? "")}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = removing;
                if (target && onRemove) void run(`remove-${target.id}`, () => onRemove(target));
              }}
            >
              {t.remove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
