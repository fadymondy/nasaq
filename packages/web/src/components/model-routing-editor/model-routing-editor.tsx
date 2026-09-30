"use client";

import { CircleAlert, Cloud, Plus, Save, Server, Trash2, Undo2 } from "lucide-react";
import { type ComponentProps, type FormEvent, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  MODALITIES,
  type ProviderDraftErrors,
  type RoutingModality,
  type RoutingRoute,
  type RoutingValue,
  modelsFor,
  routingEquals,
  routingIssues,
  toggleModality,
  validateProvider,
} from "./routing-math";

const STRINGS = {
  en: {
    auto: "Automatic routing",
    autoHint: "Pick the best model for each task class. Your routes below are the preferred choices.",
    routes: "Routes",
    routesHint: "Which model handles each kind of task, and what to try if it fails.",
    task: "Task class",
    model: "Model",
    fallback: "Fallback",
    none: "None",
    choose: "Choose a model",
    missing: "Choose a model for this task.",
    same: "The fallback must differ from the model.",
    unknown: "This model is no longer available.",
    providers: "Providers and nodes",
    providersHint: "Where models run. Register a cloud provider or a self-hosted node and say what it can do.",
    backend: "Active backend",
    add: "Register provider",
    remove: (n: string) => `Remove ${n}`,
    online: "Online",
    offline: "Offline",
    cloud: "Cloud",
    node: "Node",
    noProviders: "No providers yet. Register one to route tasks.",
    dialogTitle: "Register a provider",
    dialogBody: "Add a cloud API or a self-hosted node and choose which kinds of work it can take.",
    name: "Name",
    kind: "Type",
    endpoint: "Endpoint URL",
    endpointHint: "The address the provider is reached at.",
    modalities: "Modalities",
    modalitiesHint: "What it can handle.",
    text: "Text",
    vision: "Vision",
    audio: "Audio",
    image: "Image",
    embedding: "Embedding",
    nameRequired: "Enter a name.",
    nameDuplicate: "A provider with this name already exists.",
    endpointRequired: "Enter the endpoint URL.",
    endpointInvalid: "Enter a full address starting with http:// or https://.",
    modalitiesRequired: "Choose at least one modality.",
    cancel: "Cancel",
    register: "Register",
    dirty: "Unsaved routing changes",
    saved: "Saved",
    save: "Save routing",
    discard: "Discard changes",
    failed: "Could not save. Try again.",
    registerFailed: "Could not register the provider. Try again.",
    fixIssues: "Fix the routes marked below to save.",
    modalitiesOf: (n: string) => `Modalities of ${n}`,
  },
  ar: {
    auto: "التوجيه التلقائي",
    autoHint: "اختيار أفضل نموذج لكل فئة مهام. المسارات أدناه هي الخيارات المفضّلة.",
    routes: "المسارات",
    routesHint: "أي نموذج يتولى كل نوع من المهام، وماذا يُجرَّب إذا فشل.",
    task: "فئة المهمة",
    model: "النموذج",
    fallback: "البديل",
    none: "بدون",
    choose: "اختر نموذجًا",
    missing: "اختر نموذجًا لهذه المهمة.",
    same: "يجب أن يختلف البديل عن النموذج.",
    unknown: "هذا النموذج لم يعد متاحًا.",
    providers: "المزوّدون والعُقد",
    providersHint: "أين تعمل النماذج. سجّل مزوّدًا سحابيًا أو عقدة مستضافة ذاتيًا وحدّد ما تستطيع فعله.",
    backend: "الواجهة الخلفية النشطة",
    add: "تسجيل مزوّد",
    remove: (n: string) => `إزالة ${n}`,
    online: "متصل",
    offline: "غير متصل",
    cloud: "سحابي",
    node: "عقدة",
    noProviders: "لا يوجد مزوّدون بعد. سجّل واحدًا لتوجيه المهام.",
    dialogTitle: "تسجيل مزوّد",
    dialogBody: "أضف واجهة سحابية أو عقدة مستضافة ذاتيًا واختر أنواع العمل التي تتولاها.",
    name: "الاسم",
    kind: "النوع",
    endpoint: "رابط نقطة الاتصال",
    endpointHint: "العنوان الذي يُتصل به بالمزوّد.",
    modalities: "الوسائط",
    modalitiesHint: "ما يستطيع معالجته.",
    text: "نص",
    vision: "رؤية",
    audio: "صوت",
    image: "صورة",
    embedding: "تضمين",
    nameRequired: "أدخل اسمًا.",
    nameDuplicate: "يوجد مزوّد بهذا الاسم.",
    endpointRequired: "أدخل رابط نقطة الاتصال.",
    endpointInvalid: "أدخل عنوانًا كاملًا يبدأ بـ http:// أو https://.",
    modalitiesRequired: "اختر وسيطًا واحدًا على الأقل.",
    cancel: "إلغاء",
    register: "تسجيل",
    dirty: "تغييرات توجيه غير محفوظة",
    saved: "تم الحفظ",
    save: "حفظ التوجيه",
    discard: "تجاهل التغييرات",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    registerFailed: "تعذّر تسجيل المزوّد. حاول مرة أخرى.",
    fixIssues: "أصلح المسارات المعلَّمة أدناه للحفظ.",
    modalitiesOf: (n: string) => `وسائط ${n}`,
  },
};

