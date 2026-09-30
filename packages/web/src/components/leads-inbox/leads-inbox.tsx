"use client";

import { ArrowRight, Ban, Check, Inbox, Send, UserPlus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { CopyButton } from "../copy-button";
import type { DataTableColumn } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { ActivityCell, CardMeta, EntityIdentity, EntityList, type EntityListProps } from "../entity-list";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { CannedPicker, type CannedSnippet } from "../inbox";
import { Num } from "../numeric";
import { ScoreBadge, type ScoreBadgeProps } from "../score-explainer";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet";
import { EmptyState } from "../states";
import {
  canConvertLead,
  canMoveLead,
  classifyLeadSource,
  LEAD_PIPELINE,
  LEAD_STATUSES,
  type LeadAttribution,
  type LeadSourceKind,
  type LeadStatus,
  leadAttributionEntries,
  leadPipelineStates,
  leadStatusCounts,
} from "./leads-inbox-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Leads",
    search: "Search leads…",
    all: "All",
    statuses: { new: "New", contacted: "Contacted", qualified: "Qualified", converted: "Converted", spam: "Spam" } as Record<LeadStatus, string>,
    pipeline: "Pipeline",
    lead: "Lead",
    source: "Source",
    stage: "Stage",
    score: "Score",
    received: "Received",
    budget: "Budget",
    sources: { paid: "Paid", organic: "Organic", social: "Social", email: "Email", referral: "Referral", direct: "Direct" } as Record<LeadSourceKind, string>,
    direct: "Direct visit",
    moveTo: (stage: string) => `Move to ${stage}`,
    markSpam: "Mark as spam",
    notSpam: "Not spam",
    convert: "Convert to CRM",
    reply: "Reply",
    open: "Open",
    message: "Message",
    attribution: "Where it came from",
    attributionHint: "What the visitor's browser reported when they sent the form.",
    attrKeys: {
      utmSource: "UTM source",
      utmMedium: "UTM medium",
      utmCampaign: "UTM campaign",
      utmTerm: "UTM term",
      utmContent: "UTM content",
      referrer: "Referrer",
      gclid: "Google click ID",
      landingPage: "Landing page",
    } as Record<keyof LeadAttribution, string>,
    copy: "Copy",
    form: "Form",
    converted: "Converted to CRM",
    contactRef: "Contact",
    companyRef: "Company",
    dealRef: "Deal",
    convertHint: "Creates a contact from this lead. The lead stays here, marked as converted.",
    contactName: "Contact name",
    companyName: "Company",
    createCompany: "Create a company",
    createDeal: "Open a deal",
    dealTitle: "Deal title",
    convertAction: "Convert",
    cancel: "Cancel",
    replyLabel: "Your reply",
    replyPlaceholder: "Write a reply, or press the bolt for a canned reply…",
    cannedTrigger: "Canned replies",
    send: "Send reply",
    sent: "Reply sent",
    failed: "That did not work. Try again.",
    empty: "No leads yet",
    emptyHint: "Inquiries from your forms land here, with where they came from.",
    close: "Close",
  },
  ar: {
    label: "العملاء المحتملون",
    search: "ابحث في العملاء المحتملين…",
    all: "الكل",
    statuses: { new: "جديد", contacted: "تم التواصل", qualified: "مؤهَّل", converted: "محوَّل", spam: "مزعج" } as Record<LeadStatus, string>,
    pipeline: "المراحل",
    lead: "العميل المحتمل",
    source: "المصدر",
    stage: "المرحلة",
    score: "التقييم",
    received: "وصل",
    budget: "الميزانية",
    sources: { paid: "مدفوع", organic: "عضوي", social: "اجتماعي", email: "بريد", referral: "إحالة", direct: "مباشر" } as Record<LeadSourceKind, string>,
    direct: "زيارة مباشرة",
    moveTo: (stage: string) => `نقل إلى ${stage}`,
    markSpam: "تعليم كمزعج",
    notSpam: "ليس مزعجًا",
    convert: "تحويل إلى العملاء",
    reply: "رد",
    open: "فتح",
    message: "الرسالة",
    attribution: "من أين جاء",
    attributionHint: "ما أبلغ عنه متصفح الزائر عند إرسال النموذج.",
    attrKeys: {
      utmSource: "مصدر UTM",
      utmMedium: "وسيط UTM",
      utmCampaign: "حملة UTM",
      utmTerm: "كلمة UTM",
      utmContent: "محتوى UTM",
      referrer: "الموقع المُحيل",
      gclid: "معرّف نقرة جوجل",
      landingPage: "صفحة الوصول",
    } as Record<keyof LeadAttribution, string>,
    copy: "نسخ",
    form: "النموذج",
    converted: "تم التحويل إلى العملاء",
    contactRef: "جهة الاتصال",
    companyRef: "الشركة",
    dealRef: "الصفقة",
    convertHint: "ينشئ جهة اتصال من هذا الطلب. يبقى الطلب هنا وعليه علامة محوَّل.",
    contactName: "اسم جهة الاتصال",
    companyName: "الشركة",
    createCompany: "إنشاء شركة",
    createDeal: "فتح صفقة",
    dealTitle: "عنوان الصفقة",
    convertAction: "تحويل",
    cancel: "إلغاء",
    replyLabel: "ردك",
    replyPlaceholder: "اكتب ردًا، أو اضغط على البرق لرد جاهز…",
    cannedTrigger: "الردود الجاهزة",
    send: "إرسال الرد",
    sent: "تم إرسال الرد",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    empty: "لا يوجد عملاء محتملون بعد",
    emptyHint: "تصل هنا استفسارات نماذجك، مع مصدر كل واحد.",
    close: "إغلاق",
  },
};
export type LeadsInboxLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  /** In the workspace currency, shown as given. */
  budget?: string;
  status: LeadStatus;
  receivedAt: Date | string | number;
  /** Which form it came through. */
  form?: string;
  attribution?: LeadAttribution;
  /** Present when a scoring model rated it. Rendered as a `ScoreBadge`. */
  score?: Pick<ScoreBadgeProps, "score" | "dimensions" | "summary" | "confidence" | "model" | "aiGenerated">;
  /** Set once converted. */
  contact?: { id: string; name: string };
  companyRef?: { id: string; name: string };
  deal?: { id: string; name: string };
}

