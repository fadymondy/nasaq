"use client";

import { CircleX, Copy, Pencil, Plus, Power, PowerOff, Tag, Trash2 } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import type { CommerceProduct } from "../../lib/commerce";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { CurrencyInput } from "../currency-input";
import { DataTable, type DataTableColumn, type DataTableRowAction, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DatePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { TagInput } from "../tag-input";
import {
  type Discount,
  type DiscountClass,
  type DiscountKind,
  type DiscountScope,
  type DiscountStanding,
  discountStanding,
  duplicateDiscountCodes,
  normalizeDiscountCode,
} from "./discount-logic";
import { DiscountSimulator, type SimCollection } from "./discount-simulator";
import { Money, type SettingsResult, type StoreSettingsLabels, bpsToPercent, percentToBps, uid, useAction, useSettingsStrings } from "./store-settings-shared";
import { useCurrency } from "../../provider/nasaq-provider";

const KINDS: DiscountKind[] = ["percentage", "fixed", "bxgy", "free-shipping"];
const CLASSES: DiscountClass[] = ["product", "order", "shipping"];
const STANDINGS: DiscountStanding[] = ["live", "scheduled", "ended", "off", "used-up"];
const STANDING_TONE: Record<DiscountStanding, StatusTone> = { live: "success", scheduled: "info", ended: "neutral", off: "neutral", "used-up": "warning" };

const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0).toISOString();
const hasScope = (s?: DiscountScope) => (s?.productIds?.length ?? 0) > 0 || (s?.collectionIds?.length ?? 0) > 0;

export interface DiscountsManagerProps extends Omit<ComponentProps<"section">, "children"> {
  discounts: readonly Discount[];
  /** ISO 4217 code of the store. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** For scope pickers and the simulator. */
  products?: readonly CommerceProduct[];
  collections?: readonly SimCollection[];
  /** Customer segments offered in the eligibility field, such as "vip". */
  segments?: readonly string[];
  /** Times each discount has been used, by discount id. Drives "used up" and the Used column. */
  usage?: Readonly<Record<string, number>>;
  /** Today. Defaults to the current time; pass a fixed date for tests and stories. */
  now?: Date;
  /** Saves a new or changed discount. New ones arrive with a fresh `id`. Resolve `{ error }` to keep the editor open. */
  onSave: (discount: Discount) => Promise<SettingsResult>;
  onDelete?: (discount: Discount) => Promise<SettingsResult>;
  /** Show or hide the "try a basket" panel. Default true when `products` is given. */
  simulator?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: StoreSettingsLabels;
}

/**
 * Discounts: automatic or by code; percentage, fixed amount, buy X get Y and free shipping; with a minimum spend or
 * quantity, who may use it, a schedule, usage limits, a cap, and which other discounts it may stack with. A basket
 * simulator runs the real evaluator so the merchant sees what a customer would get. Money is integer minor units and
 * percentages are basis points.
 */
