"use client";

import { CircleX, MapPin, Pencil, Plus, Store, Trash2, Truck } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { ContextMenuActions } from "../context-menu";
import { CurrencyInput } from "../currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Switch } from "../switch";
import { TagInput } from "../tag-input";
import {
  overlappingCountries,
  type PickupLocation,
  type ShippingRate,
  type ShippingRateType,
  type ShippingTier,
  type ShippingZone,
  resolveShippingOptions,
  tierIssues,
} from "./shipping-logic";
import { Money, regionName, type SettingsResult, type StoreSettingsLabels, uid, useAction, useSettingsStrings } from "./store-settings-shared";
import { useCurrency } from "../../provider/nasaq-provider";

const RATE_TYPES: ShippingRateType[] = ["flat", "weight", "price", "free-over"];
const COMMON_COUNTRIES = ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "MA", "US", "GB", "DE", "FR", "*"];

const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
const normCodes = (codes: string[]) => [...new Set(codes.map((c) => c.trim().toUpperCase()).filter((c) => c === "*" || /^[A-Z]{2}$/.test(c)))];

export interface ShippingSettingsProps extends Omit<ComponentProps<"section">, "children"> {
  zones: readonly ShippingZone[];
  pickups?: readonly PickupLocation[];
  /** ISO 4217 code of the store. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Saves a new or changed zone with its rates. New zones arrive with a fresh `id`. Resolve `{ error }` to keep the editor open. */
  onSaveZone: (zone: ShippingZone) => Promise<SettingsResult>;
  onDeleteZone?: (zone: ShippingZone) => Promise<SettingsResult>;
  onSavePickup?: (pickup: PickupLocation) => Promise<SettingsResult>;
  onDeletePickup?: (pickup: PickupLocation) => Promise<SettingsResult>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: StoreSettingsLabels;
}

/**
 * Shipping zones and rates (flat, by weight, by price, free over a threshold) and local pickup points. A "try a
 * destination" panel runs the same resolver checkout uses, so a merchant sees exactly what a customer would be
 * offered for a country, a city, a cart total and a weight. Money is integer minor units, weight is grams.
 */
