// nqShippingSettings, nqTaxSettings, nqDiscountsManager, nqDiscountSimulator, nqGiftCardsManager and nqGiftCardField: the store-settings screens.
// The markup (<x-nq::store-settings.*>) is rendered by Blade; the state, the editors and the pure commerce logic live here.
//
//   <section data-slot="shipping-settings"  x-data="nqShippingSettings(config)"> … </section>
//   <section data-slot="tax-settings"       x-data="nqTaxSettings(config)"> … </section>
//   <section data-slot="discounts-manager"  x-data="nqDiscountsManager(config)"> … </section>
//   <div     data-slot="discount-simulator" x-data="nqDiscountSimulator(config)"> … </div>
//   <section data-slot="gift-cards-manager" x-data="nqGiftCardsManager(config)"> … </section>
//   <section data-slot="gift-card-field"    x-data="nqGiftCardField(config)"> … </section>
//
// Money is integer minor units, rates and percentages are basis points. Every save fires a bubbling, cancelable event on the root;
// whoever handles it calls waitUntil(promise), resolve() or reject(message) (a resolved `{ error }` also keeps the editor open):
//   "nq-shipping-save-zone" { zone }, "nq-shipping-delete-zone" { zone }, "nq-shipping-save-pickup" { pickup }, "nq-shipping-delete-pickup" { pickup }
//   "nq-tax-save" { rate }, "nq-tax-delete" { rate }
//   "nq-discount-save" { discount }, "nq-discount-delete" { discount }
//   "nq-giftcard-issue" { card }, "nq-giftcard-update" { card }
//   "nq-giftcard-lookup" { code }      the field waits for a card (or `{ error }`); unclaimed, it looks in config.known
//   "nq-giftcard-change" { cards, applied, covered, remaining }   not cancelable: the field's list or split changed
// Nobody claimed it: the change is applied to the local list. A claimed one keeps the dialog busy until it settles.

import { formatMoney } from "../core/money";
import { commerceToMajor } from "./store-settings-commerce";
import { evaluateDiscounts, discountStanding, duplicateDiscountCodes, normalizeDiscountCode, type Discount, type DiscountLine } from "./store-settings-discount-logic";
import {
  adjustGiftCard,
  applyGiftCards,
  generateGiftCardCode,
  giftCardBalance,
  giftCardStatus,
  initialValue,
  isValidGiftCardCode,
  issueGiftCard,
  ledgerIssues,
  maskGiftCardCode,
  normalizeGiftCardCode,
  redeemGiftCard,
  type GiftCard,
} from "./store-settings-gift-card-logic";
import { overlappingCountries, resolveShippingOptions, tierIssues, type PickupLocation, type ShippingRate, type ShippingRateType, type ShippingZone } from "./store-settings-shipping-logic";
import { bpsToPercent, percentToBps, regionName, settingsStrings, uid } from "./store-settings-strings";
import { duplicateTaxRegions, orderTax, splitTax, taxRateFor, type TaxRate } from "./store-settings-tax-logic";
import type { Register } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any> & ThisType<any>;

const loc = (locale?: string) => (locale && locale.startsWith("ar") ? "ar" : "en");
const latn = (locale: string) => `${locale}-u-nu-latn`;
const toInt = (v: unknown): number | undefined => (/^\d+$/.test(String(v ?? "").trim()) ? Number(String(v).trim()) : undefined);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const keyOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (key: string) => new Date(`${key}T00:00:00`).toISOString();
const endOfDay = (key: string) => new Date(`${key}T23:59:59`).toISOString();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const upsert = <T extends { id: string }>(list: T[], item: T): T[] => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
const hasIds = (m: Record<string, boolean>) => Object.keys(m).some((k) => m[k]);
const idsOf = (m: Record<string, boolean>) => Object.keys(m).filter((k) => m[k]);
const mapOf = (all: { id: string }[], ids: readonly string[] | undefined) => Object.fromEntries(all.map((x) => [x.id, (ids ?? []).includes(x.id)])) as Record<string, boolean>;

/** Dispatch a cancelable change event. `claimed` says whether a handler took it; `result` is what it resolved with. A rejection throws. */
async function emit(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<{ claimed: boolean; result: unknown }> {
  let claimed: Promise<unknown> | null = null;
  const claim = (p: Promise<unknown>) => (claimed = claimed ?? p);
  root.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail: {
        ...detail,
        waitUntil: (p: Promise<unknown>) => void claim(Promise.resolve(p)),
        resolve: () => void claim(Promise.resolve()),
        reject: (message?: string) => void claim(Promise.reject(new Error(message ?? ""))),
      },
    }),
  );
  return claimed ? { claimed: true, result: await claimed } : { claimed: false, result: undefined };
}

const errorOf = (result: unknown): string => (result && typeof result === "object" && "error" in result ? String((result as { error?: string }).error ?? "") : "");

/** What every screen shares: words, money, dates and the busy/failed save runner. */
function base(config: { currency?: string; locale?: string; now?: string; labels?: Record<string, any> }): Data {
  const locale = loc(config.locale);
  const currency = (config.currency ?? (locale === "ar" ? "SAR" : "USD")).toUpperCase();
  return {
    locale,
    currency,
    t: settingsStrings(locale, config.labels as any),
    today: config.now ? new Date(config.now) : new Date(),
    busy: false,
    failed: "",
    touched: false,
    money(minor: number, code?: string) {
      const c = code ?? this.currency;
      return formatMoney(commerceToMajor(minor, c), { currency: c, locale: this.locale });
    },
    n(v: number) {
      return new Intl.NumberFormat(latn(this.locale)).format(v);
    },
    pct(bps: number) {
      return new Intl.NumberFormat(latn(this.locale), { style: "percent", maximumFractionDigits: 2 }).format(bps / 10000);
    },
    day(iso: string, withTime = false) {
      return new Intl.DateTimeFormat(latn(this.locale), withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(iso));
    },
    region(code: string) {
      return code === "*" ? this.t.restOfWorld : regionName(this.locale, code);
    },
    /** Fires `name` on the root, shows a failure under the editor and runs `apply` when nobody claimed the event. */
    async run(name: string, detail: Record<string, unknown>, apply: () => void): Promise<boolean> {
      if (this.busy) return false;
      this.busy = true;
      this.failed = "";
      try {
        const { claimed, result } = await emit(this.$root as HTMLElement, name, detail);
        const err = claimed ? errorOf(result) : "";
        if (err) {
          this.failed = err;
          return false;
        }
        if (!claimed) apply();
        return true;
      } catch (e) {
        this.failed = (e as Error).message || this.t.saveFailed;
        return false;
      } finally {
        this.busy = false;
      }
    },
  };
}

/* ------------------------------------------------------------------ shipping */

