"use client";

import { CircleAlert, CirclePlus, Pencil, Rocket, Trash2, Undo2 } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type AdminPlansProps, AdminPlans, type AdminTenantsLabels } from "../admin-tenants";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { formatNumber } from "../numeric";
import { Repeater } from "../repeater";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Skeleton } from "../states";
import { Switch } from "../switch";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  CATALOG_ENTITIES,
  catalogIssues,
  type CatalogApp,
  type CatalogBundle,
  type CatalogChange,
  type CatalogEntity,
  type CatalogFeature,
  countChanges,
  diffCatalog,
  makeId,
  type PaygPrice,
  type PlanCatalog,
} from "./catalog-math";

const STRINGS = {
  en: {
    tabs: "Catalog sections",
    plans: "Plans",
    features: "Features",
    apps: "Apps",
    payg: "Pay as you go",
    bundles: "Bundles",
    unpublished: (n: string) => (n === "1" ? "1 unpublished change" : `${n} unpublished changes`),
    upToDate: "The catalog matches what is live.",
    review: "Review and apply",
    discard: "Discard changes",
    previewTitle: "Sync preview",
    previewBody: "This is a dry run. Nothing goes live until you apply.",
    previewLoading: "Checking the changes",
    previewFailed: "The preview could not be built. Try again.",
    nothing: "There is nothing to apply.",
    added: "Added",
    updated: "Updated",
    removed: "Removed",
    counts: (a: string, u: string, r: string) => `${a} added, ${u} updated, ${r} removed`,
    fields: "Changed",
    warnings: "Warnings from the dry run",
    issues: "Fix these before applying",
    issueName: (e: string, id: string) => `${e}: ${id} has no name.`,
    issueDuplicate: (e: string, id: string) => `${e}: the id ${id} is used twice.`,
    issueMissingApp: (e: string, id: string) => `${e}: ${id} points to an app that does not exist.`,
    cancel: "Cancel",
    apply: (n: string) => `Apply ${n} changes`,
    applyOne: "Apply 1 change",
    applied: "Catalog applied. The changes are live.",
    applyFailed: "The catalog could not be applied. Nothing was changed.",
    dismiss: "Dismiss",
    appName: "App name",
    appId: "App id",
    appEnabled: "On sale",
    addApp: "Add app",
    appsList: "Apps",
    app: "App",
    featureName: "Feature name",
    featureId: "Feature key",
    featureApp: "Belongs to",
    noApp: "Whole platform",
    addFeature: "Add feature",
    featuresList: "Features",
    feature: "Feature",
    paygName: "Meter name",
    paygId: "Meter key",
    paygUnit: "Unit",
    paygPrice: "Price per unit",
    paygFree: "Free units per month",
    addPayg: "Add price",
    paygList: "Pay as you go prices",
    payg1: "Price",
    bundleName: "Bundle name",
    bundleId: "Bundle id",
    bundlePrice: "Monthly price",
    includedApps: "Included apps",
    addBundle: "Add bundle",
    bundlesList: "Bundles",
    bundle: "Bundle",
    plansHint: "Plan changes show up in the sync preview with everything else.",
    empty: "Nothing here yet.",
  },
  ar: {
    tabs: "أقسام الكتالوج",
    plans: "الباقات",
    features: "الميزات",
    apps: "التطبيقات",
    payg: "الدفع حسب الاستخدام",
    bundles: "الحزم",
    unpublished: (n: string) => (n === "1" ? "تغيير واحد غير منشور" : `${n} تغييرات غير منشورة`),
    upToDate: "الكتالوج مطابق للنسخة المنشورة.",
    review: "مراجعة وتطبيق",
    discard: "تجاهل التغييرات",
    previewTitle: "معاينة المزامنة",
    previewBody: "هذه تجربة بلا أثر. لن يُنشر شيء حتى تضغط تطبيق.",
    previewLoading: "جارٍ فحص التغييرات",
    previewFailed: "تعذّر إنشاء المعاينة. حاول مرة أخرى.",
    nothing: "لا يوجد ما يُطبَّق.",
    added: "مُضاف",
    updated: "مُعدَّل",
    removed: "محذوف",
    counts: (a: string, u: string, r: string) => `${a} مضاف، ${u} معدَّل، ${r} محذوف`,
    fields: "المتغيّر",
    warnings: "تحذيرات من التجربة",
    issues: "أصلِح هذه قبل التطبيق",
    issueName: (e: string, id: string) => `${e}: العنصر ${id} بلا اسم.`,
    issueDuplicate: (e: string, id: string) => `${e}: المعرّف ${id} مستخدم مرتين.`,
    issueMissingApp: (e: string, id: string) => `${e}: العنصر ${id} يشير إلى تطبيق غير موجود.`,
    cancel: "إلغاء",
    apply: (n: string) => `تطبيق ${n} تغييرات`,
    applyOne: "تطبيق تغيير واحد",
    applied: "تم تطبيق الكتالوج. التغييرات منشورة.",
    applyFailed: "تعذّر تطبيق الكتالوج. لم يتغيّر شيء.",
    dismiss: "تجاهل",
    appName: "اسم التطبيق",
    appId: "معرّف التطبيق",
    appEnabled: "معروض للبيع",
    addApp: "إضافة تطبيق",
    appsList: "التطبيقات",
    app: "تطبيق",
    featureName: "اسم الميزة",
    featureId: "مفتاح الميزة",
    featureApp: "تتبع",
    noApp: "المنصّة كلها",
    addFeature: "إضافة ميزة",
    featuresList: "الميزات",
    feature: "ميزة",
    paygName: "اسم العدّاد",
    paygId: "مفتاح العدّاد",
    paygUnit: "الوحدة",
    paygPrice: "السعر للوحدة",
    paygFree: "وحدات مجانية شهريًا",
    addPayg: "إضافة سعر",
    paygList: "أسعار الدفع حسب الاستخدام",
    payg1: "سعر",
    bundleName: "اسم الحزمة",
    bundleId: "معرّف الحزمة",
    bundlePrice: "السعر الشهري",
    includedApps: "التطبيقات المضمّنة",
    addBundle: "إضافة حزمة",
    bundlesList: "الحزم",
    bundle: "حزمة",
    plansHint: "تظهر تعديلات الباقات في معاينة المزامنة مع بقية التغييرات.",
    empty: "لا شيء هنا بعد.",
  },
};

