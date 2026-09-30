"use client";

import { ArrowRightLeft, Building2, CirclePause, CirclePlay, ExternalLink, Pencil, Plus } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { type DataTableColumn, DataTable, DataTableFacetFilter, DataTablePagination, DataTableSearch, DataTableToolbar, DataTableViewOptions, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { PlanCard, PlanGrid } from "../plan-card";
import { Price } from "../price";
import { Meter } from "../progress";
import { Repeater } from "../repeater";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { StatCard, StatGrid } from "../stat-card";
import { Status } from "../status";
import { Switch } from "../switch";

const STRINGS = {
  en: {
    // workspaces
    workspaces: "Workspaces",
    search: "Search workspace or owner…",
    total: "Workspaces",
    trials: "On trial",
    suspendedStat: "Suspended",
    mrr: "Monthly revenue",
    workspace: "Workspace",
    owner: "Owner",
    plan: "Plan",
    seats: "Seats",
    status: "Status",
    created: "Created",
    unlimited: "Unlimited",
    statusActive: "Active",
    statusTrial: "Trial",
    statusSuspended: "Suspended",
    trialEnds: "Trial ends",
    open: "Open workspace",
    changePlan: "Change plan…",
    suspend: "Suspend…",
    reactivate: "Reactivate",
    seatsOf: (used: string, max: string) => `${used} of ${max} seats`,
    seatsUsed: (used: string) => `${used} seats`,
    empty: "No workspaces yet",
    // outcomes
    planOk: (name: string, plan: string) => `${name} is now on ${plan}.`,
    suspendOk: (name: string) => `${name} was suspended.`,
    reactivateOk: (name: string) => `${name} was reactivated.`,
    planSavedOk: (name: string) => `${name} was saved.`,
    planCreatedOk: (name: string) => `${name} was created.`,
    failed: "That did not work. Try again.",
    dismiss: "Dismiss",
    cancel: "Cancel",
    // change plan dialog
    changeTitle: (name: string) => `Change plan for ${name}`,
    changeBody: "The new plan applies at once. Billing is prorated by your payment provider.",
    newPlan: "New plan",
    overSeats: (used: string, max: string) => `This plan allows ${max} seats but the workspace uses ${used}.`,
    saveChange: "Change plan",
    // suspend
    suspendTitle: (name: string) => `Suspend ${name}?`,
    suspendBody: "Members cannot sign in to this workspace until you reactivate it. Nothing is deleted.",
    suspendConfirm: "Suspend workspace",
    // plans
    plans: "Plans",
    newPlanButton: "New plan",
    editPlan: "Edit plan",
    perMonth: "month",
    subscribers: (n: string) => (n === "1" ? "1 workspace" : `${n} workspaces`),
    storage: (n: string) => `${n} GB storage`,
    storageUnlimited: "Unlimited storage",
    seatsLimit: (n: string) => `Up to ${n} seats`,
    seatsUnlimited: "Unlimited seats",
    inactive: "Hidden",
    visible: "Visible on the pricing page",
    visibleHint: "Hidden plans can still be assigned by an admin.",
    plansEmpty: "No plans yet",
    plansEmptyHint: "Create your first plan to start selling.",
    // plan dialog
    createPlanTitle: "New plan",
    editPlanTitle: (name: string) => `Edit ${name}`,
    planBody: "Limits apply per workspace. Leave a limit empty for unlimited.",
    planName: "Plan name",
    planDescription: "Who it is for",
    price: "Price per month",
    seatLimit: "Seat limit",
    storageLimit: "Storage limit (GB)",
    features: "Features",
    addFeature: "Add feature",
    feature: "Feature",
    nameRequired: "Enter a plan name.",
    priceInvalid: "Enter a price of 0 or more.",
    limitInvalid: "Enter a whole number above 0, or leave empty.",
    savePlan: "Save plan",
    createPlan: "Create plan",
    featuresList: "Plan features",
  },
  ar: {
    workspaces: "مساحات العمل",
    search: "ابحث بمساحة العمل أو المالك…",
    total: "مساحات العمل",
    trials: "تجريبية",
    suspendedStat: "موقوفة",
    mrr: "الإيراد الشهري",
    workspace: "مساحة العمل",
    owner: "المالك",
    plan: "الباقة",
    seats: "المقاعد",
    status: "الحالة",
    created: "تاريخ الإنشاء",
    unlimited: "غير محدود",
    statusActive: "نشطة",
    statusTrial: "تجريبية",
    statusSuspended: "موقوفة",
    trialEnds: "تنتهي التجربة",
    open: "فتح مساحة العمل",
    changePlan: "تغيير الباقة…",
    suspend: "إيقاف…",
    reactivate: "إعادة التفعيل",
    seatsOf: (used: string, max: string) => `${used} من ${max} مقعد`,
    seatsUsed: (used: string) => `${used} مقعد`,
    empty: "لا توجد مساحات عمل بعد",
    planOk: (name: string, plan: string) => `أصبحت ${name} على باقة ${plan}.`,
    suspendOk: (name: string) => `تم إيقاف ${name}.`,
    reactivateOk: (name: string) => `أُعيد تفعيل ${name}.`,
    planSavedOk: (name: string) => `تم حفظ ${name}.`,
    planCreatedOk: (name: string) => `تم إنشاء ${name}.`,
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    dismiss: "تجاهل",
    cancel: "إلغاء",
    changeTitle: (name: string) => `تغيير باقة ${name}`,
    changeBody: "تسري الباقة الجديدة فورًا. تُحتسب الفوترة تناسبيًا لدى مزوّد الدفع.",
    newPlan: "الباقة الجديدة",
    overSeats: (used: string, max: string) => `تسمح هذه الباقة بـ ${max} مقعد بينما تستخدم مساحة العمل ${used}.`,
    saveChange: "تغيير الباقة",
    suspendTitle: (name: string) => `إيقاف ${name}؟`,
    suspendBody: "لن يستطيع الأعضاء الدخول إلى مساحة العمل حتى تعيد تفعيلها. لا يُحذف أي شيء.",
    suspendConfirm: "إيقاف مساحة العمل",
    plans: "الباقات",
    newPlanButton: "باقة جديدة",
    editPlan: "تعديل الباقة",
    perMonth: "شهر",
    subscribers: (n: string) => (n === "1" ? "مساحة عمل واحدة" : `${n} مساحات عمل`),
    storage: (n: string) => `${n} جيجابايت تخزين`,
    storageUnlimited: "تخزين غير محدود",
    seatsLimit: (n: string) => `حتى ${n} مقعد`,
    seatsUnlimited: "مقاعد غير محدودة",
    inactive: "مخفية",
    visible: "ظاهرة في صفحة الأسعار",
    visibleHint: "يمكن للمسؤول تعيين الباقات المخفية.",
    plansEmpty: "لا توجد باقات بعد",
    plansEmptyHint: "أنشئ أول باقة لبدء البيع.",
    createPlanTitle: "باقة جديدة",
    editPlanTitle: (name: string) => `تعديل ${name}`,
    planBody: "تنطبق الحدود على كل مساحة عمل. اترك الحد فارغًا لعدم التقييد.",
    planName: "اسم الباقة",
    planDescription: "لمن هذه الباقة",
    price: "السعر شهريًا",
    seatLimit: "حد المقاعد",
    storageLimit: "حد التخزين (جيجابايت)",
    features: "المزايا",
    addFeature: "إضافة ميزة",
    feature: "ميزة",
    nameRequired: "أدخل اسم الباقة.",
    priceInvalid: "أدخل سعرًا يساوي 0 أو أكثر.",
    limitInvalid: "أدخل عددًا صحيحًا أكبر من 0، أو اتركه فارغًا.",
    savePlan: "حفظ الباقة",
    createPlan: "إنشاء الباقة",
    featuresList: "مزايا الباقة",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type AdminTenantsLabels = Partial<typeof STRINGS.en>;

/* ------------------------------------------------------------------ types */

export interface AdminPlan {
  id: string;
  name: string;
  description?: string;
  /** Monthly price in `currency`. 0 is free. */
  priceMonthly: number;
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  /** Seat limit. `null` is unlimited. */
  seats: number | null;
  /** Storage limit in GB. `null` is unlimited. */
  storageGb: number | null;
  features: readonly string[];
  /** Shown on the pricing page. Hidden plans can still be assigned. */
  visible: boolean;
  /** How many workspaces are on it. */
  subscribers?: number;
  /** Tints the card as the recommended plan. */
  featured?: boolean;
}

export type WorkspaceStatus = "active" | "trial" | "suspended";

export interface AdminWorkspace {
  id: string;
  name: string;
  /** The URL part, shown in LTR. */
  slug: string;
  owner: { name: string; email: string };
  planId: string;
  status: WorkspaceStatus;
  seatsUsed: number;
  createdAt: string | Date;
  trialEndsAt?: string | Date | null;
}

export type AdminTenantResult = void | { error?: string };

async function attempt(fn: () => Promise<AdminTenantResult> | AdminTenantResult): Promise<string | null> {
  try {
    const result = await fn();
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch {
    return "";
  }
}

function useNotice() {
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  return [notice, setNotice] as const;
}

/* ------------------------------------------------------------------ AdminWorkspaces */

export interface AdminWorkspacesProps {
  workspaces: readonly AdminWorkspace[];
  plans: readonly AdminPlan[];
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  pageSize?: number;
  onChangePlan?: (workspace: AdminWorkspace, planId: string) => Promise<AdminTenantResult> | AdminTenantResult;
  onSetSuspended?: (workspace: AdminWorkspace, suspended: boolean) => Promise<AdminTenantResult> | AdminTenantResult;
  /** Open the workspace, for example as its owner. */
  onOpen?: (workspace: AdminWorkspace) => void;
  hideStats?: boolean;
  labels?: AdminTenantsLabels;
  className?: string;
}

/**
 * The tenants console: every workspace with its owner, plan, seats and status; change a plan, suspend or
 * reactivate, or open one. You own the data; actions are async callbacks and you send back new props.
 */
export function AdminWorkspaces({
  workspaces,
  plans,
  loading,
  error,
  onRetry,
  pageSize = 10,
  onChangePlan,
  onSetSuspended,
  onOpen,
  hideStats = false,
  labels,
  className,
}: AdminWorkspacesProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [notice, setNotice] = useNotice();
  const [changing, setChanging] = useState<AdminWorkspace | null>(null);
  const [suspending, setSuspending] = useState<AdminWorkspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState<string | null>(null);

  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const statusLabel: Record<WorkspaceStatus, string> = { active: t.statusActive, trial: t.statusTrial, suspended: t.statusSuspended };

  const columns = useMemo<DataTableColumn<AdminWorkspace>[]>(
    () => [
      {
        id: "workspace",
        header: t.workspace,
        label: t.workspace,
        hideable: false,
        sortValue: (w) => w.name,
        searchValue: (w) => `${w.name} ${w.slug} ${w.owner.name} ${w.owner.email}`,
        cell: (w) => (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-4">
              <Building2 aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label text-foreground">{w.name}</span>
              <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                {w.slug}
              </bdi>
            </div>
          </div>
        ),
      },
      {
        id: "owner",
        header: t.owner,
        label: t.owner,
        sortValue: (w) => w.owner.name,
        cell: (w) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm text-foreground">{w.owner.name}</span>
            <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
              {w.owner.email}
            </bdi>
          </div>
        ),
      },
      {
        id: "plan",
        header: t.plan,
        label: t.plan,
        sortValue: (w) => planById.get(w.planId)?.priceMonthly,
        filterValue: (w) => w.planId,
        cell: (w) => <Badge variant="brand">{planById.get(w.planId)?.name ?? w.planId}</Badge>,
      },
      {
        id: "seats",
        header: t.seats,
        label: t.seats,
        sortValue: (w) => w.seatsUsed,
        headerClassName: "w-44",
        cell: (w) => {
          const max = planById.get(w.planId)?.seats ?? null;
          return max === null ? (
            <span className="text-body-sm text-muted-foreground">{t.seatsUsed(formatNumber(w.seatsUsed, locale))}</span>
          ) : (
            <Meter
              size="sm"
              min={0}
              max={max}
              value={Math.min(w.seatsUsed, max)}
              aria-label={t.seats}
              label={<span className="text-caption text-muted-foreground">{t.seatsOf(formatNumber(w.seatsUsed, locale), formatNumber(max, locale))}</span>}
              showValue={false}
            />
          );
        },
      },
      {
        id: "status",
        header: t.status,
        label: t.status,
        sortValue: (w) => w.status,
        filterValue: (w) => w.status,
        cell: (w) => (
          <div className="flex flex-col">
            <Status tone={w.status === "active" ? "success" : w.status === "trial" ? "info" : "danger"}>{statusLabel[w.status]}</Status>
            {w.status === "trial" && w.trialEndsAt ? (
              <span className="text-caption text-muted-foreground">
                {t.trialEnds} <DateTime value={w.trialEndsAt} format={{ dateStyle: "medium" }} />
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "created",
        header: t.created,
        label: t.created,
        align: "end",
        sortValue: (w) => new Date(w.createdAt),
        cell: (w) => <DateTime value={w.createdAt} format={{ dateStyle: "medium" }} className="text-body-sm text-muted-foreground" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t.workspace, t.owner, t.plan, t.seats, t.status, t.created, t.trialEnds, planById, locale],
  );
  const table = useDataTable({ data: workspaces as AdminWorkspace[], columns, getRowId: (w) => w.id, pageSize, defaultSort: { id: "created", direction: "desc" } });

  const stats = useMemo(() => {
    const paying = workspaces.filter((w) => w.status === "active");
    const revenue = paying.reduce((sum, w) => sum + (planById.get(w.planId)?.priceMonthly ?? 0), 0);
    return {
      total: workspaces.length,
      trials: workspaces.filter((w) => w.status === "trial").length,
      suspended: workspaces.filter((w) => w.status === "suspended").length,
      revenue,
      currency: plans[0]?.currency ?? "USD",
    };
  }, [workspaces, planById, plans]);

  const openChange = (w: AdminWorkspace) => {
    setChanging(w);
    setNextPlan(w.planId);
    setDialogError(null);
  };
  const doChange = async () => {
    if (!changing || !nextPlan) return;
    setBusy(true);
    const failure = await attempt(() => onChangePlan?.(changing, nextPlan));
    setBusy(false);
    if (failure === null) {
      setNotice({ tone: "success", text: t.planOk(changing.name, planById.get(nextPlan)?.name ?? nextPlan) });
      setChanging(null);
    } else setDialogError(failure || t.failed);
  };
  const doSuspend = async () => {
    if (!suspending) return;
    setBusy(true);
    const failure = await attempt(() => onSetSuspended?.(suspending, true));
    setBusy(false);
    if (failure === null) {
      setNotice({ tone: "success", text: t.suspendOk(suspending.name) });
      setSuspending(null);
    } else setDialogError(failure || t.failed);
  };
  const reactivate = async (w: AdminWorkspace) => {
    const failure = await attempt(() => onSetSuspended?.(w, false));
    setNotice(failure === null ? { tone: "success", text: t.reactivateOk(w.name) } : { tone: "danger", text: failure || t.failed });
  };

  const chosen = nextPlan ? planById.get(nextPlan) : undefined;
  const overSeats = chosen && changing && chosen.seats !== null && changing.seatsUsed > chosen.seats;

  return (
    <div data-slot="admin-workspaces" className={cn("flex flex-col gap-5", className)}>
      {hideStats ? null : (
        <StatGrid>
          <StatCard label={t.total} value={stats.total} icon={<Building2 />} loading={loading} />
          <StatCard label={t.trials} value={stats.trials} icon={<CirclePlay />} loading={loading} />
          <StatCard label={t.suspendedStat} value={stats.suspended} icon={<CirclePause />} loading={loading} />
          <StatCard label={t.mrr} value={stats.revenue} format={{ style: "currency", currency: stats.currency, maximumFractionDigits: 0 }} loading={loading} />
        </StatGrid>
      )}
      {notice ? (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice.text}
        </Alert>
      ) : null}
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="plan" title={t.plan} options={plans.map((p) => ({ value: p.id, label: p.name }))} />
        <DataTableFacetFilter
          table={table}
          column="status"
          title={t.status}
          options={[
            { value: "active", label: t.statusActive },
            { value: "trial", label: t.statusTrial },
            { value: "suspended", label: t.statusSuspended },
          ]}
        />
        <DataTableViewOptions table={table} />
      </DataTableToolbar>
      <DataTable
        table={table}
        label={t.workspaces}
        rowLabel={(w) => w.name}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={<EmptyState icon={Building2} title={t.empty} />}
        rowActions={(w) => [
          ...(onOpen ? [{ id: "open", label: t.open, icon: ExternalLink, onSelect: () => onOpen(w), group: "manage" }] : []),
          ...(onChangePlan ? [{ id: "plan", label: t.changePlan, icon: ArrowRightLeft, onSelect: () => openChange(w), group: "manage" }] : []),
          ...(onSetSuspended
            ? [
                w.status === "suspended"
                  ? { id: "reactivate", label: t.reactivate, icon: CirclePlay, onSelect: () => void reactivate(w), group: "danger" }
                  : {
                      id: "suspend",
                      label: t.suspend,
                      icon: CirclePause,
                      danger: true,
                      onSelect: () => {
                        setSuspending(w);
                        setDialogError(null);
                      },
                      group: "danger",
                    },
              ]
            : []),
        ]}
      />
      <DataTablePagination table={table} />

      <Dialog open={!!changing} onOpenChange={(open) => (!open && !busy ? setChanging(null) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{changing ? t.changeTitle(changing.name) : ""}</DialogTitle>
            <DialogDescription>{t.changeBody}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.newPlan}</FieldLabel>
            <Select items={plans.map((p) => ({ value: p.id, label: p.name }))} value={nextPlan} onValueChange={(v) => setNextPlan(v ? String(v) : null)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {overSeats && chosen?.seats != null && changing ? (
              <p role="alert" className="text-caption text-nq-warning-text">
                {t.overSeats(formatNumber(changing.seatsUsed, locale), formatNumber(chosen.seats, locale))}
              </p>
            ) : null}
          </Field>
          {dialogError ? (
            <Alert tone="danger" role="alert">
              {dialogError}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChanging(null)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button variant="primary" loading={busy} disabled={!nextPlan || nextPlan === changing?.planId} onClick={() => void doChange()}>
              {t.saveChange}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!suspending} onOpenChange={(open) => (!open && !busy ? setSuspending(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{suspending ? t.suspendTitle(suspending.name) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{t.suspendBody}</AlertDialogDescription>
          </AlertDialogHeader>
          {dialogError ? (
            <Alert tone="danger" role="alert">
              {dialogError}
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setSuspending(null)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void doSuspend()}>
              {t.suspendConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ AdminPlans */

interface PlanForm {
  name: string;
  description: string;
  price: string;
  seats: string;
  storage: string;
  features: { text: string }[];
  visible: boolean;
}

const toForm = (p?: AdminPlan): PlanForm => ({
  name: p?.name ?? "",
  description: p?.description ?? "",
  price: p ? String(p.priceMonthly) : "0",
  seats: p?.seats == null ? "" : String(p.seats),
  storage: p?.storageGb == null ? "" : String(p.storageGb),
  features: (p?.features ?? []).map((text) => ({ text })),
  visible: p?.visible ?? true,
});

const wholeOrEmpty = (v: string) => v.trim() === "" || (/^\d+$/.test(v.trim()) && Number(v) > 0);

export interface PlanDialogProps {
  /** The plan being edited, `"new"` for a blank one, `null` to close. */
  plan: AdminPlan | "new" | null;
  currency?: string;
  onOpenChange: (open: boolean) => void;
  /** Save. The id is empty for a new plan. Return `{ error }` to keep the dialog open. */
  onSave: (plan: Omit<AdminPlan, "id" | "subscribers"> & { id?: string }) => Promise<AdminTenantResult> | AdminTenantResult;
  labels?: AdminTenantsLabels;
}

/** Create or edit a plan: name, price, seat and storage limits, and a reorderable list of features. */
export function PlanDialog({ plan, currency = "USD", onOpenChange, onSave, labels }: PlanDialogProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const editing = plan && plan !== "new" ? plan : undefined;
  const [form, setForm] = useState<PlanForm>(() => toForm(editing));
  const [errors, setErrors] = useState<Partial<Record<"name" | "price" | "seats" | "storage", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (plan) {
      setForm(toForm(plan === "new" ? undefined : plan));
      setErrors({});
      setFormError(null);
    }
  }, [plan]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = t.nameRequired;
    if (form.price.trim() === "" || Number.isNaN(Number(form.price)) || Number(form.price) < 0) next.price = t.priceInvalid;
    if (!wholeOrEmpty(form.seats)) next.seats = t.limitInvalid;
    if (!wholeOrEmpty(form.storage)) next.storage = t.limitInvalid;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const failure = await attempt(() =>
      onSave({
        id: editing?.id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceMonthly: Number(form.price),
        currency: editing?.currency ?? currency,
        seats: form.seats.trim() ? Number(form.seats) : null,
        storageGb: form.storage.trim() ? Number(form.storage) : null,
        features: form.features.map((f) => f.text.trim()).filter(Boolean),
        visible: form.visible,
        featured: editing?.featured,
      }),
    );
    setBusy(false);
    if (failure === null) onOpenChange(false);
    else setFormError(failure || t.failed);
  };

  return (
    <Dialog open={!!plan} onOpenChange={(open) => (busy ? null : onOpenChange(open))}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{editing ? t.editPlanTitle(editing.name) : t.createPlanTitle}</DialogTitle>
            <DialogDescription>{t.planBody}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={!!errors.name} className="sm:col-span-2">
              <FieldLabel>{t.planName}</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
              <FieldError match={!!errors.name}>{errors.name}</FieldError>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>{t.planDescription}</FieldLabel>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
            </Field>
            <Field invalid={!!errors.price}>
              <FieldLabel>{`${t.price} (${editing?.currency ?? currency})`}</FieldLabel>
              <Input ltr type="number" min={0} step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.currentTarget.value })} />
              <FieldError match={!!errors.price}>{errors.price}</FieldError>
            </Field>
            <Field invalid={!!errors.seats}>
              <FieldLabel>{t.seatLimit}</FieldLabel>
              <Input ltr type="number" min={1} placeholder={t.unlimited} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.currentTarget.value })} />
              <FieldError match={!!errors.seats}>{errors.seats}</FieldError>
            </Field>
            <Field invalid={!!errors.storage}>
              <FieldLabel>{t.storageLimit}</FieldLabel>
              <Input ltr type="number" min={1} placeholder={t.unlimited} value={form.storage} onChange={(e) => setForm({ ...form, storage: e.currentTarget.value })} />
              <FieldError match={!!errors.storage}>{errors.storage}</FieldError>
            </Field>
            <Field className="flex-row items-center justify-between gap-4 self-end rounded-control border border-border px-3 py-2.5">
              <div className="flex min-w-0 flex-col">
                <FieldLabel>{t.visible}</FieldLabel>
                <FieldDescription>{t.visibleHint}</FieldDescription>
              </div>
              <Switch checked={form.visible} onCheckedChange={(on) => setForm({ ...form, visible: on })} aria-label={t.visible} />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-label text-foreground">{t.features}</span>
              <Repeater<{ text: string }>
                label={t.featuresList}
                addLabel={t.addFeature}
                value={form.features}
                onValueChange={(features) => setForm({ ...form, features })}
                createItem={() => ({ text: "" })}
                duplicable={false}
                collapsible={false}
                rowTitle={(row, i) => row.text || `${t.feature} ${formatNumber(i + 1, locale)}`}
                renderRow={(row, { update }) => (
                  <Input aria-label={t.feature} value={row.text} onChange={(e) => update({ text: e.currentTarget.value })} />
                )}
              />
            </div>
          </div>
          {formError ? (
            <Alert tone="danger" role="alert">
              {formError}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {editing ? t.savePlan : t.createPlan}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface AdminPlansProps {
  plans: readonly AdminPlan[];
  /** Enables the New plan button and the plan dialog. */
  onSavePlan?: PlanDialogProps["onSave"];
  /** Default currency for new plans. */
  currency?: string;
  labels?: AdminTenantsLabels;
  className?: string;
}

/** The plan catalogue: each plan as a card with price, limits and how many workspaces use it, and a dialog to edit or add. */
export function AdminPlans({ plans, onSavePlan, currency = "USD", labels, className }: AdminPlansProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [editing, setEditing] = useState<AdminPlan | "new" | null>(null);
  const [notice, setNotice] = useNotice();

  return (
    <div data-slot="admin-plans" className={cn("flex flex-col gap-5", className)}>
      {onSavePlan ? (
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus />
            {t.newPlanButton}
          </Button>
        </div>
      ) : null}
      {notice ? (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice.text}
        </Alert>
      ) : null}
      {plans.length === 0 ? (
        <EmptyState title={t.plansEmpty} description={t.plansEmptyHint} />
      ) : (
        <PlanGrid className="@3xl:auto-cols-fr @3xl:grid-flow-row @3xl:grid-cols-2 @5xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              highlighted={plan.featured}
              name={plan.name}
              description={plan.description}
              badge={plan.visible ? undefined : <Badge variant="outline">{t.inactive}</Badge>}
              price={<Price size="lg" amount={plan.priceMonthly} currency={plan.currency ?? currency} period="month" />}
              priceNote={t.subscribers(formatNumber(plan.subscribers ?? 0, locale))}
              features={[
                plan.seats === null ? t.seatsUnlimited : t.seatsLimit(formatNumber(plan.seats, locale)),
                plan.storageGb === null ? t.storageUnlimited : t.storage(formatNumber(plan.storageGb, locale)),
                ...plan.features,
              ]}
              action={
                onSavePlan ? (
                  <Button variant="secondary" onClick={() => setEditing(plan)}>
                    <Pencil />
                    {t.editPlan}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </PlanGrid>
      )}
      {onSavePlan ? (
        <PlanDialog
          plan={editing}
          currency={currency}
          labels={labels}
          onOpenChange={(open) => !open && setEditing(null)}
          onSave={async (values) => {
            const result = await onSavePlan(values);
            if (!(result && typeof result === "object" && result.error)) setNotice({ tone: "success", text: values.id ? t.planSavedOk(values.name) : t.planCreatedOk(values.name) });
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
