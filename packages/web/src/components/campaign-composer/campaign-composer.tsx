"use client";

import { AlertTriangle, CheckCircle2, Send, Users } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { CopyButton } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { EmailTemplatePreview, type EmailVariable, fillVariables } from "../email-templates";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "../field";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { RichTextEditor } from "../rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_WHATSAPP_MAX,
  type CampaignChannel,
  type CampaignIssue,
  campaignProgress,
  validateCampaign,
} from "./campaign-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    channel: "Channel",
    channels: { email: "Email", whatsapp: "WhatsApp" } as Record<CampaignChannel, string>,
    audience: "Audience",
    audiencePlaceholder: "Choose who gets it",
    reach: "Will reach",
    people: (n: number): string => (n === 1 ? "person" : "people"),
    counting: "Counting…",
    countFailed: "Could not count this audience.",
    subject: "Subject",
    subjectHint: "What they see before opening.",
    body: "Message",
    whatsappBody: "Message text",
    whatsappHint: "Plain text. WhatsApp allows up to 1,024 characters.",
    variables: "Variables",
    variablesHint: "Filled in for each person.",
    insert: (label: string) => `Insert ${label}`,
    copyVariable: (label: string) => `Copy ${label} variable`,
    preview: "Preview",
    footerEmail: "You get this because you subscribed. Unsubscribe any time.",
    footerWhatsapp: "Reply STOP to unsubscribe.",
    sendTest: "Send a test",
    testTitle: "Send a test",
    testEmail: "Send the test to this address. It uses sample values for the variables.",
    testWhatsapp: "Send the test to your own workspace number only. It uses sample values for the variables.",
    testTo: (c: CampaignChannel): string => (c === "email" ? "Email address" : "WhatsApp number"),
    testSent: "Test sent",
    testInvalid: "Enter a valid address or number.",
    send: "Send campaign",
    sendTitle: (n: number) => `Send to ${n.toLocaleString("en")} ${n === 1 ? "person" : "people"}?`,
    sendBody: "This goes out right away and cannot be recalled. Send a test first if you have not.",
    cancel: "Cancel",
    confirmSend: "Send now",
    checks: "Before you send",
    issues: {
      "audience-none": "Choose an audience.",
      "audience-empty": "This audience has no one reachable on this channel.",
      "subject-empty": "Add a subject.",
      "body-empty": "Write the message.",
      "body-too-long": "The message is over the WhatsApp limit.",
      "variable-unknown": "The message uses a variable that does not exist.",
    } as Record<CampaignIssue, string>,
    ready: "Ready to send.",
    failed: "That did not work. Try again.",
    sending: "Sending",
    sentOf: (s: number, t: number) => `${s.toLocaleString("en")} of ${t.toLocaleString("en")} sent`,
    failedCount: (n: number) => `${n.toLocaleString("en")} failed`,
    done: "Sent to everyone.",
    partial: "Finished, but some did not go through.",
    stop: "Stop sending",
    characters: (n: number, max: number) => `${n.toLocaleString("en")} / ${max.toLocaleString("en")}`,
    noPreview: "Nothing to preview yet",
  },
  ar: {
    channel: "القناة",
    channels: { email: "بريد إلكتروني", whatsapp: "واتساب" } as Record<CampaignChannel, string>,
    audience: "الجمهور",
    audiencePlaceholder: "اختر من سيستلم",
    reach: "سيصل إلى",
    people: (n: number): string => (n === 1 ? "شخص" : "شخصًا"),
    counting: "جارٍ العدّ…",
    countFailed: "تعذّر عدّ هذا الجمهور.",
    subject: "الموضوع",
    subjectHint: "ما يراه المستلم قبل الفتح.",
    body: "الرسالة",
    whatsappBody: "نص الرسالة",
    whatsappHint: "نص عادي. يسمح واتساب بحتى 1024 حرفًا.",
    variables: "المتغيرات",
    variablesHint: "تُملأ لكل شخص.",
    insert: (label: string) => `إدراج ${label}`,
    copyVariable: (label: string) => `نسخ متغير ${label}`,
    preview: "معاينة",
    footerEmail: "وصلتك هذه الرسالة لأنك اشتركت. يمكنك إلغاء الاشتراك في أي وقت.",
    footerWhatsapp: "أرسل STOP لإلغاء الاشتراك.",
    sendTest: "إرسال تجربة",
    testTitle: "إرسال تجربة",
    testEmail: "أرسل التجربة إلى هذا العنوان. تُستخدم قيم تجريبية للمتغيرات.",
    testWhatsapp: "أرسل التجربة إلى رقم مساحة عملك فقط. تُستخدم قيم تجريبية للمتغيرات.",
    testTo: (c: CampaignChannel): string => (c === "email" ? "عنوان البريد" : "رقم واتساب"),
    testSent: "تم إرسال التجربة",
    testInvalid: "أدخل عنوانًا أو رقمًا صحيحًا.",
    send: "إرسال الحملة",
    sendTitle: (n: number) => `الإرسال إلى ${n.toLocaleString("ar")} ${n === 1 ? "شخص" : "شخصًا"}؟`,
    sendBody: "يُرسل فورًا ولا يمكن استرجاعه. أرسل تجربة أولًا إن لم تفعل.",
    cancel: "إلغاء",
    confirmSend: "أرسل الآن",
    checks: "قبل الإرسال",
    issues: {
      "audience-none": "اختر جمهورًا.",
      "audience-empty": "لا أحد في هذا الجمهور يمكن الوصول إليه عبر هذه القناة.",
      "subject-empty": "أضف موضوعًا.",
      "body-empty": "اكتب الرسالة.",
      "body-too-long": "الرسالة أطول من حد واتساب.",
      "variable-unknown": "تستخدم الرسالة متغيرًا غير موجود.",
    } as Record<CampaignIssue, string>,
    ready: "جاهزة للإرسال.",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    sending: "جارٍ الإرسال",
    sentOf: (s: number, t: number) => `أُرسلت ${s.toLocaleString("ar")} من ${t.toLocaleString("ar")}`,
    failedCount: (n: number) => `فشلت ${n.toLocaleString("ar")}`,
    done: "أُرسلت للجميع.",
    partial: "انتهى الإرسال، لكن بعض الرسائل لم تصل.",
    stop: "إيقاف الإرسال",
    characters: (n: number, max: number) => `${n.toLocaleString("ar")} / ${max.toLocaleString("ar")}`,
    noPreview: "لا شيء للمعاينة بعد",
  },
};
export type CampaignComposerLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export interface CampaignAudience {
  id: string;
  label: string;
  description?: string;
  /** People reachable on each channel. Used when there is no `onCountAudience`. */
  counts?: Partial<Record<CampaignChannel, number>>;
}