interface RateDraft {
  id: string;
  label: string;
  type: ShippingRateType;
  amount: number | null;
  freeOver: number | null;
  tiers: { min: number | string; max: number | string | null; amount: number | null }[];
  etaFrom: string;
  etaTo: string;
  express: boolean;
  active: boolean;
}

const rateToDraft = (r: ShippingRate): RateDraft => ({
  id: r.id,
  label: r.label,
  type: r.type,
  amount: r.amount ?? (r.type === "free-over" ? null : 0),
  freeOver: r.freeOver ?? 0,
  tiers: (r.tiers ?? []).map((x) => ({ min: x.min, max: x.max ?? null, amount: x.amount })),
  etaFrom: r.etaDays ? String(r.etaDays[0]) : "",
  etaTo: r.etaDays ? String(r.etaDays[1]) : "",
  express: Boolean(r.express),
  active: r.active !== false,
});

function draftToRate(d: RateDraft): ShippingRate {
  const out: ShippingRate = { id: d.id, label: d.label.trim(), type: d.type };
  if (d.type === "flat") out.amount = num(d.amount) ?? 0;
  if (d.type === "free-over") {
    out.freeOver = num(d.freeOver) ?? 0;
    if (num(d.amount) !== null) out.amount = num(d.amount) as number;
  }
  if (d.type === "weight" || d.type === "price") {
    out.tiers = d.tiers.map((x) => ({ min: num(x.min) ?? 0, amount: num(x.amount) ?? 0, ...(num(x.max) !== null ? { max: num(x.max) as number } : {}) }));
  }
  const from = toInt(d.etaFrom);
  const to = toInt(d.etaTo);
  if (from !== undefined || to !== undefined) {
    const a = from ?? 0;
    out.etaDays = [a, Math.max(to ?? 0, a)];
  }
  if (d.express) out.express = true;
  out.active = d.active;
  return out;
}

const tiersOf = (r: RateDraft) => r.tiers.map((x) => ({ min: num(x.min) ?? 0, amount: num(x.amount) ?? 0, ...(num(x.max) !== null ? { max: num(x.max) as number } : {}) }));
const rateBad = (r: RateDraft) => !r.label.trim() || ((r.type === "weight" || r.type === "price") && tierIssues(tiersOf(r)).length > 0);
const normCodes = (codes: string[]) => [...new Set(codes.map((c) => String(c).trim().toUpperCase()).filter((c) => c === "*" || /^[A-Z]{2}$/.test(c)))];

