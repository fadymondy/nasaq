"use client";

import { Check, CircleDashed, Mail, MailPlus, Plus, Send, ShieldCheck, Trash2, X } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { CodeBlock } from "../code-block";
import { CopyField } from "../copy-button";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTablePagination, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { Meter } from "../progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Spinner } from "../spinner";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import {
  type AliasField,
  type DnsKind,
  type DnsStatus,
  type MailboxField,
  type SmtpEncryption,
  type StepState,
  type TestOutcome,
  DNS_KINDS,
  SMTP_ENCRYPTIONS,
  TEST_STEPS,
  analyzeDmarc,
  analyzeSpf,
  defaultSmtpPort,
  domainHealth,
  formatMegabytes,
  isEmail,
  quotaFraction,
  stepStates,
  validateAlias,
  validateMailbox,
  validateSmtp,
} from "./mail-format";

export {
  analyzeDmarc,
  analyzeSpf,
  defaultSmtpPort,
  domainHealth,
  firstFailure,
  formatMegabytes,
  isLocalPart,
  quotaFraction,
  stepStates,
  validateAlias,
  validateMailbox,
  validateSmtp,
} from "./mail-format";
export type { DmarcAnalysis, DnsKind, DnsStatus, DomainHealth, SmtpEncryption, SmtpField, SpfAnalysis, StepState, TestOutcome, TestStep, TestStepId } from "./mail-format";

