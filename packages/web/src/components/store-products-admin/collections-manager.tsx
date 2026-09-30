"use client";

import { ArrowDown, ArrowUp, CircleX, FolderPlus, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import type { CommerceProduct } from "../../lib/commerce";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { ContextMenuActions } from "../context-menu";
import { currencyDecimals } from "../currency-input/currency-input-logic";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { Num } from "../numeric";
import { RuleBuilder } from "../rule-builder";
import { newGroup, type RuleDefinition, type RuleField, ruleUid } from "../rule-builder/rule-model";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { COLLECTION_FIELDS, type CollectionDef, type CollectionKind, matchCollection, moveItem } from "./product-admin-logic";
import { failMessage, type ProductAdminResult, type StoreProductsAdminLabels, Thumb, useProductAdminStrings } from "./product-admin-shared";

const EVENT = "product";
const ACTION = "add";

const toRule = (conditions: CollectionDef["conditions"]): RuleDefinition => ({ event: EVENT, conditions: conditions ?? newGroup("and"), actions: [{ id: "a-collection", type: ACTION, config: {} }] });

export interface CollectionsManagerProps extends Omit<ComponentProps<"section">, "children"> {
  collections: readonly CollectionDef[];
  /** The whole catalogue, for the manual picker and the live match preview. */
  products: readonly CommerceProduct[];
  /** ISO 4217 code. Prices in rules are typed in major units of it. */
  currency: string;
  /** Saves a new or changed collection. New ones arrive with a fresh `id`. Resolve `{ error }` to keep the editor open. */
  onSave: (collection: CollectionDef) => Promise<ProductAdminResult>;
  onDelete?: (collection: CollectionDef) => Promise<ProductAdminResult>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: StoreProductsAdminLabels;
}

/**
 * The collections of the store: each is manual (products picked and ordered by hand) or rule-based (a `RuleBuilder`
 * condition tree over tag, brand, category, title, price, stock, sale and status). While you edit, the products that
 * match are listed live, so a rule is checked before it is saved. Rule prices are typed in major units.
 */
export function CollectionsManager({ collections, products, currency, onSave, onDelete, loading = false, error, onRetry, labels, className, ...props }: CollectionsManagerProps) {
  const { t, n } = useProductAdminStrings(labels);
  const minorPerMajor = 10 ** currencyDecimals(currency);
  const [editing, setEditing] = useState<CollectionDef | null>(null);
  const [deleting, setDeleting] = useState<CollectionDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const guard = async (fn: () => Promise<ProductAdminResult>): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fn();
      if (r?.error) {
        setNotice(r.error);
        return false;
      }
      return true;
    } catch (e) {
      setNotice(failMessage(e, t.saveFailed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => new Map(collections.map((c) => [c.id, matchCollection(products, c, { minorPerMajor }).length])), [collections, products, minorPerMajor]);

  if (error) return <ErrorState title={t.loadFailed} description={error} {...(onRetry ? { onRetry } : {})} />;
  if (loading) {
    return (
      <div aria-busy className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const create = () => {
    setNotice(null);
    setEditing({ id: ruleUid("col"), title: "", kind: "manual", productIds: [] });
  };

  return (
    <section data-slot="collections-manager" aria-label={t.collectionsLabel} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-foreground">{t.collections}</h2>
        <Button variant="primary" onClick={create}>
          <Plus aria-hidden />
          {t.newCollection}
        </Button>
      </div>

      {notice && !editing && !deleting ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {notice}
        </p>
      ) : null}

      {collections.length === 0 ? (
        <EmptyState icon={Layers} title={t.collectionsEmpty} description={t.collectionsEmptyHint} actions={<Button onClick={create}>{t.newCollection}</Button>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((c) => {
            const list = matchCollection(products, c, { minorPerMajor });
            const actions = [
              { id: "edit", label: t.edit, icon: Pencil, onSelect: () => (setNotice(null), setEditing(c)) },
              ...(onDelete ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (setNotice(null), setDeleting(c)) }] : []),
            ];
            return (
              <li key={c.id} className="min-w-0">
                <ContextMenuActions actions={actions} render={<div className="h-full rounded-card" />}>
                  <Card className="h-full w-full">
                    <CardHeader>
                      <CardTitle as="h3" className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate">{c.title}</span>
                        <Badge variant={c.kind === "rules" ? "info" : "neutral"}>{c.kind === "rules" ? t.rules : t.manual}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <div className="flex -space-x-2 rtl:space-x-reverse" aria-hidden>
                        {list.slice(0, 5).map((p) => (
                          <Thumb key={p.id} src={p.images[0]?.src} alt="" size={32} className="rounded-full ring-2 ring-card" />
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-sm text-muted-foreground">{t.productsCount(n(list.length))}</span>
                        <Button size="sm" variant="secondary" onClick={() => (setNotice(null), setEditing(c))}>
                          <Pencil aria-hidden />
                          {t.edit}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ContextMenuActions>
              </li>
            );
          })}
        </ul>
      )}
      <span hidden data-count={counts.size} />

      {editing ? (
        <CollectionEditor
          key={editing.id}
          collection={editing}
          isNew={!collections.some((c) => c.id === editing.id)}
          products={products}
          currency={currency}
          minorPerMajor={minorPerMajor}
          busy={busy}
          error={notice}
          labels={labels}
          onCancel={() => setEditing(null)}
          onSave={(c) => void guard(() => onSave(c)).then((ok) => ok && setEditing(null))}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteCollectionTitle}</DialogTitle>
            <DialogDescription>{t.deleteCollectionDescription(deleting?.title ?? "")}</DialogDescription>
          </DialogHeader>
          {notice ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {notice}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => deleting && onDelete && void guard(() => onDelete(deleting)).then((ok) => ok && setDeleting(null))}>
              {t.deleteCollection}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ------------------------------------------------------------------ editor */

function CollectionEditor({ collection, isNew, products, currency, minorPerMajor, busy, error, labels, onCancel, onSave }: { collection: CollectionDef; isNew: boolean; products: readonly CommerceProduct[]; currency: string; minorPerMajor: number; busy: boolean; error: string | null; labels?: StoreProductsAdminLabels; onCancel: () => void; onSave: (c: CollectionDef) => void }) {
  const { t, n } = useProductAdminStrings(labels);
  const uid = useId();
  const [title, setTitle] = useState(collection.title);
  const [kind, setKind] = useState<CollectionKind>(collection.kind);
  const [ids, setIds] = useState<string[]>(collection.productIds ?? []);
  const [conditions, setConditions] = useState(collection.conditions ?? newGroup("and"));
  const [touched, setTouched] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  const draft: CollectionDef = { id: collection.id, title: title.trim(), kind, ...(kind === "manual" ? { productIds: ids } : { conditions }) };
  const matches = useMemo(() => matchCollection(products, { kind, productIds: ids, conditions }, { minorPerMajor, includeInactive: kind === "manual" }), [products, kind, ids, conditions, minorPerMajor]);
  const fields: RuleField[] = useMemo(
    () =>
      COLLECTION_FIELDS.map((id): RuleField => {
        const label = t.fields[id];
        if (id === "price" || id === "stock") return { id, label, kind: "number" };
        if (id === "onSale") return { id, label, kind: "boolean" };
        if (id === "status") return { id, label, kind: "select", options: (["active", "draft", "archived"] as const).map((s) => ({ value: s, label: t.statuses[s] })) };
        return { id, label, kind: "text" };
      }),
    [t],
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const available = products.filter((p) => !ids.includes(p.id));
  const invalid = !title.trim();

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!invalid) onSave(draft);
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? t.newCollection : collection.title || t.editCollection}</DialogTitle>
            <DialogDescription>{kind === "manual" ? t.manualHint : t.rulesHint}</DialogDescription>
          </DialogHeader>

          <Field invalid={touched && invalid}>
            <FieldLabel htmlFor={`${uid}-title`}>{t.collectionTitle}</FieldLabel>
            <Input id={`${uid}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Tabs value={kind} onValueChange={(v) => setKind(v as CollectionKind)}>
            <TabsList aria-label={t.kindLabel}>
              <TabsTab value="manual">{t.manual}</TabsTab>
              <TabsTab value="rules">{t.rules}</TabsTab>
            </TabsList>
            <TabsPanel value="manual" className="grid gap-3 pt-3">
              <Select items={available.map((p) => ({ value: p.id, label: p.name }))} value={pick} onValueChange={(v) => v && (setIds((cur) => [...cur, v]), setPick(null))}>
                <SelectTrigger aria-label={t.addProduct}>
                  <SelectValue placeholder={t.pickProduct} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ids.length === 0 ? (
                <EmptyState icon={FolderPlus} title={t.matchNone} className="border-dashed" />
              ) : (
                <ol aria-label={t.matchPreviewLabel} className="grid gap-1.5">
                  {ids.map((id, i) => {
                    const p = byId.get(id);
                    return (
                      <li key={id} className="flex min-w-0 items-center gap-2 rounded-control border border-border bg-card p-1.5">
                        <Thumb src={p?.images[0]?.src} alt="" size={32} />
                        <span className="min-w-0 flex-1 truncate text-body-sm">{p?.name ?? id}</span>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveUp} disabled={i === 0} onClick={() => setIds((cur) => moveItem(cur, i, i - 1))}>
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveDown} disabled={i === ids.length - 1} onClick={() => setIds((cur) => moveItem(cur, i, i + 1))}>
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.removeFromCollection} onClick={() => setIds((cur) => cur.filter((x) => x !== id))}>
                          <X aria-hidden />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </TabsPanel>
            <TabsPanel value="rules" className="grid gap-3 pt-3">
              <RuleBuilder
                events={[{ id: EVENT, label: t.ruleAnyProduct }]}
                fields={fields}
                actionTypes={[{ id: ACTION, label: t.ruleAction }]}
                value={toRule(conditions)}
                onValueChange={(r) => setConditions(r.conditions)}
                labels={{
                  when: t.ruleEventLabel,
                  whenHelp: t.ruleEventHelp,
                  ifTitle: t.ruleIfTitle,
                  ifHelp: t.ruleIfHelp,
                  thenTitle: t.ruleThenTitle,
                  thenHelp: t.ruleThenHelp,
                  noConditions: t.rulesHint,
                  sentence: { when: (e: string) => `${t.ruleEventLabel} ${e}`, ifWord: t.ruleWhere, then: t.ruleSo, noConditions: t.matchNone, and: t.and, or: t.or },
                }}
              />
            </TabsPanel>
          </Tabs>

          <div role="status" aria-live="polite" data-slot="collection-preview" className="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
            <p className="text-label text-foreground">{matches.length ? t.matchPreview(n(matches.length)) : t.matchNone}</p>
            {matches.length > 0 ? (
              <ul aria-label={t.matchPreviewLabel} className="grid gap-1 sm:grid-cols-2">
                {matches.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex min-w-0 items-center gap-2 text-body-sm">
                    <Thumb src={p.images[0]?.src} alt="" size={24} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-caption text-muted-foreground" dir="ltr">
                      {p.variants[0] ? <Num value={p.variants[0].price / minorPerMajor} format={{ style: "currency", currency }} /> : null}
                    </span>
                  </li>
                ))}
                {matches.length > 8 ? <li className="text-caption text-muted-foreground">+{n(matches.length - 8)}</li> : null}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
              <CircleX aria-hidden className="size-4 shrink-0" />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.saveCollection}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
