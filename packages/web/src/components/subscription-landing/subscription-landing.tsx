"use client";

import { CheckCircle2, MailCheck, MailX } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Card } from "../card";
import { Checkbox } from "../checkbox";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Radio, RadioGroup } from "../radio-group";
import { maskSubscriberEmail, type SubscriptionIssue, validateSubscription } from "./subscription-landing-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    subscribeTitle: "Stay in the loop",
    subscribeBody: "Product news and new articles, once in a while. No spam.",
    name: "Name",
    optional: "optional",
    email: "Email address",
    consent: "Yes, send me emails. I can unsubscribe at any time.",
    subscribe: "Subscribe",
    pendingTitle: "Check your inbox",
    pendingBody: (email: string) => `We sent a confirmation link to ${email}. Your subscription starts when you open it.`,
    pendingWrong: "Wrong address? Start over",
    confirmTitle: "Confirm your subscription",
    confirmBody: (email: string) => `Confirm that ${email} should get our emails.`,
    confirm: "Yes, confirm",
    confirmedTitle: "You are subscribed",
    confirmedBody: "Thanks. Your first email is on its way soon.",
    unsubscribeTitle: "Unsubscribe",
    unsubscribeBody: (email: string) => `Stop emails to ${email}.`,
    reasonLabel: "Would you tell us why? (optional)",
    reasons: { too_many: "I get too many emails", not_relevant: "The emails are not relevant", never_signed: "I never signed up", other: "Something else" } as Record<string, string>,
    note: "Anything to add",
    unsubscribe: "Unsubscribe",
    unsubscribedTitle: "You are unsubscribed",
    unsubscribedBody: (email: string) => `${email} will not get any more emails from us.`,
    resubscribe: "That was a mistake. Subscribe again",
    resubscribedTitle: "Welcome back",
    resubscribedBody: "You are subscribed again.",
    failed: "That did not work. Try again.",
    issues: { "email-empty": "Enter your email address.", "email-invalid": "That does not look like an email address.", "consent-missing": "Tick the box to agree." } as Record<SubscriptionIssue, string>,
    privacy: "We keep your address private and never sell it.",
  },
  ar: {
    subscribeTitle: "ابقَ على اطلاع",
    subscribeBody: "أخبار المنتج ومقالات جديدة بين حين وآخر. بلا إزعاج.",
    name: "الاسم",
    optional: "اختياري",
    email: "البريد الإلكتروني",
    consent: "نعم، أرسلوا لي رسائل بريدية. يمكنني إلغاء الاشتراك في أي وقت.",
    subscribe: "اشتراك",
    pendingTitle: "تحقق من بريدك",
    pendingBody: (email: string) => `أرسلنا رابط تأكيد إلى ${email}. يبدأ اشتراكك عند فتحه.`,
    pendingWrong: "العنوان خاطئ؟ ابدأ من جديد",
    confirmTitle: "أكّد اشتراكك",
    confirmBody: (email: string) => `أكّد أن ${email} يريد استلام رسائلنا.`,
    confirm: "نعم، أكّد",
    confirmedTitle: "تم اشتراكك",
    confirmedBody: "شكرًا. رسالتك الأولى في الطريق.",
    unsubscribeTitle: "إلغاء الاشتراك",
    unsubscribeBody: (email: string) => `إيقاف الرسائل إلى ${email}.`,
    reasonLabel: "هل تخبرنا بالسبب؟ (اختياري)",
    reasons: { too_many: "تصلني رسائل كثيرة", not_relevant: "الرسائل لا تعنيني", never_signed: "لم أشترك أصلًا", other: "سبب آخر" } as Record<string, string>,
    note: "أي إضافة",
    unsubscribe: "إلغاء الاشتراك",
    unsubscribedTitle: "تم إلغاء اشتراكك",
    unsubscribedBody: (email: string) => `لن يصل ${email} أي بريد آخر منا.`,
    resubscribe: "كان هذا خطأ. اشترك من جديد",
    resubscribedTitle: "أهلًا بعودتك",
    resubscribedBody: "تم اشتراكك من جديد.",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    issues: { "email-empty": "أدخل بريدك الإلكتروني.", "email-invalid": "لا يبدو هذا بريدًا إلكترونيًا.", "consent-missing": "ضع علامة للموافقة." } as Record<SubscriptionIssue, string>,
    privacy: "نحافظ على خصوصية عنوانك ولا نبيعه أبدًا.",
  },
};
export type SubscriptionLandingLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export type SubscriptionLandingMode = "subscribe" | "confirm" | "unsubscribe";
export type SubscriptionResult = void | { error?: string };