export type ModelRoutingEditorLabels = Partial<typeof STRINGS.en>;

function useLabels(labels?: ModelRoutingEditorLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

export interface RoutingTaskClass {
  id: string;
  /** Localised name: "Chat", "Summaries", "Image understanding". */
  label: string;
  description?: string;
  /** Modality a model must support. Default text. */
  modality?: RoutingModality;
}

export interface RoutingModel {
  id: string;
  /** Model name. Not translated. */
  label: string;
  modalities?: readonly RoutingModality[];
}

export interface RoutingProvider {
  id: string;
  name: string;
  kind?: "cloud" | "node";
  endpoint?: string;
  modalities: readonly RoutingModality[];
  status?: "online" | "offline";
}

export type RegisterProviderInput = { name: string; kind: "cloud" | "node"; endpoint: string; modalities: RoutingModality[] };
export type RoutingResult = void | { error?: string };

export interface ModelRoutingEditorProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  taskClasses: readonly RoutingTaskClass[];
  models: readonly RoutingModel[];
  providers: readonly RoutingProvider[];
  value?: RoutingValue;
  defaultValue?: RoutingValue;
  onValueChange?: (value: RoutingValue) => void;
  /** Persist the routing. Return `{ error }` (or throw) to show a failure. Adds the footer. */
  onSave?: (value: RoutingValue) => Promise<RoutingResult> | RoutingResult;
  /** Register a provider. Add it to `providers` when this resolves; return `{ error }` to keep the dialog open. Without it the button is hidden. */
  onRegisterProvider?: (input: RegisterProviderInput) => Promise<RoutingResult> | RoutingResult;
  /** Remove a provider. Without it the remove buttons are hidden. */
  onRemoveProvider?: (id: string) => Promise<RoutingResult> | RoutingResult;
  disabled?: boolean;
  labels?: ModelRoutingEditorLabels;
}

const NONE = "__none__";

/**
 * Chooses which model handles each task class, with a fallback, and manages the providers and nodes that run them:
 * automatic routing on or off, a route table, modality chips per provider, an active backend switch and a register
 * dialog. It edits a value; `onSave`, `onRegisterProvider` and `onRemoveProvider` do the persisting.
 */
