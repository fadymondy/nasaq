"use client";

import { ArrowRight, GitMerge, Info } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { type ContactChannel, type ContactConsentStatus, type ContactIdentity, mergeContactConsent } from "../contact-identities";
import { DateTime, Num } from "../numeric";
import { RadioCard, RadioGroup } from "../radio-group";
import {
  CONTACT_MERGE_ALL,
  type ContactMergeChoices,
  type ContactMergeField,
  type ContactMergeOutcome,
  type ContactMergeValue,
  contactMergeConflict,
  defaultContactMergeChoices,
  isEmptyMergeValue,
  rebaseContactMergeChoices,
  resolveContactMerge,
} from "./contact-merge-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    title: "Merge duplicate contacts",
    description: "Choose the record that stays, then pick which value survives wherever the records disagree.",
    survivor: "Keep this record",
    survivorHint: "Its history stays. The others are folded into it and deleted.",
    created: "Created",
    differ: (n: number) => (n === 1 ? "1 field differs" : `${n} fields differ`),
    noneDiffer: "Nothing to decide: the records do not disagree.",
    combineAll: "Combine all",
    combined: "Everything from every record",
    from: "from",
    empty: "Empty",
    same: "Same in every record",
    result: "After the merge",
    resultHint: "This is the contact that will exist.",
    moves: "Moves over",
    identities: "Linked accounts",
    consent: "Consent",
    consentNote: "If any record opted out, the merged contact stays opted out.",
    consentGranted: "Opted in",
    consentDenied: "Opted out",
    consentUnknown: "Not asked",
    merge: (n: number) => `Merge ${n} contacts`,
    cancel: "Cancel",
    confirmTitle: (name: string) => `Merge into ${name}?`,
    confirmBody: (n: number) => `${n === 1 ? "The other record is" : `The other ${n} records are`} deleted. This cannot be undone.`,
    confirm: "Merge",
    failed: "The merge did not go through. Nothing was changed.",
    needTwo: "Pick at least two contacts to merge.",
    fields: { name: "Name", email: "Email", phone: "Phone", company: "Company", jobTitle: "Job title", owner: "Owner", tags: "Tags" } as Record<string, string>,
    channels: { email: "Email", whatsapp: "WhatsApp", phone: "Phone" } as Record<string, string>,
  },
  ar: {
    title: "دمج جهات الاتصال المكرّرة",
    description: "اختر السجل الذي يبقى، ثم اختر القيمة التي تبقى في كل حقل تختلف فيه السجلات.",
    survivor: "أبقِ هذا السجل",
    survivorHint: "يبقى سجله كما هو. تُدمج السجلات الأخرى فيه وتُحذف.",
    created: "أُنشئ",
    differ: (n: number) => (n === 1 ? "حقل واحد مختلف" : `${n} حقول مختلفة`),
    noneDiffer: "لا شيء لتحسمه: السجلات متطابقة.",
    combineAll: "دمج الكل",
    combined: "كل ما في كل السجلات",
    from: "من",
    empty: "فارغ",
    same: "متطابق في كل السجلات",
    result: "بعد الدمج",
    resultHint: "هذه جهة الاتصال التي ستبقى.",
    moves: "ينتقل إليها",
    identities: "الحسابات المرتبطة",
    consent: "الموافقة",
    consentNote: "إذا رفض أي سجل، تبقى جهة الاتصال المدموجة رافضة.",
    consentGranted: "موافق",
    consentDenied: "رافض",
    consentUnknown: "لم يُسأل",
    merge: (n: number) => `دمج ${n} جهات اتصال`,
    cancel: "إلغاء",
    confirmTitle: (name: string) => `الدمج في ${name}؟`,
    confirmBody: (n: number) => `${n === 1 ? "يُحذف السجل الآخر" : `تُحذف السجلات الأخرى وعددها ${n}`}. لا يمكن التراجع.`,
    confirm: "دمج",
    failed: "لم يتم الدمج. لم يتغير شيء.",
    needTwo: "اختر جهتي اتصال على الأقل للدمج.",
    fields: { name: "الاسم", email: "البريد", phone: "الهاتف", company: "الشركة", jobTitle: "المسمى الوظيفي", owner: "المسؤول", tags: "الوسوم" } as Record<string, string>,
    channels: { email: "البريد", whatsapp: "WhatsApp", phone: "الهاتف" } as Record<string, string>,
  },
};
export type ContactMergeLabels = Omit<typeof STRINGS.en, "fields" | "channels"> & { fields: Record<string, string>; channels: Record<string, string> };
export type ContactMergeLabelOverrides = Partial<Omit<ContactMergeLabels, "fields" | "channels">> & { fields?: Record<string, string>; channels?: Record<string, string> };

/* ------------------------------------------------------------------ types */