function shippingSettings(config: any): Data {
  const data: Data = {
    ...base(config),
    zones: (config.zones ?? []).map((z: ShippingZone) => clone(z)) as ShippingZone[],
    pickups: (config.pickups ?? []).map((p: PickupLocation) => clone(p)) as PickupLocation[],
    canDeleteZone: Boolean(config.canDeleteZone),
    canSavePickup: Boolean(config.canSavePickup),
    canDeletePickup: Boolean(config.canDeletePickup),
    zoneOpen: false,
    zoneIsNew: false,
    zone: { id: "", name: "", countries: [] as string[], cities: [] as string[], rates: [] as RateDraft[] },
    pickupOpen: false,
    pickupIsNew: false,
    pk: { id: "", name: "", address: "", country: "EG", city: "", fee: 0 as number | null, ready: "", active: true },
    deleteOpen: false,
    deleting: { kind: "zone", id: "", name: "" },
    listError: "",
    // the destination tester
    tCountry: ((config.zones ?? []) as ShippingZone[]).flatMap((z) => z.countries).find((c) => c !== "*") ?? "EG",
    tCity: "",
    tSubtotal: 50000 as number | null,
    tGrams: "800",
    get overlapText(): string {
      return this.t.overlapBody(overlappingCountries(this.zones).map((c: string) => this.region(c)).join(", "));
    },
    get hasOverlap(): boolean {
      return overlappingCountries(this.zones).length > 0;
    },
    zoneRegions(z: ShippingZone): string {
      return z.countries.map((c) => this.region(c)).join(", ") + (z.cities?.length ? ` · ${z.cities.join(", ")}` : "");
    },
    rateTypeText(r: ShippingRate): string {
      return this.t.rateTypes[r.type];
    },
    rateEta(r: { etaDays?: [number, number] }): string {
      return r.etaDays ? this.t.etaDays(r.etaDays[0], r.etaDays[1]) : "";
    },
    rateAmount(r: ShippingRate): string {
      if (r.type === "flat") return (r.amount ?? 0) === 0 ? this.t.free : this.money(r.amount ?? 0);
      if (r.type === "free-over") return `${this.t.freeOver} ${this.money(r.freeOver ?? 0)}`;
      return this.t.tiersCount(String(r.tiers?.length ?? 0));
    },
    pickupMeta(p: PickupLocation): string {
      return `${regionName(this.locale, p.country)}${p.city ? ` · ${p.city}` : ""}${p.readyInHours !== undefined ? ` · ${this.t.readyIn(this.n(p.readyInHours))}` : ""}`;
    },
    pickupFee(p: PickupLocation): string {
      return (p.fee ?? 0) === 0 ? this.t.free : this.money(p.fee ?? 0);
    },
    /* ---- zone editor ---- */
    openZone(z?: ShippingZone) {
      this.failed = "";
      this.touched = false;
      this.zoneIsNew = !z;
      const src: ShippingZone = z ?? { id: uid("zone"), name: "", countries: [], rates: [] };
      this.zone = { id: src.id, name: src.name, countries: [...src.countries], cities: [...(src.cities ?? [])], rates: src.rates.map(rateToDraft) };
      this.zoneOpen = true;
    },
    get zoneProblems(): string[] {
      const z = this.zone;
      return [!z.name.trim() && this.t.zoneNameRequired, normCodes(z.countries).length === 0 && this.t.countriesRequired, z.rates.some(rateBad) && this.t.fixRates].filter(Boolean) as string[];
    },
    get zoneNameBad(): boolean {
      return this.touched && !this.zone.name.trim();
    },
    get countriesBad(): boolean {
      return this.touched && normCodes(this.zone.countries).length === 0;
    },
    get zoneError(): string {
      return this.failed || (this.touched ? this.zoneProblems.join(" ") : "");
    },
    addRate() {
      this.zone.rates.push({ id: uid("rate"), label: "", type: "flat", amount: 0, freeOver: 0, tiers: [], etaFrom: "", etaTo: "", express: false, active: true });
    },
    removeRate(id: string) {
      this.zone.rates = this.zone.rates.filter((r: RateDraft) => r.id !== id);
    },
    setType(r: RateDraft, type: ShippingRateType) {
      r.type = type;
      if (type === "flat") r.amount = 0;
      if (type === "free-over") {
        r.freeOver = 0;
        r.amount = null;
      }
      if (type === "weight") r.tiers = [{ min: 0, max: 1000, amount: 0 }, { min: 1000, max: null, amount: 0 }];
      if (type === "price") r.tiers = [{ min: 0, max: 10000, amount: 0 }, { min: 10000, max: null, amount: 0 }];
    },
    addTier(r: RateDraft) {
      const sorted = [...r.tiers].sort((a, b) => (num(a.min) ?? 0) - (num(b.min) ?? 0));
      const last = sorted[sorted.length - 1];
      const start = last ? (num(last.max) ?? (num(last.min) ?? 0) + (r.type === "weight" ? 1000 : 10000)) : 0;
      if (last && num(last.max) === null) last.max = start;
      r.tiers = [...sorted, { min: start, max: null, amount: 0 }];
    },
    removeTier(r: RateDraft, i: number) {
      r.tiers = r.tiers.filter((_: unknown, k: number) => k !== i);
    },
    tierProblem(r: RateDraft): string {
      return r.type === "weight" || r.type === "price" ? tierIssues(tiersOf(r)).map((x) => this.t.tierIssues[x]).join(" ") : "";
    },
    rateBad(r: RateDraft): boolean {
      return this.touched && !r.label.trim();
    },
    async saveZone() {
      this.touched = true;
      if (this.zoneProblems.length > 0) return;
      const z = this.zone;
      const cities = z.cities.map((c: string) => c.trim()).filter(Boolean);
      const out: ShippingZone = { id: z.id, name: z.name.trim(), countries: normCodes(z.countries), ...(cities.length ? { cities } : {}), rates: z.rates.map(draftToRate) };
      if (await this.run("nq-shipping-save-zone", { zone: out }, () => (this.zones = upsert(this.zones, out)))) this.zoneOpen = false;
    },
    /* ---- pickup editor ---- */
    openPickup(p?: PickupLocation) {
      if (!this.canSavePickup) return;
      this.failed = "";
      this.touched = false;
      this.pickupIsNew = !p;
      const src: PickupLocation = p ?? { id: uid("pickup"), name: "", address: "", country: "EG", active: true };
      this.pk = { id: src.id, name: src.name, address: src.address, country: src.country, city: src.city ?? "", fee: src.fee ?? 0, ready: src.readyInHours === undefined ? "" : String(src.readyInHours), active: src.active !== false };
      this.pickupOpen = true;
    },
    get pkCountryOk(): boolean {
      return /^[A-Za-z]{2}$/.test(this.pk.country.trim());
    },
    get pkCountryHint(): string {
      return this.pkCountryOk ? regionName(this.locale, this.pk.country) : this.t.countryHint;
    },
    get pkBad(): boolean {
      return !this.pk.name.trim() || !this.pk.address.trim() || !this.pkCountryOk;
    },
    async savePickup() {
      this.touched = true;
      if (this.pkBad) return;
      const p = this.pk;
      const hours = toInt(p.ready);
      const fee = num(p.fee) ?? 0;
      const out: PickupLocation = {
        id: p.id,
        name: p.name.trim(),
        address: p.address.trim(),
        country: p.country.trim().toUpperCase(),
        ...(p.city.trim() ? { city: p.city.trim() } : {}),
        ...(fee > 0 ? { fee } : {}),
        ...(hours !== undefined ? { readyInHours: hours } : {}),
        active: p.active,
      };
      if (await this.run("nq-shipping-save-pickup", { pickup: out }, () => (this.pickups = upsert(this.pickups, out)))) this.pickupOpen = false;
    },
    /* ---- delete ---- */
    askZone(z: { id: string; name: string }) {
      this.askDelete("zone", z);
    },
    askPickup(p: { id: string; name: string }) {
      this.askDelete("pickup", p);
    },
    askDelete(kind: "zone" | "pickup", item: { id: string; name: string }) {
      if (kind === "zone" ? !this.canDeleteZone : !this.canDeletePickup) return;
      this.failed = "";
      this.deleting = { kind, id: item.id, name: item.name };
      this.deleteOpen = true;
    },
    get deleteTitle(): string {
      return this.deleting.kind === "pickup" ? this.t.deletePickupTitle : this.t.deleteZoneTitle;
    },
    get deleteText(): string {
      return this.t.deleteBody(this.deleting.name);
    },
    async confirmDelete() {
      const d = this.deleting;
      const zone = d.kind === "zone" ? this.zones.find((z: ShippingZone) => z.id === d.id) : undefined;
      const pickup = d.kind === "pickup" ? this.pickups.find((p: PickupLocation) => p.id === d.id) : undefined;
      if (!zone && !pickup) return;
      const ok = zone
        ? await this.run("nq-shipping-delete-zone", { zone }, () => (this.zones = this.zones.filter((z: ShippingZone) => z.id !== d.id)))
        : await this.run("nq-shipping-delete-pickup", { pickup }, () => (this.pickups = this.pickups.filter((p: PickupLocation) => p.id !== d.id)));
      if (ok) this.deleteOpen = false;
    },
    /* ---- the destination tester ---- */
    get tCountryOk(): boolean {
      return /^[A-Za-z]{2}$/.test(String(this.tCountry).trim());
    },
    get test() {
      return resolveShippingOptions(this.zones, this.pickups, { country: String(this.tCountry).trim(), ...(String(this.tCity).trim() ? { city: String(this.tCity).trim() } : {}) }, { subtotal: num(this.tSubtotal) ?? 0, weightGrams: toInt(this.tGrams) ?? 0 });
    },
    get testNote(): string {
      const r = this.test;
      return !this.tCountryOk ? this.t.countryHint : r.zone ? this.t.servedBy(r.zone.name) : this.t.noZone;
    },
    get testOptions() {
      return this.test.options.map((o: any) => ({ ...o, priceText: o.free ? this.t.free : this.money(o.amount), etaText: o.etaDays ? this.t.etaDays(o.etaDays[0], o.etaDays[1]) : "" }));
    },
    get testNone(): boolean {
      return this.tCountryOk && this.test.options.length === 0;
    },
    get testHidden() {
      const r = this.test;
      return r.hidden.map((h: any) => ({
        id: h.rateId,
        text: `${r.zone?.rates.find((x: ShippingRate) => x.id === h.rateId)?.label ?? ""}: ${this.t.unavailable[h.reason as "inactive"]}`,
        more: h.remaining !== undefined ? `${this.t.spendMore} ${this.money(h.remaining)}` : "",
      }));
    },
  };
  return data;
}

/* ------------------------------------------------------------------ tax */