export type PlanCatalogEditorLabels = Partial<typeof STRINGS.en>;
export type CatalogApplyResult = void | { error?: string };

/** What a server-side dry run sends back. Without `changes` the editor's own diff is shown. */
export interface CatalogPreviewResult {
  changes?: readonly CatalogChange[];
  warnings?: readonly string[];
  error?: string;
}

export interface PlanCatalogEditorProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  /** The catalog that is live. Pass a stable value; when its contents change the draft resets to it. */
  catalog: PlanCatalog;
  /** Runs the dry run on your backend. Optional: the editor diffs the draft against `catalog` itself. */
  onPreview?: (draft: PlanCatalog) => Promise<CatalogPreviewResult | void> | CatalogPreviewResult | void;
  /** Publishes the draft. Return `{ error }` (or throw) to keep the preview open. Without it the preview is read-only. */
  onApply?: (draft: PlanCatalog) => Promise<CatalogApplyResult> | CatalogApplyResult;
  /** Called on every edit of the draft. */
  onChange?: (draft: PlanCatalog) => void;
  /** ISO 4217 code for prices. Default "USD". */
  currency?: string;
  /** Labels for the plan cards and plan dialog (AdminPlans). */
  planLabels?: AdminTenantsLabels;
  loading?: boolean;
  labels?: PlanCatalogEditorLabels;
}