/** One of the duplicate records. `values` is keyed by field id. */
export interface ContactMergeRecord {
  id: string;
  name: string;
  avatar?: string;
  values: Record<string, ContactMergeValue>;
  createdAt?: Date | string | number;
  /** Counts that move to the survivor: deals, notes, conversations. */
  stats?: { label: string; value: number }[];
  identities?: ContactIdentity[];
  /** Consent per channel. The merged contact keeps the safest answer. */
  consent?: Partial<Record<ContactChannel, ContactConsentStatus>>;
}

export type ContactMergeResult = void | { error?: string };

export interface ContactMergeProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  /** Two or more records believed to be the same person. */
  records: ContactMergeRecord[];
  /** The fields to compare. Default: name, email, phone, company, job title, owner and tags. */
  fields?: ContactMergeField[];
  /** The record that starts as the survivor. Default the first. */
  defaultSurvivorId?: string;
  /** Runs when the user confirms. Return `{ error }` to keep the dialog and show the message. */
  onMerge: (outcome: ContactMergeOutcome) => Promise<ContactMergeResult>;
  onCancel?: () => void;
  labels?: ContactMergeLabelOverrides;
}

const DEFAULT_FIELD_IDS: { id: string; multi?: boolean; ltr?: boolean }[] = [
  { id: "name" },
  { id: "email", ltr: true },
  { id: "phone", ltr: true },
  { id: "company" },
  { id: "jobTitle" },
  { id: "owner" },
  { id: "tags", multi: true },
];

const CONSENT_CHANNELS: ContactChannel[] = ["email", "whatsapp", "phone"];

function ValueText({ value, ltr, empty }: { value: ContactMergeValue; ltr?: boolean; empty: string }): ReactNode {
  if (isEmptyMergeValue(value)) return <span className="text-muted-foreground">{empty}</span>;
  const text = typeof value === "string" ? value : (value ?? []).join(", ");
  return ltr ? (
    <bdi dir="ltr" className="tabular-nums">
      {text}
    </bdi>
  ) : (
    <span dir="auto">{text}</span>
  );
}

/* ------------------------------------------------------------------ component */

/**
 * Fold duplicate contacts into one. The user keeps one record as the survivor, and for every field where the
 * records disagree picks whose value stays; lists (tags) are combined by default. A live "After the merge" panel
 * shows the result, what moves over and the consent that survives (an opt-out always wins). Confirming asks once,
 * then calls `onMerge`.
 */