function taxSettings(config: any): Data {
  const blank = (): TaxRate => ({ id: uid("tax"), name: "", country: "EG", bps: 1400, inclusive: true, onShipping: true, active: true });
  const data: Data = {
    ...base(config),
    rates: (config.rates ?? []).map((r: TaxRate) => clone(r)) as TaxRate[],
    canDelete: Boolean(config.canDelete),
    query: "",
    editorOpen: false,
    isNew: false,
    d: { id: "", name: "", country: "EG", region: "", percent: "14", inclusive: true, onShipping: true, active: true },
    deleteOpen: false,
    target: null as TaxRate | null,
    listError: "",
    // the calculator
    cCountry: ((config.rates ?? []) as TaxRate[]).find((r) => r.active !== false)?.country ?? "EG",
    cRegion: "",
    cGoods: 100000 as number | null,
    cShipping: 5000 as number | null,
    get dupesText(): string {
      return this.t.taxOverlapBody(duplicateTaxRegions(this.rates).join(", "));
    },
    get hasDupes(): boolean {
      return duplicateTaxRegions(this.rates).length > 0;
    },
    keyOf(r: TaxRate): string {
      return `${r.country.toUpperCase()}${r.region ? `/${r.region}` : ""}`;
    },
    get visible(): TaxRate[] {
      const q = this.query.trim().toLowerCase();
      return [...this.rates].filter((r: TaxRate) => !q || `${r.name} ${r.country} ${r.region ?? ""}`.toLowerCase().includes(q)).sort((a: TaxRate, b: TaxRate) => this.keyOf(a).localeCompare(this.keyOf(b)));
    },
    regionText(r: TaxRate): string {
      return `${regionName(this.locale, r.country)}${r.region ? ` · ${r.region}` : ""}`;
    },
    modeText(r: TaxRate): string {
      return r.inclusive ? this.t.inclusive : this.t.exclusive;
    },
    statusText(r: TaxRate): string {
      return r.active === false ? this.t.off : this.t.on;
    },
    /* ---- editor ---- */
    openEditor(r?: TaxRate) {
      this.failed = "";
      this.touched = false;
      this.isNew = !r;
      const x = r ?? blank();
      this.d = { id: x.id, name: x.name, country: x.country, region: x.region ?? "", percent: bpsToPercent(x.bps), inclusive: x.inclusive, onShipping: Boolean(x.onShipping), active: x.active !== false };
      this.editorOpen = true;
    },
    get bps(): number | undefined {
      return percentToBps(String(this.d.percent));
    },
    get countryOk(): boolean {
      return /^[A-Za-z]{2}$/.test(String(this.d.country).trim());
    },
    get countryHint(): string {
      return this.countryOk ? regionName(this.locale, this.d.country) : this.t.countryHint;
    },
    get rateHint(): string {
      return this.bps === undefined ? this.t.rateInvalid : this.t.bpsIs(String(this.bps));
    },
    get nameBad(): boolean {
      return this.touched && !this.d.name.trim();
    },
    get countryBad(): boolean {
      return this.touched && !this.countryOk;
    },
    get percentBad(): boolean {
      return this.touched && this.bps === undefined;
    },
    get bad(): boolean {
      return !this.d.name.trim() || !this.countryOk || this.bps === undefined;
    },
    async save() {
      this.touched = true;
      if (this.bad || this.bps === undefined) return;
      const d = this.d;
      const prev = this.rates.find((r: TaxRate) => r.id === d.id);
      const { region: _r, ...rest } = prev ?? ({ id: d.id } as TaxRate);
      const out: TaxRate = { ...rest, id: d.id, name: d.name.trim(), country: d.country.trim().toUpperCase(), ...(d.region.trim() ? { region: d.region.trim() } : {}), bps: this.bps, inclusive: d.inclusive, onShipping: d.onShipping, active: d.active };
      if (await this.run("nq-tax-save", { rate: out }, () => (this.rates = upsert(this.rates, out)))) this.editorOpen = false;
    },
    async toggle(r: TaxRate) {
      this.listError = "";
      const out = { ...r, active: r.active === false };
      await this.run("nq-tax-save", { rate: out }, () => (this.rates = upsert(this.rates, out)));
      this.listError = this.failed;
    },
    openDelete(r: TaxRate) {
      if (!this.canDelete) return;
      this.failed = "";
      this.target = r;
      this.deleteOpen = true;
    },
    get deleteText(): string {
      return this.t.deleteBody(this.target?.name ?? "");
    },
    async confirmDelete() {
      const r = this.target as TaxRate | null;
      if (!r) return;
      if (await this.run("nq-tax-delete", { rate: r }, () => (this.rates = this.rates.filter((x: TaxRate) => x.id !== r.id)))) this.deleteOpen = false;
    },
    /* ---- the calculator ---- */
    get cRate(): TaxRate | undefined {
      return taxRateFor(this.rates.filter((r: TaxRate) => r.active !== false), { country: String(this.cCountry).trim(), ...(String(this.cRegion).trim() ? { region: String(this.cRegion).trim() } : {}) });
    },
    get cTax() {
      return orderTax({ goods: num(this.cGoods) ?? 0, shipping: num(this.cShipping) ?? 0, rate: this.cRate });
    },
    get cSplit() {
      const r = this.cRate as TaxRate | undefined;
      return r ? splitTax((num(this.cGoods) ?? 0) + (r.onShipping ? (num(this.cShipping) ?? 0) : 0), r.bps, r.inclusive) : undefined;
    },
    get cHead(): string {
      const r = this.cRate as TaxRate | undefined;
      return r ? `${r.name} · ${this.pct(r.bps)} · ${r.inclusive ? this.t.inclusive : this.t.exclusive}` : "";
    },
  };
  return data;
}

/* ------------------------------------------------------------------ discounts */

