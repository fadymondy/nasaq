"use client";

import { ArrowDownRight, ArrowUpRight, Plus, Receipt, Server, Trash2, TrendingDown } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { BreakdownTable } from "../breakdown-table";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTablePagination, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { MetricTiles } from "../metric-tiles";
import { Num } from "../numeric";
import { Meter } from "../progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { type TimeSeriesPoint, TimeSeriesPanel } from "../time-series-panel";
import {
  type LineItemPeriod,
  type PlanOption,
  type Rightsize,
  type ServerUsage,
  budgetState,
  finopsTotals,
  monthlyEquivalent,
  rightsize,
  roundMoney,
  validateLineItem,
} from "./finops-format";
import { useCurrency } from "../../provider/nasaq-provider";

export { budgetState, finopsTotals, monthlyEquivalent, parseAmount, rightsize, roundMoney, validateLineItem } from "./finops-format";
export type { BudgetState, LineItemDraft, LineItemPeriod, LineItemProblem, PlanOption, Rightsize, ServerUsage, Totals } from "./finops-format";

const STRINGS = {
  en: {
    title: "Costs",
    description: "What the servers and extra items cost each month.",
    total: "Monthly total",
    servers: "Servers",
    items: "Extra items",
    savings: "Possible savings",
    vsPrevious: "vs last month",
    budget: "Budget",
    budgetOf: (used: string, budget: string) => `${used} of ${budget}`,
    budgetNear: "Close to the budget.",
    budgetOver: "Over the budget.",
    serversTitle: "Servers",
    serversDescription: "Price and average use per server. Hints come from CPU and memory use.",
    serversTable: "Servers and their cost",
    server: "Server",
    region: "Region",
    price: "Price",
    cpu: "CPU",
    memory: "Memory",
    disk: "Disk",
    hint: "Hint",
    hintOk: "Right size",
    hintDown: "Could be smaller",
    hintUp: "Needs more room",
    hintDownDetail: (plan: string, save: string) => `Move to ${plan} and save ${save} a month.`,
    hintDownGeneric: "Use is low. A smaller plan would cost less.",
    hintUpDetail: (plan: string, extra: string) => `Move to ${plan} for ${extra} more a month.`,
    hintUpGeneric: "Use is high. Consider a bigger plan.",
    changePlan: (plan: string) => `Switch to ${plan}`,
    serversEmpty: "No servers yet",
    perMonth: "/ month",
    categoryTitle: "Cost by category",
    categoryDescription: "Monthly cost grouped by kind.",
    category: "Category",
    monthlyCost: "Monthly cost",
    serversCategory: "Servers",
    historyTitle: "Cost over time",
    historyDescription: "Daily cost.",
    cost: "Cost",
    itemsTitle: "Extra items",
    itemsDescription: "Costs that are not servers: domains, licences, backups, support.",
    itemsTable: "Extra cost items",
    itemName: "Item",
    itemCategory: "Category",
    itemAmount: "Amount",
    itemPeriod: "Billed",
    periods: { monthly: "Monthly", yearly: "Yearly", once: "One time" } as Record<LineItemPeriod, string>,
    perMonthEquivalent: "Per month",
    itemsEmpty: "No extra items",
    itemsEmptyBody: "Add costs that are not part of a server.",
    addItem: "Add item",
    addItemTitle: "Add a cost item",
    addItemBody: "It counts towards the monthly total. A yearly item is divided by twelve; a one time item is listed but not counted.",
    nameLabel: "Name",
    namePlaceholder: "Domain renewal",
    nameRequired: "Enter a name.",
    categoryLabel: "Category",
    categoryPlaceholder: "Domains",
    amountLabel: "Amount",
    amountInvalid: "Enter an amount greater than zero.",
    periodLabel: "Billed",
    add: "Add",
    cancel: "Cancel",
    remove: "Remove",
    removeTitle: (name: string) => `Remove ${name}?`,
    removeBody: "It stops counting towards the monthly total.",
    dismiss: "Dismiss",
    genericError: "That did not work. Try again.",
    uncategorised: "Other",
    retry: "Try again",
  },
  ar: {
    title: "التكاليف",
    description: "ما تكلفه الخوادم والبنود الإضافية كل شهر.",
    total: "الإجمالي الشهري",
    servers: "الخوادم",
    items: "بنود إضافية",
    savings: "توفير ممكن",
    vsPrevious: "مقارنة بالشهر الماضي",
    budget: "الميزانية",
    budgetOf: (used: string, budget: string) => `${used} من ${budget}`,
    budgetNear: "اقتربت من الميزانية.",
    budgetOver: "تجاوزت الميزانية.",
    serversTitle: "الخوادم",
    serversDescription: "السعر ومتوسط الاستخدام لكل خادم. الاقتراحات مبنية على استخدام المعالج والذاكرة.",
    serversTable: "الخوادم وتكلفتها",
    server: "الخادم",
    region: "المنطقة",
    price: "السعر",
    cpu: "المعالج",
    memory: "الذاكرة",
    disk: "القرص",
    hint: "اقتراح",
    hintOk: "حجم مناسب",
    hintDown: "يمكن أن يكون أصغر",
    hintUp: "يحتاج مساحة أكبر",
    hintDownDetail: (plan: string, save: string) => `انتقل إلى ${plan} ووفّر ${save} شهريًا.`,
    hintDownGeneric: "الاستخدام منخفض. خطة أصغر ستكلف أقل.",
    hintUpDetail: (plan: string, extra: string) => `انتقل إلى ${plan} مقابل ${extra} إضافية شهريًا.`,
    hintUpGeneric: "الاستخدام مرتفع. فكّر في خطة أكبر.",
    changePlan: (plan: string) => `التحويل إلى ${plan}`,
    serversEmpty: "لا توجد خوادم بعد",
    perMonth: "/ شهر",
    categoryTitle: "التكلفة حسب الفئة",
    categoryDescription: "التكلفة الشهرية مجمعة حسب النوع.",
    category: "الفئة",
    monthlyCost: "التكلفة الشهرية",
    serversCategory: "الخوادم",
    historyTitle: "التكلفة عبر الزمن",
    historyDescription: "التكلفة اليومية.",
    cost: "التكلفة",
    itemsTitle: "بنود إضافية",
    itemsDescription: "تكاليف ليست خوادم: نطاقات وتراخيص ونسخ احتياطي ودعم.",
    itemsTable: "بنود التكلفة الإضافية",
    itemName: "البند",
    itemCategory: "الفئة",
    itemAmount: "المبلغ",
    itemPeriod: "الفوترة",
    periods: { monthly: "شهريًا", yearly: "سنويًا", once: "مرة واحدة" } as Record<LineItemPeriod, string>,
    perMonthEquivalent: "في الشهر",
    itemsEmpty: "لا توجد بنود إضافية",
    itemsEmptyBody: "أضف تكاليف ليست جزءًا من خادم.",
    addItem: "إضافة بند",
    addItemTitle: "إضافة بند تكلفة",
    addItemBody: "يُحتسب ضمن الإجمالي الشهري. البند السنوي يُقسم على اثني عشر، والبند لمرة واحدة يُعرض دون احتسابه.",
    nameLabel: "الاسم",
    namePlaceholder: "تجديد النطاق",
    nameRequired: "أدخل اسمًا.",
    categoryLabel: "الفئة",
    categoryPlaceholder: "النطاقات",
    amountLabel: "المبلغ",
    amountInvalid: "أدخل مبلغًا أكبر من صفر.",
    periodLabel: "الفوترة",
    add: "إضافة",
    cancel: "إلغاء",
    remove: "إزالة",
    removeTitle: (name: string) => `إزالة ${name}؟`,
    removeBody: "سيتوقف احتسابه ضمن الإجمالي الشهري.",
    dismiss: "إغلاق",
    genericError: "لم تنجح العملية. حاول مرة أخرى.",
    uncategorised: "أخرى",
    retry: "حاول مرة أخرى",
  },
};