const STRINGS = {
  en: {
    genericError: "Something went wrong. Try again.",
    cancel: "Cancel",
    dismiss: "Dismiss",
    // smtp
    smtpTitle: "SMTP",
    smtpDescription: "The mail server the app sends through.",
    host: "Host",
    hostPlaceholder: "smtp.example.com",
    hostInvalid: "Enter a host name or IP address.",
    port: "Port",
    portInvalid: "Enter a port from 1 to 65535.",
    encryption: "Encryption",
    encryptions: { none: "None", starttls: "STARTTLS", tls: "SSL/TLS" } as Record<SmtpEncryption, string>,
    encryptionHint: (port: number) => `Usual port ${port}.`,
    username: "Username",
    password: "Password",
    passwordSaved: "A password is saved. Leave blank to keep it.",
    passwordPlaceholderSaved: "Saved",
    passwordHint: "Stored write-only. It is never shown again.",
    fromName: "From name",
    fromNamePlaceholder: "Nasaq",
    fromAddress: "From address",
    fromAddressPlaceholder: "no-reply@example.com",
    fromAddressInvalid: "Enter a valid email address.",
    save: "Save settings",
    saved: "Settings saved.",
    // test
    testTitle: "Send a test email",
    testDescription: "Uses the settings above, saved or not. It checks each step of the connection.",
    testTo: "Send to",
    testToPlaceholder: "you@example.com",
    testToInvalid: "Enter a valid email address.",
    sendTest: "Send test",
    testing: "Testing…",
    testPassed: "The test email was sent.",
    testFailed: "The test failed.",
    steps: { connect: "Connect to the server", tls: "Secure the connection", auth: "Sign in", send: "Send the message" } as Record<"connect" | "tls" | "auth" | "send", string>,
    stepState: { pass: "Passed", fail: "Failed", skipped: "Skipped" } as Record<StepState, string>,
    testHost: "Fix the host, port and address first.",
    // domains
    domainsTitle: "Mail domains",
    domainsDescription: "Mailboxes and aliases per domain, with the DNS records that make mail deliverable.",
    domain: "Domain",
    noDomains: "No mail domains",
    noDomainsBody: "Add a domain to create mailboxes and aliases.",
    health: { healthy: "Ready to send", attention: "Checking", critical: "Needs DNS records" } as Record<"healthy" | "attention" | "critical", string>,
    checklistTitle: "DNS checklist",
    checklistDescription: "Add these records at your DNS host. Then check again.",
    recheck: "Check again",
    checking: "Checking…",
    lastChecked: "Last checked",
    kinds: { spf: "SPF", dkim: "DKIM", dmarc: "DMARC" } as Record<DnsKind, string>,
    kindHelp: {
      spf: "Says which servers may send for the domain.",
      dkim: "Signs each message so it cannot be forged.",
      dmarc: "Tells receivers what to do with mail that fails the two above.",
    } as Record<DnsKind, string>,
    dnsStatus: { pass: "Correct", fail: "Wrong value", missing: "Not found", pending: "Checking" } as Record<DnsStatus, string>,
    recordName: "Name",
    recordType: "Type",
    expected: "Expected value",
    found: "Found",
    nothingFound: "Nothing found.",
    spfOpen: "This record lets any server send for the domain (+all). Use -all or ~all.",
    spfLookups: (n: number) => `${n} DNS lookups. More than 10 breaks SPF.`,
    dmarcNone: "Policy none only monitors. Move to quarantine or reject once reports look clean.",
    mailboxesTitle: "Mailboxes",
    mailboxesDescription: "Each has its own sign-in and quota.",
    mailboxesTable: "Mailboxes",
    address: "Address",
    quota: "Quota",
    used: "Used",
    addMailbox: "Add mailbox",
    mailboxesEmpty: "No mailboxes",
    localPart: "Name",
    localPlaceholder: "info",
    localInvalid: "Use letters, digits and . _ + - only.",
    quotaLabel: "Quota (MB)",
    quotaInvalid: "Enter a size in MB.",
    mailboxPassword: "Password",
    mailboxPasswordInvalid: "Use at least 10 characters.",
    addMailboxTitle: "Add a mailbox",
    add: "Add",
    remove: "Remove",
    removeMailboxTitle: (a: string) => `Remove ${a}?`,
    removeMailboxBody: "The mailbox and every message in it are deleted.",
    aliasesTitle: "Aliases",
    aliasesDescription: "Forward an address to another one. A star catches everything else.",
    aliasesTable: "Aliases",
    aliasSource: "Alias",
    aliasDestination: "Forwards to",
    aliasesEmpty: "No aliases",
    addAlias: "Add alias",
    addAliasTitle: "Add an alias",
    aliasSourceLabel: "Alias name",
    aliasSourcePlaceholder: "sales",
    aliasSourceInvalid: "Use letters, digits and . _ + - or a star.",
    aliasDestLabel: "Forward to",
    aliasDestPlaceholder: "team@example.com",
    aliasDestInvalid: "Enter a valid email address.",
    removeAliasTitle: (a: string) => `Remove ${a}?`,
    removeAliasBody: "Mail sent to this alias will bounce.",
    copyRecord: "Copy record",
  },
  ar: {
    genericError: "حدث خطأ. حاول مرة أخرى.",
    cancel: "إلغاء",
    dismiss: "إغلاق",
    smtpTitle: "SMTP",
    smtpDescription: "خادم البريد الذي يرسل التطبيق عبره.",
    host: "المضيف",
    hostPlaceholder: "smtp.example.com",
    hostInvalid: "أدخل اسم مضيف أو عنوان IP.",
    port: "المنفذ",
    portInvalid: "أدخل منفذًا من 1 إلى 65535.",
    encryption: "التشفير",
    encryptions: { none: "بدون", starttls: "STARTTLS", tls: "SSL/TLS" } as Record<SmtpEncryption, string>,
    encryptionHint: (port: number) => `المنفذ المعتاد ${port}.`,
    username: "اسم المستخدم",
    password: "كلمة المرور",
    passwordSaved: "توجد كلمة مرور محفوظة. اتركه فارغًا للإبقاء عليها.",
    passwordPlaceholderSaved: "محفوظة",
    passwordHint: "تُخزَّن للكتابة فقط ولا تُعرض مرة أخرى.",
    fromName: "اسم المرسل",
    fromNamePlaceholder: "نسق",
    fromAddress: "عنوان المرسل",
    fromAddressPlaceholder: "no-reply@example.com",
    fromAddressInvalid: "أدخل بريدًا إلكترونيًا صحيحًا.",
    save: "حفظ الإعدادات",
    saved: "تم حفظ الإعدادات.",
    testTitle: "إرسال بريد تجريبي",
    testDescription: "يستخدم الإعدادات أعلاه، محفوظة أم لا، ويفحص كل خطوة في الاتصال.",
    testTo: "إرسال إلى",
    testToPlaceholder: "you@example.com",
    testToInvalid: "أدخل بريدًا إلكترونيًا صحيحًا.",
    sendTest: "إرسال تجريبي",
    testing: "جارٍ الاختبار…",
    testPassed: "تم إرسال البريد التجريبي.",
    testFailed: "فشل الاختبار.",
    steps: { connect: "الاتصال بالخادم", tls: "تأمين الاتصال", auth: "تسجيل الدخول", send: "إرسال الرسالة" } as Record<"connect" | "tls" | "auth" | "send", string>,
    stepState: { pass: "نجحت", fail: "فشلت", skipped: "تم تخطيها" } as Record<StepState, string>,
    testHost: "صحّح المضيف والمنفذ والعنوان أولًا.",
    domainsTitle: "نطاقات البريد",
    domainsDescription: "صناديق البريد والأسماء المستعارة لكل نطاق، مع سجلات DNS التي تجعل البريد قابلًا للتسليم.",
    domain: "النطاق",
    noDomains: "لا توجد نطاقات بريد",
    noDomainsBody: "أضف نطاقًا لإنشاء صناديق بريد وأسماء مستعارة.",
    health: { healthy: "جاهز للإرسال", attention: "جارٍ الفحص", critical: "يحتاج سجلات DNS" } as Record<"healthy" | "attention" | "critical", string>,
    checklistTitle: "قائمة فحص DNS",
    checklistDescription: "أضف هذه السجلات عند مزوّد DNS ثم افحص مرة أخرى.",
    recheck: "افحص مرة أخرى",
    checking: "جارٍ الفحص…",
    lastChecked: "آخر فحص",
    kinds: { spf: "SPF", dkim: "DKIM", dmarc: "DMARC" } as Record<DnsKind, string>,
    kindHelp: {
      spf: "يحدد الخوادم المسموح لها بالإرسال باسم النطاق.",
      dkim: "يوقّع كل رسالة حتى لا يمكن تزويرها.",
      dmarc: "يخبر المستلمين بما يفعلونه بالبريد الذي يفشل في الفحصين السابقين.",
    } as Record<DnsKind, string>,
    dnsStatus: { pass: "صحيح", fail: "قيمة خاطئة", missing: "غير موجود", pending: "جارٍ الفحص" } as Record<DnsStatus, string>,
    recordName: "الاسم",
    recordType: "النوع",
    expected: "القيمة المتوقعة",
    found: "الموجود",
    nothingFound: "لا يوجد شيء.",
    spfOpen: "يسمح هذا السجل لأي خادم بالإرسال باسم النطاق (+all). استخدم -all أو ~all.",
    spfLookups: (n: number) => `${n} عمليات بحث DNS. أكثر من 10 يكسر SPF.`,
    dmarcNone: "السياسة none للمراقبة فقط. انتقل إلى quarantine أو reject عندما تبدو التقارير نظيفة.",
    mailboxesTitle: "صناديق البريد",
    mailboxesDescription: "لكل صندوق تسجيل دخول وحصة خاصة.",
    mailboxesTable: "صناديق البريد",
    address: "العنوان",
    quota: "الحصة",
    used: "المستخدم",
    addMailbox: "إضافة صندوق",
    mailboxesEmpty: "لا توجد صناديق بريد",
    localPart: "الاسم",
    localPlaceholder: "info",
    localInvalid: "استخدم الأحرف والأرقام و . _ + - فقط.",
    quotaLabel: "الحصة (ميغابايت)",
    quotaInvalid: "أدخل حجمًا بالميغابايت.",
    mailboxPassword: "كلمة المرور",
    mailboxPasswordInvalid: "استخدم 10 أحرف على الأقل.",
    addMailboxTitle: "إضافة صندوق بريد",
    add: "إضافة",
    remove: "إزالة",
    removeMailboxTitle: (a: string) => `إزالة ${a}؟`,
    removeMailboxBody: "سيُحذف الصندوق وكل الرسائل فيه.",
    aliasesTitle: "الأسماء المستعارة",
    aliasesDescription: "حوّل عنوانًا إلى آخر. النجمة تلتقط كل ما تبقى.",
    aliasesTable: "الأسماء المستعارة",
    aliasSource: "الاسم المستعار",
    aliasDestination: "يُحوَّل إلى",
    aliasesEmpty: "لا توجد أسماء مستعارة",
    addAlias: "إضافة اسم مستعار",
    addAliasTitle: "إضافة اسم مستعار",
    aliasSourceLabel: "الاسم المستعار",
    aliasSourcePlaceholder: "sales",
    aliasSourceInvalid: "استخدم الأحرف والأرقام و . _ + - أو نجمة.",
    aliasDestLabel: "التحويل إلى",
    aliasDestPlaceholder: "team@example.com",
    aliasDestInvalid: "أدخل بريدًا إلكترونيًا صحيحًا.",
    removeAliasTitle: (a: string) => `إزالة ${a}؟`,
    removeAliasBody: "الرسائل المرسلة إلى هذا الاسم ستُرتد.",
    copyRecord: "نسخ السجل",
  },
};