/** The basket simulator: state and getters shared by the standalone simulator and the one inside the discounts manager. */
function simulator(config: any): Data {
  const products = (config.products ?? []) as any[];
  return {
    simQty: Object.fromEntries(products.slice(0, 2).map((p, i) => [p.id, i + 1])) as Record<string, number>,
    simShipping: 5000 as number | null,
    simCodes: "",
    simOrders: "0",
    get simProducts() {
      return this.products.slice(0, 8).map((p: any) => ({ id: p.id, name: p.name, price: p.variants?.[0]?.price ?? 0 }));
    },
    bump(id: string, by: number) {
      this.simQty = { ...this.simQty, [id]: Math.max(0, (this.simQty[id] ?? 0) + by) };
    },
    qtyText(id: string): string {
      return this.n(this.simQty[id] ?? 0);
    },
    get simLines(): DiscountLine[] {
      return this.products
        .filter((p: any) => (this.simQty[p.id] ?? 0) > 0 && p.variants?.[0])
        .map((p: any) => {
          const v = p.variants[0];
          return {
            id: p.id,
            productId: p.id,
            collectionIds: this.collections.filter((c: any) => c.productIds.includes(p.id)).map((c: any) => c.id),
            unitPrice: v.price ?? 0,
            quantity: this.simQty[p.id] ?? 0,
            ...(v.compareAt !== undefined ? { compareAt: v.compareAt } : {}),
          };
        });
    },
    get simResult() {
      const codes = this.simCodes.split(/[\s,]+/).map(normalizeDiscountCode).filter(Boolean);
      return evaluateDiscounts(this.simSource(), { lines: this.simLines, shipping: num(this.simShipping) ?? 0, codes, now: this.today, customer: { ordersCount: Number(this.simOrders) || 0 } });
    },
    get simEmpty(): boolean {
      return this.simLines.length === 0;
    },
    get simTotal(): string {
      const r = this.simResult;
      return this.money(r.goodsAfter + r.shippingAfter);
    },
    get simApplied() {
      return this.simResult.applied.map((a: any) => ({ id: a.id, title: a.title, capped: Boolean(a.capped), free: a.freeUnits !== undefined, freeText: a.freeUnits !== undefined ? this.t.freeUnits(this.n(a.freeUnits)) : "", amount: this.money(a.amount) }));
    },
    get simRejected() {
      return this.simResult.rejected.map((r: any) => ({ id: r.id, text: `${r.title}: ${this.t.rejections[r.reason as "inactive"]}${r.with ? ` (${this.simSource().find((d: Discount) => d.id === r.with)?.title ?? r.with})` : ""}` }));
    },
    get simShippingText(): string {
      return this.money(num(this.simShipping) ?? 0);
    },
    get simShippingAfter(): string {
      return this.money(this.simResult.shippingAfter);
    },
    get simShippingCut(): boolean {
      return this.simResult.shippingDiscount > 0;
    },
    get simSubtotal(): string {
      return this.money(this.simResult.subtotal);
    },
    get simNothing(): boolean {
      return this.simResult.applied.length === 0;
    },
    onOrders() {
      this.simOrders = String(this.simOrders).replace(/\D/g, "");
    },
  };
}

const withMixin = (data: Data, mixin: Data): Data => Object.defineProperties(data, Object.getOwnPropertyDescriptors(mixin));

/** The editor draft of a discount: plain strings and flag maps the form binds to. */
function draftOf(x: Discount, products: any[], collections: any[]): Record<string, any> {
  const b = x.bxgy;
  return {
    id: x.id,
    title: x.title,
    method: x.method,
    code: x.code ?? "",
    kind: x.kind,
    pct: x.kind === "percentage" ? bpsToPercent(x.value ?? 0) : "10",
    amount: x.kind === "fixed" ? (x.value ?? 0) : 10000,
    perItem: Boolean(x.perItem),
    maxDiscount: x.maxDiscount ?? null,
    scope: { p: mapOf(products, x.scope?.productIds), c: mapOf(collections, x.scope?.collectionIds) },
    excludeOnSale: Boolean(x.excludeOnSale),
    buyQty: String(b?.buyQty ?? 2),
    getQty: String(b?.getQty ?? 1),
    getPct: bpsToPercent(b?.getPercentBps ?? 10000),
    maxSets: b?.maxSets === undefined ? "" : String(b.maxSets),
    buy: { p: mapOf(products, b?.buyScope?.productIds), c: mapOf(collections, b?.buyScope?.collectionIds) },
    get: { p: mapOf(products, b?.getScope?.productIds), c: mapOf(collections, b?.getScope?.collectionIds) },
    minSubtotal: x.minSubtotal ?? null,
    minQuantity: x.minQuantity === undefined ? "" : String(x.minQuantity),
    custMode: x.customers?.mode ?? "all",
    segments: [...(x.customers?.segments ?? [])],
    customerIds: [...(x.customers?.customerIds ?? [])],
    firstOrderOnly: Boolean(x.firstOrderOnly),
    startsOn: x.startsAt ? keyOf(new Date(x.startsAt)) : null,
    endsOn: x.endsAt ? keyOf(new Date(x.endsAt)) : null,
    limitTotal: x.limits?.total === undefined ? "" : String(x.limits.total),
    limitCustomer: x.limits?.perCustomer === undefined ? "" : String(x.limits.perCustomer),
    combines: { product: Boolean(x.combinesWith?.product), order: Boolean(x.combinesWith?.order), shipping: Boolean(x.combinesWith?.shipping) },
  };
}

