// nqLoyaltyCard, nqPromoCodeField and nqPromoCodeManager: the interactive parts of the loyalty and promo components.
// The card, points history and visit history are rendered by <x-nq::loyalty-promo.*>; the state of these three lives here.
//
//   <div data-slot="loyalty-card" x-data="nqLoyaltyCard({ rewards })"> … reward cards … </div>
//   <div data-slot="promo-code-field" x-data="nqPromoCodeField({ applied, currency, locale, promos, context, t })"> … </div>
//   <section data-slot="promo-code-manager" x-data="nqPromoCodeManager({ promos, currency, locale, today, canSave, canSetActive, canDelete, t })"> … </section>
//
// Every change fires a bubbling, cancelable event on the root; whoever handles it calls waitUntil(promise), resolve() or reject(message):
//   "nq-loyalty-redeem" { reward, … }   a Redeem button (the reward card shows its own busy state and error)
//   "nq-promo-apply"    { code, setApplied({ code, discount }), … }   Apply on the promo field; reject(message) shows the message under the field
//   "nq-promo-remove"   { … }
//   "nq-promo-applied"  { applied }     not cancelable: a code the field checked locally (promos + context) and accepted
//   "nq-promo-save"     { input, id?, … }, "nq-promo-active" { promo, active, … }, "nq-promo-delete" { promo, … }   the manager
// Nobody claimed it (no waitUntil / resolve / reject call): the change is applied locally. A claimed one keeps the dialog busy until it settles.
// Strings come from the Blade view as config.t (the component's own words, already in the page's language).

import { evaluatePromo, isPromoCodeFormat, normalizePromoCode, type PromoContext, type PromoLike } from "./loyalty-logic";
import type { Register } from "./types";

type Words = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface Applied {
  code: string;
  discount: number;
}
interface Promo extends PromoLike {
  id: string;
  used: number;
}
type Standing = "live" | "scheduled" | "ended" | "off" | "full";

let counter = 0;

const say = (text: string, ...args: (string | number)[]): string => args.reduce<string>((s, a, i) => s.split(`{${i}}`).join(String(a)), text);
const keyOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOf = (key: string): Date => new Date(`${key}T12:00:00`);

function money(minor: number, currency: string, locale: string): string {
  const f = new Intl.NumberFormat(`${locale}-u-nu-latn`, { style: "currency", currency });
  const digits = f.resolvedOptions().maximumFractionDigits ?? 2;
  return f.format(minor / 10 ** digits);
}
const dayText = (key: string, locale: string): string => new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "medium" }).format(dayOf(key));
const numText = (v: number, locale: string): string => new Intl.NumberFormat(`${locale}-u-nu-latn`, { maximumFractionDigits: 2 }).format(v);

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

function standing(p: Promo, today: string): Standing {
  if (p.active === false) return "off";
  if (p.endsOn && today > p.endsOn) return "ended";
  if (p.startsOn && today < p.startsOn) return "scheduled";
  if (p.maxRedemptions !== undefined && p.used >= p.maxRedemptions) return "full";
  return "live";
}