export interface SubscriptionLandingProps {
  /** Which page this is. Each is its own address in a real product. */
  mode: SubscriptionLandingMode;
  /** The sender's name or mark, shown above the card. Give text for a brand, never a substitute icon. */
  brand?: ReactNode;
  /** The person's address for the confirm and unsubscribe pages (they arrive from an email link). */
  email?: string;
  /** Subscribe page. After it resolves the page asks the person to check their inbox. */
  onSubscribe?: (input: { email: string; name?: string }) => Promise<SubscriptionResult>;
  /** Confirm page. A button, never automatic, so mail scanners that open links do not subscribe anyone. */
  onConfirm?: () => Promise<SubscriptionResult>;
  /** Unsubscribe page. `reason` is one of the `reasons` keys. */
  onUnsubscribe?: (input: { reason?: string; note?: string }) => Promise<SubscriptionResult>;
  /** Undo an unsubscribe. */
  onResubscribe?: () => Promise<SubscriptionResult>;
  /** Reason keys offered on the unsubscribe page. Default too_many, not_relevant, never_signed, other. */
  reasons?: string[];
  /** Ask for a name on the subscribe page. */
  askName?: boolean;
  className?: string;
  labels?: Partial<SubscriptionLandingLabels>;
}

type Stage = "form" | "pending" | "done" | "undone";

/* ------------------------------------------------------------------ component */

/**
 * The three public pages of an email list: subscribe (with explicit consent), confirm (double opt-in) and
 * unsubscribe (with an optional reason and a way back). One centred card each. Fully full width on a phone.
 */