function discountsManager(config: any): Data {
  const products = (config.products ?? []) as any[];
  const collections = (config.collections ?? []) as any[];
  const blank = (): Discount => ({ id: uid("disc"), title: "", method: "automatic", kind: "percentage", value: 1000, active: true, combinesWith: {} });
  const MANAGED = ["code", "value", "perItem", "maxDiscount", "scope", "excludeOnSale", "bxgy", "minSubtotal", "minQuantity", "customers", "firstOrderOnly", "startsAt", "endsAt", "limits", "combinesWith"];
  const data: Data = {
    ...base(config),
    discounts: (config.discounts ?? []).map((d: Discount) => clone(d)) as Discount[],
    products,
    collections,
    segments: (config.segments ?? []) as string[],
    usage: (config.usage ?? {}) as Record<string, number>,
    canDelete: Boolean(config.canDelete),
    query: "",
    kindFilter: "all",
    statusFilter: "all",
    editorOpen: false,
    isNew: false,
    base: blank() as Discount,
    d: draftOf(blank(), products, collections),
    deleteOpen: false,
    target: null as Discount | null,
    listError: "",
    simSource(): Discount[] {
      return this.discounts.filter((d: Discount) => d.active !== false);
    },
    get hasDupes(): boolean {
      return duplicateDiscountCodes(this.discounts).length > 0;
    },
    get dupesText(): string {
      return this.t.duplicateCodes(duplicateDiscountCodes(this.discounts).join(", "));
    },
    standing(d: Discount) {
      return discountStanding(d, this.today, this.usage[d.id] ?? 0);
    },
    standingText(d: Discount): string {
      return this.t.standings[this.standing(d)];
    },
    tone(d: Discount): string {
      return { live: "success", scheduled: "info", ended: "neutral", off: "neutral", "used-up": "warning" }[this.standing(d) as "live"];
    },
    kindText(d: Discount): string {
      return this.t.kinds[d.kind as "fixed"];
    },
    methodText(d: Discount): string {
      return d.method === "code" ? this.t.byCode : this.t.automatic;
    },
    valueText(d: Discount): string {
      switch (d.kind) {
        case "percentage":
          return this.pct(d.value ?? 0);
        case "fixed":
          return `${this.money(d.value ?? 0)}${d.perItem ? ` ${this.t.perItemShort}` : ""}`;
        case "bxgy":
          return this.t.bxgyShort(this.n(d.bxgy?.buyQty ?? 0), this.n(d.bxgy?.getQty ?? 0));
        default:
          return this.t.freeShipping;
      }
    },
    usedText(d: Discount): string {
      return `${this.n(this.usage[d.id] ?? 0)}${d.limits?.total !== undefined ? ` / ${this.n(d.limits.total)}` : ""}`;
    },
    get visible(): Discount[] {
      const q = this.query.trim().toLowerCase();
      return [...this.discounts]
        .filter((d: Discount) => (!q || `${d.title} ${d.code ?? ""}`.toLowerCase().includes(q)) && (this.kindFilter === "all" || d.kind === this.kindFilter) && (this.statusFilter === "all" || this.standing(d) === this.statusFilter))
        .sort((a: Discount, b: Discount) => a.title.localeCompare(b.title));
    },
    /* ---- editor ---- */
    openEditor(src?: Discount, copy = false) {
      this.failed = "";
      this.touched = false;
      const x: Discount = src ? clone(src) : blank();
      if (copy) {
        x.id = uid("disc");
        x.title = this.t.copyOf(x.title);
        if (x.method === "code") x.code = "";
        x.active = false;
      }
      this.isNew = !src || copy;
      this.base = x;
      this.d = draftOf(x, products, collections);
      this.editorOpen = true;
    },
    onKind(kind: string) {
      this.d.kind = kind;
      if (kind === "percentage") this.d.pct = "10";
      if (kind === "fixed") this.d.amount = 10000;
      if (kind === "bxgy") {
        this.d.buyQty = "2";
        this.d.getQty = "1";
        this.d.getPct = "100";
        this.d.maxSets = "";
      }
    },
    scopeText(m: { p: Record<string, boolean>; c: Record<string, boolean> }, empty?: string): string {
      const count = idsOf(m.p).length + idsOf(m.c).length;
      return count === 0 ? (empty ?? this.t.everything) : this.t.scopeCount(String(count));
    },
    get pctBps(): number | undefined {
      return percentToBps(String(this.d.pct));
    },
    get getBps(): number | undefined {
      return percentToBps(String(this.d.getPct));
    },
    get cleanCode(): string {
      return normalizeDiscountCode(this.d.code ?? "");
    },
    get codeOk(): boolean {
      return /^[A-Z0-9_-]{3,32}$/.test(this.cleanCode);
    },
    get codeDupe(): boolean {
      const others = this.discounts.filter((x: Discount) => x.id !== this.d.id);
      return this.d.method === "code" && Boolean(this.cleanCode) && duplicateDiscountCodes([...others, { ...(this.base as Discount), id: this.d.id, code: this.cleanCode }]).includes(this.cleanCode);
    },
    get problems(): string[] {
      const d = this.d;
      const t = this.t;
      const out: string[] = [];
      if (!String(d.title).trim()) out.push(t.problemTitle);
      if (d.method === "code" && !this.codeOk) out.push(t.problemCode);
      if (this.codeDupe) out.push(t.problemDuplicateCode);
      if (d.kind === "percentage" && (this.pctBps === undefined || this.pctBps < 1)) out.push(t.problemPercent);
      if (d.kind === "fixed" && (num(d.amount) ?? 0) <= 0) out.push(t.problemAmount);
      if (d.kind === "bxgy") {
        if ((toInt(d.buyQty) ?? 0) < 1 || (toInt(d.getQty) ?? 0) < 1) out.push(t.problemBxgy);
        if (this.getBps === undefined || this.getBps < 1) out.push(t.problemPercent);
      }
      if (d.startsOn && d.endsOn && d.endsOn < d.startsOn) out.push(t.problemDates);
      return out;
    },
    get editorError(): string {
      return this.failed || (this.touched ? this.problems.join(" ") : "");
    },
    get titleBad(): boolean {
      return this.touched && !String(this.d.title).trim();
    },
    get codeBad(): boolean {
      return this.touched && (!this.codeOk || this.codeDupe);
    },
    get pctBad(): boolean {
      return this.touched && (this.pctBps === undefined || this.pctBps < 1);
    },
    get amountBad(): boolean {
      return this.touched && (num(this.d.amount) ?? 0) <= 0;
    },
    get datesBad(): boolean {
      return this.problems.includes(this.t.problemDates);
    },
    get pctHint(): string {
      return this.pctBps === undefined ? this.t.rateInvalid : this.t.bpsIs(String(this.pctBps));
    },
    get isPriceKind(): boolean {
      return this.d.kind === "percentage" || this.d.kind === "fixed";
    },
    get capLabel(): string {
      return this.d.kind === "free-shipping" ? this.t.capShipping : this.t.cap;
    },
    get editorTitle(): string {
      return this.isNew ? this.t.addDiscount : this.d.title || this.t.editDiscount;
    },
    toDiscount(): Discount {
      const d = this.d;
      const out: Record<string, any> = { ...(this.base as Discount) };
      for (const k of MANAGED) delete out[k];
      out.title = String(d.title).trim();
      out.method = d.method;
      out.kind = d.kind;
      if (d.method === "code") out.code = this.cleanCode;
      if (d.kind === "percentage" && this.pctBps !== undefined) out.value = this.pctBps;
      if (d.kind === "fixed") {
        out.value = num(d.amount) ?? 0;
        if (d.perItem) out.perItem = true;
      }
      if (d.kind === "percentage" || d.kind === "fixed" || d.kind === "free-shipping") {
        if (num(d.maxDiscount) !== null && (num(d.maxDiscount) as number) > 0) out.maxDiscount = num(d.maxDiscount);
      }
      const scope = (m: { p: Record<string, boolean>; c: Record<string, boolean> }, a: string, b: string) => {
        const s: Record<string, string[]> = {};
        if (hasIds(m.p)) s[a] = idsOf(m.p);
        if (hasIds(m.c)) s[b] = idsOf(m.c);
        return Object.keys(s).length ? s : undefined;
      };
      if (this.isPriceKind) {
        const s = scope(d.scope, "productIds", "collectionIds");
        if (s) out.scope = s;
        if (d.excludeOnSale) out.excludeOnSale = true;
      }
      if (d.kind === "bxgy") {
        const bx: Record<string, any> = { buyQty: toInt(d.buyQty) ?? 0, getQty: toInt(d.getQty) ?? 0 };
        const bs = scope(d.buy, "productIds", "collectionIds");
        const gs = scope(d.get, "productIds", "collectionIds");
        if (bs) bx.buyScope = bs;
        if (gs) bx.getScope = gs;
        if (this.getBps !== undefined && this.getBps !== 10000) bx.getPercentBps = this.getBps;
        if ((toInt(d.maxSets) ?? 0) > 0) bx.maxSets = toInt(d.maxSets);
        out.bxgy = bx;
      }
      if ((num(d.minSubtotal) ?? 0) > 0) out.minSubtotal = num(d.minSubtotal);
      if ((toInt(d.minQuantity) ?? 0) > 0) out.minQuantity = toInt(d.minQuantity);
      if (d.custMode === "segments") out.customers = { mode: "segments", segments: [...d.segments] };
      if (d.custMode === "specific") out.customers = { mode: "specific", customerIds: [...d.customerIds] };
      if (d.firstOrderOnly) out.firstOrderOnly = true;
      if (d.startsOn) out.startsAt = startOfDay(d.startsOn);
      if (d.endsOn) out.endsAt = endOfDay(d.endsOn);
      const limits: Record<string, number> = {};
      if ((toInt(d.limitTotal) ?? 0) > 0) limits.total = toInt(d.limitTotal) as number;
      if ((toInt(d.limitCustomer) ?? 0) > 0) limits.perCustomer = toInt(d.limitCustomer) as number;
      if (Object.keys(limits).length) out.limits = limits;
      out.combinesWith = Object.fromEntries(Object.entries(d.combines).filter(([, v]) => v));
      return out as Discount;
    },
    async save() {
      this.touched = true;
      if (this.problems.length > 0) return;
      const out = this.toDiscount();
      if (await this.run("nq-discount-save", { discount: out }, () => (this.discounts = upsert(this.discounts, out)))) this.editorOpen = false;
    },
    async toggle(d: Discount) {
      this.listError = "";
      const out = { ...d, active: d.active === false };
      await this.run("nq-discount-save", { discount: out }, () => (this.discounts = upsert(this.discounts, out)));
      this.listError = this.failed;
    },
    openDelete(d: Discount) {
      if (!this.canDelete) return;
      this.failed = "";
      this.target = d;
      this.deleteOpen = true;
    },
    get deleteText(): string {
      return this.t.deleteBody(this.target?.title ?? "");
    },
    async confirmDelete() {
      const d = this.target as Discount | null;
      if (!d) return;
      if (await this.run("nq-discount-delete", { discount: d }, () => (this.discounts = this.discounts.filter((x: Discount) => x.id !== d.id)))) this.deleteOpen = false;
    },
  };
  return withMixin(data, simulator(config));
}