export function DiscountsManager({ discounts, currency: currencyProp, products = [], collections = [], segments = [], usage = {}, now, onSave, onDelete, simulator, loading = false, error, onRetry, labels, className, ...props }: DiscountsManagerProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useSettingsStrings(labels);
  const today = useMemo(() => now ?? new Date(), [now]);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const action = useAction(t.saveFailed);
  const dupes = duplicateDiscountCodes(discounts);

  const standing = (d: Discount) => discountStanding(d, today, usage[d.id] ?? 0);
  const valueOf = (d: Discount) => {
    switch (d.kind) {
      case "percentage":
        return <Num value={(d.value ?? 0) / 10000} format={{ style: "percent", maximumFractionDigits: 2 }} />;
      case "fixed":
        return (
          <span>
            <Money minor={d.value ?? 0} currency={currency} />
            {d.perItem ? ` ${t.perItemShort}` : ""}
          </span>
        );
      case "bxgy":
        return t.bxgyShort(n(d.bxgy?.buyQty ?? 0), n(d.bxgy?.getQty ?? 0));
      case "free-shipping":
        return t.freeShipping;
    }
  };

  const columns: DataTableColumn<Discount>[] = [
    {
      id: "title",
      header: t.discountTitle,
      label: t.discountTitle,
      cell: (d) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{d.title}</span>
          {d.method === "code" && d.code ? (
            <bdi dir="ltr" className="truncate font-mono text-caption text-muted-foreground">
              {d.code}
            </bdi>
          ) : (
            <span className="text-caption text-muted-foreground">{t.automatic}</span>
          )}
        </div>
      ),
      sortValue: (d) => d.title,
      searchValue: (d) => `${d.title} ${d.code ?? ""}`,
    },
    { id: "kind", header: t.type, label: t.type, cell: (d) => t.kinds[d.kind], sortValue: (d) => d.kind, filterValue: (d) => d.kind },
    { id: "value", header: t.value, label: t.value, align: "end", cell: valueOf },
    { id: "method", header: t.method, label: t.method, defaultHidden: true, cell: (d) => (d.method === "code" ? t.byCode : t.automatic), sortValue: (d) => d.method },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (d) => <Status tone={STANDING_TONE[standing(d)]}>{t.standings[standing(d)]}</Status>, sortValue: (d) => standing(d), filterValue: (d) => standing(d) },
    {
      id: "used",
      header: t.used,
      label: t.used,
      align: "end",
      cell: (d) => (
        <span className="tabular-nums">
          {n(usage[d.id] ?? 0)}
          {d.limits?.total !== undefined ? ` / ${n(d.limits.total)}` : ""}
        </span>
      ),
      sortValue: (d) => usage[d.id] ?? 0,
    },
  ];
  const table = useDataTable({ data: discounts as Discount[], columns, getRowId: (d) => d.id, pageSize: 10, defaultSort: { id: "title", direction: "asc" } });

  const create = () => (action.setError(null), setEditing({ id: uid("disc"), title: "", method: "automatic", kind: "percentage", value: 1000, active: true, combinesWith: {} }));
  const rowActions = (d: Discount): DataTableRowAction[] => [
    { id: "edit", label: t.edit, icon: Pencil, onSelect: () => (action.setError(null), setEditing(d)) },
    { id: "copy", label: t.duplicate, icon: Copy, onSelect: () => (action.setError(null), setEditing({ ...d, id: uid("disc"), title: t.copyOf(d.title), ...(d.method === "code" ? { code: "" } : {}), active: false })) },
    { id: "toggle", label: d.active === false ? t.enable : t.disable, icon: d.active === false ? Power : PowerOff, group: "state", onSelect: () => void action.run(() => onSave({ ...d, active: d.active === false })) },
    ...(onDelete ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (action.setError(null), setDeleting(d)) }] : []),
  ];

  return (
    <section data-slot="discounts-manager" aria-label={t.discounts} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-foreground">{t.discounts}</h2>
        <Button variant="primary" onClick={create}>
          <Plus aria-hidden />
          {t.addDiscount}
        </Button>
      </div>
      {dupes.length > 0 ? (
        <p role="alert" className="text-body-sm text-nq-warning-text">
          {t.duplicateCodes(dupes.join(", "))}
        </p>
      ) : null}
      {action.error && !editing && !deleting ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {action.error}
        </p>
      ) : null}
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.searchDiscounts} />
        <DataTableFacetFilter table={table} column="kind" title={t.type} options={KINDS.map((k) => ({ value: k, label: t.kinds[k] }))} />
        <DataTableFacetFilter table={table} column="status" title={t.statusCol} options={STANDINGS.map((s) => ({ value: s, label: t.standings[s] }))} />
      </DataTableToolbar>
      <DataTable
        table={table}
        label={t.discounts}
        rowLabel={(d) => d.title}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={(d) => (action.setError(null), setEditing(d))}
        rowActions={rowActions}
        empty={<EmptyState icon={Tag} title={t.discountsEmpty} description={t.discountsEmptyHint} className="border-0" actions={<Button size="sm" onClick={create}>{t.addDiscount}</Button>} />}
      />

      {(simulator ?? products.length > 0) && !loading && !error ? <DiscountSimulator discounts={discounts.filter((d) => d.active !== false)} products={products} collections={collections} currency={currency} now={today} labels={labels} /> : null}

      {editing ? (
        <DiscountEditor
          key={editing.id}
          discount={editing}
          isNew={!discounts.some((d) => d.id === editing.id)}
          others={discounts.filter((d) => d.id !== editing.id)}
          currency={currency}
          products={products}
          collections={collections}
          segments={segments}
          busy={action.busy}
          error={action.error}
          labels={labels}
          onCancel={() => setEditing(null)}
          onSave={(d) => void action.run(() => onSave(d)).then((ok) => ok && setEditing(null))}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !action.busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteDiscountTitle}</DialogTitle>
            <DialogDescription>{t.deleteBody(deleting?.title ?? "")}</DialogDescription>
          </DialogHeader>
          {action.error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {action.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={action.busy} onClick={() => deleting && onDelete && void action.run(() => onDelete(deleting)).then((ok) => ok && setDeleting(null))}>
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------------ editor */

function DiscountEditor({ discount, isNew, others, currency, products, collections, segments, busy, error, labels, onCancel, onSave }: { discount: Discount; isNew: boolean; others: readonly Discount[]; currency: string; products: readonly CommerceProduct[]; collections: readonly SimCollection[]; segments: readonly string[]; busy: boolean; error: string | null; labels?: StoreSettingsLabels; onCancel: () => void; onSave: (d: Discount) => void }) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const [d, setD] = useState<Discount>(discount);
  const [pct, setPct] = useState(discount.kind === "percentage" ? bpsToPercent(discount.value ?? 0) : "10");
  const [getPct, setGetPct] = useState(bpsToPercent(discount.bxgy?.getPercentBps ?? 10000));
  const [touched, setTouched] = useState(false);
  const patch = (change: Partial<Discount>) => setD((cur) => ({ ...cur, ...change }));
  const without = <K extends keyof Discount>(key: K) => setD((cur) => { const { [key]: _x, ...rest } = cur; return rest as Discount; });

  const pctBps = percentToBps(pct);
  const getBps = percentToBps(getPct);
  const code = normalizeDiscountCode(d.code ?? "");
  const problems: string[] = [];
  if (!d.title.trim()) problems.push(t.problemTitle);
  if (d.method === "code" && !/^[A-Z0-9_-]{3,32}$/.test(code)) problems.push(t.problemCode);
  if (d.method === "code" && code && duplicateDiscountCodes([...others, { ...d, code }]).includes(code)) problems.push(t.problemDuplicateCode);
  if (d.kind === "percentage" && (pctBps === undefined || pctBps < 1)) problems.push(t.problemPercent);
  if (d.kind === "fixed" && (d.value ?? 0) <= 0) problems.push(t.problemAmount);
  if (d.kind === "bxgy") {
    if (!d.bxgy || d.bxgy.buyQty < 1 || d.bxgy.getQty < 1) problems.push(t.problemBxgy);
    if (getBps === undefined || getBps < 1) problems.push(t.problemPercent);
  }
  if (d.startsAt && d.endsAt && Date.parse(d.endsAt) < Date.parse(d.startsAt)) problems.push(t.problemDates);

  const setKind = (kind: DiscountKind) =>
    setD((cur) => {
      const { value: _v, perItem: _p, bxgy: _b, scope: _s, ...rest } = cur;
      switch (kind) {
        case "percentage":
          return { ...rest, kind, value: 1000 };
        case "fixed":
          return { ...rest, kind, value: 10000 };
        case "bxgy":
          return { ...rest, kind, bxgy: { buyQty: 2, getQty: 1 } };
        case "free-shipping":
          return { ...rest, kind };
      }
    });

  const submit = () => {
    setTouched(true);
    if (problems.length > 0) return;
    const out: Discount = { ...d, title: d.title.trim() };
    if (d.method === "code") out.code = code;
    else delete out.code;
    if (d.kind === "percentage" && pctBps !== undefined) out.value = pctBps;
    if (d.kind === "bxgy" && d.bxgy && getBps !== undefined) out.bxgy = { ...d.bxgy, ...(getBps === 10000 ? {} : { getPercentBps: getBps }) };
    if (getBps === 10000 && out.bxgy) delete out.bxgy.getPercentBps;
    onSave(out);
  };

  const scope = d.scope;
  const combines = d.combinesWith ?? {};
  const sectionTitle = "text-h4 text-foreground";

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? t.addDiscount : d.title || t.editDiscount}</DialogTitle>
            <DialogDescription>{t.discountHint}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && !d.title.trim()} className="sm:col-span-2">
              <FieldLabel htmlFor={`${id}-title`}>{t.discountTitle}</FieldLabel>
              <Input id={`${id}-title`} value={d.title} onChange={(e) => patch({ title: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>{t.method}</FieldLabel>
              <Select items={[{ value: "automatic", label: t.automatic }, { value: "code", label: t.byCode }]} value={d.method} onValueChange={(v) => v && (v === "code" ? patch({ method: "code" }) : setD((cur) => { const { code: _c, ...rest } = cur; return { ...rest, method: "automatic" }; }))}>
                <SelectTrigger aria-label={t.method}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">{t.automatic}</SelectItem>
                  <SelectItem value="code">{t.byCode}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {d.method === "code" ? (
              <Field invalid={touched && (!/^[A-Z0-9_-]{3,32}$/.test(code) || problems.includes(t.problemDuplicateCode))}>
                <FieldLabel htmlFor={`${id}-code`}>{t.code}</FieldLabel>
                <Input id={`${id}-code`} ltr className="font-mono uppercase" value={d.code ?? ""} placeholder="SUMMER10" onChange={(e) => patch({ code: e.target.value })} />
              </Field>
            ) : null}
          </div>

          <section className="grid gap-3" aria-label={t.whatItDoes}>
            <h3 className={sectionTitle}>{t.whatItDoes}</h3>
            <Field>
              <FieldLabel>{t.type}</FieldLabel>
              <Select items={KINDS.map((k) => ({ value: k, label: t.kinds[k] }))} value={d.kind} onValueChange={(v) => v && setKind(v as DiscountKind)}>
                <SelectTrigger aria-label={t.type}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t.kinds[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {d.kind === "percentage" ? (
              <Field invalid={touched && (pctBps === undefined || pctBps < 1)}>
                <FieldLabel htmlFor={`${id}-pct`}>{t.percentOff}</FieldLabel>
                <Input id={`${id}-pct`} ltr inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
                <FieldDescription>{pctBps === undefined ? t.rateInvalid : t.bpsIs(String(pctBps))}</FieldDescription>
              </Field>
            ) : null}
            {d.kind === "fixed" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field invalid={touched && (d.value ?? 0) <= 0}>
                  <FieldLabel>{t.amountOff}</FieldLabel>
                  <CurrencyInput currency={currency} value={d.value ?? 0} onValueChange={(v) => patch({ value: v ?? 0 })} aria-label={t.amountOff} />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-body-sm">
                  <Switch checked={Boolean(d.perItem)} onCheckedChange={(on) => patch({ perItem: on })} />
                  {t.perItem}
                </label>
              </div>
            ) : null}
            {d.kind === "bxgy" && d.bxgy ? (
              <BxgyFields d={d} getPct={getPct} setGetPct={setGetPct} getBps={getBps} onChange={(bxgy) => patch({ bxgy })} products={products} collections={collections} touched={touched} labels={labels} />
            ) : null}
            {d.kind === "free-shipping" ? <p className="text-body-sm text-muted-foreground">{t.freeShippingHint}</p> : null}
            {d.kind === "percentage" || d.kind === "fixed" || d.kind === "free-shipping" ? (
              <Field>
                <FieldLabel>{d.kind === "free-shipping" ? t.capShipping : t.cap}</FieldLabel>
                <CurrencyInput currency={currency} value={d.maxDiscount ?? null} onValueChange={(v) => (v === null ? without("maxDiscount") : patch({ maxDiscount: v }))} aria-label={t.cap} />
                <FieldDescription>{t.capHint}</FieldDescription>
              </Field>
            ) : null}
          </section>

          {d.kind === "percentage" || d.kind === "fixed" ? (
            <section className="grid gap-3" aria-label={t.appliesTo}>
              <h3 className={sectionTitle}>{t.appliesTo}</h3>
              <ScopePicker value={scope} onChange={(s) => (hasScope(s) ? patch({ scope: s }) : without("scope"))} products={products} collections={collections} labels={labels} />
              <label className="flex items-center gap-2 text-body-sm">
                <Switch checked={Boolean(d.excludeOnSale)} onCheckedChange={(on) => patch({ excludeOnSale: on })} />
                {t.excludeOnSale}
              </label>
            </section>
          ) : null}

          <section className="grid gap-3" aria-label={t.requirements}>
            <h3 className={sectionTitle}>{t.requirements}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.minSpend}</FieldLabel>
                <CurrencyInput currency={currency} value={d.minSubtotal ?? null} onValueChange={(v) => (v === null || v === 0 ? without("minSubtotal") : patch({ minSubtotal: v }))} aria-label={t.minSpend} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-minq`}>{t.minQuantity}</FieldLabel>
                <Input id={`${id}-minq`} ltr inputMode="numeric" value={d.minQuantity === undefined ? "" : String(d.minQuantity)} onChange={(e) => { const v = toInt(e.target.value); if (v === undefined || v === 0) without("minQuantity"); else patch({ minQuantity: v }); }} />
              </Field>
            </div>
          </section>

          <section className="grid gap-3" aria-label={t.eligibility}>
            <h3 className={sectionTitle}>{t.eligibility}</h3>
            <Field>
              <FieldLabel>{t.customers}</FieldLabel>
              <Select
                items={[{ value: "all", label: t.customersAll }, { value: "segments", label: t.customersSegments }, { value: "specific", label: t.customersSpecific }]}
                value={d.customers?.mode ?? "all"}
                onValueChange={(v) => v && (v === "all" ? without("customers") : patch({ customers: { mode: v as "segments" | "specific" } }))}
              >
                <SelectTrigger aria-label={t.customers}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.customersAll}</SelectItem>
                  <SelectItem value="segments">{t.customersSegments}</SelectItem>
                  <SelectItem value="specific">{t.customersSpecific}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {d.customers?.mode === "segments" ? (
              <Field>
                <FieldLabel id={`${id}-seg`}>{t.segmentsLabel}</FieldLabel>
                <TagInput aria-labelledby={`${id}-seg`} value={d.customers.segments ?? []} suggestions={segments} placeholder={t.segmentsPlaceholder} onValueChange={(v) => patch({ customers: { mode: "segments", segments: v } })} />
              </Field>
            ) : null}
            {d.customers?.mode === "specific" ? (
              <Field>
                <FieldLabel id={`${id}-cust`}>{t.customerIdsLabel}</FieldLabel>
                <TagInput aria-labelledby={`${id}-cust`} value={d.customers.customerIds ?? []} placeholder={t.customerIdsPlaceholder} onValueChange={(v) => patch({ customers: { mode: "specific", customerIds: v } })} />
              </Field>
            ) : null}
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={Boolean(d.firstOrderOnly)} onCheckedChange={(on) => patch({ firstOrderOnly: on })} />
              {t.firstOrderOnly}
            </label>
          </section>

          <section className="grid gap-3" aria-label={t.schedule}>
            <h3 className={sectionTitle}>{t.schedule}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.startsOn}</FieldLabel>
                <DatePicker aria-label={t.startsOn} value={d.startsAt ? new Date(d.startsAt) : null} onValueChange={(v) => (v ? patch({ startsAt: startOfDay(v) }) : without("startsAt"))} />
              </Field>
              <Field invalid={problems.includes(t.problemDates)}>
                <FieldLabel>{t.endsOn}</FieldLabel>
                <DatePicker aria-label={t.endsOn} value={d.endsAt ? new Date(d.endsAt) : null} onValueChange={(v) => (v ? patch({ endsAt: endOfDay(v) }) : without("endsAt"))} />
              </Field>
            </div>
          </section>

          <section className="grid gap-3" aria-label={t.limits}>
            <h3 className={sectionTitle}>{t.limits}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-lt`}>{t.limitTotal}</FieldLabel>
                <Input id={`${id}-lt`} ltr inputMode="numeric" value={d.limits?.total === undefined ? "" : String(d.limits.total)} onChange={(e) => setLimit(patch, d, "total", toInt(e.target.value))} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-lc`}>{t.limitCustomer}</FieldLabel>
                <Input id={`${id}-lc`} ltr inputMode="numeric" value={d.limits?.perCustomer === undefined ? "" : String(d.limits.perCustomer)} onChange={(e) => setLimit(patch, d, "perCustomer", toInt(e.target.value))} />
              </Field>
            </div>
          </section>

          <fieldset className="grid gap-2">
            <legend className={sectionTitle}>{t.combinesWith}</legend>
            <p className="text-caption text-muted-foreground">{t.combinesHint}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {CLASSES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-body-sm">
                  <Checkbox checked={Boolean(combines[c])} onCheckedChange={(on) => patch({ combinesWith: { ...combines, [c]: Boolean(on) } })} />
                  {t.classes[c]}
                </label>
              ))}
            </div>
          </fieldset>

          {(touched && problems.length > 0) || error ? (
            <p role="alert" className="flex items-start gap-2 text-body-sm text-nq-danger-text">
              <CircleX aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error ?? problems.join(" ")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.saveDiscount}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function setLimit(patch: (c: Partial<Discount>) => void, d: Discount, key: "total" | "perCustomer", v: number | undefined) {
  const next = { ...d.limits };
  if (v === undefined || v === 0) delete next[key];
  else next[key] = v;
  patch({ limits: next });
}

/* ------------------------------------------------------------------ buy X get Y */

function BxgyFields({ d, getPct, setGetPct, getBps, onChange, products, collections, touched, labels }: { d: Discount; getPct: string; setGetPct: (v: string) => void; getBps: number | undefined; onChange: (b: NonNullable<Discount["bxgy"]>) => void; products: readonly CommerceProduct[]; collections: readonly SimCollection[]; touched: boolean; labels?: StoreSettingsLabels }) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const b = d.bxgy as NonNullable<Discount["bxgy"]>;
  const set = (change: Partial<NonNullable<Discount["bxgy"]>>) => onChange({ ...b, ...change });
  const clear = (key: "maxSets" | "getScope" | "buyScope") => {
    const { [key]: _x, ...rest } = b;
    onChange(rest as NonNullable<Discount["bxgy"]>);
  };
  return (
    <div className="grid gap-4" data-slot="bxgy-fields">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field invalid={touched && b.buyQty < 1}>
          <FieldLabel htmlFor={`${id}-bq`}>{t.buyQty}</FieldLabel>
          <Input id={`${id}-bq`} ltr inputMode="numeric" value={String(b.buyQty)} onChange={(e) => set({ buyQty: toInt(e.target.value) ?? 0 })} />
        </Field>
        <Field invalid={touched && b.getQty < 1}>
          <FieldLabel htmlFor={`${id}-gq`}>{t.getQty}</FieldLabel>
          <Input id={`${id}-gq`} ltr inputMode="numeric" value={String(b.getQty)} onChange={(e) => set({ getQty: toInt(e.target.value) ?? 0 })} />
        </Field>
        <Field invalid={touched && (getBps === undefined || getBps < 1)}>
          <FieldLabel htmlFor={`${id}-gp`}>{t.getPercent}</FieldLabel>
          <Input id={`${id}-gp`} ltr inputMode="decimal" value={getPct} onChange={(e) => setGetPct(e.target.value)} />
          <FieldDescription>{t.getPercentHint}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-ms`}>{t.maxSets}</FieldLabel>
          <Input id={`${id}-ms`} ltr inputMode="numeric" value={b.maxSets === undefined ? "" : String(b.maxSets)} placeholder={t.noLimit} onChange={(e) => { const v = toInt(e.target.value); if (v === undefined || v === 0) clear("maxSets"); else set({ maxSets: v }); }} />
        </Field>
      </div>
      <div className="grid gap-2">
        <p className="text-label text-foreground">{t.buyItems}</p>
        <ScopePicker value={b.buyScope} onChange={(s) => (hasScope(s) ? set({ buyScope: s }) : clear("buyScope"))} products={products} collections={collections} labels={labels} />
      </div>
      <div className="grid gap-2">
        <p className="text-label text-foreground">{t.getItems}</p>
        <ScopePicker value={b.getScope} onChange={(s) => (hasScope(s) ? set({ getScope: s }) : clear("getScope"))} products={products} collections={collections} labels={labels} emptyLabel={t.sameAsBuy} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ scope */

function ScopePicker({ value, onChange, products, collections, labels, emptyLabel }: { value: DiscountScope | undefined; onChange: (s: DiscountScope | undefined) => void; products: readonly CommerceProduct[]; collections: readonly SimCollection[]; labels?: StoreSettingsLabels; emptyLabel?: string }) {
  const { t } = useSettingsStrings(labels);
  const productIds = value?.productIds ?? [];
  const collectionIds = value?.collectionIds ?? [];
  const toggle = (key: "productIds" | "collectionIds", id: string, on: boolean) => {
    const cur = key === "productIds" ? productIds : collectionIds;
    const next = on ? [...cur, id] : cur.filter((x) => x !== id);
    const scope: DiscountScope = { productIds, collectionIds, [key]: next };
    if (scope.productIds?.length === 0) delete scope.productIds;
    if (scope.collectionIds?.length === 0) delete scope.collectionIds;
    onChange(hasScope(scope) ? scope : undefined);
  };
  const all = !hasScope(value);
  if (products.length === 0 && collections.length === 0) return <p className="text-body-sm text-muted-foreground">{emptyLabel ?? t.everything}</p>;
  return (
    <div className="grid gap-2" data-slot="scope-picker">
      <p className="text-body-sm text-muted-foreground" aria-live="polite">
        {all ? (emptyLabel ?? t.everything) : t.scopeCount(String(productIds.length + collectionIds.length))}
      </p>
      <div className="grid max-h-44 gap-1 overflow-y-auto rounded-control border border-border p-2 sm:grid-cols-2">
        {collections.map((c) => (
          <label key={c.id} className="flex min-w-0 items-center gap-2 text-body-sm">
            <Checkbox checked={collectionIds.includes(c.id)} onCheckedChange={(on) => toggle("collectionIds", c.id, Boolean(on))} />
            <span className="truncate">{c.title}</span>
            <Badge variant="outline">{t.collection}</Badge>
          </label>
        ))}
        {products.map((p) => (
          <label key={p.id} className="flex min-w-0 items-center gap-2 text-body-sm">
            <Checkbox checked={productIds.includes(p.id)} onCheckedChange={(on) => toggle("productIds", p.id, Boolean(on))} />
            <span className="truncate">{p.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