export interface CampaignDraft {
  channel: CampaignChannel;
  audienceId: string | null;
  subject: string;
  /** HTML for email, plain text for WhatsApp. */
  body: string;
}

export type CampaignResult = void | { error?: string };

export interface CampaignSendProgress {
  sent: number;
  failed: number;
  total: number;
}

export interface CampaignComposerProps {
  audiences: CampaignAudience[];
  /** `{{key}}` variables the message may use. `sample` fills the preview and the test. */
  variables?: EmailVariable[];
  /** Start with this draft. */
  defaultValue?: Partial<CampaignDraft>;
  onChange?: (draft: CampaignDraft) => void;
  /** Counts the people in an audience on a channel, live. Falls back to `audience.counts`. */
  onCountAudience?: (audienceId: string, channel: CampaignChannel) => Promise<number>;
  /** Sends the message to one address or number. WhatsApp tests go only to the workspace's own number. */
  onSendTest?: (draft: CampaignDraft, to: string) => Promise<CampaignResult>;
  onSend?: (draft: CampaignDraft) => Promise<CampaignResult>;
  /** Controlled send progress. While set, the composer locks and shows the bar. */
  progress?: CampaignSendProgress | null;
  onStopSending?: () => void;
  sender?: { name: string; email: string };
  /** Default for the test dialog. */
  testRecipient?: string;
  className?: string;
  labels?: Partial<CampaignComposerLabels>;
}

