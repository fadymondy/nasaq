"use client";

import { ArrowDown, ArrowUp, ExternalLink, Megaphone } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import { IncidentList, type Incident, type IncidentImpact, type IncidentStatus } from "../uptime-monitors";
import { isValidStatusSlug, moveItem, type StatusPageSettingsDraft } from "./status-page-manager-format";

export { isValidStatusSlug, moveItem, type StatusPageSettingsDraft } from "./status-page-manager-format";

const STRINGS = {
  en: {
    title: "Status page",
    description: "Choose what customers see on your public status page, and post incidents to it.",
    view: "View public page",
    settings: "Page settings",
    pageTitle: "Page title",
    slug: "Address",
    slugHint: "Lowercase letters, numbers and dashes.",
    slugError: "Use lowercase letters, numbers and dashes only.",
    domain: "Custom domain",
    domainHint: "Optional. Point a CNAME at your status host first.",
    required: "This field is required.",
    services: "Services on the page",
    servicesHint: "Turn a service off to hide it. Use the arrows to change the order.",
    show: (n: string) => `Show ${n} on the status page`,
    up: (n: string) => `Move ${n} up`,
    down: (n: string) => `Move ${n} down`,
    save: "Save changes",
    saved: "Saved.",
    discard: "Discard",
    dirty: "Unsaved changes",
    post: "Post incident",
    dialogTitle: "Post an incident",
    dialogBody: "It appears on the public page right away. Customers see each update you add.",
    incTitle: "Title",
    incBody: "What is happening",
    incImpact: "Impact",
    incStatus: "Status",
    incServices: "Affected services",
    impact: { minor: "Minor", major: "Major", maintenance: "Maintenance" } satisfies Record<IncidentImpact, string>,
    incidentStatus: { investigating: "Investigating", identified: "Identified", monitoring: "Monitoring", resolved: "Resolved" } satisfies Record<IncidentStatus, string>,
    publish: "Publish",
    cancel: "Cancel",
    incidents: "Incidents",
    addUpdate: "Post an update",
    genericError: "Something went wrong. Try again.",
    hidden: "Hidden",
  },
  ar: {
    title: "صفحة الحالة",
    description: "اختر ما يراه العملاء في صفحة الحالة العامة، وانشر الحوادث عليها.",
    view: "عرض الصفحة العامة",
    settings: "إعدادات الصفحة",
    pageTitle: "عنوان الصفحة",
    slug: "العنوان",
    slugHint: "أحرف إنجليزية صغيرة وأرقام وشرطات.",
    slugError: "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.",
    domain: "نطاق مخصص",
    domainHint: "اختياري. وجّه سجل CNAME إلى مضيف الحالة أولًا.",
    required: "هذا الحقل مطلوب.",
    services: "الخدمات في الصفحة",
    servicesHint: "أوقف خدمة لإخفائها. استخدم الأسهم لتغيير الترتيب.",
    show: (n: string) => `إظهار ${n} في صفحة الحالة`,
    up: (n: string) => `نقل ${n} للأعلى`,
    down: (n: string) => `نقل ${n} للأسفل`,
    save: "حفظ التغييرات",
    saved: "تم الحفظ.",
    discard: "تجاهل",
    dirty: "تغييرات غير محفوظة",
    post: "نشر حادثة",
    dialogTitle: "نشر حادثة",
    dialogBody: "تظهر في الصفحة العامة فورًا. يرى العملاء كل تحديث تضيفه.",
    incTitle: "العنوان",
    incBody: "ما الذي يحدث",
    incImpact: "الأثر",
    incStatus: "الحالة",
    incServices: "الخدمات المتأثرة",
    impact: { minor: "طفيف", major: "كبير", maintenance: "صيانة" } satisfies Record<IncidentImpact, string>,
    incidentStatus: { investigating: "قيد التحقق", identified: "تم تحديد السبب", monitoring: "تحت المراقبة", resolved: "تم الحل" } satisfies Record<IncidentStatus, string>,
    publish: "نشر",
    cancel: "إلغاء",
    incidents: "الحوادث",
    addUpdate: "نشر تحديث",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    hidden: "مخفية",
  },
};
type T = typeof STRINGS.en;
export type StatusPageManagerLabels = Partial<T>;
export type StatusPageManagerResult = void | { error?: string };