export function ContactMerge({ records, fields, defaultSurvivorId, onMerge, onCancel, labels, className, ...props }: ContactMergeProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t: ContactMergeLabels = { ...base, ...labels, fields: { ...base.fields, ...labels?.fields }, channels: { ...base.channels, ...labels?.channels } };
  const id = useId();

  const fieldList = useMemo<ContactMergeField[]>(() => fields ?? DEFAULT_FIELD_IDS.map((f) => ({ ...f, label: t.fields[f.id] ?? f.id })), [fields, locale, JSON.stringify(labels?.fields)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [survivorId, setSurvivorId] = useState(defaultSurvivorId && records.some((r) => r.id === defaultSurvivorId) ? defaultSurvivorId : (records[0]?.id ?? ""));
  const [choices, setChoices] = useState<ContactMergeChoices>(() => defaultContactMergeChoices(fieldList, records, survivorId));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const survivor = records.find((r) => r.id === survivorId) ?? records[0];
  const conflicts = fieldList.filter((f) => contactMergeConflict(f, records));
  const identical = fieldList.filter((f) => !contactMergeConflict(f, records) && records.some((r) => !isEmptyMergeValue(r.values[f.id])));
  const outcome = resolveContactMerge(fieldList, records, survivorId, choices);
  const others = records.filter((r) => r.id !== survivorId);

  const pickSurvivor = (next: string) => {
    setChoices((c) => rebaseContactMergeChoices(fieldList, records, c, survivorId, next));
    setSurvivorId(next);
  };

  const totals = new Map<string, number>();
  for (const r of records) for (const s of r.stats ?? []) totals.set(s.label, (totals.get(s.label) ?? 0) + s.value);
  const accountCount = new Set(records.flatMap((r) => (r.identities ?? []).map((i) => `${i.channel}:${i.value.toLowerCase()}`))).size;
  const consentRows = CONSENT_CHANNELS.filter((c) => records.some((r) => r.consent?.[c]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await onMerge(outcome);
      if (result && result.error) {
        setError(result.error);
      } else {
        setConfirming(false);
      }
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  if (records.length < 2 || !survivor) return <Alert tone="info" data-slot="contact-merge">{t.needTwo}</Alert>;

  return (
    <section data-slot="contact-merge" aria-labelledby={`${id}-title`} className={cn("grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-title-md text-foreground">
            {t.title}
          </h2>
          <p className="text-body text-muted-foreground">{t.description}</p>
        </header>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="text-label text-foreground">{t.survivor}</legend>
          <p className="text-body-sm text-muted-foreground">{t.survivorHint}</p>
          <RadioGroup value={survivorId} onValueChange={(v) => pickSurvivor(String(v))} aria-label={t.survivor} className="grid gap-2 sm:grid-cols-2">
            {records.map((r) => (
              <RadioCard
                key={r.id}
                value={r.id}
                title={
                  <span className="flex items-center gap-2">
                    <Avatar name={r.name} src={r.avatar} size="sm" />
                    <span dir="auto" className="truncate">
                      {r.name}
                    </span>
                  </span>
                }
                description={
                  <span className="flex flex-wrap gap-x-3">
                    {r.createdAt ? (
                      <span>
                        {t.created} <DateTime value={r.createdAt} />
                      </span>
                    ) : null}
                    {(r.stats ?? []).map((s) => (
                      <span key={s.label}>
                        {s.label} <Num value={s.value} />
                      </span>
                    ))}
                  </span>
                }
              />
            ))}
          </RadioGroup>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-4">
          <h3 className="flex items-center gap-2 text-title-sm text-foreground">
            {conflicts.length ? t.differ(conflicts.length) : t.noneDiffer}
          </h3>
          {conflicts.map((field) => {
            const choice = choices[field.id];
            return (
              <fieldset key={field.id} data-slot="contact-merge-field" className="flex min-w-0 flex-col gap-2">
                <legend className="mb-2 text-label text-foreground">{field.label}</legend>
                <RadioGroup value={choice} onValueChange={(v) => setChoices((c) => ({ ...c, [field.id]: String(v) }))} aria-label={field.label} className="grid gap-2 sm:grid-cols-2">
                  {field.multi ? <RadioCard value={CONTACT_MERGE_ALL} title={t.combineAll} description={t.combined} /> : null}
                  {records.map((r) => {
                    const v = r.values[field.id];
                    if (isEmptyMergeValue(v)) return null;
                    return <RadioCard key={r.id} value={r.id} title={<ValueText value={v} ltr={field.ltr} empty={t.empty} />} description={`${t.from} ${r.name}`} />;
                  })}
                </RadioGroup>
              </fieldset>
            );
          })}
          {identical.length ? (
            <details className="rounded-card border border-border bg-card px-3 py-2 text-body-sm">
              <summary className="cursor-pointer text-muted-foreground">{t.same}</summary>
              <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr]">
                {identical.map((f) => (
                  <div key={f.id} className="contents">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd>
                      <ValueText value={records.map((r) => r.values[f.id]).find((v) => !isEmptyMergeValue(v))} ltr={f.ltr} empty={t.empty} />
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>
      </div>

      <aside aria-label={t.result} className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
        <Card className="gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-title-sm text-foreground">{t.result}</h3>
            <p className="text-caption text-muted-foreground">{t.resultHint}</p>
          </div>
          <dl data-slot="contact-merge-result" className="flex flex-col gap-2 text-body-sm">
            {fieldList.map((f) => {
              const v = outcome.values[f.id];
              if (isEmptyMergeValue(v)) return null;
              return (
                <div key={f.id} className="flex flex-col">
                  <dt className="text-caption text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 break-words text-foreground">
                    {f.multi && Array.isArray(v) ? (
                      <span className="flex flex-wrap gap-1">
                        {v.map((tag) => (
                          <Badge key={tag} variant="neutral">
                            {tag}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      <ValueText value={v} ltr={f.ltr} empty={t.empty} />
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {totals.size || accountCount ? (
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <span className="text-label text-foreground">{t.moves}</span>
              <ul className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
                {accountCount ? (
                  <li>
                    {t.identities}: <Num value={accountCount} />
                  </li>
                ) : null}
                {[...totals].map(([label, n]) => (
                  <li key={label}>
                    {label}: <Num value={n} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {consentRows.length ? (
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <span className="text-label text-foreground">{t.consent}</span>
              <ul className="flex flex-col gap-1 text-body-sm">
                {consentRows.map((c) => {
                  const merged = mergeContactConsent(records.map((r) => r.consent?.[c]));
                  return (
                    <li key={c} className="flex items-center justify-between gap-2">
                      <span>{t.channels[c] ?? c}</span>
                      <Badge variant={merged === "granted" ? "success" : merged === "denied" ? "danger" : "outline"}>
                        {merged === "granted" ? t.consentGranted : merged === "denied" ? t.consentDenied : t.consentUnknown}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
              <p className="flex items-start gap-1.5 text-caption text-muted-foreground">
                <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {t.consentNote}
              </p>
            </div>
          ) : null}
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" className="flex-1" onClick={() => setConfirming(true)}>
            <GitMerge aria-hidden />
            {t.merge(records.length)}
          </Button>
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              {t.cancel}
            </Button>
          ) : null}
        </div>
      </aside>

      <AlertDialog open={confirming} onOpenChange={(open) => !busy && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.confirmTitle(survivor.name)}
            </AlertDialogTitle>
            <AlertDialogDescription>{t.confirmBody(others.length)}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <Button
              variant="primary"
              loading={busy}
              onClick={() => void submit()}
            >
              {t.confirm}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
