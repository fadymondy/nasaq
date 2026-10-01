"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import type { CommerceImage, CommerceOption, CommerceVariant } from "../../lib/commerce";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { CurrencyInput } from "../currency-input";
import { Field, FieldLabel, Input } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { TagInput } from "../tag-input";
import { bulkFillVariants, duplicateSkus, MAX_OPTIONS, optionValuesFromLabels, type VariantPatch, variantLabel } from "./product-admin-logic";
import { type StoreProductsAdminLabels, Thumb, useProductAdminStrings } from "./product-admin-shared";
import { useCurrency } from "../../provider/nasaq-provider";

/* ------------------------------------------------------------------ OptionsEditor */

export interface OptionsEditorProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  options: readonly CommerceOption[];
  onOptionsChange: (options: CommerceOption[]) => void;
  /** Default 3. */
  maxOptions?: number;
  disabled?: boolean;
  labels?: StoreProductsAdminLabels;
}

/**
 * The option axes of a product (Colour, Size, Material) and the values of each. A value you keep typing keeps its
 * id, so the variants built on it keep their price, SKU and stock when you add or remove neighbours.
 */
export function OptionsEditor({ options, onOptionsChange, maxOptions = MAX_OPTIONS, disabled = false, labels, className, ...props }: OptionsEditorProps) {
  const { t } = useProductAdminStrings(labels);
  const uid = useId();
  const update = (id: string, change: (o: CommerceOption) => CommerceOption) => onOptionsChange(options.map((o) => (o.id === id ? change(o) : o)));
  const add = () => {
    const taken = new Set(options.map((o) => o.id));
    let n = options.length + 1;
    while (taken.has(`option-${n}`)) n += 1;
    onOptionsChange([...options, { id: `option-${n}`, name: "", display: "button", values: [] }]);
  };
  return (
    <section data-slot="options-editor" aria-label={t.optionsTitle} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <p className="text-body-sm text-muted-foreground">{t.optionsHint}</p>
      {options.map((o, i) => (
        <div key={o.id} className="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-start">
          <Field>
            <FieldLabel htmlFor={`${uid}-${o.id}-name`}>{t.optionName}</FieldLabel>
            <Input id={`${uid}-${o.id}-name`} value={o.name} placeholder={t.optionNamePlaceholder} disabled={disabled} onChange={(e) => update(o.id, (x) => ({ ...x, name: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel id={`${uid}-${o.id}-values`}>{t.optionValues}</FieldLabel>
            <TagInput aria-labelledby={`${uid}-${o.id}-values`} value={o.values.map((v) => v.label)} placeholder={t.optionValuesPlaceholder} disabled={disabled} onValueChange={(labelsNext) => update(o.id, (x) => ({ ...x, values: optionValuesFromLabels(x, labelsNext) }))} />
          </Field>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`${t.removeOption}: ${o.name || i + 1}`} disabled={disabled} className="sm:mt-6" onClick={() => onOptionsChange(options.filter((x) => x.id !== o.id))}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      {options.length < maxOptions ? (
        <div>
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={add}>
            <Plus aria-hidden />
            {t.addOption}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ VariantMatrix */

export interface VariantMatrixProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  options: readonly CommerceOption[];
  variants: readonly CommerceVariant[];
  onVariantsChange: (variants: CommerceVariant[]) => void;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** The product's pictures, offered as each variant's image. */
  images?: readonly CommerceImage[];
  disabled?: boolean;
  labels?: StoreProductsAdminLabels;
}

const NONE = "__none";
const GRID = "lg:grid-cols-[auto_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(6rem,0.8fr)_minmax(8rem,1fr)]";

/**
 * The variant matrix: one row per combination of the options, with its own price, compare-at price, SKU, stock and
 * image. Select rows and fill a price, stock, stock change or SKU prefix into all of them at once. Duplicate SKUs are
 * flagged. On a phone each row becomes a card.
 */
export function VariantMatrix({ options, variants, onVariantsChange, currency: currencyProp, images = [], disabled = false, labels, className, ...props }: VariantMatrixProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useProductAdminStrings(labels);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [fill, setFill] = useState<{ price: number | null; compareAt: number | null; stock: string; add: string; sku: string }>({ price: null, compareAt: null, stock: "", add: "", sku: "" });
  const dupes = useMemo(() => new Set(duplicateSkus(variants)), [variants]);
  const ids = variants.map((v) => v.id);
  const all = variants.length > 0 && ids.every((id) => selected.has(id));
  const some = ids.some((id) => selected.has(id));
  const patch = (id: string, change: Partial<CommerceVariant> | ((v: CommerceVariant) => CommerceVariant)) => onVariantsChange(variants.map((v) => (v.id === id ? (typeof change === "function" ? change(v) : { ...v, ...change }) : v)));
  const wholeOrNull = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

  const fillPatch: VariantPatch = {
    ...(fill.price !== null ? { price: fill.price } : {}),
    ...(fill.compareAt !== null ? { compareAt: fill.compareAt } : {}),
    ...(wholeOrNull(fill.stock) !== null ? { stock: wholeOrNull(fill.stock) } : {}),
    ...(/^-?\d+$/.test(fill.add.trim()) ? { stockDelta: Number(fill.add.trim()) } : {}),
    ...(fill.sku.trim() ? { skuPrefix: fill.sku.trim().toUpperCase() } : {}),
  };
  const canFill = some && Object.keys(fillPatch).length > 0;

  if (variants.length === 0) return <EmptyState data-slot="variant-matrix" title={t.variantsTitle} description={t.variantsEmpty} className={cn("border-dashed", className)} />;

  return (
    <section data-slot="variant-matrix" aria-label={t.variantsTitle} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <div role="group" aria-label={t.bulkFill} className="grid gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-label text-foreground">{t.bulkFill}</h3>
          <span className="text-caption text-muted-foreground" aria-live="polite">
            {some ? t.variantsSelected(n(ids.filter((id) => selected.has(id)).length)) : t.selectVariants}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field>
            <FieldLabel>{t.fillPrice}</FieldLabel>
            <CurrencyInput currency={currency} value={fill.price} disabled={disabled || !some} onValueChange={(v) => setFill((f) => ({ ...f, price: v }))} aria-label={t.fillPrice} />
          </Field>
          <Field>
            <FieldLabel>{t.fillCompare}</FieldLabel>
            <CurrencyInput currency={currency} value={fill.compareAt} disabled={disabled || !some} onValueChange={(v) => setFill((f) => ({ ...f, compareAt: v }))} aria-label={t.fillCompare} />
          </Field>
          <Field>
            <FieldLabel>{t.fillStock}</FieldLabel>
            <Input ltr inputMode="numeric" value={fill.stock} disabled={disabled || !some} onChange={(e) => setFill((f) => ({ ...f, stock: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel>{t.fillAddStock}</FieldLabel>
            <Input ltr inputMode="numeric" value={fill.add} disabled={disabled || !some} onChange={(e) => setFill((f) => ({ ...f, add: e.target.value }))} placeholder="+10" />
          </Field>
          <Field className="col-span-2 md:col-span-1">
            <FieldLabel>{t.fillSkuPrefix}</FieldLabel>
            <Input ltr className="uppercase" value={fill.sku} disabled={disabled || !some} onChange={(e) => setFill((f) => ({ ...f, sku: e.target.value }))} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || !canFill}
            onClick={() => {
              onVariantsChange(bulkFillVariants(variants, selected, fillPatch));
              setFill({ price: null, compareAt: null, stock: "", add: "", sku: "" });
            }}
          >
            {t.fillApply}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={!some} onClick={() => setSelected(new Set())}>
            {t.fillClear}
          </Button>
        </div>
      </div>

      <div className={cn("hidden items-center gap-3 px-3 text-caption text-muted-foreground lg:grid", GRID)} aria-hidden>
        <Checkbox checked={all} indeterminate={!all && some} onCheckedChange={(c) => setSelected(c ? new Set(ids) : new Set())} aria-label={t.selectAll} tabIndex={-1} />
        <span>{t.variantLabel}</span>
        <span>{t.skuCol}</span>
        <span>{t.priceCol2}</span>
        <span>{t.compareCol}</span>
        <span>{t.stockCol2}</span>
        <span>{t.imageCol}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {variants.map((v, idx) => {
          const label = variantLabel(options, v) || `#${idx + 1}`;
          const dup = Boolean(v.sku && dupes.has(v.sku.trim().toUpperCase()));
          const badCompare = v.compareAt !== undefined && v.compareAt <= v.price;
          return (
            <li key={v.id} data-slot="variant-row" className={cn("grid grid-cols-2 items-start gap-3 rounded-card border border-border bg-card p-3 lg:items-center", GRID)}>
              <div className="col-span-2 flex items-center gap-3 lg:col-span-2 lg:contents">
                <Checkbox checked={selected.has(v.id)} disabled={disabled} onCheckedChange={(c) => setSelected((s) => { const next = new Set(s); if (c) next.add(v.id); else next.delete(v.id); return next; })} aria-label={t.selectVariant(label)} />
                <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
              </div>
              <Field invalid={dup} className="col-span-2 lg:col-span-1">
                <FieldLabel className="lg:sr-only">{t.skuCol}</FieldLabel>
                <Input ltr className="font-mono uppercase" value={v.sku ?? ""} disabled={disabled} aria-label={`${t.skuCol}: ${label}`} onChange={(e) => patch(v.id, (x) => { const { sku: _drop, ...rest } = x; return e.target.value ? { ...rest, sku: e.target.value } : rest; })} />
                {dup ? (
                  <span className="flex items-center gap-1 text-caption text-nq-danger-text">
                    <TriangleAlert aria-hidden className="size-3" />
                    {t.dupSku}
                  </span>
                ) : null}
              </Field>
              <Field>
                <FieldLabel className="lg:sr-only">{t.priceCol2}</FieldLabel>
                <CurrencyInput currency={currency} value={v.price} disabled={disabled} onValueChange={(p) => patch(v.id, { price: p ?? 0 })} aria-label={`${t.priceCol2}: ${label}`} />
              </Field>
              <Field invalid={badCompare}>
                <FieldLabel className="lg:sr-only">{t.compareCol}</FieldLabel>
                <CurrencyInput currency={currency} value={v.compareAt ?? null} disabled={disabled} onValueChange={(p) => patch(v.id, (x) => { const { compareAt: _drop, ...rest } = x; return p === null ? rest : { ...rest, compareAt: p }; })} aria-label={`${t.compareCol}: ${label}`} />
              </Field>
              <Field>
                <FieldLabel className="lg:sr-only">{t.stockCol2}</FieldLabel>
                <Input
                  ltr
                  inputMode="numeric"
                  value={v.stock === undefined ? "" : String(v.stock)}
                  placeholder={t.stockLevels.untracked}
                  disabled={disabled}
                  aria-label={`${t.stockCol2}: ${label}`}
                  onChange={(e) => patch(v.id, (x) => { const { stock: _drop, ...rest } = x; const s = e.target.value.trim(); return /^\d+$/.test(s) ? { ...rest, stock: Number(s) } : rest; })}
                />
              </Field>
              <Field>
                <FieldLabel className="lg:sr-only">{t.imageCol}</FieldLabel>
                <Select
                  items={[{ value: NONE, label: t.noImage }, ...images.map((im, i) => ({ value: im.src, label: im.alt || `#${i + 1}` }))]}
                  value={v.image ?? NONE}
                  disabled={disabled || images.length === 0}
                  onValueChange={(val) => patch(v.id, (x) => { const { image: _drop, ...rest } = x; return val && val !== NONE ? { ...rest, image: val as string } : rest; })}
                >
                  <SelectTrigger aria-label={`${t.imageCol}: ${label}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t.noImage}</SelectItem>
                    {images.map((im, i) => (
                      <SelectItem key={im.src} value={im.src}>
                        <span className="flex items-center gap-2">
                          <Thumb src={im.src} alt="" size={20} />
                          {im.alt || `#${i + 1}`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