export interface LeadConversion {
  contactName: string;
  /** A company name to create, or undefined for none. */
  company?: string;
  /** A deal title to open, or undefined for none. */
  deal?: string;
}

export type LeadActionResult = void | { error?: string };

export interface LeadsInboxProps
  extends Omit<EntityListProps<Lead>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "labels" | "facets" | "rowActions" | "actions" | "onRowClick" | "selectable" | "bulkActions" | "toolbar"> {
  leads: Lead[];
  /** Saved replies for the composer's bolt menu. */
  canned?: readonly CannedSnippet[];
  /** Move a lead to a stage by hand. Never called with `converted`. */
  onStatusChange?: (lead: Lead, status: LeadStatus) => Promise<LeadActionResult>;
  /** Turn a lead into a contact (and optionally a company and deal). The host should then return it with `status: "converted"`. */
  onConvert?: (lead: Lead, conversion: LeadConversion) => Promise<LeadActionResult>;
  onReply?: (lead: Lead, message: string) => Promise<LeadActionResult>;
  /** Start with this lead's detail open. */
  defaultOpenId?: string;
  label?: string;
  labels?: Partial<LeadsInboxLabels>;
}

const SOURCE_VARIANT: Record<LeadSourceKind, "accent" | "info" | "brand" | "success" | "neutral" | "outline"> = {
  paid: "accent",
  organic: "success",
  social: "info",
  email: "brand",
  referral: "neutral",
  direct: "outline",
};

const STATUS_VARIANT: Record<LeadStatus, "info" | "warning" | "brand" | "success" | "danger"> = {
  new: "info",
  contacted: "warning",
  qualified: "brand",
  converted: "success",
  spam: "danger",
};

/* ------------------------------------------------------------------ pieces */

function useLabels(labels?: Partial<LeadsInboxLabels>): LeadsInboxLabels {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
}