export const loyaltyPromo: Register = (Alpine) => {
  Alpine.data("nqLoyaltyCard", (config: { rewards?: { id: string; [key: string]: unknown }[] } = {}) => ({
    rewards: config.rewards ?? [],
    /** A reward card's nq-claim becomes nq-loyalty-redeem { reward }; the card waits on whatever the handler hands back. */
    redeem(event: CustomEvent<{ wait?: () => Promise<unknown> }>, id: string) {
      event.stopPropagation();
      const reward = this.rewards.find((r: { id: string }) => r.id === id) ?? { id };
      let claimed: Promise<unknown> | null = null;
      const claim = (p: Promise<unknown>) => (claimed = claimed ?? p);
      (this.$root as HTMLElement).dispatchEvent(
        new CustomEvent("nq-loyalty-redeem", {
          bubbles: true,
          cancelable: true,
          detail: {
            reward,
            waitUntil: (p: Promise<unknown>) => void claim(Promise.resolve(p)),
            resolve: () => void claim(Promise.resolve()),
            reject: (message?: string) => void claim(Promise.resolve({ error: message || undefined })),
          },
        }),
      );
      event.detail.wait = () => (claimed ?? Promise.resolve()) as Promise<unknown>;
    },
  }));

  Alpine.data(
    "nqPromoCodeField",
    (config: { applied?: Applied | null; disabled?: boolean; currency: string; locale?: string; promos?: PromoLike[]; context?: PromoContext; t: Words }) => ({
      applied: (config.applied ?? null) as Applied | null,
      value: "",
      busy: false,
      disabled: Boolean(config.disabled),
      error: "",
      currency: config.currency,
      locale: config.locale ?? "en",
      t: config.t,
      money(minor: number) {
        return money(minor, this.currency, this.locale);
      },
      get savesText() {
        return say(this.t.saves, "");
      },
      onInput() {
        this.error = "";
      },
      async apply() {
        if (this.busy) return;
        const code = normalizePromoCode(this.value);
        if (!code) return void (this.error = this.t.problems.empty);
        if (!isPromoCodeFormat(code)) return void (this.error = this.t.problems.format);
        this.busy = true;
        this.error = "";
        try {
          const root = this.$root as HTMLElement;
          const { claimed, result } = await emit(root, "nq-promo-apply", {
            code,
            setApplied: (a: Applied) => {
              this.applied = a;
            },
          });
          if (claimed) {
            const err = errorOf(result);
            if (err) this.error = err;
            else this.value = "";
            return;
          }
          const promo = config.promos?.find((p) => normalizePromoCode(p.code) === code);
          if (!promo || !config.context) return void (this.error = this.t.problems.unknown);
          const r = evaluatePromo(promo, config.context);
          if (!r.valid) return void (this.error = this.t.problems[r.problem]);
          this.applied = { code, discount: r.discount };
          this.value = "";
          root.dispatchEvent(new CustomEvent("nq-promo-applied", { bubbles: true, detail: { applied: { ...this.applied } } }));
        } catch (e) {
          this.error = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
      async remove() {
        try {
          await emit(this.$root as HTMLElement, "nq-promo-remove", {});
        } catch {
          return;
        }
        this.applied = null;
      },
    }),
  );

  Alpine.data(
    "nqPromoCodeManager",
    (config: { promos: Promo[]; currency: string; locale?: string; today?: string; canSave?: boolean; canSetActive?: boolean; canDelete?: boolean; t: Words }) => ({
      promos: config.promos.map((p) => ({ ...p })) as Promo[],
      currency: config.currency,
      locale: config.locale ?? "en",
      today: config.today ?? keyOf(new Date()),
      canSave: Boolean(config.canSave),
      canSetActive: Boolean(config.canSetActive),
      canDelete: Boolean(config.canDelete),
      t: config.t,
      query: "",
      statusFilter: "all",
      editorOpen: false,
      deleteOpen: false,
      editingId: "",
      target: null as Promo | null,
      code: "",
      type: "percent",
      percent: "",
      fixed: null as number | null,
      maxDiscount: null as number | null,
      minSubtotal: null as number | null,
      startsOn: null as string | null,
      endsOn: null as string | null,
      maxUses: "",
      perCustomer: "",
      firstOrderOnly: false,
      active: true,
      touched: false,
      busy: false,
      failed: "",
      listError: "",
      money(minor: number) {
        return money(minor, this.currency, this.locale);
      },
      day(key: string) {
        return dayText(key, this.locale);
      },
      num(v: number) {
        return numText(v, this.locale);
      },
      standingOf(p: Promo): Standing {
        return standing(p, this.today);
      },
      statusLabel(p: Promo) {
        return this.t.statuses[standing(p, this.today)];
      },
      tone(p: Promo) {
        return { live: "success", scheduled: "info", ended: "neutral", off: "neutral", full: "warning" }[standing(p, this.today)];
      },
      discountText(p: Promo) {
        return p.type === "percent" ? `${numText(p.value / 100, this.locale)}%` : money(p.value, this.currency, this.locale);
      },
      validityText(p: Promo) {
        return p.startsOn || p.endsOn ? `${p.startsOn ? dayText(p.startsOn, this.locale) : "…"} – ${p.endsOn ? dayText(p.endsOn, this.locale) : "…"}` : this.t.unlimited;
      },
      usedText(p: Promo) {
        return p.maxRedemptions !== undefined ? `${numText(p.used, this.locale)} / ${numText(p.maxRedemptions, this.locale)}` : numText(p.used, this.locale);
      },
      get visible(): Promo[] {
        const q = this.query.trim().toUpperCase();
        return [...this.promos]
          .filter((p: Promo) => (!q || p.code.toUpperCase().includes(q)) && (this.statusFilter === "all" || standing(p, this.today) === this.statusFilter))
          .sort((a: Promo, b: Promo) => a.code.localeCompare(b.code));
      },
      /* ---- editor ---- */
      get pct() {
        return Number(String(this.percent).replace(",", "."));
      },
      get codeBad() {
        return !isPromoCodeFormat(this.code);
      },
      get valueBad() {
        return this.type === "percent" ? !(this.pct > 0 && this.pct <= 100) : !(this.fixed && this.fixed > 0);
      },
      get datesBad() {
        return Boolean(this.startsOn && this.endsOn && this.endsOn < this.startsOn);
      },
      whole(v: string) {
        return String(v).trim() === "" || (Number.isInteger(Number(v)) && Number(v) > 0);
      },
      get limitsBad() {
        return !this.whole(this.maxUses) || !this.whole(this.perCustomer);
      },
      get codeErr() {
        return this.touched && this.codeBad;
      },
      get valueErr() {
        return this.touched && this.valueBad;
      },
      get datesErr() {
        return this.touched && this.datesBad;
      },
      get usesErr() {
        return this.touched && !this.whole(this.maxUses);
      },
      get perErr() {
        return this.touched && !this.whole(this.perCustomer);
      },
      get isPercent() {
        return this.type === "percent";
      },
      get bad() {
        return this.codeBad || this.valueBad || this.datesBad || this.limitsBad;
      },
      openEditor(p?: Promo) {
        if (!this.canSave) return;
        this.editingId = p?.id ?? "";
        this.code = p?.code ?? "";
        this.type = p?.type ?? "percent";
        this.percent = p && p.type === "percent" ? String(p.value / 100) : "";
        this.fixed = p && p.type === "fixed" ? p.value : null;
        this.maxDiscount = p?.maxDiscount ?? null;
        this.minSubtotal = p?.minSubtotal ?? null;
        this.startsOn = p?.startsOn ?? null;
        this.endsOn = p?.endsOn ?? null;
        this.maxUses = p?.maxRedemptions !== undefined ? String(p.maxRedemptions) : "";
        this.perCustomer = p?.perCustomer !== undefined ? String(p.perCustomer) : "";
        this.firstOrderOnly = p?.firstOrderOnly ?? false;
        this.active = p?.active ?? true;
        this.touched = false;
        this.failed = "";
        this.editorOpen = true;
      },
      async submit() {
        this.touched = true;
        if (this.bad || this.busy) return;
        const input = {
          code: normalizePromoCode(this.code),
          type: this.type,
          value: this.type === "percent" ? Math.round(this.pct * 100) : (this.fixed ?? 0),
          maxDiscount: this.type === "percent" && this.maxDiscount ? this.maxDiscount : undefined,
          minSubtotal: this.minSubtotal || undefined,
          startsOn: this.startsOn ?? undefined,
          endsOn: this.endsOn ?? undefined,
          maxRedemptions: String(this.maxUses).trim() ? Number(this.maxUses) : undefined,
          perCustomer: String(this.perCustomer).trim() ? Number(this.perCustomer) : undefined,
          firstOrderOnly: this.firstOrderOnly,
          active: this.active,
        };
        const id = this.editingId || undefined;
        this.busy = true;
        this.failed = "";
        try {
          const { claimed, result } = await emit(this.$root as HTMLElement, "nq-promo-save", { input, id });
          const err = claimed ? errorOf(result) : "";
          if (err) {
            this.failed = err;
            return;
          }
          if (!claimed) {
            if (id) this.promos = this.promos.map((p: Promo) => (p.id === id ? { ...p, ...input } : p));
            else this.promos = [...this.promos, { ...input, id: `promo-${(counter++).toString(36)}`, used: 0 } as Promo];
          }
          this.editorOpen = false;
        } catch (e) {
          this.failed = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
      /* ---- row actions ---- */
      copy(p: Promo) {
        void navigator.clipboard?.writeText(p.code);
      },
      async setActive(p: Promo, active: boolean) {
        if (!this.canSetActive || this.busy) return;
        this.busy = true;
        this.listError = "";
        try {
          const { claimed, result } = await emit(this.$root as HTMLElement, "nq-promo-active", { promo: p, active });
          const err = claimed ? errorOf(result) : "";
          if (err) this.listError = err;
          else if (!claimed) this.promos = this.promos.map((x: Promo) => (x.id === p.id ? { ...x, active } : x));
        } catch (e) {
          this.listError = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
      openDelete(p: Promo) {
        if (!this.canDelete) return;
        this.target = p;
        this.failed = "";
        this.deleteOpen = true;
      },
      async confirmDelete() {
        const p = this.target as Promo | null;
        if (!p || this.busy) return;
        this.busy = true;
        this.failed = "";
        try {
          const { claimed, result } = await emit(this.$root as HTMLElement, "nq-promo-delete", { promo: p });
          const err = claimed ? errorOf(result) : "";
          if (err) {
            this.failed = err;
            return;
          }
          if (!claimed) this.promos = this.promos.filter((x: Promo) => x.id !== p.id);
          this.deleteOpen = false;
        } catch (e) {
          this.failed = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
      deleteText(p: Promo | null) {
        return say(this.t.deleteDescription, p ? p.code : "");
      },
    }),
  );
};