export function ShippingSettings({ zones, pickups = [], currency: currencyProp, onSaveZone, onDeleteZone, onSavePickup, onDeletePickup, loading = false, error, onRetry, labels, className, ...props }: ShippingSettingsProps) {
  const currency = useCurrency(currencyProp);
  const { t, locale, n } = useSettingsStrings(labels);
  const [zone, setZone] = useState<ShippingZone | null>(null);
  const [pickup, setPickup] = useState<PickupLocation | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "zone" | "pickup"; id: string; name: string } | null>(null);
  const action = useAction(t.saveFailed);
  const overlaps = overlappingCountries(zones);

  if (error) return <ErrorState title={t.loadFailed} description={error} {...(onRetry ? { onRetry } : {})} />;
  if (loading) {
    return (
      <div aria-busy className="grid gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const newZone = () => (action.setError(null), setZone({ id: uid("zone"), name: "", countries: [], rates: [] }));
  const newPickup = () => (action.setError(null), setPickup({ id: uid("pickup"), name: "", address: "", country: "EG", active: true }));
  const regions = (codes: string[]) => codes.map((c) => (c === "*" ? t.restOfWorld : regionName(locale, c))).join(", ");

  return (
    <section data-slot="shipping-settings" aria-label={t.shipping} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-foreground">{t.zones}</h2>
        <Button variant="primary" onClick={newZone}>
          <Plus aria-hidden />
          {t.addZone}
        </Button>
      </div>

      {overlaps.length > 0 ? (
        <Alert tone="warning" title={t.overlapTitle}>
          {t.overlapBody(overlaps.map((c) => (c === "*" ? t.restOfWorld : regionName(locale, c))).join(", "))}
        </Alert>
      ) : null}
      {action.error && !zone && !pickup && !deleting ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {action.error}
        </p>
      ) : null}

      {zones.length === 0 ? (
        <EmptyState icon={Truck} title={t.zonesEmpty} description={t.zonesEmptyHint} actions={<Button onClick={newZone}>{t.addZone}</Button>} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {zones.map((z) => {
            const actions = [
              { id: "edit", label: t.edit, icon: Pencil, onSelect: () => (action.setError(null), setZone(z)) },
              ...(onDeleteZone ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (action.setError(null), setDeleting({ kind: "zone" as const, id: z.id, name: z.name })) }] : []),
            ];
            return (
              <li key={z.id} className="min-w-0">
                <ContextMenuActions actions={actions} render={<div className="h-full rounded-card" />}>
                  <Card className="h-full w-full">
                    <CardHeader>
                      <CardTitle as="h3" className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate">{z.name}</span>
                        <Button size="sm" variant="secondary" onClick={() => (action.setError(null), setZone(z))}>
                          <Pencil aria-hidden />
                          {t.edit}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
                        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                        <span className="min-w-0">
                          {regions(z.countries)}
                          {z.cities?.length ? ` · ${z.cities.join(", ")}` : ""}
                        </span>
                      </p>
                      {z.rates.length === 0 ? (
                        <p className="text-body-sm text-muted-foreground">{t.noRates}</p>
                      ) : (
                        <ul className="grid gap-1.5">
                          {z.rates.map((r) => (
                            <li key={r.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-medium text-foreground">{r.label}</span>
                                <Badge variant="neutral">{t.rateTypes[r.type]}</Badge>
                                {r.express ? <Badge variant="accent">{t.express}</Badge> : null}
                                {r.active === false ? <Badge variant="outline">{t.off}</Badge> : null}
                              </span>
                              <RateSummary rate={r} currency={currency} t={t} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </ContextMenuActions>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <h2 className="text-h3 text-foreground">{t.pickup}</h2>
        {onSavePickup ? (
          <Button variant="secondary" onClick={newPickup}>
            <Plus aria-hidden />
            {t.addPickup}
          </Button>
        ) : null}
      </div>
      {pickups.length === 0 ? (
        <EmptyState icon={Store} title={t.pickupEmpty} description={t.pickupEmptyHint} className="border-dashed" />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {pickups.map((p) => {
            const actions = [
              ...(onSavePickup ? [{ id: "edit", label: t.edit, icon: Pencil, onSelect: () => (action.setError(null), setPickup(p)) }] : []),
              ...(onDeletePickup ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (action.setError(null), setDeleting({ kind: "pickup" as const, id: p.id, name: p.name })) }] : []),
            ];
            return (
              <li key={p.id} className="min-w-0">
                <ContextMenuActions actions={actions} render={<div className="h-full rounded-card" />}>
                  <Card className="h-full w-full">
                    <CardContent className="flex min-w-0 items-start justify-between gap-3 pt-4">
                      <div className="grid min-w-0 gap-0.5">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <span className="truncate">{p.name}</span>
                          {p.active === false ? <Badge variant="outline">{t.off}</Badge> : null}
                        </p>
                        <p className="text-body-sm text-muted-foreground">{p.address}</p>
                        <p className="text-caption text-muted-foreground">
                          {regionName(locale, p.country)}
                          {p.city ? ` · ${p.city}` : ""}
                          {p.readyInHours !== undefined ? ` · ${t.readyIn(n(p.readyInHours))}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-body-sm font-medium text-foreground">{(p.fee ?? 0) === 0 ? t.free : <Money minor={p.fee ?? 0} currency={currency} />}</div>
                    </CardContent>
                  </Card>
                </ContextMenuActions>
              </li>
            );
          })}
        </ul>
      )}

      <DestinationTester zones={zones} pickups={pickups} currency={currency} labels={labels} />

      {zone ? (
        <ZoneEditor
          key={zone.id}
          zone={zone}
          isNew={!zones.some((z) => z.id === zone.id)}
          currency={currency}
          busy={action.busy}
          error={action.error}
          labels={labels}
          onCancel={() => setZone(null)}
          onSave={(z) => void action.run(() => onSaveZone(z)).then((ok) => ok && setZone(null))}
        />
      ) : null}
      {pickup && onSavePickup ? (
        <PickupEditor
          key={pickup.id}
          pickup={pickup}
          isNew={!pickups.some((p) => p.id === pickup.id)}
          currency={currency}
          busy={action.busy}
          error={action.error}
          labels={labels}
          onCancel={() => setPickup(null)}
          onSave={(p) => void action.run(() => onSavePickup(p)).then((ok) => ok && setPickup(null))}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !action.busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleting?.kind === "pickup" ? t.deletePickupTitle : t.deleteZoneTitle}</DialogTitle>
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
            <Button
              variant="danger"
              loading={action.busy}
              onClick={() => {
                if (!deleting) return;
                const target = deleting;
                const job = target.kind === "zone" ? zones.find((z) => z.id === target.id) && onDeleteZone ? () => onDeleteZone(zones.find((z) => z.id === target.id) as ShippingZone) : null : pickups.find((p) => p.id === target.id) && onDeletePickup ? () => onDeletePickup(pickups.find((p) => p.id === target.id) as PickupLocation) : null;
                if (job) void action.run(job).then((ok) => ok && setDeleting(null));
              }}
            >
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RateSummary({ rate, currency, t }: { rate: ShippingRate; currency: string; t: ReturnType<typeof useSettingsStrings>["t"] }) {
  const eta = rate.etaDays ? <span className="text-caption text-muted-foreground">{t.etaDays(rate.etaDays[0], rate.etaDays[1])}</span> : null;
  let price: ReactNode;
  switch (rate.type) {
    case "flat":
      price = (rate.amount ?? 0) === 0 ? t.free : <Money minor={rate.amount ?? 0} currency={currency} />;
      break;
    case "free-over":
      price = (
        <span>
          {t.freeOver} <Money minor={rate.freeOver ?? 0} currency={currency} />
        </span>
      );
      break;
    default:
      price = t.tiersCount(String(rate.tiers?.length ?? 0));
  }
  return (
    <span className="flex items-center gap-2">
      {eta}
      <span className="font-medium text-foreground">{price}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ zone editor */

function ZoneEditor({ zone, isNew, currency, busy, error, labels, onCancel, onSave }: { zone: ShippingZone; isNew: boolean; currency: string; busy: boolean; error: string | null; labels?: StoreSettingsLabels; onCancel: () => void; onSave: (z: ShippingZone) => void }) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const [name, setName] = useState(zone.name);
  const [countries, setCountries] = useState(zone.countries);
  const [cities, setCities] = useState(zone.cities ?? []);
  const [rates, setRates] = useState<ShippingRate[]>(zone.rates);
  const [touched, setTouched] = useState(false);

  const rateProblem = (r: ShippingRate) => !r.label.trim() || ((r.type === "weight" || r.type === "price") && tierIssues(r.tiers ?? []).length > 0);
  const problems = [!name.trim() && t.zoneNameRequired, normCodes(countries).length === 0 && t.countriesRequired, rates.some(rateProblem) && t.fixRates].filter(Boolean) as string[];
  const patch = (rid: string, change: Partial<ShippingRate> | ((r: ShippingRate) => ShippingRate)) => setRates((cur) => cur.map((r) => (r.id === rid ? (typeof change === "function" ? change(r) : { ...r, ...change }) : r)));

  const addRate = () => setRates((cur) => [...cur, { id: uid("rate"), label: "", type: "flat", amount: 0, active: true }]);
  const setType = (r: ShippingRate, type: ShippingRateType): ShippingRate => {
    const { tiers: _t, freeOver: _f, amount: _a, ...rest } = r;
    switch (type) {
      case "flat":
        return { ...rest, type, amount: 0 };
      case "free-over":
        return { ...rest, type, freeOver: 0, amount: 0 };
      case "weight":
        return { ...rest, type, tiers: [{ min: 0, max: 1000, amount: 0 }, { min: 1000, amount: 0 }] };
      case "price":
        return { ...rest, type, tiers: [{ min: 0, max: 10000, amount: 0 }, { min: 10000, amount: 0 }] };
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (problems.length > 0) return;
            const c = cities.map((x) => x.trim()).filter(Boolean);
            const { cities: _c, ...base } = zone;
            onSave({ ...base, name: name.trim(), countries: normCodes(countries), ...(c.length ? { cities: c } : {}), rates });
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? t.addZone : name || t.editZone}</DialogTitle>
            <DialogDescription>{t.zoneHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && !name.trim()}>
            <FieldLabel htmlFor={`${id}-name`}>{t.zoneName}</FieldLabel>
            <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && normCodes(countries).length === 0}>
              <FieldLabel id={`${id}-countries`}>{t.countries}</FieldLabel>
              <TagInput aria-labelledby={`${id}-countries`} value={countries} suggestions={COMMON_COUNTRIES} placeholder={t.countriesPlaceholder} onValueChange={(v) => setCountries(v.map((c) => c.toUpperCase()))} />
              <FieldDescription>{t.countriesHint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel id={`${id}-cities`}>{t.cities}</FieldLabel>
              <TagInput aria-labelledby={`${id}-cities`} value={cities} placeholder={t.citiesPlaceholder} onValueChange={setCities} />
              <FieldDescription>{t.citiesHint}</FieldDescription>
            </Field>
          </div>

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-h4 text-foreground">{t.rates}</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addRate}>
              <Plus aria-hidden />
              {t.addRate}
            </Button>
          </div>
          {rates.length === 0 ? <p className="text-body-sm text-muted-foreground">{t.noRates}</p> : null}
          <ul className="grid gap-3">
            {rates.map((r, i) => (
              <li key={r.id} className="grid gap-3 rounded-card border border-border bg-card p-3" data-slot="rate-editor">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                  <Field invalid={touched && !r.label.trim()}>
                    <FieldLabel htmlFor={`${id}-rl-${r.id}`}>{t.rateName}</FieldLabel>
                    <Input id={`${id}-rl-${r.id}`} value={r.label} placeholder={t.rateNamePlaceholder} onChange={(e) => patch(r.id, { label: e.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel>{t.rateType}</FieldLabel>
                    <Select items={RATE_TYPES.map((x) => ({ value: x, label: t.rateTypes[x] }))} value={r.type} onValueChange={(v) => v && patch(r.id, (cur) => setType(cur, v as ShippingRateType))}>
                      <SelectTrigger aria-label={t.rateType}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATE_TYPES.map((x) => (
                          <SelectItem key={x} value={x}>
                            {t.rateTypes[x]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button type="button" variant="ghost" size="icon" className="self-end" aria-label={t.removeRate(String(i + 1))} onClick={() => setRates((cur) => cur.filter((x) => x.id !== r.id))}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>

                {r.type === "flat" ? (
                  <Field>
                    <FieldLabel>{t.price}</FieldLabel>
                    <CurrencyInput currency={currency} value={r.amount ?? 0} onValueChange={(v) => patch(r.id, { amount: v ?? 0 })} aria-label={t.price} />
                  </Field>
                ) : null}
                {r.type === "free-over" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>{t.freeOverAmount}</FieldLabel>
                      <CurrencyInput currency={currency} value={r.freeOver ?? 0} onValueChange={(v) => patch(r.id, { freeOver: v ?? 0 })} aria-label={t.freeOverAmount} />
                    </Field>
                    <Field>
                      <FieldLabel>{t.belowPrice}</FieldLabel>
                      <CurrencyInput currency={currency} value={r.amount ?? null} onValueChange={(v) => patch(r.id, (cur) => { const { amount: _a, ...rest } = cur; return v === null ? rest : { ...rest, amount: v }; })} aria-label={t.belowPrice} />
                      <FieldDescription>{t.belowPriceHint}</FieldDescription>
                    </Field>
                  </div>
                ) : null}
                {r.type === "weight" || r.type === "price" ? <TierEditor type={r.type} tiers={r.tiers ?? []} currency={currency} onChange={(tiers) => patch(r.id, { tiers })} labels={labels} showIssues={touched || (r.tiers ?? []).length > 0} /> : null}

                <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,8rem))_1fr] sm:items-end">
                  <Field>
                    <FieldLabel htmlFor={`${id}-e1-${r.id}`}>{t.etaFrom}</FieldLabel>
                    <Input id={`${id}-e1-${r.id}`} ltr inputMode="numeric" value={r.etaDays ? String(r.etaDays[0]) : ""} onChange={(e) => patch(r.id, (cur) => setEta(cur, toInt(e.target.value), undefined))} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-e2-${r.id}`}>{t.etaTo}</FieldLabel>
                    <Input id={`${id}-e2-${r.id}`} ltr inputMode="numeric" value={r.etaDays ? String(r.etaDays[1]) : ""} onChange={(e) => patch(r.id, (cur) => setEta(cur, undefined, toInt(e.target.value)))} />
                  </Field>
                  <div className="flex flex-wrap items-center gap-4 pb-1.5">
                    <label className="flex items-center gap-2 text-body-sm">
                      <Switch checked={Boolean(r.express)} onCheckedChange={(on) => patch(r.id, { express: on })} />
                      {t.express}
                    </label>
                    <label className="flex items-center gap-2 text-body-sm">
                      <Switch checked={r.active !== false} onCheckedChange={(on) => patch(r.id, { active: on })} />
                      {t.active}
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {(touched && problems.length > 0) || error ? (
            <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
              <CircleX aria-hidden className="size-4 shrink-0" />
              {error ?? problems.join(" ")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.saveZone}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function setEta(rate: ShippingRate, from: number | undefined, to: number | undefined): ShippingRate {
  const cur = rate.etaDays ?? [0, 0];
  const next: [number, number] = [from ?? cur[0], to ?? cur[1]];
  if (next[1] < next[0]) next[1] = next[0];
  const { etaDays: _e, ...rest } = rate;
  return next[0] === 0 && next[1] === 0 && from === undefined && to === undefined ? rest : { ...rest, etaDays: next };
}

/* ------------------------------------------------------------------ tiers */

function TierEditor({ type, tiers, currency, onChange, labels, showIssues }: { type: "weight" | "price"; tiers: ShippingTier[]; currency: string; onChange: (tiers: ShippingTier[]) => void; labels?: StoreSettingsLabels; showIssues: boolean }) {
  const { t, n } = useSettingsStrings(labels);
  const issues = tierIssues(tiers);
  const set = (i: number, change: Partial<ShippingTier> | ((x: ShippingTier) => ShippingTier)) => onChange(tiers.map((x, k) => (k === i ? (typeof change === "function" ? change(x) : { ...x, ...change }) : x)));
  const unit = type === "weight" ? t.grams : "";
  const add = () => {
    const sorted = [...tiers].sort((a, b) => a.min - b.min);
    const last = sorted[sorted.length - 1];
    const start = last ? (last.max ?? last.min + (type === "weight" ? 1000 : 10000)) : 0;
    onChange([...sorted.map((x, i) => (i === sorted.length - 1 && x.max === undefined ? { ...x, max: start } : x)), { min: start, amount: 0 }]);
  };

  return (
    <div className="grid gap-2" data-slot="tier-editor">
      <p className="text-label text-foreground">{type === "weight" ? t.weightTiers : t.priceTiers}</p>
      <ul className="grid gap-2">
        {tiers.map((tier, i) => (
          <li key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Field>
              <FieldLabel className="text-caption">{t.tierFrom}</FieldLabel>
              {type === "weight" ? (
                <Input ltr inputMode="numeric" aria-label={`${t.tierFrom} ${unit}`} value={String(tier.min)} onChange={(e) => set(i, { min: toInt(e.target.value) ?? 0 })} />
              ) : (
                <CurrencyInput currency={currency} value={tier.min} onValueChange={(v) => set(i, { min: v ?? 0 })} aria-label={t.tierFrom} />
              )}
            </Field>
            <Field>
              <FieldLabel className="text-caption">{t.tierTo}</FieldLabel>
              {type === "weight" ? (
                <Input ltr inputMode="numeric" aria-label={`${t.tierTo} ${unit}`} value={tier.max === undefined ? "" : String(tier.max)} placeholder={t.andAbove} onChange={(e) => set(i, (x) => { const { max: _m, ...rest } = x; const v = toInt(e.target.value); return v === undefined ? rest : { ...rest, max: v }; })} />
              ) : (
                <CurrencyInput currency={currency} value={tier.max ?? null} onValueChange={(v) => set(i, (x) => { const { max: _m, ...rest } = x; return v === null ? rest : { ...rest, max: v }; })} aria-label={t.tierTo} placeholder={t.andAbove} />
              )}
            </Field>
            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel className="text-caption">{t.tierPrice}</FieldLabel>
              <CurrencyInput currency={currency} value={tier.amount} onValueChange={(v) => set(i, { amount: v ?? 0 })} aria-label={t.tierPrice} />
            </Field>
            <Button type="button" variant="ghost" size="icon" className="justify-self-end" aria-label={t.removeTier(n(i + 1))} onClick={() => onChange(tiers.filter((_, k) => k !== i))}>
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus aria-hidden />
          {t.addTier}
        </Button>
        {showIssues && issues.length > 0 ? (
          <p role="status" className="text-caption text-nq-danger-text">
            {issues.map((x) => t.tierIssues[x]).join(" ")}
          </p>
        ) : null}
      </div>
      {type === "weight" ? <p className="text-caption text-muted-foreground">{t.weightUnitHint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ pickup editor */

function PickupEditor({ pickup, isNew, currency, busy, error, labels, onCancel, onSave }: { pickup: PickupLocation; isNew: boolean; currency: string; busy: boolean; error: string | null; labels?: StoreSettingsLabels; onCancel: () => void; onSave: (p: PickupLocation) => void }) {
  const { t, locale } = useSettingsStrings(labels);
  const id = useId();
  const [name, setName] = useState(pickup.name);
  const [address, setAddress] = useState(pickup.address);
  const [country, setCountry] = useState(pickup.country);
  const [city, setCity] = useState(pickup.city ?? "");
  const [fee, setFee] = useState(pickup.fee ?? 0);
  const [ready, setReady] = useState(pickup.readyInHours === undefined ? "" : String(pickup.readyInHours));
  const [active, setActive] = useState(pickup.active !== false);
  const [touched, setTouched] = useState(false);
  const bad = !name.trim() || !address.trim() || !/^[A-Za-z]{2}$/.test(country.trim());
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (bad) return;
            const hours = toInt(ready);
            const { city: _c, fee: _f, readyInHours: _r, ...base } = pickup;
            onSave({ ...base, name: name.trim(), address: address.trim(), country: country.trim().toUpperCase(), ...(city.trim() ? { city: city.trim() } : {}), ...(fee > 0 ? { fee } : {}), ...(hours !== undefined ? { readyInHours: hours } : {}), active });
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? t.addPickup : name || t.editPickup}</DialogTitle>
            <DialogDescription>{t.pickupHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && !name.trim()}>
            <FieldLabel htmlFor={`${id}-n`}>{t.pickupName}</FieldLabel>
            <Input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field invalid={touched && !address.trim()}>
            <FieldLabel htmlFor={`${id}-a`}>{t.address}</FieldLabel>
            <Input id={`${id}-a`} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && !/^[A-Za-z]{2}$/.test(country.trim())}>
              <FieldLabel htmlFor={`${id}-c`}>{t.country}</FieldLabel>
              <Input id={`${id}-c`} ltr maxLength={2} className="uppercase" value={country} onChange={(e) => setCountry(e.target.value)} />
              <FieldDescription>{/^[A-Za-z]{2}$/.test(country.trim()) ? regionName(locale, country) : t.countryHint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-city`}>{t.city}</FieldLabel>
              <Input id={`${id}-city`} value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>{t.pickupFee}</FieldLabel>
              <CurrencyInput currency={currency} value={fee} onValueChange={(v) => setFee(v ?? 0)} aria-label={t.pickupFee} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-r`}>{t.readyInHoursLabel}</FieldLabel>
              <Input id={`${id}-r`} ltr inputMode="numeric" value={ready} onChange={(e) => setReady(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <Switch checked={active} onCheckedChange={setActive} />
            {t.active}
          </label>
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
              {t.savePickup}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ destination tester */

function DestinationTester({ zones, pickups, currency, labels }: { zones: readonly ShippingZone[]; pickups: readonly PickupLocation[]; currency: string; labels?: StoreSettingsLabels }) {
  const { t } = useSettingsStrings(labels);
  const id = useId();
  const [country, setCountry] = useState(() => zones.flatMap((z) => z.countries).find((c) => c !== "*") ?? "EG");
  const [city, setCity] = useState("");
  const [subtotal, setSubtotal] = useState(50000);
  const [grams, setGrams] = useState("800");
  const result = useMemo(
    () => resolveShippingOptions(zones, pickups, { country: country.trim(), ...(city.trim() ? { city: city.trim() } : {}) }, { subtotal, weightGrams: toInt(grams) ?? 0 }),
    [zones, pickups, country, city, subtotal, grams],
  );
  const validCountry = /^[A-Za-z]{2}$/.test(country.trim());
  return (
    <Card className="w-full" data-slot="shipping-tester">
      <CardHeader>
        <CardTitle as="h3">{t.tryDestination}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor={`${id}-c`}>{t.country}</FieldLabel>
            <Input id={`${id}-c`} ltr maxLength={2} className="uppercase" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-city`}>{t.city}</FieldLabel>
            <Input id={`${id}-city`} value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>{t.cartTotal}</FieldLabel>
            <CurrencyInput currency={currency} value={subtotal} onValueChange={(v) => setSubtotal(v ?? 0)} aria-label={t.cartTotal} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-w`}>{t.cartWeight}</FieldLabel>
            <Input id={`${id}-w`} ltr inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} />
          </Field>
        </div>
        <div role="status" aria-live="polite" className="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
          <p className="text-body-sm text-muted-foreground">{!validCountry ? t.countryHint : result.zone ? t.servedBy(result.zone.name) : t.noZone}</p>
          {result.options.length > 0 ? (
            <ul className="grid gap-1.5">
              {result.options.map((o) => (
                <li key={o.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-body-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {o.kind === "pickup" ? <Store aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : <Truck aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate font-medium text-foreground">{o.label}</span>
                    {o.kind === "express" ? <Badge variant="accent">{t.express}</Badge> : null}
                    {o.kind === "pickup" ? <Badge variant="neutral">{t.pickupBadge}</Badge> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    {o.etaDays ? <span className="text-caption text-muted-foreground">{t.etaDays(o.etaDays[0], o.etaDays[1])}</span> : null}
                    <span className="font-medium text-foreground">{o.free ? t.free : <Money minor={o.amount} currency={currency} />}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : validCountry ? (
            <p className="text-body-sm text-nq-danger-text">{t.noOptions}</p>
          ) : null}
          {result.hidden.length > 0 ? (
            <ul className="grid gap-0.5 border-t border-border pt-2 text-caption text-muted-foreground">
              {result.hidden.map((h) => {
                const rate = result.zone?.rates.find((r) => r.id === h.rateId);
                return (
                  <li key={h.rateId}>
                    {rate?.label}: {t.unavailable[h.reason]}
                    {h.remaining !== undefined ? <> · {t.spendMore} <Money minor={h.remaining} currency={currency} /></> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