/** Where a lead came from, as a text badge plus the campaign. Text, never colour alone. */
export function LeadSourceBadge({ attribution, labels }: { attribution?: LeadAttribution; labels?: Partial<LeadsInboxLabels> }) {
  const t = useLabels(labels);
  const src = classifyLeadSource(attribution);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Badge variant={SOURCE_VARIANT[src.kind]}>{t.sources[src.kind]}</Badge>
      {src.name || src.campaign ? (
        <bdi dir="auto" className="truncate text-body-sm text-muted-foreground">
          {[src.name, src.campaign].filter(Boolean).join(" · ")}
        </bdi>
      ) : null}
    </span>
  );
}

export function LeadStatusBadge({ status, labels }: { status: LeadStatus; labels?: Partial<LeadsInboxLabels> }) {
  const t = useLabels(labels);
  return <Badge variant={STATUS_VARIANT[status]}>{t.statuses[status]}</Badge>;
}

/** The stage stepper of one lead: done, current and to-do, with words as well as marks. */
function PipelineStepper({ status, t }: { status: LeadStatus; t: LeadsInboxLabels }) {
  const steps = leadPipelineStates(status);
  return (
    <ol aria-label={t.pipeline} className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <li key={s.status} aria-current={s.state === "current" ? "step" : undefined} className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption",
              s.state === "current" ? "border-primary bg-primary text-primary-foreground" : s.state === "done" ? "border-nq-success/40 bg-nq-success-soft text-nq-success-text" : "border-border text-muted-foreground",
            )}
          >
            {s.state === "done" ? <Check aria-hidden className="size-3" /> : null}
            {t.statuses[s.status]}
          </span>
          {i < steps.length - 1 ? <ArrowRight aria-hidden className="size-3 text-muted-foreground rtl:-scale-x-100" /> : null}
        </li>
      ))}
    </ol>
  );
}