export function ModelRoutingEditor({
  taskClasses,
  models,
  providers,
  value,
  defaultValue,
  onValueChange,
  onSave,
  onRegisterProvider,
  onRemoveProvider,
  disabled = false,
  labels,
  className,
  ...props
}: ModelRoutingEditorProps) {
  const { t } = useLabels(labels);
  const initial: RoutingValue = defaultValue ?? { auto: true, routes: {}, backend: providers[0]?.id };
  const [inner, setInner] = useState<RoutingValue>(initial);
  const [baseline, setBaseline] = useState<RoutingValue>(value ?? initial);
  const current = value ?? inner;
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [open, setOpen] = useState(false);

  const issues = routingIssues(current, taskClasses, models);
  const issueOf = (id: string) => issues.find((i) => i.taskId === id)?.kind;
  const dirty = !routingEquals(current, baseline);

  const commit = (next: RoutingValue) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    setJustSaved(false);
  };
  const setRoute = (taskId: string, patch: RoutingRoute) => commit({ ...current, routes: { ...current.routes, [taskId]: { ...current.routes[taskId], ...patch } } });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (issues.length > 0 || !onSave) return;
    setBusy(true);
    setFailure(null);
    let error: string | undefined;
    try {
      const r = await onSave(current);
      if (r && typeof r === "object" && r.error) error = r.error;
    } catch (e) {
      error = e instanceof Error && e.message ? e.message : t.failed;
    }
    setBusy(false);
    if (error) return setFailure(error);
    setBaseline(current);
    setSubmitted(false);
    setJustSaved(true);
  };

  const issueText = (k?: "missing" | "same" | "unknown") => (k ? t[k] : undefined);

  return (
    <form data-slot="model-routing-editor" noValidate onSubmit={submit} className={cn("flex min-w-0 flex-col gap-4", className)} {...(props as ComponentProps<"form">)}>
      <Card>
        <CardHeader>
          <CardTitle as="h3" className="text-h3">
            {t.auto}
          </CardTitle>
          <CardDescription id="routing-auto-hint">{t.autoHint}</CardDescription>
          <CardAction>
            <Switch aria-label={t.auto} aria-describedby="routing-auto-hint" checked={current.auto} disabled={disabled} onCheckedChange={(auto) => commit({ ...current, auto })} />
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3" className="text-h3">
            {t.routes}
          </CardTitle>
          <CardDescription>{t.routesHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul data-slot="routing-routes" className="flex flex-col divide-y divide-border">
            {taskClasses.map((task) => {
              const route = current.routes[task.id] ?? {};
              const options = modelsFor(task, models);
              const issue = submitted || issueOf(task.id) === "same" || issueOf(task.id) === "unknown" ? issueOf(task.id) : undefined;
              const items = options.map((m) => ({ value: m.id, label: m.label }));
              const fbItems = [{ value: NONE, label: t.none }, ...items];
              return (
                <li key={task.id} data-slot="routing-route" data-task={task.id} data-invalid={issue ? "" : undefined} className="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-label text-foreground">{task.label}</span>
                    {task.description ? <span className="text-caption text-muted-foreground">{task.description}</span> : null}
                    {task.modality && task.modality !== "text" ? (
                      <Badge variant="neutral" className="mt-1 w-fit">
                        {t[task.modality]}
                      </Badge>
                    ) : null}
                  </div>
                  <Field invalid={!!issue && issue !== "same"} disabled={disabled} className="min-w-0">
                    <FieldLabel>{t.model}</FieldLabel>
                    <Select items={items} value={route.model ?? null} disabled={disabled} onValueChange={(v) => setRoute(task.id, { model: v ? String(v) : undefined })}>
                      <SelectTrigger aria-label={`${task.label}: ${t.model}`}>
                        <SelectValue placeholder={t.choose} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <bdi dir="ltr">{m.label}</bdi>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {issue && issue !== "same" ? <FieldError match>{issueText(issue)}</FieldError> : null}
                  </Field>
                  <Field invalid={issue === "same"} disabled={disabled} className="min-w-0">
                    <FieldLabel>{t.fallback}</FieldLabel>
                    <Select items={fbItems} value={route.fallback ?? NONE} disabled={disabled} onValueChange={(v) => setRoute(task.id, { fallback: v && v !== NONE ? String(v) : undefined })}>
                      <SelectTrigger aria-label={`${task.label}: ${t.fallback}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{t.none}</SelectItem>
                        {options.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <bdi dir="ltr">{m.label}</bdi>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {issue === "same" ? <FieldError match>{t.same}</FieldError> : null}
                  </Field>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3" className="text-h3">
            {t.providers}
          </CardTitle>
          <CardDescription>{t.providersHint}</CardDescription>
          {onRegisterProvider ? (
            <CardAction>
              <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
                <Plus />
                {t.add}
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {providers.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.noProviders}</p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span id="routing-backend-label" className="text-label text-foreground">
                  {t.backend}
                </span>
                <ToggleGroup aria-labelledby="routing-backend-label" value={current.backend ? [current.backend] : []} disabled={disabled} onValueChange={(v) => v[0] && commit({ ...current, backend: v[0] })} className="w-fit max-w-full flex-wrap">
                  {providers.map((p) => (
                    <Toggle key={p.id} value={p.id}>
                      <bdi dir="ltr">{p.name}</bdi>
                    </Toggle>
                  ))}
                </ToggleGroup>
              </div>
              <ul data-slot="routing-providers" className="flex flex-col divide-y divide-border">
                {providers.map((p) => {
                  const Icon = p.kind === "node" ? Server : Cloud;
                  return (
                    <li key={p.id} data-slot="routing-provider" data-active={current.backend === p.id ? "" : undefined} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 basis-48 flex-col">
                        <span className="truncate text-label text-foreground">
                          <bdi dir="ltr">{p.name}</bdi>
                        </span>
                        <span className="truncate text-caption text-muted-foreground">
                          {t[p.kind ?? "cloud"]}
                          {p.endpoint ? (
                            <>
                              {" · "}
                              <bdi dir="ltr">{p.endpoint}</bdi>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <ul aria-label={t.modalitiesOf(p.name)} className="flex flex-wrap gap-1">
                        {p.modalities.map((m) => (
                          <li key={m}>
                            <Badge variant="neutral">{t[m]}</Badge>
                          </li>
                        ))}
                      </ul>
                      {p.status ? (
                        <Badge variant={p.status === "online" ? "success" : "danger"}>{t[p.status]}</Badge>
                      ) : null}
                      {onRemoveProvider ? (
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.remove(p.name)} disabled={disabled} onClick={() => void onRemoveProvider(p.id)}>
                          <Trash2 />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {failure ? (
        <Alert tone="danger">{failure || t.failed}</Alert>
      ) : submitted && issues.length > 0 ? (
        <Alert tone="warning" icon={CircleAlert}>
          {t.fixIssues}
        </Alert>
      ) : null}
      {onSave ? (
        <div data-slot="routing-footer" className="flex flex-wrap items-center justify-end gap-2">
          <span role="status" className="me-auto text-body-sm text-muted-foreground">
            {dirty ? t.dirty : justSaved ? t.saved : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || busy || disabled}
            onClick={() => {
              if (value === undefined) setInner(baseline);
              onValueChange?.(baseline);
              setSubmitted(false);
              setFailure(null);
            }}
          >
            <Undo2 />
            {t.discard}
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={!dirty || disabled}>
            <Save />
            {t.save}
          </Button>
        </div>
      ) : null}

      {onRegisterProvider ? <RegisterDialog open={open} onOpenChange={setOpen} providers={providers} onRegister={onRegisterProvider} t={t} /> : null}
    </form>
  );
}

function RegisterDialog({
  open,
  onOpenChange,
  providers,
  onRegister,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: readonly RoutingProvider[];
  onRegister: (input: RegisterProviderInput) => Promise<RoutingResult> | RoutingResult;
  t: typeof STRINGS.en;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"cloud" | "node">("cloud");
  const [endpoint, setEndpoint] = useState("");
  const [mods, setMods] = useState<RoutingModality[]>(["text"]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const errors: ProviderDraftErrors = validateProvider({ name, endpoint, modalities: mods }, providers);
  const msg = {
    name: errors.name === "required" ? t.nameRequired : errors.name === "duplicate" ? t.nameDuplicate : undefined,
    endpoint: errors.endpoint === "required" ? t.endpointRequired : errors.endpoint === "invalid" ? t.endpointInvalid : undefined,
    modalities: errors.modalities ? t.modalitiesRequired : undefined,
  };

  const reset = () => {
    setName("");
    setKind("cloud");
    setEndpoint("");
    setMods(["text"]);
    setSubmitted(false);
    setFailure(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSubmitted(true);
    if (errors.name || errors.endpoint || errors.modalities) return;
    setBusy(true);
    setFailure(null);
    let error: string | undefined;
    try {
      const r = await onRegister({ name: name.trim(), kind, endpoint: endpoint.trim(), modalities: mods });
      if (r && typeof r === "object" && r.error) error = r.error;
    } catch (e) {
      error = e instanceof Error && e.message ? e.message : t.registerFailed;
    }
    setBusy(false);
    if (error) return setFailure(error);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto" data-slot="routing-register">
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogBody}</DialogDescription>
          </DialogHeader>
          <Field invalid={submitted && !!msg.name}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            {submitted && msg.name ? <FieldError match>{msg.name}</FieldError> : null}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span id="routing-kind-label" className="text-label text-foreground">
              {t.kind}
            </span>
            <ToggleGroup aria-labelledby="routing-kind-label" value={[kind]} onValueChange={(v) => v[0] && setKind(v[0] as "cloud" | "node")} className="w-fit">
              <Toggle value="cloud">{t.cloud}</Toggle>
              <Toggle value="node">{t.node}</Toggle>
            </ToggleGroup>
          </div>
          <Field invalid={submitted && !!msg.endpoint}>
            <FieldLabel>{t.endpoint}</FieldLabel>
            <Input ltr type="url" inputMode="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://" autoComplete="off" />
            {submitted && msg.endpoint ? <FieldError match>{msg.endpoint}</FieldError> : <p className="text-caption text-muted-foreground">{t.endpointHint}</p>}
          </Field>
          <div className="flex flex-col gap-1.5">
            <span id="routing-mod-label" className="text-label text-foreground">
              {t.modalities}
            </span>
            <ToggleGroup multiple aria-labelledby="routing-mod-label" value={mods} onValueChange={(v) => setMods(MODALITIES.filter((m) => v.includes(m)))} className="w-fit max-w-full flex-wrap">
              {MODALITIES.map((m) => (
                <Toggle key={m} value={m}>
                  {t[m]}
                </Toggle>
              ))}
            </ToggleGroup>
            {submitted && msg.modalities ? (
              <p role="alert" className="flex items-center gap-1.5 text-caption text-nq-danger-text">
                <CircleAlert aria-hidden className="size-3.5" />
                {msg.modalities}
              </p>
            ) : (
              <p className="text-caption text-muted-foreground">{t.modalitiesHint}</p>
            )}
          </div>
          {failure ? <Alert tone="danger">{failure}</Alert> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.register}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