function discountSimulator(config: any): Data {
  const data: Data = {
    ...base(config),
    products: (config.products ?? []) as any[],
    collections: (config.collections ?? []) as any[],
    discounts: (config.discounts ?? []) as Discount[],
    simSource(): Discount[] {
      return this.discounts;
    },
  };
  return withMixin(data, simulator(config));
}

/* ------------------------------------------------------------------ gift cards */

const GIFT_TONE = { active: "success", depleted: "neutral", expired: "warning", disabled: "danger" } as const;

function giftCardsManager(config: any): Data {
  const data: Data = {
    ...base(config),
    cards: (config.cards ?? []).map((c: GiftCard) => clone(c)) as GiftCard[],
    actor: (config.actor ?? undefined) as string | undefined,
    query: "",
    statusFilter: "all",
    listError: "",
    // issue dialog
    issueOpen: false,
    code: "",
    amount: 50000 as number | null,
    expires: null as string | null,
    name: "",
    email: "",
    // detail sheet
    detailOpen: false,
    openId: "",
    redeemAmount: null as number | null,
    orderId: "",
    adjustAmount: null as number | null,
    adjustDir: "add",
    note: "",
    problem: "",
    done: "",
    standing(c: GiftCard) {
      return giftCardStatus(c, this.today);
    },
    statusText(c: GiftCard): string {
      return this.t.giftStatuses[this.standing(c) as "active"];
    },
    tone(c: GiftCard): string {
      return GIFT_TONE[this.standing(c) as "active"];
    },
    balanceText(c: GiftCard): string {
      return this.money(giftCardBalance(c, this.today), c.currency);
    },
    issuedText(c: GiftCard): string {
      return this.money(initialValue(c), c.currency);
    },
    expiresText(c: GiftCard): string {
      return c.expiresAt ? this.day(c.expiresAt) : this.t.never;
    },
    get visible(): GiftCard[] {
      const q = this.query.trim().toLowerCase();
      const order = ["active", "depleted", "expired", "disabled"];
      return [...this.cards]
        .filter((c: GiftCard) => (!q || `${c.code} ${c.recipient?.name ?? ""} ${c.recipient?.email ?? ""}`.toLowerCase().includes(q)) && (this.statusFilter === "all" || this.standing(c) === this.statusFilter))
        .sort((a: GiftCard, b: GiftCard) => order.indexOf(this.standing(a)) - order.indexOf(this.standing(b)));
    },
    /* ---- issue ---- */
    openIssue() {
      this.failed = "";
      this.touched = false;
      this.code = generateGiftCardCode();
      this.amount = 50000;
      this.expires = null;
      this.name = "";
      this.email = "";
      this.issueOpen = true;
    },
    regenerate() {
      this.code = generateGiftCardCode();
    },
    get clean(): string {
      return normalizeGiftCardCode(this.code);
    },
    get codeOk(): boolean {
      return isValidGiftCardCode(this.clean);
    },
    get taken(): boolean {
      return this.cards.some((c: GiftCard) => normalizeGiftCardCode(c.code) === this.clean);
    },
    get emailOk(): boolean {
      return !this.email.trim() || /^\S+@\S+\.\S+$/.test(this.email.trim());
    },
    get amountBad(): boolean {
      return !this.amount || this.amount <= 0;
    },
    get codeBad(): boolean {
      return this.touched && (!this.codeOk || this.taken);
    },
    get amountErr(): boolean {
      return this.touched && this.amountBad;
    },
    get emailErr(): boolean {
      return this.touched && !this.emailOk;
    },
    get codeHint(): string {
      return this.taken ? this.t.codeTaken : this.codeOk ? this.t.codeHint : this.t.codeInvalid;
    },
    async issue() {
      this.touched = true;
      if (this.amountBad || !this.codeOk || this.taken || !this.emailOk || !this.amount) return;
      const n = this.name.trim();
      const e = this.email.trim();
      const card = issueGiftCard({
        id: uid("gc"),
        code: this.clean,
        amount: this.amount,
        currency: this.currency,
        now: this.today,
        ...(this.expires ? { expiresAt: endOfDay(this.expires) } : {}),
        ...(n || e ? { recipient: { ...(n ? { name: n } : {}), ...(e ? { email: e } : {}) } } : {}),
        ...(this.actor ? { by: this.actor } : {}),
      });
      if ("error" in card) return;
      if (await this.run("nq-giftcard-issue", { card }, () => (this.cards = upsert(this.cards, card)))) this.issueOpen = false;
    },
    /* ---- detail ---- */
    get card(): GiftCard | undefined {
      return this.cards.find((c: GiftCard) => c.id === this.openId);
    },
    openDetail(c: GiftCard) {
      this.failed = "";
      this.problem = "";
      this.done = "";
      this.redeemAmount = null;
      this.adjustAmount = null;
      this.orderId = "";
      this.note = "";
      this.openId = c.id;
      this.detailOpen = true;
    },
    get detail() {
      const c = this.card as GiftCard | undefined;
      if (!c) return { code: "", recipient: "", balance: "", issued: "", expires: "", status: "", tone: "neutral", enabled: true, active: false, issues: "", rows: [] as any[] };
      const issues = ledgerIssues(c.ledger);
      return {
        code: c.code,
        recipient: c.recipient?.name ? `${c.recipient.name}${c.recipient.email ? ` · ${c.recipient.email}` : ""}` : this.t.noRecipient,
        balance: this.balanceText(c),
        issued: this.issuedText(c),
        expires: this.expiresText(c),
        status: this.statusText(c),
        tone: this.tone(c),
        enabled: !c.disabled,
        active: this.standing(c) === "active",
        issues: issues.map((i) => this.t.ledgerIssues[i]).join(" "),
        rows: [...c.ledger]
          .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
          .map((e) => ({
            id: e.id,
            kind: this.t.entryKinds[e.kind],
            positive: e.amount >= 0,
            at: this.day(e.at, true),
            meta: [e.orderId, e.note].filter(Boolean).join(" · "),
            sign: e.amount > 0 ? "+" : e.amount < 0 ? "−" : "",
            amount: this.money(Math.abs(e.amount), c.currency),
          })),
      };
    },
    get enabledModel(): boolean {
      return this.detail.enabled;
    },
    set enabledModel(on: boolean) {
      const c = this.card as GiftCard | undefined;
      if (c && on !== !c.disabled) void this.setEnabled(c, on);
    },
    get message(): string {
      return this.problem || this.failed || this.done;
    },
    get messageIsError(): boolean {
      return Boolean(this.problem || this.failed);
    },
    fail(code: string) {
      this.done = "";
      this.problem = this.t.giftErrors[code as "empty"];
    },
    async update(card: GiftCard): Promise<boolean> {
      return this.run("nq-giftcard-update", { card }, () => (this.cards = upsert(this.cards, card)));
    },
    async doRedeem() {
      this.problem = "";
      const c = this.card as GiftCard;
      if (!c || !this.redeemAmount) return this.fail("invalid-amount");
      const r = redeemGiftCard(c, this.redeemAmount, { now: this.today, currency: c.currency, exact: true, ...(this.orderId.trim() ? { orderId: this.orderId.trim() } : {}), ...(this.actor ? { by: this.actor } : {}) });
      if (!r.ok) return this.fail(r.error);
      if (await this.update(r.card)) {
        this.redeemAmount = null;
        this.orderId = "";
        this.done = this.t.redeemed;
      }
    },
    async doAdjust() {
      this.problem = "";
      const c = this.card as GiftCard;
      if (!c || !this.adjustAmount) return this.fail("invalid-amount");
      const r = adjustGiftCard(c, this.adjustDir === "add" ? this.adjustAmount : -this.adjustAmount, { now: this.today, ...(this.note.trim() ? { note: this.note.trim() } : {}), ...(this.actor ? { by: this.actor } : {}) });
      if (!r.ok) return this.fail(r.error);
      if (await this.update(r.card)) {
        this.adjustAmount = null;
        this.note = "";
        this.done = this.t.adjusted;
      }
    },
    async setEnabled(c: GiftCard, on: boolean) {
      this.listError = "";
      await this.update({ ...c, disabled: !on });
      this.listError = this.failed;
    },
  };
  return data;
}