export function SubscriptionLanding({ mode, brand, email: emailProp, onSubscribe, onConfirm, onUnsubscribe, onResubscribe, reasons, askName, className, labels }: SubscriptionLandingProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t: SubscriptionLandingLabels = { ...base, ...labels, issues: { ...base.issues, ...labels?.issues }, reasons: { ...base.reasons, ...labels?.reasons } };
  const id = useId();
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailProp ?? "");
  const [consent, setConsent] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const issues = validateSubscription({ email, consent });
  const shownEmail = emailProp ?? email;

  const run = async (fn: () => Promise<SubscriptionResult> | undefined, next: Stage) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r && r.error) setError(r.error);
      else setStage(next);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const head = (icon: ReactNode, title: string, body?: string) => (
    <div className="flex flex-col items-center gap-3 text-center">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-secondary text-foreground [&_svg]:size-6">
        {icon}
      </span>
      <h1 className="text-h3 text-foreground">{title}</h1>
      {body ? (
        <p dir="auto" className="text-body-sm text-muted-foreground">
          {body}
        </p>
      ) : null}
    </div>
  );

  let content: ReactNode;
  if (mode === "subscribe") {
    if (stage === "pending") {
      content = (
        <div className="flex flex-col gap-4" role="status">
          {head(<MailCheck />, t.pendingTitle, t.pendingBody(email.trim()))}
          <Button variant="ghost" onClick={() => { setStage("form"); setConsent(false); setTried(false); }}>
            {t.pendingWrong}
          </Button>
        </div>
      );
    } else {
      content = (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (issues.length) return;
            void run(() => onSubscribe?.({ email: email.trim(), name: name.trim() || undefined }), "pending");
          }}
        >
          {head(<MailCheck />, t.subscribeTitle, t.subscribeBody)}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {askName ? (
            <Field>
              <FieldLabel>
                {t.name} <span className="text-caption font-normal text-muted-foreground">({t.optional})</span>
              </FieldLabel>
              <Input value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            </Field>
          ) : null}
          <Field invalid={tried && (issues.includes("email-empty") || issues.includes("email-invalid"))}>
            <FieldLabel>{t.email}</FieldLabel>
            <Input ltr type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
            {tried && (issues.includes("email-empty") || issues.includes("email-invalid")) ? (
              <p role="alert" className="text-caption text-destructive">
                {t.issues[issues.includes("email-empty") ? "email-empty" : "email-invalid"]}
              </p>
            ) : null}
          </Field>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-consent`} className="flex items-start gap-2 text-body-sm">
              <Checkbox id={`${id}-consent`} className="mt-0.5" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
              <span>{t.consent}</span>
            </label>
            {tried && issues.includes("consent-missing") ? (
              <p role="alert" className="text-caption text-destructive">
                {t.issues["consent-missing"]}
              </p>
            ) : null}
          </div>
          <Button type="submit" variant="primary" loading={busy} className="w-full">
            {t.subscribe}
          </Button>
          <p className="text-center text-caption text-muted-foreground">{t.privacy}</p>
        </form>
      );
    }
  } else if (mode === "confirm") {
    content =
      stage === "done" ? (
        <div role="status">{head(<CheckCircle2 />, t.confirmedTitle, t.confirmedBody)}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {head(<MailCheck />, t.confirmTitle, t.confirmBody(maskSubscriberEmail(shownEmail)))}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button variant="primary" loading={busy} className="w-full" onClick={() => void run(() => onConfirm?.(), "done")}>
            {t.confirm}
          </Button>
        </div>
      );
  } else if (stage === "done") {
    content = (
      <div className="flex flex-col gap-4" role="status">
        {head(<MailX />, t.unsubscribedTitle, t.unsubscribedBody(maskSubscriberEmail(shownEmail)))}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {onResubscribe ? (
          <Button variant="secondary" loading={busy} className="w-full" onClick={() => void run(() => onResubscribe(), "undone")}>
            {t.resubscribe}
          </Button>
        ) : null}
      </div>
    );
  } else if (stage === "undone") {
    content = <div role="status">{head(<CheckCircle2 />, t.resubscribedTitle, t.resubscribedBody)}</div>;
  } else {
    const keys = reasons ?? ["too_many", "not_relevant", "never_signed", "other"];
    content = (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => onUnsubscribe?.({ reason: reason || undefined, note: note.trim() || undefined }), "done");
        }}
      >
        {head(<MailX />, t.unsubscribeTitle, t.unsubscribeBody(maskSubscriberEmail(shownEmail)))}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-label text-foreground">{t.reasonLabel}</legend>
          <RadioGroup value={reason} onValueChange={(v) => setReason(String(v))} className="flex flex-col gap-2">
            {keys.map((k) => (
              <label key={k} className="flex items-center gap-2 text-body-sm">
                <Radio value={k} />
                {t.reasons[k] ?? k}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
        {reason === "other" ? (
          <Field>
            <FieldLabel>{t.note}</FieldLabel>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        ) : null}
        <Button type="submit" variant="primary" loading={busy} className="w-full">
          {t.unsubscribe}
        </Button>
      </form>
    );
  }

  return (
    <div data-slot="subscription-landing" data-mode={mode} className={cn("flex min-h-full w-full flex-col items-center justify-center gap-6 p-4 sm:p-8", className)}>
      {brand ? <div className="text-h4 text-foreground">{brand}</div> : null}
      <Card className="w-full max-w-md p-6">{content}</Card>
    </div>
  );
}
