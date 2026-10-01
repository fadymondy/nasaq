"use client";

import { CircleX, Save, Undo2 } from "lucide-react";
import { type ComponentProps, lazy, Suspense, useId, useMemo, useRef, useState } from "react";
import type { CommerceOption, CommerceVariant } from "../../lib/commerce";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { CurrencyInput } from "../currency-input";
import { currencyDecimals } from "../currency-input/currency-input-logic";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { Num } from "../numeric";
import { SeoPreview } from "../seo-preview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Skeleton } from "../states";
import { Switch } from "../switch";
import { TagInput } from "../tag-input";
import { DEFAULT_VARIANT_ID, draftChanged, emptyProductDraft, generateVariants, marginFromCost, type ProductDraft, slugify, validateProductDraft } from "./product-admin-logic";
import { failMessage, Money, type ProductAdminResult, type StoreProductsAdminLabels, useProductAdminStrings } from "./product-admin-shared";
import { MediaManager } from "./media-manager";
import { OptionsEditor, VariantMatrix } from "./variant-matrix";
import { useCurrency } from "../../provider/nasaq-provider";

const RichTextEditor = lazy(() => import("../rich-text-editor").then((m) => ({ default: m.RichTextEditor })));

export interface ProductEditorProps extends Omit<ComponentProps<"form">, "children" | "onSubmit"> {
  /** The product to edit. Omit for a new one. Build it with `productToDraft(product, { cost, … })`. */
  initial?: ProductDraft;
  /** ISO 4217 code of the store. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Origin of the storefront, for the search preview URL. */
  siteUrl?: string;
  /** Saves the draft. Resolve `{ error }` to show a message and keep the edits. */
  onSave: (draft: ProductDraft) => Promise<ProductAdminResult>;
  /** Called when the merchant discards edits or leaves without saving. */
  onCancel?: () => void;
  /** Suggestions for the brand, category and tag fields. */
  suggestions?: { brands?: readonly string[]; categories?: readonly string[]; tags?: readonly string[] };
  /** Stock at or below this is called low in hints. Default 5. */
  loading?: boolean;
  labels?: StoreProductsAdminLabels;
}

type Setter = (change: Partial<ProductDraft> | ((d: ProductDraft) => ProductDraft)) => void;

/**
 * The product editor: title and rich description, pictures with reorder and alt text, price with margin from cost,
 * inventory, options that build a variant matrix (per-variant price, compare-at, SKU, stock and image, with bulk
 * fill), brand, category and tags, a search listing preview, and status and visibility. Save is off until the
 * product is valid and has changed. Changing options keeps what you already typed on the variants that remain.
 */