export type MailSettingsLabels = typeof STRINGS.en;
export type MailResult = void | { error?: string };

function useMailLabels(labels: Partial<MailSettingsLabels> | undefined) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  return { ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as MailSettingsLabels };
}

/* ------------------------------------------------------------------ smtp */

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  fromName: string;
  fromAddress: string;
  /** Whether a password is already stored. The password itself is never passed to the UI. */
  passwordSet: boolean;
}

/** What Save sends. `password` is set only when the user typed one. */
export interface SmtpSaveInput {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  password?: string;
  fromName: string;
  fromAddress: string;
}

export interface SmtpTestInput extends SmtpSaveInput {
  to: string;
}

export interface SmtpSettingsProps extends Omit<ComponentProps<"div">, "children" | "title" | "onSubmit"> {
  value: SmtpConfig;
  /** Saves the form. Return `{ error }` to show a failure. */
  onSave: (input: SmtpSaveInput) => Promise<MailResult> | MailResult;
  /** Sends a test message with the current form values and reports each step. */
  onTest: (input: SmtpTestInput) => Promise<TestOutcome>;
  /** Pre-fills the test recipient, for example the signed-in user. */
  defaultTestTo?: string;
  loading?: boolean;
  labels?: Partial<MailSettingsLabels>;
}

