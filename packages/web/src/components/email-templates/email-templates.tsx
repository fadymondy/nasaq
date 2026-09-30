"use client";

import { ArrowLeft, Copy, Mail, Monitor, Plus, Search, Send, Smartphone, Trash2 } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { CopyButton } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { RichTextEditor } from "../rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Status } from "../status";
import { Tabs, TabsList, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import { type EmailDirection, type EmailVariable, fillVariables, renderEmailDocument, unknownVariables } from "./email-render";

export { type EmailDirection, type EmailVariable, escapeHtml, fillVariables, findVariables, renderEmailDocument, unknownVariables } from "./email-render";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    gallery: "Email templates",
    search: "Search templates…",
    newTemplate: "New template",
    untitled: "Untitled template",
    all: "All",
    categories: { welcome: "Welcome", transactional: "Transactional", marketing: "Marketing", notification: "Notification" },
    statuses: { draft: "Draft", active: "Active" },
    updated: "Updated",
    noneTitle: "No templates yet",
    noneHint: "Create a template to reuse the same message everywhere.",
    noMatchTitle: "No templates match",
    noMatchHint: "Try another search or category.",
    open: "Edit",
    duplicate: "Duplicate",
    delete: "Delete",
    back: "All templates",
    save: "Save template",
    saved: "Template saved.",
    unsaved: "Unsaved changes",
    name: "Template name",
    category: "Category",
    subject: "Subject",
    preheader: "Preview text",
    preheaderHint: "The grey line shown after the subject in most inboxes.",
    body: "Body",
    direction: "Direction",
    ltr: "Left to right",
    rtl: "Right to left",
    footer: "Footer",
    variables: "Variables",
    variablesHint: "Copy a variable and paste it into the subject or the body. It is replaced when the email is sent.",
    copyVariable: (k: string) => `Copy ${k}`,
    unknown: (keys: string) => `Unknown variables: ${keys}`,
    edit: "Edit",
    preview: "Preview",
    desktop: "Desktop",
    mobile: "Mobile",
    from: "From",
    to: "To",
    subjectLabel: "Subject",
    sendTest: "Send test",
    sendTestTitle: "Send a test email",
    sendTestBody: "Sends this template with the sample values to one address.",
    email: "Email address",
    send: "Send",
    cancel: "Cancel",
    sent: "Test email sent.",
    invalidEmail: "Enter a valid email address.",
    previewFrame: "Email preview",
    thumbnail: (n: string) => `Preview of ${n}`,
    deleteConfirm: (n: string) => `Delete ${n}?`,
    deleteBody: "This cannot be undone.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    gallery: "قوالب البريد",
    search: "ابحث في القوالب…",
    newTemplate: "قالب جديد",
    untitled: "قالب بلا عنوان",
    all: "الكل",
    categories: { welcome: "ترحيب", transactional: "معاملات", marketing: "تسويق", notification: "إشعارات" },
    statuses: { draft: "مسودة", active: "نشط" },
    updated: "آخر تحديث",
    noneTitle: "لا توجد قوالب بعد",
    noneHint: "أنشئ قالبًا لإعادة استخدام الرسالة نفسها في كل مكان.",
    noMatchTitle: "لا توجد قوالب مطابقة",
    noMatchHint: "جرّب بحثًا أو تصنيفًا آخر.",
    open: "تحرير",
    duplicate: "تكرار",
    delete: "حذف",
    back: "كل القوالب",
    save: "حفظ القالب",
    saved: "تم حفظ القالب.",
    unsaved: "تغييرات غير محفوظة",
    name: "اسم القالب",
    category: "التصنيف",
    subject: "الموضوع",
    preheader: "نص المعاينة",
    preheaderHint: "السطر الرمادي الذي يظهر بعد الموضوع في معظم صناديق البريد.",
    body: "المحتوى",
    direction: "الاتجاه",
    ltr: "من اليسار إلى اليمين",
    rtl: "من اليمين إلى اليسار",
    footer: "التذييل",
    variables: "المتغيرات",
    variablesHint: "انسخ المتغير والصقه في الموضوع أو المحتوى. يُستبدل بقيمته عند إرسال البريد.",
    copyVariable: (k: string) => `نسخ ${k}`,
    unknown: (keys: string) => `متغيرات غير معروفة: ${keys}`,
    edit: "تحرير",
    preview: "معاينة",
    desktop: "حاسوب",
    mobile: "جوال",
    from: "من",
    to: "إلى",
    subjectLabel: "الموضوع",
    sendTest: "إرسال تجريبي",
    sendTestTitle: "إرسال بريد تجريبي",
    sendTestBody: "يرسل هذا القالب بالقيم التجريبية إلى عنوان واحد.",
    email: "البريد الإلكتروني",
    send: "إرسال",
    cancel: "إلغاء",
    sent: "أُرسل البريد التجريبي.",
    invalidEmail: "أدخل بريدًا إلكترونيًا صالحًا.",
    previewFrame: "معاينة البريد",
    thumbnail: (n: string) => `معاينة ${n}`,
    deleteConfirm: (n: string) => `حذف ${n}؟`,
    deleteBody: "لا يمكن التراجع عن هذا.",
    failed: "حدث خطأ. حاول مرة أخرى.",
  },
};
export type EmailTemplatesLabels = Omit<typeof STRINGS.en, "categories" | "statuses"> & {
  categories: Record<EmailTemplateCategory, string>;
  statuses: Record<EmailTemplateStatus, string>;
};
type LabelOverrides = Partial<Omit<EmailTemplatesLabels, "categories" | "statuses">> & {
  categories?: Partial<EmailTemplatesLabels["categories"]>;
  statuses?: Partial<EmailTemplatesLabels["statuses"]>;
};

