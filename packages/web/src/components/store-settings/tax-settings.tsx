"use client";

import { CircleX, Pencil, Percent, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { CurrencyInput } from "../currency-input";
import { DataTable, type DataTableColumn, type DataTableRowAction, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Num } from "../numeric";
import { EmptyState } from "../states";
import { Status } from "../status";
import { Switch } from "../switch";
import { duplicateTaxRegions, orderTax, splitTax, type TaxRate, taxRateFor } from "./tax-logic";
import { Money, bpsToPercent, percentToBps, regionName, type SettingsResult, type StoreSettingsLabels, uid, useAction, useSettingsStrings } from "./store-settings-shared";
import { useCurrency } from "../../provider/nasaq-provider";

const keyOf = (r: { country: string; region?: string }) => `${r.country.toUpperCase()}${r.region ? `/${r.region}` : ""}`;

export interface TaxSettingsProps extends Omit<ComponentProps<"section">, "children"> {
  rates: readonly TaxRate[];
  /** ISO 4217 code of the store. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Saves a new or changed rate. New rates arrive with a fresh `id`. Resolve `{ error }` to keep the dialog open. */
  onSave: (rate: TaxRate) => Promise<SettingsResult>;
  onDelete?: (rate: TaxRate) => Promise<SettingsResult>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: StoreSettingsLabels;
}

/**
 * Tax rates by country and region, each either inclusive (the price already contains the tax) or exclusive (added at
 * checkout), optionally on shipping too. A calculator below runs the same `orderTax` a checkout does, so a merchant sees
 * the tax, the total and the net for a sample order. Rates are basis points (1400 is 14%); money is integer minor units.
 */
export function TaxSettings({ rates, currency: currencyProp, onSave, onDelete, loading = false, error, onRetry, labels, className, ...props }: TaxSettingsProps) {
  const currency = useCurrency(currencyProp);
  const { t, locale } = useSettingsStrings(labels);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [deleting, setDeleting] = useState<TaxRate | null>(null);
  const action = useAction(t.saveFailed);
  const dupes = duplicateTaxRegions(rates);

  const columns: DataTableColumn<TaxRate>[] = [
    { id: "name", header: t.taxName, label: t.taxName, cell: (r) => <span className="font-medium text-foreground">{r.name}</span>, sortValue: (r) => r.name, searchValue: (r) => `${r.name} ${r.country} ${r.region ?? ""}` },
    {
      id: "region",
      header: t.region,
      label: t.region,
      cell: (r) => (
        <span className="text-body-sm">
          {regionName(locale, r.country)}
          {r.region ? ` · ${r.region}` : ""}
        </span>
      ),
      sortValue: (r) => keyOf(r),
    },
    { id: "rate", header: t.rate, label: t.rate, align: "end", cell: (r) => <Num value={r.bps / 10000} format={{ style: "percent", maximumFractionDigits: 2 }} />, sortValue: (r) => r.bps },
    { id: "mode", header: t.mode, label: t.mode, cell: (r) => <Badge variant={r.inclusive ? "info" : "neutral"}>{r.inclusive ? t.inclusive : t.exclusive}</Badge>, sortValue: (r) => Number(r.inclusive) },
    { id: "shipping", header: t.onShipping, label: t.onShipping, defaultHidden: true, cell: (r) => (r.onShipping ? t.yes : t.no), sortValue: (r) => Number(Boolean(r.onShipping)) },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (r) => <Status tone={r.active === false ? "neutral" : "success"}>{r.active === false ? t.off : t.on}</Status>, sortValue: (r) => Number(r.active !== false) },
  ];
  const table = useDataTable({ data: rates as TaxRate[], columns, getRowId: (r) => r.id, pageSize: 10, defaultSort: { id: "region", direction: "asc" } });

  const create = () => (action.setError(null), setEditing({ id: uid("tax"), name: "", country: "EG", bps: 1400, inclusive: true, onShipping: true, active: true }));
  const rowActions = (r: TaxRate): DataTableRowAction[] => [
    { id: "edit", label: t.edit, icon: Pencil, onSelect: () => (action.setError(null), setEditing(r)) },
    { id: "toggle", label: r.active === false ? t.enable : t.disable, icon: r.active === false ? Power : PowerOff, group: "state", onSelect: () => void action.run(() => onSave({ ...r, active: r.active === false })) },
    ...(onDelete ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (action.setError(null), setDeleting(r)) }] : []),
  ];

  return (
    <section data-slot="tax-settings" aria-label={t.taxes} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-foreground">{t.taxRates}</h2>
        <Button variant="primary" onClick={create}>
          <Plus aria-hidden />
          {t.addTax}
        </Button>
      </div>
      {dupes.length > 0 ? (
        <Alert tone="warning" title={t.taxOverlapTitle}>
          {t.taxOverlapBody(dupes.join(", "))}
        </Alert>
      ) : null}
      {action.error && !editing && !deleting ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {action.error}
        </p>
      ) : null}
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.searchTax} />
      </DataTableToolbar>
      <DataTable
        table={table}
        label={t.taxRates}
        rowLabel={(r) => r.name}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={(r) => (action.setError(null), setEditing(r))}
        rowActions={rowActions}
        empty={<EmptyState icon={Percent} title={t.taxEmpty} description={t.taxEmptyHint} className="border-0" actions={<Button size="sm" onClick={create}>{t.addTax}</Button>} />}
      />

      <TaxCalculator rates={rates} currency={currency} labels={labels} />

      {editing ? (
        <TaxEditor
          key={editing.id}
          rate={editing}
          isNew={!rates.some((r) => r.id === editing.id)}
          busy={action.busy}
          error={action.error}
          labels={labels}
          onCancel={() => setEditing(null)}
          onSave={(r) => void action.run(() => onSave(r)).then((ok) => ok && setEditing(null))}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !action.busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteTaxTitle}</DialogTitle>
            <DialogDescription>{t.deleteBody(deleting?.name ?? "")}</DialogDescription>
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

function TaxEditor({ rate, isNew, busy, error, labels, onCancel, onSave }: { rate: TaxRate; isNew: boolean; busy: boolean; error: string | null; labels?: StoreSettingsLabels; onCancel: () => void; onSave: (r: TaxRate) => void }) {
  const { t, locale } = useSettingsStrings(labels);
  const id = useId();
  const [name, setName] = useState(rate.name);
  const [country, setCountry] = useState(rate.country);
  const [region, setRegion] = useState(rate.region ?? "");
  const [percent, setPercent] = useState(bpsToPercent(rate.bps));
  const [inclusive, setInclusive] = useState(rate.inclusive);
  const [onShipping, setOnShipping] = useState(Boolean(rate.onShipping));
  const [active, setActive] = useState(rate.active !== false);
  const [touched, setTouched] = useState(false);
  const bps = percentToBps(percent);
  const validCountry = /^[A-Za-z]{2}$/.test(country.trim());
  const bad = !name.trim() || !validCountry || bps === undefined;
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (bad || bps === undefined) return;
            const { region: _r, ...base } = rate;
            onSave({ ...base, name: name.trim(), country: country.trim().toUpperCase(), ...(region.trim() ? { region: region.trim() } : {}), bps, inclusive, onShipping, active });
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? t.addTax : name || t.editTax}</DialogTitle>
            <DialogDescription>{t.taxHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && !name.trim()}>
            <FieldLabel htmlFor={`${id}-n`}>{t.taxName}</FieldLabel>
            <Input id={`${id}-n`} value={name} placeholder={t.taxNamePlaceholder} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && !validCountry}>
              <FieldLabel htmlFor={`${id}-c`}>{t.country}</FieldLabel>
              <Input id={`${id}-c`} ltr maxLength={2} className="uppercase" value={country} onChange={(e) => setCountry(e.target.value)} />
              <FieldDescription>{validCountry ? regionName(locale, country) : t.countryHint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-r`}>{t.regionOptional}</FieldLabel>
              <Input id={`${id}-r`} value={region} onChange={(e) => setRegion(e.target.value)} />
              <FieldDescription>{t.regionHint}</FieldDescription>
            </Field>
            <Field invalid={touched && bps === undefined}>
              <FieldLabel htmlFor={`${id}-p`}>{t.ratePercent}</FieldLabel>
              <Input id={`${id}-p`} ltr inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
              <FieldDescription>{bps === undefined ? t.rateInvalid : t.bpsIs(String(bps))}</FieldDescription>
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-label text-foreground">{t.mode}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([true, false] as const).map((inc) => (
                <label key={String(inc)} className={cn("flex cursor-pointer items-start gap-2 rounded-card border p-3 text-body-sm", inclusive === inc ? "border-primary bg-nq-surface-soft" : "border-border")}>
                  <input type="radio" name={`${id}-mode`} className="mt-1 accent-[var(--nq-brand)]" checked={inclusive === inc} onChange={() => setInclusive(inc)} />
                  <span className="grid gap-0.5">
                    <span className="font-medium text-foreground">{inc ? t.inclusive : t.exclusive}</span>
                    <span className="text-caption text-muted-foreground">{inc ? t.inclusiveHint : t.exclusiveHint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={onShipping} onCheckedChange={setOnShipping} />
              {t.onShipping}
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={active} onCheckedChange={setActive} />
              {t.active}
            </label>
          </div>
          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.saveTax}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaxCalculator({ rates, currency, labels }: { rates: readonly TaxRate[]; currency: string; labels?: StoreSettingsLabels }) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const [country, setCountry] = useState(() => rates.find((r) => r.active !== false)?.country ?? "EG");
  const [region, setRegion] = useState("");
  const [goods, setGoods] = useState(100000);
  const [shipping, setShipping] = useState(5000);
  const active = useMemo(() => rates.filter((r) => r.active !== false), [rates]);
  const rate = taxRateFor(active, { country: country.trim(), ...(region.trim() ? { region: region.trim() } : {}) });
  const tax = orderTax({ goods, shipping, rate });
  const split = rate ? splitTax(goods + (rate.onShipping ? shipping : 0), rate.bps, rate.inclusive) : undefined;
  return (
    <Card className="w-full" data-slot="tax-calculator">
      <CardHeader>
        <CardTitle as="h3">{t.tryTax}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor={`${id}-c`}>{t.country}</FieldLabel>
            <Input id={`${id}-c`} ltr maxLength={2} className="uppercase" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-r`}>{t.regionOptional}</FieldLabel>
            <Input id={`${id}-r`} value={region} onChange={(e) => setRegion(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>{t.goods}</FieldLabel>
            <CurrencyInput currency={currency} value={goods} onValueChange={(v) => setGoods(v ?? 0)} aria-label={t.goods} />
          </Field>
          <Field>
            <FieldLabel>{t.shippingCharge}</FieldLabel>
            <CurrencyInput currency={currency} value={shipping} onValueChange={(v) => setShipping(v ?? 0)} aria-label={t.shippingCharge} />
          </Field>
        </div>
        <div role="status" aria-live="polite" className="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm">
          {rate ? (
            <>
              <p className="text-muted-foreground">
                {rate.name} · <Num value={rate.bps / 10000} format={{ style: "percent", maximumFractionDigits: 2 }} /> · {rate.inclusive ? t.inclusive : t.exclusive}
              </p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Cell label={t.taxAmount} value={<Money minor={tax.tax} currency={currency} />} />
                {split ? <Cell label={t.netAmount} value={<Money minor={split.net} currency={currency} />} /> : null}
                <Cell label={t.addedToTotal} value={<Money minor={tax.added} currency={currency} />} />
                <Cell label={t.customerPays} value={<Money minor={tax.total} currency={currency} />} strong />
              </dl>
            </>
          ) : (
            <p className="text-muted-foreground">{t.noTaxRate}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", strong ? "font-semibold" : "font-medium")}>{value}</dd>
    </div>
  );
}