/* ------------------------------------------------------------------ pieces */

/** A WhatsApp message as a bubble, with the stop hint under it. Text is bidi-isolated. */
function WhatsappPreview({ text, footer, empty }: { text: string; footer: string; empty: string }) {
  return (
    <div className="flex justify-center rounded-card border border-border bg-secondary p-4">
      <div className="flex w-full max-w-[22rem] flex-col gap-1 rounded-card rounded-ss-none border border-border bg-card p-3 text-body-sm">
        {text ? (
          <p dir="auto" className="whitespace-pre-wrap break-words text-foreground">
            {text}
          </p>
        ) : (
          <p className="text-muted-foreground">{empty}</p>
        )}
        <p className="text-caption text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

function TestDialog({ draft, t, defaultTo, onClose, onSendTest }: { draft: CampaignDraft; t: CampaignComposerLabels; defaultTo?: string; onClose: () => void; onSendTest: (to: string) => Promise<CampaignResult> }) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const valid = draft.channel === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()) : /^\+?[\d\s-]{7,}$/.test(to.trim());
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return setNote({ tone: "danger", text: t.testInvalid });
            setBusy(true);
            setNote(null);
            try {
              const r = await onSendTest(to.trim());
              setNote(r && r.error ? { tone: "danger", text: r.error } : { tone: "success", text: t.testSent });
            } catch {
              setNote({ tone: "danger", text: t.failed });
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.testTitle}</DialogTitle>
            <DialogDescription>{draft.channel === "email" ? t.testEmail : t.testWhatsapp}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.testTo(draft.channel)}</FieldLabel>
            <Input ltr value={to} type={draft.channel === "email" ? "email" : "tel"} autoFocus onChange={(e) => setTo(e.target.value)} />
          </Field>
          {note ? <Alert tone={note.tone}>{note.text}</Alert> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              <Send aria-hidden className="rtl:-scale-x-100" />
              {t.sendTest}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ composer */

/**
 * Compose a broadcast to an audience by email or WhatsApp: pick who, see the live count, write the message,
 * preview it as the reader sees it, send a test, check what is missing, confirm, and watch the send progress.
 * Every callback is yours, so the same screen works against any sender.
 */
export function CampaignComposer({
  audiences,
  variables = [],
  defaultValue,
  onChange,
  onCountAudience,
  onSendTest,
  onSend,
  progress,
  onStopSending,
  sender,
  testRecipient,
  className,
  labels,
}: CampaignComposerProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t: CampaignComposerLabels = { ...STRINGS[ar ? "ar" : "en"], ...labels, issues: { ...STRINGS[ar ? "ar" : "en"].issues, ...labels?.issues } };
  const id = useId();
  const [draft, setDraft] = useState<CampaignDraft>({ channel: "email", audienceId: null, subject: "", body: "", ...defaultValue });
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const patch = (next: Partial<CampaignDraft>) => {
    setDraft((d) => {
      const merged = { ...d, ...next };
      onChange?.(merged);
      return merged;
    });
  };

  const audience = audiences.find((a) => a.id === draft.audienceId) ?? null;
  const staticCount = audience?.counts?.[draft.channel];

  const countRef = useRef(onCountAudience);
  countRef.current = onCountAudience;
  const hasCounter = Boolean(onCountAudience);
  useEffect(() => {
    setCountError(false);
    if (!draft.audienceId) return setCount(null);
    const counter = countRef.current;
    if (!counter) return setCount(staticCount ?? null);
    let cancelled = false;
    setCount(null);
    counter(draft.audienceId, draft.channel).then(
      (n) => !cancelled && setCount(n),
      () => !cancelled && setCountError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [draft.audienceId, draft.channel, hasCounter, staticCount]);

  const known = variables.map((v) => v.key);
  const issues = validateCampaign({ channel: draft.channel, audienceId: draft.audienceId, audienceCount: countError ? null : count, subject: draft.subject, body: draft.body, knownVariables: known });
  const locked = !!progress || sending;
  const isEmail = draft.channel === "email";
  const bodyText = useMemo(() => (isEmail ? draft.body : fillVariables(draft.body, variables)), [isEmail, draft.body, variables]);
  const prog = progress ? campaignProgress(progress) : null;

  const audienceItems = audiences.map((a) => ({ value: a.id, label: a.label }));

  const start = async () => {
    setConfirming(false);
    setSending(true);
    setSendError(null);
    try {
      const r = await onSend?.(draft);
      if (r && r.error) setSendError(r.error);
    } catch {
      setSendError(t.failed);
    } finally {
      setSending(false);
    }
  };

  const insertVariable = (key: string) => patch({ body: `${draft.body}{{${key}}}` });
  const dir = ar ? "rtl" : "ltr";

  return (
    <div data-slot="campaign-composer" className={cn("grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", className)}>
      <div className="flex min-w-0 flex-col gap-5">
        <Field>
          <FieldLabel>{t.channel}</FieldLabel>
          <ToggleGroup
            value={[draft.channel]}
            onValueChange={(v) => v[0] && !locked && patch({ channel: v[0] as CampaignChannel, body: v[0] === draft.channel ? draft.body : "" })}
            aria-label={t.channel}
          >
            {CAMPAIGN_CHANNELS.map((c) => (
              <Toggle key={c} value={c} disabled={locked}>
                {t.channels[c]}
              </Toggle>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel>{t.audience}</FieldLabel>
          <Select items={audienceItems} value={draft.audienceId ?? undefined} onValueChange={(v) => v && patch({ audienceId: v })} disabled={locked}>
            <SelectTrigger>
              <SelectValue placeholder={t.audiencePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {audiences.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {audience?.description ? <FieldDescription>{audience.description}</FieldDescription> : null}
        </Field>

        <div role="status" aria-live="polite" data-slot="campaign-audience-count" className="flex items-center gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
          <Users aria-hidden className="size-5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-caption text-muted-foreground">{t.reach}</span>
            {!draft.audienceId ? (
              <span className="text-body-sm text-muted-foreground">—</span>
            ) : countError ? (
              <span className="text-body-sm text-destructive">{t.countFailed}</span>
            ) : count == null ? (
              <span className="text-body-sm text-muted-foreground">{t.counting}</span>
            ) : (
              <span className="text-body font-medium text-foreground">
                <Num value={count} /> {t.people(count)}
              </span>
            )}
          </div>
        </div>

        {isEmail ? (
          <Field>
            <FieldLabel>{t.subject}</FieldLabel>
            <Input value={draft.subject} disabled={locked} onChange={(e) => patch({ subject: e.target.value })} />
            <FieldDescription>{t.subjectHint}</FieldDescription>
          </Field>
        ) : null}

        <div className="flex flex-col gap-2">
          <span id={`${id}-body`} className="text-label text-foreground">
            {isEmail ? t.body : t.whatsappBody}
          </span>
          {isEmail ? (
            <RichTextEditor
              aria-labelledby={`${id}-body`}
              value={draft.body}
              onValueChange={(v) => patch({ body: v })}
              readOnly={locked}
              minHeight="12rem"
              toolbar={["bold", "italic", "underline", "h2", "bulletList", "orderedList", "link", "undo", "redo"]}
            />
          ) : (
            <>
              <Textarea aria-labelledby={`${id}-body`} rows={8} value={draft.body} disabled={locked} onChange={(e) => patch({ body: e.target.value })} />
              <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
                <span>{t.whatsappHint}</span>
                <bdi dir="ltr" className={cn(draft.body.length > CAMPAIGN_WHATSAPP_MAX && "text-destructive")}>
                  {t.characters(draft.body.length, CAMPAIGN_WHATSAPP_MAX)}
                </bdi>
              </div>
            </>
          )}
          {variables.length ? (
            <div role="group" aria-label={t.variables} className="flex flex-wrap items-center gap-1.5">
              <span className="text-caption text-muted-foreground">
                {t.variables}. {t.variablesHint}
              </span>
              {variables.map((v) =>
                isEmail ? (
                  <CopyButton key={v.key} value={`{{${v.key}}}`} label={t.copyVariable(v.label)}>
                    {v.label}
                  </CopyButton>
                ) : (
                  <Button key={v.key} type="button" size="sm" variant="secondary" disabled={locked} aria-label={t.insert(v.label)} onClick={() => insertVariable(v.key)}>
                    {v.label}
                  </Button>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {isEmail ? (
          <EmailTemplatePreview
            template={{ subject: draft.subject, body: draft.body || "<p></p>", dir, footer: t.footerEmail }}
            variables={variables}
            sender={sender}
            recipient={variables.find((v) => v.key === "email")?.sample}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <span className="text-label text-foreground">{t.preview}</span>
            <WhatsappPreview text={bodyText} footer={t.footerWhatsapp} empty={t.noPreview} />
          </div>
        )}

        <section aria-label={t.checks} className="flex flex-col gap-2 rounded-card border border-border p-3">
          <h3 className="text-label text-foreground">{t.checks}</h3>
          {issues.length === 0 ? (
            <p className="flex items-center gap-1.5 text-body-sm text-nq-success-text">
              <CheckCircle2 aria-hidden className="size-4" />
              {t.ready}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {issues.map((i) => (
                <li key={i} className={cn("flex items-center gap-1.5 text-body-sm", tried ? "text-destructive" : "text-muted-foreground")}>
                  <AlertTriangle aria-hidden className="size-4 shrink-0" />
                  {t.issues[i]}
                </li>
              ))}
            </ul>
          )}
        </section>

        {sendError ? <Alert tone="danger">{sendError}</Alert> : null}

        {prog && progress ? (
          <section aria-label={t.sending} className="flex flex-col gap-2 rounded-card border border-border p-3">
            <Progress
              value={prog.percent}
              label={prog.state === "sending" ? t.sending : prog.state === "done" ? t.done : t.partial}
              tone={prog.state === "done" ? "success" : prog.state === "partial" ? "warning" : undefined}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted-foreground">
              <span aria-live="polite">{t.sentOf(progress.sent, progress.total)}</span>
              {progress.failed > 0 ? <Badge variant="danger">{t.failedCount(progress.failed)}</Badge> : null}
              {prog.state === "sending" && onStopSending ? (
                <Button size="sm" variant="secondary" onClick={onStopSending}>
                  {t.stop}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onSendTest ? (
            <Button variant="secondary" disabled={locked} onClick={() => setTesting(true)}>
              {t.sendTest}
            </Button>
          ) : null}
          <Button
            variant="primary"
            loading={sending}
            disabled={locked || !onSend}
            onClick={() => {
              setTried(true);
              if (issues.length === 0) setConfirming(true);
            }}
          >
            <Send aria-hidden className="rtl:-scale-x-100" />
            {t.send}
          </Button>
        </div>
      </div>

      {testing && onSendTest ? <TestDialog draft={draft} t={t} defaultTo={draft.channel === "email" ? testRecipient : undefined} onClose={() => setTesting(false)} onSendTest={(to) => onSendTest(draft, to)} /> : null}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.sendTitle(count ?? 0)}</AlertDialogTitle>
            <AlertDialogDescription>{t.sendBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void start()}>{t.confirmSend}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