function useStrings(labels?: LabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { locale, t: { ...base, ...labels, categories: { ...base.categories, ...labels?.categories }, statuses: { ...base.statuses, ...labels?.statuses } } };
}

/* ------------------------------------------------------------------ types */

export type EmailTemplateCategory = "welcome" | "transactional" | "marketing" | "notification";
export type EmailTemplateStatus = "draft" | "active";
export type EmailTemplateResult = void | { error?: string };

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory;
  status: EmailTemplateStatus;
  subject: string;
  preheader?: string;
  /** HTML from the body editor. `{{variable}}` placeholders are allowed. */
  body: string;
  /** Text direction of the email itself. Default `"ltr"`. */
  dir?: EmailDirection;
  footer?: string;
  updatedAt?: Date | string | number;
}

const CATEGORY_ORDER: EmailTemplateCategory[] = ["welcome", "transactional", "marketing", "notification"];

/** A blank template ready to edit. */
export function blankEmailTemplate(id: string, dir: EmailDirection = "ltr"): EmailTemplate {
  return { id, name: "", category: "transactional", status: "draft", subject: "", preheader: "", body: "<p></p>", dir };
}

/* ------------------------------------------------------------------ preview */

export interface EmailTemplatePreviewProps {
  template: Pick<EmailTemplate, "subject" | "preheader" | "body" | "dir" | "footer">;
  variables?: readonly EmailVariable[];
  /** Shown in the header of the mock inbox. */
  sender?: { name: string; email: string };
  /** Shown in the header of the mock inbox. */
  recipient?: string;
  /** Start on the mobile width. */
  defaultDevice?: "desktop" | "mobile";
  labels?: LabelOverrides;
  className?: string;
}