/** The whole attribution as a small definition list. Values are LTR. Click ID and landing page can be copied. */
export function LeadAttributionList({ attribution, labels }: { attribution?: LeadAttribution; labels?: Partial<LeadsInboxLabels> }) {
  const t = useLabels(labels);
  const entries = leadAttributionEntries(attribution);
  if (!entries.length) return <p className="text-body-sm text-muted-foreground">{t.direct}</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
      {entries.map(({ key, value }) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{t.attrKeys[key]}</dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            <bdi dir="ltr" className="min-w-0 break-all font-mono text-caption text-foreground">
              {value}
            </bdi>
            {key === "gclid" || key === "landingPage" ? <CopyButton value={value} label={`${t.copy} ${t.attrKeys[key]}`} /> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ convert dialog */

function ConvertDialog({ lead, t, onClose, onConvert }: { lead: Lead; t: LeadsInboxLabels; onClose: () => void; onConvert: (c: LeadConversion) => Promise<LeadActionResult> }) {
  const id = useId();
  const [name, setName] = useState(lead.name);
  const [withCompany, setWithCompany] = useState(!!lead.company);
  const [company, setCompany] = useState(lead.company ?? "");
  const [withDeal, setWithDeal] = useState(false);
  const [deal, setDeal] = useState(lead.company ? `${lead.company} — ${lead.form ?? ""}`.replace(/ — $/, "") : lead.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 0 && (!withCompany || company.trim().length > 0) && (!withDeal || deal.trim().length > 0);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await onConvert({ contactName: name.trim(), company: withCompany ? company.trim() : undefined, deal: withDeal ? deal.trim() : undefined });
      if (r && r.error) setError(r.error);
      else onClose();
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.convert}</DialogTitle>
          <DialogDescription>{t.convertHint}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field>
            <FieldLabel>{t.contactName}</FieldLabel>
            <Input value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-body-sm" htmlFor={`${id}-co`}>
              <Checkbox id={`${id}-co`} checked={withCompany} onCheckedChange={(v) => setWithCompany(v === true)} />
              {t.createCompany}
            </label>
            {withCompany ? (
              <Field>
                <FieldLabel className="sr-only">{t.companyName}</FieldLabel>
                <Input value={company} aria-label={t.companyName} onChange={(e) => setCompany(e.target.value)} />
              </Field>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-body-sm" htmlFor={`${id}-deal`}>
              <Checkbox id={`${id}-deal`} checked={withDeal} onCheckedChange={(v) => setWithDeal(v === true)} />
              {t.createDeal}
            </label>
            {withDeal ? (
              <Field>
                <FieldLabel className="sr-only">{t.dealTitle}</FieldLabel>
                <Input value={deal} aria-label={t.dealTitle} onChange={(e) => setDeal(e.target.value)} />
              </Field>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!valid}>
              {t.convertAction}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ detail sheet */

interface DetailProps {
  lead: Lead;
  t: LeadsInboxLabels;
  canned?: readonly CannedSnippet[];
  onClose: () => void;
  onStatusChange?: LeadsInboxProps["onStatusChange"];
  onConvert?: LeadsInboxProps["onConvert"];
  onReply?: LeadsInboxProps["onReply"];
  onStartConvert: () => void;
}

function LeadDetail({ lead, t, canned, onClose, onStatusChange, onReply, onConvert, onStartConvert }: DetailProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const move = async (status: LeadStatus) => {
    if (!onStatusChange) return;
    setMoveError(null);
    try {
      const r = await onStatusChange(lead, status);
      if (r && r.error) setMoveError(r.error);
    } catch {
      setMoveError(t.failed);
    }
  };

  const send = async () => {
    if (!onReply || !text.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await onReply(lead, text.trim());
      if (r && r.error) setNote({ tone: "danger", text: r.error });
      else {
        setNote({ tone: "success", text: t.sent });
        setText("");
      }
    } catch {
      setNote({ tone: "danger", text: t.failed });
    } finally {
      setBusy(false);
    }
  };

  const nextStages = LEAD_PIPELINE.filter((s) => canMoveLead(lead.status, s));

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="end" className="w-[min(34rem,100vw)]">
        <SheetHeader>
          <SheetTitle dir="auto">{lead.name}</SheetTitle>
          <SheetDescription>
            <span className="inline-flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={lead.status} labels={t} />
              <ActivityCell value={lead.receivedAt} />
            </span>
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-5">
          <PipelineStepper status={lead.status} t={t} />
          {moveError ? <Alert tone="danger">{moveError}</Alert> : null}

          <div className="flex flex-wrap gap-2">
            {onConvert && canConvertLead(lead.status) ? (
              <Button variant="primary" size="sm" onClick={onStartConvert}>
                <UserPlus aria-hidden />
                {t.convert}
              </Button>
            ) : null}
            {onStatusChange
              ? nextStages
                  .filter((s) => s !== "converted")
                  .map((s) => (
                    <Button key={s} variant="secondary" size="sm" onClick={() => void move(s)}>
                      {t.moveTo(t.statuses[s])}
                    </Button>
                  ))
              : null}
            {onStatusChange && lead.status !== "converted" ? (
              <Button variant="ghost" size="sm" onClick={() => void move(lead.status === "spam" ? "new" : "spam")}>
                <Ban aria-hidden />
                {lead.status === "spam" ? t.notSpam : t.markSpam}
              </Button>
            ) : null}
          </div>

          {lead.status === "converted" && (lead.contact || lead.companyRef || lead.deal) ? (
            <section aria-label={t.converted} className="flex flex-col gap-2 rounded-card border border-nq-success/40 bg-nq-success-soft p-3 text-body-sm">
              <span className="text-label text-nq-success-text">{t.converted}</span>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {lead.contact ? (
                  <>
                    <dt className="text-muted-foreground">{t.contactRef}</dt>
                    <dd dir="auto">{lead.contact.name}</dd>
                  </>
                ) : null}
                {lead.companyRef ? (
                  <>
                    <dt className="text-muted-foreground">{t.companyRef}</dt>
                    <dd dir="auto">{lead.companyRef.name}</dd>
                  </>
                ) : null}
                {lead.deal ? (
                  <>
                    <dt className="text-muted-foreground">{t.dealRef}</dt>
                    <dd dir="auto">{lead.deal.name}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section aria-label={t.message} className="flex flex-col gap-2">
            <h3 className="text-label text-foreground">{t.message}</h3>
            {lead.message ? (
              <p dir="auto" className="whitespace-pre-wrap rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm">
                {lead.message}
              </p>
            ) : null}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
              {lead.email ? (
                <>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>
                    <bdi dir="ltr">{lead.email}</bdi>
                  </dd>
                </>
              ) : null}
              {lead.phone ? (
                <>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>
                    <bdi dir="ltr">{lead.phone}</bdi>
                  </dd>
                </>
              ) : null}
              {lead.company ? (
                <>
                  <dt className="text-muted-foreground">{t.companyRef}</dt>
                  <dd dir="auto">{lead.company}</dd>
                </>
              ) : null}
              {lead.budget ? (
                <>
                  <dt className="text-muted-foreground">{t.budget}</dt>
                  <dd dir="auto">{lead.budget}</dd>
                </>
              ) : null}
              {lead.form ? (
                <>
                  <dt className="text-muted-foreground">{t.form}</dt>
                  <dd dir="auto">{lead.form}</dd>
                </>
              ) : null}
            </dl>
          </section>

          <section aria-label={t.attribution} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-label text-foreground">{t.attribution}</h3>
              <p className="text-caption text-muted-foreground">{t.attributionHint}</p>
            </div>
            <LeadSourceBadge attribution={lead.attribution} labels={t} />
            <LeadAttributionList attribution={lead.attribution} labels={t} />
          </section>

          {onReply ? (
            <section aria-label={t.reply} className="flex flex-col gap-2">
              <label htmlFor={`${id}-reply`} className="text-label text-foreground">
                {t.replyLabel}
              </label>
              {note ? <Alert tone={note.tone}>{note.text}</Alert> : null}
              <Textarea id={`${id}-reply`} rows={4} value={text} placeholder={t.replyPlaceholder} onChange={(e) => setText(e.target.value)} />
              <div className="flex items-center justify-between gap-2">
                {canned?.length ? (
                  <CannedPicker
                    snippets={canned}
                    variables={{ name: lead.name.split(" ")[0] }}
                    onPick={(body) => setText((cur) => (cur ? `${cur}\n${body}` : body))}
                    side="bottom"
                  />
                ) : (
                  <span />
                )}
                <Button variant="primary" size="sm" loading={busy} disabled={!text.trim()} onClick={() => void send()}>
                  <Send aria-hidden className="rtl:-scale-x-100" />
                  {t.send}
                </Button>
              </div>
            </section>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ inbox */

/**
 * Inquiries from your forms with where each came from (UTM, referrer, Google click id), a stage pipeline with counts,
 * a detail panel with reply and canned replies, and conversion into a CRM contact. Built on `EntityList`, so every
 * row's actions also open from a context menu.
 */
export function LeadsInbox({ leads, canned, onStatusChange, onConvert, onReply, defaultOpenId, label, labels, empty, ...props }: LeadsInboxProps) {
  const t = useLabels(labels);
  const [stage, setStage] = useState<LeadStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const [converting, setConverting] = useState<string | null>(null);
  const counts = useMemo(() => leadStatusCounts(leads), [leads]);
  const shown = useMemo(() => (stage === "all" ? leads : leads.filter((l) => l.status === stage)), [leads, stage]);
  const open = leads.find((l) => l.id === openId) ?? null;
  const target = leads.find((l) => l.id === converting) ?? null;

  const columns = useMemo<DataTableColumn<Lead>[]>(
    () => [
      {
        id: "lead",
        header: t.lead,
        hideable: false,
        cell: (l) => <EntityIdentity name={l.name} avatarName={l.name} subtitle={l.company ?? l.email} />,
        sortValue: (l) => l.name,
        searchValue: (l) => `${l.name} ${l.email ?? ""} ${l.company ?? ""} ${l.message ?? ""} ${l.attribution?.utmCampaign ?? ""} ${l.attribution?.utmSource ?? ""}`,
        className: "min-w-52",
      },
      { id: "source", header: t.source, cell: (l) => <LeadSourceBadge attribution={l.attribution} labels={t} />, sortValue: (l) => classifyLeadSource(l.attribution).kind, className: "min-w-44" },
      { id: "stage", header: t.stage, cell: (l) => <LeadStatusBadge status={l.status} labels={t} />, sortValue: (l) => LEAD_STATUSES.indexOf(l.status) },
      {
        id: "score",
        header: t.score,
        cell: (l) => (l.score ? <ScoreBadge {...l.score} /> : "—"),
        sortValue: (l) => l.score?.score,
        align: "end",
      },
      { id: "received", header: t.received, cell: (l) => <ActivityCell value={l.receivedAt} />, sortValue: (l) => new Date(l.receivedAt), align: "end" },
    ],
    [t.lead, t.source, t.stage, t.score, t.received, JSON.stringify(t.statuses)], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tabs: (LeadStatus | "all")[] = ["all", ...LEAD_STATUSES];

  return (
    <div data-slot="leads-inbox" className="flex min-w-0 flex-col gap-3">
      <div role="group" aria-label={t.pipeline} className="flex flex-wrap gap-2">
        {tabs.map((s) => (
          <Button key={s} size="sm" variant={stage === s ? "primary" : "secondary"} aria-pressed={stage === s} onClick={() => setStage(s)}>
            {s === "all" ? t.all : t.statuses[s]}
            <Num value={counts[s]} className="ms-1.5 opacity-80" />
          </Button>
        ))}
      </div>

      <EntityList<Lead>
        data={shown}
        columns={columns}
        getRowId={(l) => l.id}
        rowLabel={(l) => l.name}
        label={label ?? t.label}
        searchPlaceholder={t.search}
        selectable={false}
        defaultSort={{ id: "received", direction: "desc" }}
        onRowClick={(l) => setOpenId(l.id)}
        rowActions={(l) => [
          { id: "open", label: t.open, icon: Inbox, onSelect: () => setOpenId(l.id) },
          ...(onConvert && canConvertLead(l.status) ? [{ id: "convert", label: t.convert, icon: UserPlus, onSelect: () => setConverting(l.id) }] : []),
          ...(onStatusChange
            ? [
                ...LEAD_PIPELINE.filter((s) => s !== "converted" && canMoveLead(l.status, s)).map((s) => ({
                  id: `move-${s}`,
                  label: t.moveTo(t.statuses[s]),
                  icon: ArrowRight,
                  group: "stage",
                  onSelect: () => void onStatusChange(l, s),
                })),
                ...(l.status !== "converted" ? [{ id: "spam", label: l.status === "spam" ? t.notSpam : t.markSpam, icon: Ban, danger: l.status !== "spam", group: "danger", onSelect: () => void onStatusChange(l, l.status === "spam" ? "new" : "spam") }] : []),
              ]
            : []),
        ]}
        empty={empty ?? <EmptyState icon={Inbox} title={t.empty} description={t.emptyHint} className="border-0" />}
        renderCard={(l) => (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <EntityIdentity name={l.name} avatarName={l.name} subtitle={l.company ?? l.email} />
              <LeadStatusBadge status={l.status} labels={t} />
            </div>
            {l.message ? (
              <span dir="auto" className="line-clamp-2 text-body-sm text-muted-foreground">
                {l.message}
              </span>
            ) : null}
            <CardMeta label={t.source}>
              <LeadSourceBadge attribution={l.attribution} labels={t} />
            </CardMeta>
            <CardMeta label={t.received}>
              <ActivityCell value={l.receivedAt} />
            </CardMeta>
          </div>
        )}
        {...props}
      />

      {open ? (
        <LeadDetail
          key={open.id}
          lead={open}
          t={t}
          canned={canned}
          onClose={() => setOpenId(null)}
          onStatusChange={onStatusChange}
          onConvert={onConvert}
          onReply={onReply}
          onStartConvert={() => setConverting(open.id)}
        />
      ) : null}
      {target && onConvert ? <ConvertDialog key={target.id} lead={target} t={t} onClose={() => setConverting(null)} onConvert={(c) => onConvert(target, c)} /> : null}
    </div>
  );
}