const stepTone: Record<StepState, StatusTone> = { pass: "success", fail: "danger", skipped: "neutral" };

/**
 * SMTP settings: host, port, encryption, username, a write-only password and the From identity, plus a test send that shows
 * each of the four steps (connect, secure, sign in, send) as passed, failed or skipped with the server reply for a failure.
 * The password is never read back: an empty field keeps the stored one.
 */
export function SmtpSettings({ value, onSave, onTest, defaultTestTo = "", loading = false, labels, className, ...props }: SmtpSettingsProps) {
  const { t } = useMailLabels(labels);
  const [host, setHost] = useState(value.host);
  const [port, setPort] = useState(String(value.port));
  const [encryption, setEncryption] = useState<SmtpEncryption>(value.encryption);
  const [username, setUsername] = useState(value.username);
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(value.fromName);
  const [fromAddress, setFromAddress] = useState(value.fromAddress);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [to, setTo] = useState(defaultTestTo);
  const [toTouched, setToTouched] = useState(false);
  const [testing, setTesting] = useState(false);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const stored = useRef(value);
  useEffect(() => {
    // A new saved value from the host resets the form to it.
    if (stored.current === value) return;
    stored.current = value;
    setHost(value.host);
    setPort(String(value.port));
    setEncryption(value.encryption);
    setUsername(value.username);
    setFromName(value.fromName);
    setFromAddress(value.fromAddress);
    setPassword("");
  }, [value]);

  const invalid = validateSmtp({ host, port, encryption, username, fromName, fromAddress });
  const draft = (): SmtpSaveInput => ({
    host: host.trim(),
    port: Number(port),
    encryption,
    username: username.trim(),
    ...(password ? { password } : {}),
    fromName: fromName.trim(),
    fromAddress: fromAddress.trim(),
  });

  const encItems = SMTP_ENCRYPTIONS.map((e) => ({ value: e, label: t.encryptions[e] }));

  async function save(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    setSaved(false);
    if (invalid.length) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onSave(draft());
      if (result && result.error) setError(result.error);
      else {
        setSaved(true);
        setPassword("");
      }
    } catch {
      setError(t.genericError);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setToTouched(true);
    setTouched(true);
    if (!isEmail(to) || invalid.length) return;
    setTesting(true);
    setOutcome(null);
    setTestError(null);
    try {
      setOutcome(await onTest({ ...draft(), to: to.trim() }));
    } catch {
      setTestError(t.genericError);
    } finally {
      setTesting(false);
    }
  }

  const states = outcome ? stepStates(outcome.steps) : null;
  const failing = outcome?.steps.find((s) => !s.ok);

  return (
    <div data-slot="smtp-settings" aria-busy={loading || undefined} className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle as="h2">{t.smtpTitle}</CardTitle>
          <CardDescription>{t.smtpDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} noValidate className="flex flex-col gap-4">
            {error ? (
              <Alert tone="danger" onDismiss={() => setError(null)} dismissLabel={t.dismiss}>
                {error}
              </Alert>
            ) : null}
            {saved ? (
              <Alert tone="success" onDismiss={() => setSaved(false)} dismissLabel={t.dismiss}>
                {t.saved}
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_12rem]">
              <Field invalid={touched && invalid.includes("host")}>
                <FieldLabel>{t.host}</FieldLabel>
                <Input ltr value={host} onChange={(e) => setHost(e.target.value)} placeholder={t.hostPlaceholder} autoComplete="off" spellCheck={false} disabled={loading} />
                {touched && invalid.includes("host") ? <FieldError match>{t.hostInvalid}</FieldError> : null}
              </Field>
              <Field invalid={touched && invalid.includes("port")}>
                <FieldLabel>{t.port}</FieldLabel>
                <Input ltr inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value)} autoComplete="off" disabled={loading} />
                {touched && invalid.includes("port") ? <FieldError match>{t.portInvalid}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel>{t.encryption}</FieldLabel>
                <Select
                  items={encItems}
                  value={encryption}
                  onValueChange={(v) => {
                    if (!v) return;
                    const next = v as SmtpEncryption;
                    // Keep the port in step with the mode unless the user typed a custom one.
                    if (port === String(defaultSmtpPort(encryption))) setPort(String(defaultSmtpPort(next)));
                    setEncryption(next);
                  }}
                >
                  <SelectTrigger disabled={loading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {encItems.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{t.encryptionHint(defaultSmtpPort(encryption))}</FieldDescription>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.username}</FieldLabel>
                <Input ltr value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" spellCheck={false} disabled={loading} />
              </Field>
              <Field>
                <FieldLabel>{t.password}</FieldLabel>
                <Input ltr type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={value.passwordSet ? t.passwordPlaceholderSaved : ""} disabled={loading} />
                <FieldDescription>{value.passwordSet ? t.passwordSaved : t.passwordHint}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>{t.fromName}</FieldLabel>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder={t.fromNamePlaceholder} autoComplete="off" disabled={loading} />
              </Field>
              <Field invalid={touched && invalid.includes("fromAddress")}>
                <FieldLabel>{t.fromAddress}</FieldLabel>
                <Input ltr type="email" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder={t.fromAddressPlaceholder} autoComplete="off" disabled={loading} />
                {touched && invalid.includes("fromAddress") ? <FieldError match>{t.fromAddressInvalid}</FieldError> : null}
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={saving} disabled={loading}>
                {t.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card data-slot="smtp-test" className="w-full">
        <CardHeader>
          <CardTitle as="h3">{t.testTitle}</CardTitle>
          <CardDescription>{t.testDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="flex-1" invalid={toTouched && !isEmail(to)}>
              <FieldLabel>{t.testTo}</FieldLabel>
              <Input ltr type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder={t.testToPlaceholder} autoComplete="off" disabled={loading} />
              {toTouched && !isEmail(to) ? <FieldError match>{t.testToInvalid}</FieldError> : null}
            </Field>
            <Button variant="secondary" onClick={sendTest} loading={testing} disabled={loading}>
              <Send aria-hidden className="size-4 rtl:-scale-x-100" />
              {testing ? t.testing : t.sendTest}
            </Button>
          </div>
          {testError ? <Alert tone="danger">{testError}</Alert> : null}
          {outcome && states ? (
            <div data-slot="smtp-test-result" className="flex flex-col gap-3" role="status">
              <Alert tone={outcome.ok ? "success" : "danger"}>{outcome.ok ? t.testPassed : t.testFailed}</Alert>
              <ol className="flex flex-col divide-y divide-border rounded-control border border-border">
                {TEST_STEPS.map((id) => {
                  const state = states[id];
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        {state === "pass" ? <Check aria-hidden className="size-4 text-success" /> : state === "fail" ? <X aria-hidden className="size-4 text-danger" /> : <CircleDashed aria-hidden className="size-4 text-muted-foreground" />}
                        {t.steps[id]}
                      </span>
                      <Status tone={stepTone[state]}>{t.stepState[state]}</Status>
                    </li>
                  );
                })}
              </ol>
              {failing?.message ? <CodeBlock code={failing.message} language="text" /> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ domains */

export interface DnsCheck {
  kind: DnsKind;
  status: DnsStatus;
  /** Record name, for example `example.com` or `mail._domainkey.example.com`. */
  name: string;
  /** The DNS record type: TXT for all three usually. */
  type?: string;
  /** The value the host should publish. */
  expected: string;
  /** What DNS returned now, if anything. */
  found?: string;
}

export interface Mailbox {
  id: string;
  /** The part before the `@`. */
  local: string;
  quotaMb: number;
  usedMb: number;
}

export interface MailAlias {
  id: string;
  /** The part before the `@`, or `*` for a catch-all. */
  source: string;
  /** A full address. */
  destination: string;
}

export interface MailDomain {
  id: string;
  name: string;
  checks: readonly DnsCheck[];
  mailboxes: readonly Mailbox[];
  aliases: readonly MailAlias[];
  checkedAt?: Date | number | string;
}

export interface MailboxInput {
  local: string;
  quotaMb: number;
  password: string;
}

export interface AliasInput {
  source: string;
  destination: string;
}

export interface MailDomainsProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  domains: readonly MailDomain[];
  /** Domain shown first. Default the first one. */
  defaultDomainId?: string;
  onRecheck: (domainId: string) => Promise<MailResult> | MailResult;
  onAddMailbox: (domainId: string, input: MailboxInput) => Promise<MailResult> | MailResult;
  onRemoveMailbox: (domainId: string, id: string) => Promise<MailResult> | MailResult;
  onAddAlias: (domainId: string, input: AliasInput) => Promise<MailResult> | MailResult;
  onRemoveAlias: (domainId: string, id: string) => Promise<MailResult> | MailResult;
  loading?: boolean;
  labels?: Partial<MailSettingsLabels>;
}

const dnsTone: Record<DnsStatus, StatusTone> = { pass: "success", fail: "danger", missing: "danger", pending: "info" };
const healthTone = { healthy: "success", attention: "info", critical: "warning" } as const;

interface RemoveRequest {
  title: string;
  body: string;
  run: () => Promise<MailResult> | MailResult;
}

/**
 * Mail domains: pick a domain and see an SPF, DKIM and DMARC checklist (expected record, what DNS returned, with copy
 * fields and a check again button), its mailboxes with quota use, and its aliases. Adding and removing is through
 * callbacks; removals ask first. The host does the DNS lookups and passes the statuses back.
 */
export function MailDomains({ domains, defaultDomainId, onRecheck, onAddMailbox, onRemoveMailbox, onAddAlias, onRemoveAlias, loading = false, labels, className, ...props }: MailDomainsProps) {
  const { t } = useMailLabels(labels);
  const [domainId, setDomainId] = useState(defaultDomainId ?? domains[0]?.id ?? "");
  const domain = domains.find((d) => d.id === domainId) ?? domains[0];
  const [failure, setFailure] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [aliasOpen, setAliasOpen] = useState(false);
  const [removing, setRemoving] = useState<RemoveRequest | null>(null);
  const [held, setHeld] = useState<RemoveRequest | null>(null);
  const [removePending, setRemovePending] = useState(false);
  useEffect(() => {
    if (removing) setHeld(removing);
  }, [removing]);

  async function guard(task: () => Promise<MailResult> | MailResult) {
    setFailure(null);
    try {
      const result = await task();
      if (result && result.error) setFailure(result.error);
    } catch {
      setFailure(t.genericError);
    }
  }

  const mailboxColumns = useMemo<DataTableColumn<Mailbox>[]>(
    () => [
      {
        id: "address",
        header: t.address,
        label: t.address,
        hideable: false,
        sortValue: (m) => m.local,
        searchValue: (m) => m.local,
        cell: (m) => (
          <bdi dir="ltr" className="text-start font-mono text-code text-foreground">
            {m.local}@{domain?.name}
          </bdi>
        ),
      },
      {
        id: "used",
        header: t.used,
        label: t.used,
        sortValue: (m) => quotaFraction(m.usedMb, m.quotaMb),
        headerClassName: "min-w-40",
        cell: (m) => (
          <Meter
            size="sm"
            aria-label={`${t.used}: ${m.local}`}
            value={m.usedMb}
            max={m.quotaMb}
            showValue
            valueText={
              <bdi dir="ltr">
                {formatMegabytes(m.usedMb)} / {formatMegabytes(m.quotaMb)}
              </bdi>
            }
          />
        ),
      },
    ],
    [t, domain?.name],
  );
  const mailboxTable = useDataTable({ data: (domain?.mailboxes ?? []) as Mailbox[], columns: mailboxColumns, getRowId: (m) => m.id, defaultSort: { id: "address", direction: "asc" }, pageSize: 8 });

  const aliasColumns = useMemo<DataTableColumn<MailAlias>[]>(
    () => [
      {
        id: "source",
        header: t.aliasSource,
        label: t.aliasSource,
        hideable: false,
        sortValue: (a) => a.source,
        searchValue: (a) => `${a.source} ${a.destination}`,
        cell: (a) => (
          <bdi dir="ltr" className="text-start font-mono text-code text-foreground">
            {a.source}@{domain?.name}
          </bdi>
        ),
      },
      {
        id: "destination",
        header: t.aliasDestination,
        label: t.aliasDestination,
        sortValue: (a) => a.destination,
        cell: (a) => (
          <bdi dir="ltr" className="text-start font-mono text-code text-muted-foreground">
            {a.destination}
          </bdi>
        ),
      },
    ],
    [t, domain?.name],
  );
  const aliasTable = useDataTable({ data: (domain?.aliases ?? []) as MailAlias[], columns: aliasColumns, getRowId: (a) => a.id, defaultSort: { id: "source", direction: "asc" }, pageSize: 8 });

  if (!domain) {
    return (
      <Card data-slot="mail-domains" className={cn("w-full", className)}>
        <CardContent>
          <EmptyState icon={Mail} title={t.noDomains} description={t.noDomainsBody} />
        </CardContent>
      </Card>
    );
  }

  const health = domainHealth(domain.checks);
  const domainItems = domains.map((d) => ({ value: d.id, label: d.name }));

  const mailboxActions = (m: Mailbox): DataTableRowAction[] => [
    {
      id: "remove",
      label: t.remove,
      icon: Trash2,
      danger: true,
      onSelect: () => setRemoving({ title: t.removeMailboxTitle(`${m.local}@${domain.name}`), body: t.removeMailboxBody, run: () => onRemoveMailbox(domain.id, m.id) }),
    },
  ];
  const aliasActions = (a: MailAlias): DataTableRowAction[] => [
    {
      id: "remove",
      label: t.remove,
      icon: Trash2,
      danger: true,
      onSelect: () => setRemoving({ title: t.removeAliasTitle(`${a.source}@${domain.name}`), body: t.removeAliasBody, run: () => onRemoveAlias(domain.id, a.id) }),
    },
  ];

  return (
    <div data-slot="mail-domains" aria-busy={loading || undefined} className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle as="h2">{t.domainsTitle}</CardTitle>
          <CardDescription>{t.domainsDescription}</CardDescription>
          <CardAction>
            <Status tone={healthTone[health]} data-health={health}>
              {t.health[health]}
            </Status>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {failure ? (
            <Alert tone="danger" onDismiss={() => setFailure(null)} dismissLabel={t.dismiss}>
              {failure}
            </Alert>
          ) : null}
          <Field className="max-w-sm">
            <FieldLabel>{t.domain}</FieldLabel>
            <Select items={domainItems} value={domain.id} onValueChange={(v) => v && setDomainId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domainItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <bdi dir="ltr">{o.label}</bdi>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card data-slot="mail-dns" className="w-full">
        <CardHeader>
          <CardTitle as="h3">{t.checklistTitle}</CardTitle>
          <CardDescription>
            {t.checklistDescription}
            {domain.checkedAt ? (
              <>
                {" "}
                {t.lastChecked} <DateTime value={domain.checkedAt} relative />.
              </>
            ) : null}
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              variant="secondary"
              loading={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  await guard(() => onRecheck(domain.id));
                } finally {
                  setChecking(false);
                }
              }}
            >
              <ShieldCheck aria-hidden className="size-4" />
              {checking ? t.checking : t.recheck}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {DNS_KINDS.map((kind) => {
            const check = domain.checks.find((c) => c.kind === kind);
            return <DnsRow key={kind} kind={kind} check={check} t={t} />;
          })}
        </CardContent>
      </Card>

      <Card data-slot="mail-mailboxes" className="w-full">
        <CardHeader>
          <CardTitle as="h3">{t.mailboxesTitle}</CardTitle>
          <CardDescription>{t.mailboxesDescription}</CardDescription>
          <CardAction>
            <Button size="sm" variant="secondary" onClick={() => setMailboxOpen(true)}>
              <MailPlus aria-hidden className="size-4" />
              {t.addMailbox}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DataTable table={mailboxTable} label={t.mailboxesTable} rowLabel={(m) => `${m.local}@${domain.name}`} loading={loading} empty={<EmptyState icon={Mail} title={t.mailboxesEmpty} />} rowActions={mailboxActions} />
          <DataTablePagination table={mailboxTable} />
        </CardContent>
      </Card>

      <Card data-slot="mail-aliases" className="w-full">
        <CardHeader>
          <CardTitle as="h3">{t.aliasesTitle}</CardTitle>
          <CardDescription>{t.aliasesDescription}</CardDescription>
          <CardAction>
            <Button size="sm" variant="secondary" onClick={() => setAliasOpen(true)}>
              <Plus aria-hidden className="size-4" />
              {t.addAlias}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DataTable table={aliasTable} label={t.aliasesTable} rowLabel={(a) => `${a.source}@${domain.name}`} loading={loading} empty={<EmptyState icon={Mail} title={t.aliasesEmpty} />} rowActions={aliasActions} />
          <DataTablePagination table={aliasTable} />
        </CardContent>
      </Card>

      <MailboxDialog open={mailboxOpen} onOpenChange={setMailboxOpen} domain={domain.name} onAdd={(input) => onAddMailbox(domain.id, input)} t={t} />
      <AliasDialog open={aliasOpen} onOpenChange={setAliasOpen} domain={domain.name} onAdd={(input) => onAddAlias(domain.id, input)} t={t} />

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !removePending && setRemoving(null)}>
        <AlertDialogContent data-slot="mail-remove">
          <AlertDialogHeader>
            <AlertDialogTitle>{held?.title}</AlertDialogTitle>
            <AlertDialogDescription>{held?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePending}>{t.cancel}</AlertDialogCancel>
            <Button
              variant="danger"
              loading={removePending}
              onClick={async () => {
                if (!held) return;
                setRemovePending(true);
                try {
                  await guard(held.run);
                } finally {
                  setRemovePending(false);
                  setRemoving(null);
                }
              }}
            >
              {t.remove}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DnsRow({ kind, check, t }: { kind: DnsKind; check: DnsCheck | undefined; t: MailSettingsLabels }) {
  const status: DnsStatus = check?.status ?? "missing";
  // Warnings that come from reading the record that DNS returned.
  const warnings: string[] = [];
  if (check?.found) {
    if (kind === "spf") {
      const spf = analyzeSpf(check.found);
      if (spf.valid && spf.policy === "open") warnings.push(t.spfOpen);
      if (spf.valid && spf.lookups > 10) warnings.push(t.spfLookups(spf.lookups));
    }
    if (kind === "dmarc") {
      const dmarc = analyzeDmarc(check.found);
      if (dmarc.valid && dmarc.policy === "none") warnings.push(t.dmarcNone);
    }
  }
  return (
    <section data-slot="mail-dns-row" data-kind={kind} data-status={status} aria-label={t.kinds[kind]} className="flex flex-col gap-2 rounded-control border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-label text-foreground">{t.kinds[kind]}</span>
          <span className="text-caption text-muted-foreground">{t.kindHelp[kind]}</span>
        </div>
        {status === "pending" ? (
          <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
            <Spinner /> {t.dnsStatus.pending}
          </span>
        ) : (
          <Status tone={dnsTone[status]}>{t.dnsStatus[status]}</Status>
        )}
      </div>
      {check ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            <span>{t.recordType}</span>
            <Badge variant="outline">{check.type ?? "TXT"}</Badge>
            <span>{t.recordName}</span>
            <bdi dir="ltr" className="font-mono text-code text-foreground">
              {check.name}
            </bdi>
          </div>
          <CopyField value={check.expected} label={`${t.kinds[kind]}: ${t.expected}`} copyLabel={t.copyRecord} />
          {status !== "pass" ? (
            <p className="text-caption text-muted-foreground">
              {t.found}:{" "}
              {check.found ? (
                <bdi dir="ltr" className="font-mono text-code text-foreground break-all">
                  {check.found}
                </bdi>
              ) : (
                t.nothingFound
              )}
            </p>
          ) : null}
        </>
      ) : null}
      {warnings.map((w) => (
        <Alert key={w} tone="warning">
          {w}
        </Alert>
      ))}
    </section>
  );
}

function MailboxDialog({ open, onOpenChange, domain, onAdd, t }: { open: boolean; onOpenChange: (open: boolean) => void; domain: string; onAdd: (input: MailboxInput) => Promise<MailResult> | MailResult; t: MailSettingsLabels }) {
  const [local, setLocal] = useState("");
  const [quota, setQuota] = useState("2048");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setLocal("");
      setQuota("2048");
      setPassword("");
      setTouched(false);
      setError(null);
    }
  }, [open]);
  const problems: MailboxField[] = validateMailbox({ local, quotaMb: quota, password });
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    if (problems.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await onAdd({ local: local.trim().toLowerCase(), quotaMb: Number(quota), password });
      if (result && result.error) setError(result.error);
      else onOpenChange(false);
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-slot="mail-add-mailbox" className="max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.addMailboxTitle}</DialogTitle>
            <DialogDescription>
              <bdi dir="ltr">@{domain}</bdi>
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={touched && problems.includes("local")}>
            <FieldLabel>{t.localPart}</FieldLabel>
            <Input ltr value={local} onChange={(e) => setLocal(e.target.value)} placeholder={t.localPlaceholder} autoComplete="off" spellCheck={false} />
            {touched && problems.includes("local") ? <FieldError match>{t.localInvalid}</FieldError> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && problems.includes("quota")}>
              <FieldLabel>{t.quotaLabel}</FieldLabel>
              <Input ltr inputMode="numeric" value={quota} onChange={(e) => setQuota(e.target.value)} autoComplete="off" />
              {touched && problems.includes("quota") ? <FieldError match>{t.quotaInvalid}</FieldError> : null}
            </Field>
            <Field invalid={touched && problems.includes("password")}>
              <FieldLabel>{t.mailboxPassword}</FieldLabel>
              <Input ltr type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              {touched && problems.includes("password") ? <FieldError match>{t.mailboxPasswordInvalid}</FieldError> : null}
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AliasDialog({ open, onOpenChange, domain, onAdd, t }: { open: boolean; onOpenChange: (open: boolean) => void; domain: string; onAdd: (input: AliasInput) => Promise<MailResult> | MailResult; t: MailSettingsLabels }) {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSource("");
      setDestination("");
      setTouched(false);
      setError(null);
    }
  }, [open]);
  const problems: AliasField[] = validateAlias({ source, destination });
  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    if (problems.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await onAdd({ source: source.trim().toLowerCase(), destination: destination.trim() });
      if (result && result.error) setError(result.error);
      else onOpenChange(false);
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-slot="mail-add-alias" className="max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.addAliasTitle}</DialogTitle>
            <DialogDescription>
              <bdi dir="ltr">@{domain}</bdi>
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={touched && problems.includes("source")}>
            <FieldLabel>{t.aliasSourceLabel}</FieldLabel>
            <Input ltr value={source} onChange={(e) => setSource(e.target.value)} placeholder={t.aliasSourcePlaceholder} autoComplete="off" spellCheck={false} />
            {touched && problems.includes("source") ? <FieldError match>{t.aliasSourceInvalid}</FieldError> : null}
          </Field>
          <Field invalid={touched && problems.includes("destination")}>
            <FieldLabel>{t.aliasDestLabel}</FieldLabel>
            <Input ltr type="email" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t.aliasDestPlaceholder} autoComplete="off" />
            {touched && problems.includes("destination") ? <FieldError match>{t.aliasDestInvalid}</FieldError> : null}
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