const errorOf = async (fn: () => unknown): Promise<string | null> => {
  try {
    const result = (await fn()) as { error?: string } | void;
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch (e) {
    return e instanceof Error && e.message ? e.message : "";
  }
};

/**
 * The admin editor for a product catalog: plans (the AdminPlans cards and dialog), features, apps, pay-as-you-go
 * prices and bundles, all edited into a draft. Nothing is live until the sync preview, a dry run listing what will be
 * added, updated and removed, is applied. Persistence is yours: `onPreview` and `onApply` are async callbacks.
 */
export function PlanCatalogEditor({ catalog, onPreview, onApply, onChange, currency = "USD", planLabels, loading = false, labels, className, ...props }: PlanCatalogEditorProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const num = (n: number) => formatNumber(n, locale);

  const signature = JSON.stringify(catalog);
  const [live, setLive] = useState<PlanCatalog>(catalog);
  const [draft, setDraft] = useState<PlanCatalog>(catalog);
  useEffect(() => {
    setLive(catalog);
    setDraft(catalog);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the catalog's contents change
  }, [signature]);

  const update = (patch: Partial<PlanCatalog>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      onChange?.(next);
      return next;
    });
  };

  const changes = useMemo(() => diffCatalog(live, draft), [live, draft]);
  const byEntity = (entity: CatalogEntity) => changes.filter((c) => c.entity === entity).length;
  const [tab, setTab] = useState<CatalogEntity>("plans");
  const [notice, setNotice] = useState<string | null>(null);

  /* -------- preview and apply */
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<CatalogPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const openPreview = async () => {
    setOpen(true);
    setPreview(null);
    setPreviewError(null);
    setApplyError(null);
    if (!onPreview) {
      setPreview({});
      return;
    }
    setPreviewing(true);
    try {
      const result = await onPreview(draft);
      if (result && result.error) setPreviewError(result.error);
      else setPreview(result ?? {});
    } catch (e) {
      setPreviewError(e instanceof Error && e.message ? e.message : t.previewFailed);
    }
    setPreviewing(false);
  };

  const shown = preview?.changes ?? changes;
  const issues = catalogIssues(draft);
  const apply = async () => {
    if (!onApply) return;
    setApplying(true);
    setApplyError(null);
    const failure = await errorOf(() => onApply(draft));
    setApplying(false);
    if (failure !== null) {
      setApplyError(failure || t.applyFailed);
      return;
    }
    setLive(draft);
    setOpen(false);
    setNotice(t.applied);
  };

  const entityLabel = (e: CatalogEntity) => t[e];
  const issueText = (i: (typeof issues)[number]) => (i.code === "name" ? t.issueName : i.code === "duplicate" ? t.issueDuplicate : t.issueMissingApp)(entityLabel(i.entity), i.id);
  const counts = countChanges(shown);
  const liveIds = (entity: CatalogEntity) => new Set((live[entity] as readonly { id: string }[]).map((r) => r.id));

  /* -------- plans: share the AdminPlans cards and dialog */
  const savePlan: NonNullable<AdminPlansProps["onSavePlan"]> = (values) => {
    setDraft((d) => {
      const plans = [...d.plans];
      const at = values.id ? plans.findIndex((p) => p.id === values.id) : -1;
      if (at >= 0) plans[at] = { ...plans[at]!, ...values, id: plans[at]!.id };
      else plans.push({ ...values, id: makeId(values.name, plans.map((p) => p.id), "plan"), subscribers: 0 });
      const next = { ...d, plans };
      onChange?.(next);
      return next;
    });
  };

  /* -------- row editors */
  const idField = (id: string, entity: CatalogEntity, label: string, onId: (id: string) => void) => (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Input ltr value={id} disabled={liveIds(entity).has(id)} onChange={(e) => onId(e.currentTarget.value.trim())} />
    </Field>
  );

  const apps = draft.apps as CatalogApp[];
  const features = draft.features as CatalogFeature[];
  const payg = draft.payg as PaygPrice[];
  const bundles = draft.bundles as CatalogBundle[];

  const tabs: { id: CatalogEntity; label: string }[] = CATALOG_ENTITIES.map((id) => ({ id, label: t[id] }));

  return (
    <section data-slot="plan-catalog-editor" aria-busy={loading || undefined} className={cn("flex flex-col gap-4", className)} {...props}>
      <div data-slot="plan-catalog-toolbar" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3">
        <div role="status" className="flex items-center gap-2 text-body-sm">
          {changes.length > 0 ? (
            <>
              <Pencil aria-hidden className="size-4 text-primary" />
              <span className="text-label text-foreground">{t.unpublished(num(changes.length))}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{t.upToDate}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={changes.length === 0} onClick={() => { setDraft(live); onChange?.(live); }}>
            <Undo2 />
            {t.discard}
          </Button>
          <Button variant="primary" disabled={changes.length === 0 || loading} onClick={() => void openPreview()}>
            <Rocket />
            {t.review}
          </Button>
        </div>
      </div>

      {notice ? (
        <Alert tone="success" onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice}
        </Alert>
      ) : null}

      {loading ? (
        <div role="status" className="flex flex-col gap-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as CatalogEntity)}>
          <TabsList variant="underline" aria-label={t.tabs} className="gap-5">
            {tabs.map((x) => (
              <TabsTab key={x.id} value={x.id}>
                {x.label}
                {byEntity(x.id) > 0 ? (
                  <Badge variant="brand" aria-label={t.unpublished(num(byEntity(x.id)))}>
                    {num(byEntity(x.id))}
                  </Badge>
                ) : null}
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="plans" className="flex flex-col gap-3">
            <p className="text-body-sm text-muted-foreground">{t.plansHint}</p>
            <AdminPlans plans={draft.plans} currency={currency} onSavePlan={savePlan} labels={planLabels} />
          </TabsPanel>

          <TabsPanel value="features">
            <Repeater<CatalogFeature>
              label={t.featuresList}
              addLabel={t.addFeature}
              value={features}
              onValueChange={(rows) => update({ features: rows })}
              createItem={() => ({ id: makeId("", features.map((f) => f.id), "feature"), name: "" })}
              duplicable={false}
              collapsible={false}
              empty={t.empty}
              rowTitle={(row, i) => row.name || `${t.feature} ${num(i + 1)}`}
              renderRow={(row, { update: set }) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field className="min-w-0">
                    <FieldLabel>{t.featureName}</FieldLabel>
                    <Input value={row.name} onChange={(e) => set({ ...row, name: e.currentTarget.value })} />
                  </Field>
                  {idField(row.id, "features", t.featureId, (id) => set({ ...row, id }))}
                  <Field className="min-w-0">
                    <FieldLabel>{t.featureApp}</FieldLabel>
                    <Select
                      items={[{ value: "", label: t.noApp }, ...apps.map((a) => ({ value: a.id, label: a.name }))]}
                      value={row.appId ?? ""}
                      onValueChange={(v) => set({ ...row, appId: v ? String(v) : undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t.noApp}</SelectItem>
                        {apps.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}
            />
          </TabsPanel>

          <TabsPanel value="apps">
            <Repeater<CatalogApp>
              label={t.appsList}
              addLabel={t.addApp}
              value={apps}
              onValueChange={(rows) => update({ apps: rows })}
              createItem={() => ({ id: makeId("", apps.map((a) => a.id), "app"), name: "", enabled: true })}
              duplicable={false}
              collapsible={false}
              empty={t.empty}
              rowTitle={(row, i) => row.name || `${t.app} ${num(i + 1)}`}
              renderRow={(row, { update: set }) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field className="min-w-0">
                    <FieldLabel>{t.appName}</FieldLabel>
                    <Input value={row.name} onChange={(e) => set({ ...row, name: e.currentTarget.value })} />
                  </Field>
                  {idField(row.id, "apps", t.appId, (id) => set({ ...row, id }))}
                  <Field className="flex-row items-center justify-between gap-3 self-end rounded-control border border-border px-3 py-2.5">
                    <FieldLabel>{t.appEnabled}</FieldLabel>
                    <Switch checked={row.enabled} onCheckedChange={(on) => set({ ...row, enabled: on })} aria-label={t.appEnabled} />
                  </Field>
                </div>
              )}
            />
          </TabsPanel>

          <TabsPanel value="payg">
            <Repeater<PaygPrice>
              label={t.paygList}
              addLabel={t.addPayg}
              value={payg}
              onValueChange={(rows) => update({ payg: rows })}
              createItem={() => ({ id: makeId("", payg.map((p) => p.id), "meter"), name: "", unit: "", unitPrice: 0 })}
              duplicable={false}
              collapsible={false}
              empty={t.empty}
              rowTitle={(row, i) => row.name || `${t.payg1} ${num(i + 1)}`}
              renderRow={(row, { update: set }) => (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Field className="min-w-0 lg:col-span-2">
                    <FieldLabel>{t.paygName}</FieldLabel>
                    <Input value={row.name} onChange={(e) => set({ ...row, name: e.currentTarget.value })} />
                  </Field>
                  {idField(row.id, "payg", t.paygId, (id) => set({ ...row, id }))}
                  <Field className="min-w-0">
                    <FieldLabel>{t.paygUnit}</FieldLabel>
                    <Input value={row.unit} onChange={(e) => set({ ...row, unit: e.currentTarget.value })} />
                  </Field>
                  <Field className="min-w-0">
                    <FieldLabel>{`${t.paygPrice} (${currency})`}</FieldLabel>
                    <Input ltr type="number" min={0} step="any" value={row.unitPrice} onChange={(e) => set({ ...row, unitPrice: Number(e.currentTarget.value) || 0 })} />
                  </Field>
                  <Field className="min-w-0">
                    <FieldLabel>{t.paygFree}</FieldLabel>
                    <Input ltr type="number" min={0} step="any" value={row.freeUnits ?? ""} onChange={(e) => set({ ...row, freeUnits: e.currentTarget.value === "" ? undefined : Number(e.currentTarget.value) || 0 })} />
                  </Field>
                </div>
              )}
            />
          </TabsPanel>

          <TabsPanel value="bundles">
            <Repeater<CatalogBundle>
              label={t.bundlesList}
              addLabel={t.addBundle}
              value={bundles}
              onValueChange={(rows) => update({ bundles: rows })}
              createItem={() => ({ id: makeId("", bundles.map((b) => b.id), "bundle"), name: "", price: 0, appIds: [] })}
              duplicable={false}
              collapsible={false}
              empty={t.empty}
              rowTitle={(row, i) => row.name || `${t.bundle} ${num(i + 1)}`}
              renderRow={(row, { update: set }) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field className="min-w-0">
                    <FieldLabel>{t.bundleName}</FieldLabel>
                    <Input value={row.name} onChange={(e) => set({ ...row, name: e.currentTarget.value })} />
                  </Field>
                  {idField(row.id, "bundles", t.bundleId, (id) => set({ ...row, id }))}
                  <Field className="min-w-0">
                    <FieldLabel>{`${t.bundlePrice} (${currency})`}</FieldLabel>
                    <Input ltr type="number" min={0} step="any" value={row.price} onChange={(e) => set({ ...row, price: Number(e.currentTarget.value) || 0 })} />
                  </Field>
                  <div role="group" aria-label={t.includedApps} className="flex flex-col gap-2 sm:col-span-3">
                    <span className="text-label text-foreground">{t.includedApps}</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {apps.map((a) => (
                        <label key={a.id} className="inline-flex items-center gap-2 text-body-sm">
                          <Checkbox
                            checked={row.appIds.includes(a.id)}
                            onCheckedChange={(on) => set({ ...row, appIds: on ? [...row.appIds, a.id] : row.appIds.filter((x) => x !== a.id) })}
                          />
                          {a.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            />
          </TabsPanel>
        </Tabs>
      )}

      <Dialog open={open} onOpenChange={(o) => (applying ? null : setOpen(o))}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.previewTitle}</DialogTitle>
            <DialogDescription>{t.previewBody}</DialogDescription>
          </DialogHeader>
          <div data-slot="plan-catalog-preview" className="flex flex-col gap-4">
            {previewing ? (
              <div role="status" aria-label={t.previewLoading} className="flex flex-col gap-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : previewError ? (
              <Alert tone="danger">{previewError || t.previewFailed}</Alert>
            ) : (
              <>
                {shown.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">{t.nothing}</p>
                ) : (
                  <>
                    <p data-slot="plan-catalog-counts" className="text-label text-foreground">
                      {t.counts(num(counts.added), num(counts.updated), num(counts.removed))}
                    </p>
                    <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
                      {shown.map((c) => (
                        <li key={`${c.entity}:${c.id}:${c.kind}`} data-kind={c.kind} className="flex items-start gap-3 px-3 py-2.5 text-body-sm">
                          <span className="mt-0.5 shrink-0">
                            {c.kind === "added" ? <CirclePlus aria-hidden className="size-4 text-nq-success-text" /> : c.kind === "removed" ? <Trash2 aria-hidden className="size-4 text-nq-danger-text" /> : <Pencil aria-hidden className="size-4 text-nq-info-text" />}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-label text-foreground">{c.name || c.id}</span>
                              <Badge variant={c.kind === "added" ? "success" : c.kind === "removed" ? "danger" : "info"}>{t[c.kind]}</Badge>
                              <span className="text-caption text-muted-foreground">{entityLabel(c.entity)}</span>
                            </span>
                            {c.fields?.length ? (
                              <span className="text-caption text-muted-foreground">
                                {t.fields}: <bdi dir="ltr">{c.fields.join(", ")}</bdi>
                              </span>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {preview?.warnings?.length ? (
                  <Alert tone="warning" title={t.warnings}>
                    <ul className="list-disc ps-4">
                      {preview.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : null}
                {issues.length ? (
                  <Alert tone="danger" title={t.issues} icon={CircleAlert}>
                    <ul className="list-disc ps-4">
                      {issues.map((i) => (
                        <li key={`${i.entity}:${i.id}:${i.code}`}>{issueText(i)}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : null}
              </>
            )}
            {applyError ? <Alert tone="danger">{applyError}</Alert> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={applying}>
              {t.cancel}
            </Button>
            {onApply ? (
              <Button type="button" variant="primary" loading={applying} disabled={previewing || !!previewError || shown.length === 0 || issues.length > 0} onClick={() => void apply()}>
                {shown.length === 1 ? t.applyOne : t.apply(num(shown.length))}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