export interface ManagedService {
  id: string;
  name: string;
  visible: boolean;
}

export interface StatusPageSettings {
  title: string;
  slug: string;
  domain?: string;
  /** In display order. */
  services: ManagedService[];
}

export interface IncidentInput {
  title: string;
  body: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  serviceIds: string[];
}

export interface StatusPageManagerProps extends Omit<ComponentProps<typeof Card>, "children"> {
  settings: StatusPageSettings;
  incidents?: readonly Incident[];
  /** Public URL, shown as a link. */
  publicUrl?: string;
  onSave: (next: StatusPageSettings) => Promise<StatusPageManagerResult>;
  /** Shows Post incident when set. */
  onPostIncident?: (input: IncidentInput) => Promise<StatusPageManagerResult>;
  labels?: StatusPageManagerLabels;
}

/** Admin for the public status page: title, address and domain, which services show and in what order (staged until Save), and posting incidents. */
export function StatusPageManager({ settings, incidents = [], publicUrl, onSave, onPostIncident, labels, className, ...props }: StatusPageManagerProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [draft, setDraft] = useState<StatusPageSettingsDraft>(settings);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setDraft(settings), [settings]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const slugBad = !isValidStatusSlug(draft.slug);
  const titleBad = !draft.title.trim();

  async function save() {
    setTried(true);
    if (slugBad || titleBad) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await onSave({ ...draft, title: draft.title.trim(), domain: draft.domain?.trim() || undefined });
      if (r && r.error) setError(r.error);
      else setSaved(true);
    } catch {
      setError(t.genericError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card data-slot="status-page-manager" className={cn("w-full", className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3">{t.title}</CardTitle>
          <div className="flex items-center gap-2">
            {publicUrl ? (
              <Button variant="ghost" size="sm" render={<a href={publicUrl} target="_blank" rel="noreferrer" />}>
                <ExternalLink aria-hidden />
                {t.view}
              </Button>
            ) : null}
            {onPostIncident ? (
              <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
                <Megaphone aria-hidden />
                {t.post}
              </Button>
            ) : null}
          </div>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {saved && !dirty ? <Alert tone="success">{t.saved}</Alert> : null}

        <section aria-label={t.settings} className="grid gap-4 sm:grid-cols-2">
          <Field invalid={tried && titleBad}>
            <FieldLabel>{t.pageTitle}</FieldLabel>
            <Input dir="auto" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            {tried && titleBad ? <FieldError match>{t.required}</FieldError> : null}
          </Field>
          <Field invalid={tried && slugBad}>
            <FieldLabel>{t.slug}</FieldLabel>
            <Input ltr value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            {tried && slugBad ? <FieldError match>{t.slugError}</FieldError> : <FieldDescription>{t.slugHint}</FieldDescription>}
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>{t.domain}</FieldLabel>
            <Input ltr value={draft.domain ?? ""} placeholder="status.example.com" onChange={(e) => setDraft({ ...draft, domain: e.target.value })} />
            <FieldDescription>{t.domainHint}</FieldDescription>
          </Field>
        </section>

        <section aria-labelledby="spm-services" className="grid gap-2">
          <div>
            <h4 id="spm-services" className="text-label text-foreground">
              {t.services}
            </h4>
            <p className="text-body-sm text-muted-foreground">{t.servicesHint}</p>
          </div>
          <ul className="divide-y divide-border rounded-control border border-border">
            {draft.services.map((s, i) => (
              <li key={s.id} data-slot="managed-service" className="flex items-center gap-3 px-3 py-2">
                <Switch aria-label={t.show(s.name)} checked={s.visible} onCheckedChange={(v) => setDraft({ ...draft, services: draft.services.map((x) => (x.id === s.id ? { ...x, visible: v } : x)) })} />
                <span className={cn("min-w-0 flex-1 truncate text-body-sm", s.visible ? "text-foreground" : "text-muted-foreground")} dir="auto">
                  {s.name}
                </span>
                {!s.visible ? <Badge variant="neutral">{t.hidden}</Badge> : null}
                <Button variant="ghost" size="icon-sm" aria-label={t.up(s.name)} disabled={i === 0} onClick={() => setDraft({ ...draft, services: moveItem(draft.services, i, -1) })}>
                  <ArrowUp aria-hidden className="rtl:-scale-x-100" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={t.down(s.name)} disabled={i === draft.services.length - 1} onClick={() => setDraft({ ...draft, services: moveItem(draft.services, i, 1) })}>
                  <ArrowDown aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center justify-end gap-2">
          {dirty ? <span className="me-auto text-body-sm text-muted-foreground">{t.dirty}</span> : null}
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => (setDraft(settings), setTried(false))}>
            {t.discard}
          </Button>
          <Button variant="primary" disabled={!dirty} loading={saving} onClick={save}>
            {t.save}
          </Button>
        </div>

        {incidents.length ? (
          <section aria-labelledby="spm-incidents" className="grid gap-3">
            <h4 id="spm-incidents" className="text-label text-foreground">
              {t.incidents}
            </h4>
            <IncidentList incidents={incidents} />
          </section>
        ) : null}
      </CardContent>
      {onPostIncident ? <IncidentDialog open={open} onOpenChange={setOpen} services={settings.services} onPost={onPostIncident} t={t} /> : null}
    </Card>
  );
}

function IncidentDialog({ open, onOpenChange, services, onPost, t }: { open: boolean; onOpenChange: (o: boolean) => void; services: ManagedService[]; onPost: (i: IncidentInput) => Promise<StatusPageManagerResult>; t: T }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [impact, setImpact] = useState<IncidentImpact>("minor");
  const [status, setStatus] = useState<IncidentStatus>("investigating");
  const [ids, setIds] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) (setTitle(""), setBody(""), setImpact("minor"), setStatus("investigating"), setIds([]), setTried(false), setError(null));
  }, [open]);
  const impactItems = (Object.keys(t.impact) as IncidentImpact[]).map((v) => ({ value: v, label: t.impact[v] }));
  const statusItems = (Object.keys(t.incidentStatus) as IncidentStatus[]).map((v) => ({ value: v, label: t.incidentStatus[v] }));
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setTried(true);
            if (!title.trim() || !body.trim()) return;
            setBusy(true);
            setError(null);
            try {
              const r = await onPost({ title: title.trim(), body: body.trim(), impact, status, serviceIds: ids });
              if (r && r.error) setError(r.error);
              else onOpenChange(false);
            } catch {
              setError(t.genericError);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogBody}</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={tried && !title.trim()}>
            <FieldLabel>{t.incTitle}</FieldLabel>
            <Input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} />
            {tried && !title.trim() ? <FieldError match>{t.required}</FieldError> : null}
          </Field>
          <Field invalid={tried && !body.trim()}>
            <FieldLabel>{t.incBody}</FieldLabel>
            <Textarea dir="auto" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            {tried && !body.trim() ? <FieldError match>{t.required}</FieldError> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.incImpact}</FieldLabel>
              <Select items={impactItems} value={impact} onValueChange={(v) => v && setImpact(v as IncidentImpact)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {impactItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t.incStatus}</FieldLabel>
              <Select items={statusItems} value={status} onValueChange={(v) => v && setStatus(v as IncidentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-label text-foreground">{t.incServices}</legend>
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" className="size-4 accent-[var(--nq-brand)]" checked={ids.includes(s.id)} onChange={(e) => setIds(e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id))} />
                <span dir="auto">{s.name}</span>
              </label>
            ))}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.publish}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