export type FinopsCostLabels = typeof STRINGS.en;
export type FinopsCostResult = void | { error?: string };

export interface CostServer {
  id: string;
  name: string;
  /** Plan name as the provider sells it: text only. */
  plan: string;
  region?: string;
  monthlyPrice: number;
  /** Average use over the period, 0 to 100 each. */
  usage: ServerUsage;
  /** The next plan down and up, used for the hint text and the saving. */
  smallerPlan?: PlanOption;
  largerPlan?: PlanOption;
}

export interface CostItem {
  id: string;
  name: string;
  category?: string;
  amount: number;
  period: LineItemPeriod;
}

export interface CostItemInput {
  name: string;
  category: string;
  amount: number;
  period: LineItemPeriod;
}

export interface FinopsCostProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  servers: readonly CostServer[];
  items?: readonly CostItem[];
  /** ISO 4217 code such as `USD` or `SAR`. Default `USD`. */
  currency?: string;
  /** Last month's total. Adds the change on the total tile. */
  previousTotal?: number;
  /** Monthly budget. Adds a meter and a warning close to it. */
  budget?: number;
  /** Daily cost for a chart: `{ date, cost }`. Left out, no chart shows. */
  history?: readonly TimeSeriesPoint[];
  /** Adds a line item. Without it the add button is hidden. */
  onAddItem?: (input: CostItemInput) => Promise<FinopsCostResult> | FinopsCostResult;
  onRemoveItem?: (id: string) => Promise<FinopsCostResult> | FinopsCostResult;
  /** Applies a rightsizing hint. Without it the row menu has no plan switch. */
  onChangePlan?: (serverId: string, plan: PlanOption) => Promise<FinopsCostResult> | FinopsCostResult;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  labels?: Partial<FinopsCostLabels>;
}