export function ProductEditor({ initial, currency: currencyProp, siteUrl = "https://store.example", onSave, onCancel, suggestions, loading = false, labels, className, ...props }: ProductEditorProps) {
  const currency = useCurrency(currencyProp);
  const { t, n, locale } = useProductAdminStrings(labels);
  const uid = useId();
  const base = useRef<ProductDraft>(initial ?? emptyProductDraft());
  const [draft, setDraft] = useState<ProductDraft>(base.current);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const isNew = !base.current.id;
  const decimals = currencyDecimals(currency);

  const set: Setter = (change) => {
    setSaved(false);
    setDraft((d) => (typeof change === "function" ? change(d) : { ...d, ...change }));
  };

  const hasOptions = draft.options.some((o) => o.values.length > 0);
  const single = draft.variants[0] as CommerceVariant | undefined;
  const patchSingle = (change: Partial<CommerceVariant> | ((v: CommerceVariant) => CommerceVariant)) =>
    set((d) => ({ ...d, variants: d.variants.map((v, i) => (i === 0 ? (typeof change === "function" ? change(v) : { ...v, ...change }) : v)) }));
  const refPrice = hasOptions ? (draft.variants.length ? Math.min(...draft.variants.map((v) => v.price)) : null) : (single?.price ?? null);
  const margin = marginFromCost(refPrice && refPrice > 0 ? refPrice : null, draft.cost);

  const skuBase = (draft.slug || slugify(draft.title)).toUpperCase().slice(0, 12) || undefined;
  const changeOptions = (options: CommerceOption[]) => {
    set((d) => {
      const axes = options.filter((o) => o.values.length > 0);
      if (axes.length === 0) {
        const first = d.variants[0] ?? { id: DEFAULT_VARIANT_ID, options: {}, price: 0 };
        return { ...d, options, variants: [{ ...first, options: {} }] };
      }
      const first = d.variants[0];
      const r = generateVariants(options, d.variants, { defaults: { price: first?.price ?? 0, ...(first?.compareAt !== undefined ? { compareAt: first.compareAt } : {}), ...(first?.stock !== undefined ? { stock: first.stock } : {}), ...(first?.weightGrams !== undefined ? { weightGrams: first.weightGrams } : {}) }, ...(skuBase ? { skuBase } : {}) });
      setNote(r.dropped.length ? t.variantsRemoved(n(r.dropped.length)) : r.truncated ? t.variantsTruncated(n(100)) : null);
      return { ...d, options, variants: r.variants };
    });
  };

  const issues = useMemo(
    () => validateProductDraft({ title: draft.title, price: isNew && !hasOptions && (single?.price ?? 0) <= 0 ? null : (single?.price ?? 0), compareAt: single?.compareAt ?? null, options: draft.options.filter((o) => o.values.length > 0), variants: draft.variants, slug: draft.slug }),
    [draft, hasOptions, isNew, single],
  );
  const dirty = draftChanged(draft, base.current);
  const has = (code: string, variantId?: string) => issues.some((i) => i.code === code && (variantId === undefined || i.variantId === variantId));
  const issueList = [...new Set(issues.map((i) => i.code))];

  const seoUrl = `${siteUrl.replace(/\/$/, "")}/products/${draft.slug || slugify(draft.title) || "product"}`;
  const plain = draft.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const submit = async () => {
    setTouched(true);
    if (issues.length > 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await onSave(draft);
      if (r?.error) {
        setError(r.error);
        return;
      }
      base.current = draft;
      setSaved(true);
    } catch (e) {
      setError(failMessage(e, t.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div data-slot="product-editor" aria-busy className={cn("grid gap-4", className)}>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const pct = (bps: number) => <Num value={bps / 10000} format={{ style: "percent", maximumFractionDigits: 1 }} />;

  return (
    <form
      data-slot="product-editor"
      noValidate
      aria-label={isNew ? t.newProductTitle : t.editProduct}
      className={cn("flex min-w-0 flex-col gap-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      {...props}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.general}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field invalid={touched && has("title")}>
                <FieldLabel htmlFor={`${uid}-title`}>{t.title}</FieldLabel>
                <Input id={`${uid}-title`} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
                {touched && has("title") ? <FieldError match>{t.issues.title}</FieldError> : null}
              </Field>
              <div className="grid gap-1.5">
                <span id={`${uid}-desc`} className="text-label text-foreground">
                  {t.description}
                </span>
                <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                  <RichTextEditor aria-labelledby={`${uid}-desc`} value={draft.description} onValueChange={(html: string) => set({ description: html })} minHeight="9rem" />
                </Suspense>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.media}</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaManager images={draft.images} onImagesChange={(images) => set({ images })} labels={labels} />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.pricing}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!hasOptions && single ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field invalid={touched && has("price")}>
                    <FieldLabel>{t.price}</FieldLabel>
                    <CurrencyInput currency={currency} value={single.price} onValueChange={(p) => patchSingle({ price: p ?? 0 })} aria-label={t.price} />
                    {touched && has("price") ? <FieldError match>{t.issues.price}</FieldError> : null}
                  </Field>
                  <Field invalid={has("compare-at")}>
                    <FieldLabel>{t.compareAt}</FieldLabel>
                    <CurrencyInput currency={currency} value={single.compareAt ?? null} onValueChange={(p) => patchSingle((v) => { const { compareAt: _d, ...rest } = v; return p === null ? rest : { ...rest, compareAt: p }; })} aria-label={t.compareAt} />
                    {has("compare-at") ? <FieldError match>{t.issues["compare-at"]}</FieldError> : <FieldDescription>{t.compareAtHint}</FieldDescription>}
                  </Field>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t.cost}</FieldLabel>
                  <CurrencyInput currency={currency} value={draft.cost} onValueChange={(cost) => set({ cost })} aria-label={t.cost} />
                  <FieldDescription>{t.costHint}</FieldDescription>
                </Field>
                <div role="group" aria-label={t.margin} aria-live="polite" className="grid content-start gap-1 rounded-control border border-border bg-nq-surface-soft p-3">
                  {margin ? (
                    <dl className="grid grid-cols-3 gap-2 text-body-sm">
                      <div>
                        <dt className="text-caption text-muted-foreground">{t.profit}</dt>
                        <dd className="font-medium text-foreground">
                          <Money minor={margin.profit} currency={currency} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-caption text-muted-foreground">{t.margin}</dt>
                        <dd className={cn("font-medium", margin.marginBps < 0 ? "text-nq-danger-text" : "text-foreground")}>{pct(margin.marginBps)}</dd>
                      </div>
                      <div>
                        <dt className="text-caption text-muted-foreground">{t.markup}</dt>
                        <dd className="font-medium text-foreground">{margin.markupBps === null ? "—" : pct(margin.markupBps)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-body-sm text-muted-foreground">{t.noMargin}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {!hasOptions && single ? (
            <Card className="w-full">
              <CardHeader>
                <CardTitle as="h3">{t.inventory}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field invalid={has("sku-duplicate")}>
                    <FieldLabel htmlFor={`${uid}-sku`}>{t.sku}</FieldLabel>
                    <Input id={`${uid}-sku`} ltr className="font-mono uppercase" value={single.sku ?? ""} onChange={(e) => patchSingle((v) => { const { sku: _d, ...rest } = v; return e.target.value ? { ...rest, sku: e.target.value } : rest; })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${uid}-weight`}>{t.weight}</FieldLabel>
                    <Input id={`${uid}-weight`} ltr inputMode="numeric" value={single.weightGrams === undefined ? "" : String(single.weightGrams)} onChange={(e) => patchSingle((v) => { const { weightGrams: _d, ...rest } = v; return /^\d+$/.test(e.target.value.trim()) ? { ...rest, weightGrams: Number(e.target.value.trim()) } : rest; })} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-body-sm">
                  <Switch checked={single.stock !== undefined} onCheckedChange={(on) => patchSingle((v) => { const { stock: _d, ...rest } = v; return on ? { ...rest, stock: 0 } : rest; })} />
                  {t.trackStock}
                </label>
                {single.stock !== undefined ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`${uid}-stock`}>{t.stockQty}</FieldLabel>
                      <Input id={`${uid}-stock`} ltr inputMode="numeric" value={String(single.stock)} onChange={(e) => patchSingle({ stock: /^\d+$/.test(e.target.value.trim()) ? Number(e.target.value.trim()) : 0 })} />
                    </Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-body-sm">
                      <Switch checked={Boolean(single.allowBackorder)} onCheckedChange={(on) => patchSingle({ allowBackorder: on })} />
                      {t.backorder}
                    </label>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.optionsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <OptionsEditor options={draft.options} onOptionsChange={changeOptions} labels={labels} />
              {note ? (
                <Alert tone="warning" role="status" onDismiss={() => setNote(null)}>
                  {note}
                </Alert>
              ) : null}
              {hasOptions ? (
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-h4 text-foreground">{t.variantsTitle}</h4>
                    <Badge variant="neutral">{t.variantsSummary(n(draft.variants.length))}</Badge>
                  </div>
                  <VariantMatrix options={draft.options.filter((o) => o.values.length > 0)} variants={draft.variants} onVariantsChange={(variants) => set({ variants })} currency={currency} images={draft.images} labels={labels} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.seo}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field invalid={has("slug")}>
                <FieldLabel htmlFor={`${uid}-slug`}>{t.slug}</FieldLabel>
                <Input id={`${uid}-slug`} ltr value={draft.slug} placeholder={slugify(draft.title)} onChange={(e) => set({ slug: e.target.value })} />
                {has("slug") ? <FieldError match>{t.issues.slug}</FieldError> : <FieldDescription>{t.slugHint}</FieldDescription>}
              </Field>
              <SeoPreview
                value={{ title: draft.seoTitle || draft.title, description: draft.seoDescription || plain.slice(0, 160), url: seoUrl, ...(draft.images[0] ? { image: draft.images[0].src } : {}) }}
                onValueChange={(v) => set({ seoTitle: v.title, seoDescription: v.description })}
                editable
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:self-start">
          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.statusSection}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field>
                <FieldLabel>{t.statusCol}</FieldLabel>
                <Select items={(["active", "draft", "archived"] as const).map((s) => ({ value: s, label: t.statuses[s] }))} value={draft.status} onValueChange={(v) => v && set({ status: v as ProductDraft["status"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["active", "draft", "archived"] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t.statuses[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{t.statusHint[draft.status]}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>{t.visibility}</FieldLabel>
                <Select items={[{ value: "visible", label: t.visible }, { value: "hidden", label: t.hidden }]} value={draft.visibility} onValueChange={(v) => v && set({ visibility: v as ProductDraft["visibility"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visible">{t.visible}</SelectItem>
                    <SelectItem value="hidden">{t.hidden}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.organization}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field>
                <FieldLabel htmlFor={`${uid}-brand`}>{t.brand}</FieldLabel>
                <Input id={`${uid}-brand`} value={draft.brand} list={suggestions?.brands ? `${uid}-brands` : undefined} onChange={(e) => set({ brand: e.target.value })} />
                {suggestions?.brands ? <datalist id={`${uid}-brands`}>{suggestions.brands.map((b) => <option key={b} value={b} />)}</datalist> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${uid}-cat`}>{t.category}</FieldLabel>
                <Input id={`${uid}-cat`} value={draft.category} list={suggestions?.categories ? `${uid}-cats` : undefined} onChange={(e) => set({ category: e.target.value })} />
                {suggestions?.categories ? <datalist id={`${uid}-cats`}>{suggestions.categories.map((c) => <option key={c} value={c} />)}</datalist> : null}
              </Field>
              <Field>
                <FieldLabel id={`${uid}-tags`}>{t.tags}</FieldLabel>
                <TagInput aria-labelledby={`${uid}-tags`} value={draft.tags} placeholder={t.tagsPlaceholder} suggestions={suggestions?.tags} onValueChange={(tags) => set({ tags })} />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      <div data-slot="product-editor-bar" className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <div className="min-w-0 text-body-sm" role="status" aria-live="polite">
          {error ? (
            <span className="flex items-center gap-2 text-nq-danger-text">
              <CircleX aria-hidden className="size-4 shrink-0" />
              {error}
            </span>
          ) : touched && issueList.length > 0 ? (
            <span className="text-nq-danger-text">{t.fixIssues(n(issueList.length))}: {issueList.map((c) => t.issues[c]).join(" ")}</span>
          ) : dirty ? (
            <span className="text-nq-warning-text">{t.unsaved}</span>
          ) : saved ? (
            <span className="text-nq-success-text">{t.allSaved}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={saving || (!dirty && !onCancel)}
            onClick={() => {
              if (dirty) {
                setDraft(base.current);
                setTouched(false);
                setError(null);
                setNote(null);
              } else onCancel?.();
            }}
          >
            <Undo2 aria-hidden />
            {t.discard}
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty && !isNew}>
            <Save aria-hidden />
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>
      <span hidden data-decimals={decimals} data-locale={locale} />
    </form>
  );
}