function giftCardField(config: any): Data {
  const data: Data = {
    ...base(config),
    cards: (config.cards ?? []).map((c: GiftCard) => clone(c)) as GiftCard[],
    known: (config.known ?? []) as GiftCard[],
    total: Number(config.total ?? 0),
    disabled: Boolean(config.disabled),
    code: "",
    problem: "",
    get result() {
      return applyGiftCards(this.cards, this.total, { now: this.today, currency: this.currency });
    },
    get rows() {
      const by = new Map<string, number>(this.result.applied.map((a: any) => [a.cardId, a.amount]));
      return this.cards.map((c: GiftCard) => ({ id: c.id, masked: maskGiftCardCode(c.code), balance: this.money(giftCardBalance(c, this.today), c.currency), taken: this.money(by.get(c.id) ?? 0) }));
    },
    get remainingText(): string {
      return this.money(this.result.remaining);
    },
    onInput() {
      this.problem = "";
    },
    notify() {
      (this.$root as HTMLElement).dispatchEvent(new CustomEvent("nq-giftcard-change", { bubbles: true, detail: { cards: clone(this.cards), ...this.result } }));
    },
    removeLabel(r: { masked: string }): string {
      return `${this.t.removeCard}: ${r.masked}`;
    },
    remove(id: string) {
      this.cards = this.cards.filter((c: GiftCard) => c.id !== id);
      this.notify();
    },
    async add() {
      const clean = normalizeGiftCardCode(this.code);
      if (!clean || this.busy) return;
      this.problem = "";
      const tt = this.t;
      if (!isValidGiftCardCode(clean)) return void (this.problem = tt.codeInvalid);
      if (this.cards.some((c: GiftCard) => c.code === clean)) return void (this.problem = tt.alreadyAdded);
      this.busy = true;
      try {
        const { claimed, result } = await emit(this.$root as HTMLElement, "nq-giftcard-lookup", { code: clean });
        const found = (claimed ? result : this.known.find((c: GiftCard) => c.code === clean)) as any;
        if (!found || "error" in found) return void (this.problem = tt.giftErrors[(found?.error ?? "not-found") as "empty"]);
        if (found.currency !== this.currency) return void (this.problem = tt.giftErrors.currency);
        const st = giftCardStatus(found, this.today);
        if (st === "expired") return void (this.problem = tt.giftErrors.expired);
        if (st === "disabled") return void (this.problem = tt.giftErrors.disabled);
        if (st === "depleted") return void (this.problem = tt.giftErrors.empty);
        this.cards = [...this.cards, clone(found) as GiftCard];
        this.code = "";
        this.notify();
      } catch {
        this.problem = tt.lookupFailed;
      } finally {
        this.busy = false;
      }
    },
  };
  return data;
}

export const storeSettings: Register = (Alpine) => {
  Alpine.data("nqShippingSettings", (config: any = {}) => shippingSettings(config));
  Alpine.data("nqTaxSettings", (config: any = {}) => taxSettings(config));
  Alpine.data("nqDiscountsManager", (config: any = {}) => discountsManager(config));
  Alpine.data("nqDiscountSimulator", (config: any = {}) => discountSimulator(config));
  Alpine.data("nqGiftCardsManager", (config: any = {}) => giftCardsManager(config));
  Alpine.data("nqGiftCardField", (config: any = {}) => giftCardField(config));
};