/** The email as the reader sees it: sender line, subject and the body in a sandboxed frame, at desktop or phone width. */
export function EmailTemplatePreview({ template, variables = [], sender, recipient, defaultDevice = "desktop", labels, className }: EmailTemplatePreviewProps) {
  const { t } = useStrings(labels);
  const [device, setDevice] = useState<"desktop" | "mobile">(defaultDevice);
  const srcDoc = useMemo(
    () => renderEmailDocument({ body: template.body, preheader: template.preheader, dir: template.dir, variables, footer: template.footer }),
    [template.body, template.preheader, template.dir, template.footer, variables],
  );
  return (
    <div data-slot="email-template-preview" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-foreground">{t.preview}</span>
        <ToggleGroup value={[device]} onValueChange={(v) => v[0] && setDevice(v[0] as "desktop" | "mobile")} aria-label={t.preview}>
          <Toggle value="desktop" aria-label={t.desktop}>
            <Monitor aria-hidden className="size-4" />
          </Toggle>
          <Toggle value="mobile" aria-label={t.mobile}>
            <Smartphone aria-hidden className="size-4" />
          </Toggle>
        </ToggleGroup>
      </div>
      <div className="flex justify-center rounded-card border border-border bg-secondary p-3">
        <div className={cn("flex w-full flex-col overflow-hidden rounded-card border border-border bg-card", device === "mobile" ? "max-w-[375px]" : "max-w-[680px]")}>
          <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3 text-body-sm">
            <span className="truncate text-label text-foreground">{fillVariables(template.subject, variables) || "—"}</span>
            {sender ? (
              <span className="flex flex-wrap items-center gap-x-1 text-muted-foreground">
                {t.from}: <span className="text-foreground">{sender.name}</span> <bdi dir="ltr">&lt;{sender.email}&gt;</bdi>
              </span>
            ) : null}
            {recipient ? (
              <span className="flex flex-wrap items-center gap-x-1 text-muted-foreground">
                {t.to}: <bdi dir="ltr">{recipient}</bdi>
              </span>
            ) : null}
          </div>
          <iframe title={t.previewFrame} sandbox="" srcDoc={srcDoc} className="h-[520px] w-full border-0 bg-secondary" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ gallery */

function Thumbnail({ template, variables, name, label }: { template: EmailTemplate; variables: readonly EmailVariable[]; name: string; label: string }) {
  const srcDoc = useMemo(
    () => renderEmailDocument({ body: template.body, preheader: template.preheader, dir: template.dir, variables, footer: template.footer }),
    [template.body, template.preheader, template.dir, template.footer, variables],
  );
  return (
    <div dir="ltr" aria-hidden className="relative flex h-44 justify-center overflow-hidden border-b border-border bg-secondary" data-name={name} title={label}>
      <iframe tabIndex={-1} sandbox="" srcDoc={srcDoc} className="pointer-events-none absolute top-0 h-[440px] w-[600px] shrink-0 origin-top scale-[0.4] border-0" style={{ insetInlineStart: "50%", marginInlineStart: -300 }} title="" />
    </div>
  );
}

export interface EmailTemplateGalleryProps {
  templates: EmailTemplate[];
  /** Used to fill `{{variables}}` in the thumbnails. */
  variables?: readonly EmailVariable[];
  onOpen?: (template: EmailTemplate) => void;
  onCreate?: () => void;
  onDuplicate?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onDelete?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  labels?: LabelOverrides;
  className?: string;
}

/** A searchable grid of template cards, each with a thumbnail of the rendered email, filterable by category. */
export function EmailTemplateGallery({ templates, variables = [], onOpen, onCreate, onDuplicate, onDelete, labels, className }: EmailTemplateGalleryProps) {
  const { t } = useStrings(labels);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | EmailTemplateCategory>("all");
  const [pendingDelete, setPendingDelete] = useState<EmailTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const shown = templates.filter((tpl) => {
    if (category !== "all" && tpl.category !== category) return false;
    const q = query.trim().toLowerCase();
    return !q || `${tpl.name} ${tpl.subject}`.toLowerCase().includes(q);
  });
  const present = CATEGORY_ORDER.filter((c) => templates.some((tpl) => tpl.category === c));

  const run = async (fn: () => Promise<EmailTemplateResult> | undefined) => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result && result.error) setError(result.error);
      return !(result && result.error);
    } catch {
      setError(t.failed);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-slot="email-template-gallery" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} className="ps-9" />
        </div>
        {onCreate ? (
          <Button variant="primary" onClick={onCreate} className="ms-auto">
            <Plus aria-hidden />
            {t.newTemplate}
          </Button>
        ) : null}
      </div>
      {present.length > 1 ? (
        <Tabs value={category} onValueChange={(v) => setCategory(v as "all" | EmailTemplateCategory)}>
          <TabsList aria-label={t.category}>
            <TabsTab value="all">{t.all}</TabsTab>
            {present.map((c) => (
              <TabsTab key={c} value={c}>
                {t.categories[c]}
              </TabsTab>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {shown.length === 0 ? (
        <EmptyState icon={Mail} title={templates.length === 0 ? t.noneTitle : t.noMatchTitle} description={templates.length === 0 ? t.noneHint : t.noMatchHint} />
      ) : (
        <ul aria-label={t.gallery} className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {shown.map((tpl) => (
            <li key={tpl.id} className="min-w-0">
              <Card className="group h-full gap-0 overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => onOpen?.(tpl)}
                  aria-labelledby={`${id}-${tpl.id}`}
                  className="flex flex-col text-start outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                >
                  <Thumbnail template={tpl} variables={variables} name={tpl.name} label={t.thumbnail(tpl.name)} />
                  <span className="flex flex-col gap-1.5 p-3">
                    <span id={`${id}-${tpl.id}`} className="truncate text-label text-foreground">
                      {tpl.name || t.untitled}
                    </span>
                    <span className="truncate text-body-sm text-muted-foreground">{fillVariables(tpl.subject, variables)}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Status tone={tpl.status === "active" ? "success" : "neutral"}>{t.statuses[tpl.status]}</Status>
                      <Badge variant="outline">{t.categories[tpl.category]}</Badge>
                    </span>
                  </span>
                </button>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                  {tpl.updatedAt != null ? (
                    <span className="truncate text-caption text-muted-foreground">
                      {t.updated} <DateTime value={tpl.updatedAt} format={{ dateStyle: "medium" }} />
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex shrink-0 items-center">
                    {onDuplicate ? (
                      <Button variant="ghost" size="icon-sm" aria-label={`${t.duplicate}: ${tpl.name}`} disabled={busy} onClick={() => void run(() => onDuplicate(tpl))}>
                        <Copy aria-hidden />
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button variant="ghost" size="icon-sm" aria-label={`${t.delete}: ${tpl.name}`} disabled={busy} onClick={() => setPendingDelete(tpl)}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteConfirm(pendingDelete?.name || t.untitled)}</DialogTitle>
            <DialogDescription>{t.deleteBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (pendingDelete && (await run(() => onDelete?.(pendingDelete)))) setPendingDelete(null);
              }}
            >
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

export interface EmailTemplateEditorProps {
  template: EmailTemplate;
  variables?: readonly EmailVariable[];
  sender?: { name: string; email: string };
  recipient?: string;
  onSave?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onSendTest?: (template: EmailTemplate, email: string) => Promise<EmailTemplateResult>;
  /** Shows a back button that returns to the gallery. */
  onBack?: () => void;
  labels?: LabelOverrides;
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SendTestDialog({ open, onOpenChange, onSend, defaultEmail, t }: { open: boolean; onOpenChange: (open: boolean) => void; onSend: (email: string) => Promise<EmailTemplateResult>; defaultEmail?: string; t: ReturnType<typeof useStrings>["t"] }) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setMessage(null);
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!EMAIL_RE.test(email.trim())) return setMessage({ tone: "danger", text: t.invalidEmail });
            setPending(true);
            setMessage(null);
            try {
              const result = await onSend(email.trim());
              setMessage(result && result.error ? { tone: "danger", text: result.error } : { tone: "success", text: t.sent });
            } catch {
              setMessage({ tone: "danger", text: t.failed });
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.sendTestTitle}</DialogTitle>
            <DialogDescription>{t.sendTestBody}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.email}</FieldLabel>
            <Input type="email" ltr value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              <Send aria-hidden />
              {t.send}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Edit name, category, subject, preview text and body (rich text) on one side, with a live preview on the other. Below `lg` the two are tabs. */
export function EmailTemplateEditor({ template, variables = [], sender, recipient, onSave, onSendTest, onBack, labels, className }: EmailTemplateEditorProps) {
  const { t } = useStrings(labels);
  const [draft, setDraft] = useState<EmailTemplate>(template);
  const [savedAs, setSavedAs] = useState<EmailTemplate>(template);
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const id = useId();
  // The rich text editor rewrites the body into its own schema on mount. Treat that as the baseline, not as an edit.
  const touched = useRef(false);
  const onBody = (body: string) => {
    if (!touched.current) setSavedAs((s) => (s.body === body ? s : { ...s, body }));
    patch({ body });
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedAs);
  const patch = (next: Partial<EmailTemplate>) => setDraft((d) => ({ ...d, ...next }));
  const unknown = unknownVariables(`${draft.subject} ${draft.preheader ?? ""} ${draft.body}`, variables);
  const categoryItems = CATEGORY_ORDER.map((c) => ({ value: c, label: t.categories[c] }));
  const dirItems = [
    { value: "ltr", label: t.ltr },
    { value: "rtl", label: t.rtl },
  ];

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await onSave(draft);
      if (result && result.error) setMessage({ tone: "danger", text: result.error });
      else {
        setSavedAs(draft);
        setMessage({ tone: "success", text: t.saved });
      }
    } catch {
      setMessage({ tone: "danger", text: t.failed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-slot="email-template-editor" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
            {t.back}
          </Button>
        ) : null}
        <span className="ms-auto flex flex-wrap items-center gap-2">
          {dirty ? <span className="text-caption text-muted-foreground">{t.unsaved}</span> : null}
          {onSendTest ? (
            <Button onClick={() => setTesting(true)}>
              <Send aria-hidden />
              {t.sendTest}
            </Button>
          ) : null}
          {onSave ? (
            <Button variant="primary" loading={saving} disabled={!dirty} onClick={() => void save()}>
              {t.save}
            </Button>
          ) : null}
        </span>
      </div>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <Tabs value={pane} onValueChange={(v) => setPane(v as "edit" | "preview")} className="lg:hidden">
        <TabsList aria-label={t.gallery}>
          <TabsTab value="edit">{t.edit}</TabsTab>
          <TabsTab value="preview">{t.preview}</TabsTab>
        </TabsList>
      </Tabs>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className={cn("flex min-w-0 flex-col gap-4", pane !== "edit" && "hidden lg:flex")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.name}</FieldLabel>
              <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>{t.category}</FieldLabel>
              <Select items={categoryItems} value={draft.category} onValueChange={(v) => v && patch({ category: v as EmailTemplateCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel>{t.subject}</FieldLabel>
            <Input value={draft.subject} onChange={(e) => patch({ subject: e.target.value })} dir="auto" />
          </Field>
          <Field>
            <FieldLabel>{t.preheader}</FieldLabel>
            <Input value={draft.preheader ?? ""} onChange={(e) => patch({ preheader: e.target.value })} dir="auto" />
            <FieldDescription>{t.preheaderHint}</FieldDescription>
          </Field>
          <div className="flex flex-col gap-1.5" onFocusCapture={() => { touched.current = true; }}>
            <span id={`${id}-body`} className="text-label text-foreground">
              {t.body}
            </span>
            <RichTextEditor aria-labelledby={`${id}-body`} value={draft.body} onValueChange={onBody} minHeight="14rem" toolbar={["bold", "italic", "underline", "h2", "h3", "bulletList", "orderedList", "blockquote", "link", "undo", "redo"]} />
          </div>
          <Field>
            <FieldLabel>{t.direction}</FieldLabel>
            <Select items={dirItems} value={draft.dir ?? "ltr"} onValueChange={(v) => v && patch({ dir: v as EmailDirection })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dirItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {variables.length ? (
            <section aria-labelledby={`${id}-vars`} className="flex flex-col gap-2">
              <div>
                <h3 id={`${id}-vars`} className="text-label text-foreground">
                  {t.variables}
                </h3>
                <p className="text-body-sm text-muted-foreground">{t.variablesHint}</p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <li key={v.key} className="flex items-center gap-1 rounded-control border border-border bg-card ps-2 text-body-sm">
                    <span className="text-muted-foreground">{v.label}</span>
                    <bdi dir="ltr" className="font-mono text-code text-foreground">{`{{${v.key}}}`}</bdi>
                    <CopyButton value={`{{${v.key}}}`} size="icon-sm" variant="ghost" label={t.copyVariable(v.key)} />
                  </li>
                ))}
              </ul>
              {unknown.length ? <Alert tone="warning">{t.unknown(unknown.join(", "))}</Alert> : null}
            </section>
          ) : null}
        </div>
        <div className={cn("min-w-0", pane !== "preview" && "hidden lg:block")}>
          <EmailTemplatePreview template={draft} variables={variables} sender={sender} recipient={recipient} labels={labels} />
        </div>
      </div>
      {onSendTest ? <SendTestDialog open={testing} onOpenChange={setTesting} onSend={(email) => onSendTest(draft, email)} defaultEmail={recipient} t={t} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ EmailTemplates */

export interface EmailTemplatesProps {
  templates: EmailTemplate[];
  variables?: readonly EmailVariable[];
  /** Start in the editor for this template. */
  defaultSelectedId?: string;
  sender?: { name: string; email: string };
  recipient?: string;
  /** Called with the edited template. For a new template the `id` is the temporary one from `blankEmailTemplate`. Add it to `templates` when this resolves. */
  onSave?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onDuplicate?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onDelete?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onSendTest?: (template: EmailTemplate, email: string) => Promise<EmailTemplateResult>;
  labels?: LabelOverrides;
  className?: string;
}

/** Gallery, editor and preview in one: pick a template card to edit it, with a live preview beside the form. */
export function EmailTemplates({ templates, variables = [], defaultSelectedId, sender, recipient, onSave, onDuplicate, onDelete, onSendTest, labels, className }: EmailTemplatesProps) {
  const { locale } = useStrings(labels);
  const [selected, setSelected] = useState<EmailTemplate | null>(() => templates.find((tpl) => tpl.id === defaultSelectedId) ?? null);
  const live = selected ? (templates.find((tpl) => tpl.id === selected.id) ?? selected) : null;
  return (
    <div data-slot="email-templates" className={className}>
      {live ? (
        <EmailTemplateEditor
          key={live.id}
          template={live}
          variables={variables}
          sender={sender}
          recipient={recipient}
          onSave={onSave}
          onSendTest={onSendTest}
          onBack={() => setSelected(null)}
          labels={labels}
        />
      ) : (
        <EmailTemplateGallery
          templates={templates}
          variables={variables}
          onOpen={setSelected}
          onCreate={onSave ? () => setSelected(blankEmailTemplate(`new-${Date.now()}`, locale.startsWith("ar") ? "rtl" : "ltr")) : undefined}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          labels={labels}
        />
      )}
    </div>
  );
}