const dash = <span className="text-muted-foreground">{"—"}</span>;

function hintOf(server: CostServer): Rightsize {
  return rightsize(server.usage, server.monthlyPrice, server.smallerPlan, server.largerPlan);
}

/**
 * A cost page for the infrastructure: KPI tiles (monthly total against last month, servers, extra items, possible savings),
 * a budget meter, a per-server table with price, CPU, memory and disk use and a rightsizing hint, a cost-by-category table,
 * an optional history chart and a list of manual line items you can add and remove. Money uses the page locale with Latin
 * digits; provider and plan names stay as text.
 */
export function FinopsCost({
  servers,
  items = [],
  currency: currencyProp,
  previousTotal,
  budget,
  history,
  onAddItem,
  onRemoveItem,
  onChangePlan,
  loading = false,
  error,
  onRetry,
  labels,
  className,
  ...props
}: FinopsCostProps) {
  const currency = useCurrency(currencyProp);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as FinopsCostLabels;
  const money = useMemo(() => ({ style: "currency" as const, currency, maximumFractionDigits: 2 }), [currency]);
  const fmt = (value: number) => new Intl.NumberFormat(ar ? "ar-u-nu-latn" : locale, money).format(value);

  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(key: string, task: () => Promise<FinopsCostResult> | FinopsCostResult) {
    setFailure(null);
    setBusy((b) => new Set([...b, key]));
    try {
      const result = await task();
      if (result && result.error && mounted.current) setFailure(result.error);
    } catch {
      if (mounted.current) setFailure(t.genericError);
    } finally {
      if (mounted.current)
        setBusy((b) => {
          const next = new Set(b);
          next.delete(key);
          return next;
        });
    }
  }

  const totals = finopsTotals(servers, items);
  const savings = roundMoney(
    servers.reduce((sum, s) => {
      const h = hintOf(s);
      return h.kind === "downsize" ? sum + h.savings : sum;
    }, 0),
  );
  const state = budgetState(totals.total, budget);

  const [removing, setRemoving] = useState<CostItem | null>(null);
  const [held, setHeld] = useState<CostItem | null>(null);
  const [removePending, setRemovePending] = useState(false);
  useEffect(() => {
    if (removing) setHeld(removing);
  }, [removing]);
  const [addOpen, setAddOpen] = useState(false);

  const serverColumns = useMemo<DataTableColumn<CostServer>[]>(() => {
    const usageColumn = (id: "cpu" | "memory" | "disk", header: string): DataTableColumn<CostServer> => ({
      id,
      header,
      label: header,
      sortValue: (s) => s.usage[id],
      headerClassName: "min-w-28",
      cell: (s) => <Meter size="sm" aria-label={`${header}: ${s.name}`} value={s.usage[id]} warnAt={0.85} dangerAt={0.95} showValue valueText={<Num value={s.usage[id] / 100} format={{ style: "percent", maximumFractionDigits: 0 }} />} />,
    });
    return [
      {
        id: "server",
        header: t.server,
        label: t.server,
        hideable: false,
        sortValue: (s) => s.name,
        searchValue: (s) => `${s.name} ${s.plan} ${s.region ?? ""}`,
        cell: (s) => (
          <div className="flex min-w-0 flex-col">
            <bdi dir="ltr" className="truncate text-start font-medium text-foreground">
              {s.name}
            </bdi>
            <bdi dir="ltr" className="truncate text-start text-caption text-muted-foreground">
              {s.plan}
              {s.region ? ` · ${s.region}` : ""}
            </bdi>
          </div>
        ),
      },
      {
        id: "price",
        header: t.price,
        label: t.price,
        align: "end",
        sortValue: (s) => s.monthlyPrice,
        cell: (s) => (
          <span className="whitespace-nowrap">
            <Num value={s.monthlyPrice} format={money} /> <span className="text-caption text-muted-foreground">{t.perMonth}</span>
          </span>
        ),
      },
      usageColumn("cpu", t.cpu),
      usageColumn("memory", t.memory),
      { ...usageColumn("disk", t.disk), defaultHidden: true },
      {
        id: "hint",
        header: t.hint,
        label: t.hint,
        sortValue: (s) => hintOf(s).kind,
        filterValue: (s) => hintOf(s).kind,
        cell: (s) => {
          const h = hintOf(s);
          if (h.kind === "ok") return <Badge variant="outline">{t.hintOk}</Badge>;
          const detail =
            h.kind === "downsize"
              ? h.plan && h.savings > 0
                ? t.hintDownDetail(h.plan.name, fmt(h.savings))
                : t.hintDownGeneric
              : h.plan && h.extra > 0
                ? t.hintUpDetail(h.plan.name, fmt(h.extra))
                : t.hintUpGeneric;
          return (
            <div className="flex min-w-0 flex-col items-start gap-1">
              <Badge variant={h.kind === "downsize" ? "success" : "warning"}>
                {h.kind === "downsize" ? <ArrowDownRight aria-hidden className="size-3.5 rtl:-scale-x-100" /> : <ArrowUpRight aria-hidden className="size-3.5 rtl:-scale-x-100" />}
                {h.kind === "downsize" ? t.hintDown : t.hintUp}
              </Badge>
              <span dir="auto" className="max-w-56 text-caption text-muted-foreground">
                {detail}
              </span>
            </div>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, money, locale]);

  const serverTable = useDataTable({ data: servers as CostServer[], columns: serverColumns, getRowId: (s) => s.id, defaultSort: { id: "price", direction: "desc" }, pageSize: 8 });

  const serverActions = (server: CostServer): DataTableRowAction[] => {
    if (!onChangePlan) return [];
    const h = hintOf(server);
    if (h.kind === "ok" || !h.plan) return [];
    const plan = h.plan;
    return [
      {
        id: "change-plan",
        label: t.changePlan(plan.name),
        icon: h.kind === "downsize" ? TrendingDown : ArrowUpRight,
        disabled: busy.has(server.id),
        onSelect: () => void run(server.id, () => onChangePlan(server.id, plan)),
      },
    ];
  };

  const itemColumns = useMemo<DataTableColumn<CostItem>[]>(
    () => [
      {
        id: "name",
        header: t.itemName,
        label: t.itemName,
        hideable: false,
        sortValue: (i) => i.name,
        searchValue: (i) => `${i.name} ${i.category ?? ""}`,
        cell: (i) => (
          <div className="flex min-w-0 flex-col">
            <span dir="auto" className="truncate font-medium text-foreground">
              {i.name}
            </span>
            {i.category ? (
              <span dir="auto" className="truncate text-caption text-muted-foreground">
                {i.category}
              </span>
            ) : null}
          </div>
        ),
      },
      { id: "period", header: t.itemPeriod, label: t.itemPeriod, sortValue: (i) => i.period, cell: (i) => <Badge variant="outline">{t.periods[i.period]}</Badge> },
      { id: "amount", header: t.itemAmount, label: t.itemAmount, align: "end", sortValue: (i) => i.amount, cell: (i) => <Num value={i.amount} format={money} /> },
      {
        id: "monthly",
        header: t.perMonthEquivalent,
        label: t.perMonthEquivalent,
        align: "end",
        sortValue: (i) => monthlyEquivalent(i),
        cell: (i) => (i.period === "once" ? dash : <Num value={roundMoney(monthlyEquivalent(i))} format={money} />),
      },
    ],
    [t, money],
  );
  const itemTable = useDataTable({ data: items as CostItem[], columns: itemColumns, getRowId: (i) => i.id, defaultSort: { id: "monthly", direction: "desc" }, pageSize: 8 });

  const itemActions = (item: CostItem): DataTableRowAction[] =>
    onRemoveItem ? [{ id: "remove", label: t.remove, icon: Trash2, danger: true, disabled: busy.has(item.id), onSelect: () => setRemoving(item) }] : [];

  const categoryRows = useMemo(() => {
    const map = new Map<string, number>();
    if (totals.servers > 0) map.set(t.serversCategory, totals.servers);
    for (const i of items) {
      const m = monthlyEquivalent(i);
      if (m <= 0) continue;
      const key = i.category?.trim() || t.uncategorised;
      map.set(key, roundMoney((map.get(key) ?? 0) + m));
    }
    return [...map].map(([label, value]) => ({ id: label, label, value }));
  }, [items, totals.servers, t]);

  const tiles = [
    { id: "total", label: t.total, value: totals.total, previous: previousTotal, invert: true, format: money },
    { id: "servers", label: t.servers, value: totals.servers, format: money },
    { id: "items", label: t.items, value: totals.items, format: money },
    { id: "savings", label: t.savings, value: savings, format: money },
  ];

  return (
    <div data-slot="finops-cost" aria-busy={loading || undefined} className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <header className="flex flex-col gap-1">
        <h2 className="text-h3 text-foreground">{t.title}</h2>
        <p className="text-body-sm text-muted-foreground">{t.description}</p>
      </header>

      {failure ? (
        <Alert tone="danger" onDismiss={() => setFailure(null)} dismissLabel={t.dismiss}>
          {failure}
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" action={onRetry ? <Button size="sm" variant="secondary" onClick={onRetry}>{t.retry}</Button> : undefined}>
          {error}
        </Alert>
      ) : null}

      <MetricTiles metrics={tiles} loading={loading} comparisonLabel={t.vsPrevious} />

      {budget !== undefined && budget > 0 ? (
        <Card data-slot="finops-budget" className="w-full">
          <CardContent className="flex flex-col gap-3">
            <Meter label={t.budget} value={totals.total} max={budget} warnAt={0.9} dangerAt={1} showValue valueText={t.budgetOf(fmt(totals.total), fmt(budget))} />
            {state === "near" ? <Alert tone="warning">{t.budgetNear}</Alert> : null}
            {state === "over" ? <Alert tone="danger">{t.budgetOver}</Alert> : null}
          </CardContent>
        </Card>
      ) : null}

      {history && history.length > 0 ? (
        <TimeSeriesPanel title={t.historyTitle} description={t.historyDescription} metrics={[{ id: "cost", label: t.cost, format: money, aggregate: "sum" }]} data={history} />
      ) : null}

      <Card data-slot="finops-servers" className="w-full">
        <CardHeader>
          <CardTitle as="h3">{t.serversTitle}</CardTitle>
          <CardDescription>{t.serversDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DataTable
            table={serverTable}
            label={t.serversTable}
            rowLabel={(s) => s.name}
            loading={loading}
            error={error ? t.genericError : undefined}
            empty={<EmptyState icon={Server} title={t.serversEmpty} />}
            rowActions={onChangePlan ? serverActions : undefined}
          />
          <DataTablePagination table={serverTable} />
        </CardContent>
      </Card>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <BreakdownTable
          className="w-full"
          title={t.categoryTitle}
          description={t.categoryDescription}
          dimensionLabel={t.category}
          valueLabel={t.monthlyCost}
          format={money}
          rows={categoryRows}
          loading={loading}
          labels={undefined}
        />
        <Card data-slot="finops-items" className="w-full">
          <CardHeader>
            <CardTitle as="h3">{t.itemsTitle}</CardTitle>
            <CardDescription>{t.itemsDescription}</CardDescription>
            {onAddItem ? (
              <CardAction>
                <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                  <Plus aria-hidden className="size-4" />
                  {t.addItem}
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DataTable
              table={itemTable}
              label={t.itemsTable}
              rowLabel={(i) => i.name}
              loading={loading}
              empty={<EmptyState icon={Receipt} title={t.itemsEmpty} description={t.itemsEmptyBody} />}
              rowActions={onRemoveItem ? itemActions : undefined}
            />
            <DataTablePagination table={itemTable} />
          </CardContent>
        </Card>
      </div>

      {onAddItem ? <AddItemDialog open={addOpen} onOpenChange={setAddOpen} onAdd={onAddItem} t={t} /> : null}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && !removePending && setRemoving(null)}>
        <AlertDialogContent data-slot="finops-remove">
          <AlertDialogHeader>
            <AlertDialogTitle>{held ? t.removeTitle(held.name) : null}</AlertDialogTitle>
            <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePending}>{t.cancel}</AlertDialogCancel>
            <Button
              variant="danger"
              loading={removePending}
              onClick={async () => {
                if (!held || !onRemoveItem) return;
                setRemovePending(true);
                try {
                  await run(held.id, () => onRemoveItem(held.id));
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

function AddItemDialog({ open, onOpenChange, onAdd, t }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: NonNullable<FinopsCostProps["onAddItem"]>; t: FinopsCostLabels }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<LineItemPeriod>("monthly");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setName("");
      setCategory("");
      setAmount("");
      setPeriod("monthly");
      setTouched(false);
      setError(null);
    }
  }, [open]);
  const check = validateLineItem({ name, amount });
  const problems = check.ok ? [] : check.problems;
  const periodItems = (Object.keys(t.periods) as LineItemPeriod[]).map((p) => ({ value: p, label: t.periods[p] }));

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    if (!check.ok) return;
    setPending(true);
    setError(null);
    try {
      const result = await onAdd({ name: name.trim(), category: category.trim(), amount: check.amount, period });
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
      <DialogContent data-slot="finops-add-item" className="max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.addItemTitle}</DialogTitle>
            <DialogDescription>{t.addItemBody}</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={touched && problems.includes("name")}>
            <FieldLabel>{t.nameLabel}</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="off" />
            {touched && problems.includes("name") ? <FieldError match>{t.nameRequired}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel>{t.categoryLabel}</FieldLabel>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t.categoryPlaceholder} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && problems.includes("amount")}>
              <FieldLabel>{t.amountLabel}</FieldLabel>
              <Input ltr inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12.00" autoComplete="off" />
              {touched && problems.includes("amount") ? <FieldError match>{t.amountInvalid}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel>{t.periodLabel}</FieldLabel>
              <Select items={periodItems} value={period} onValueChange={(v) => v && setPeriod(v as LineItemPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

