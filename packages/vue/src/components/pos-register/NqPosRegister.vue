<script setup lang="ts">
import { Banknote, Clock, Lock, Minus, Pause, Plus, ScanBarcode, ShoppingBasket, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqCurrencyInput } from "../currency-input";
import { NqInput } from "../field";
import { computeLineItems, NqLineItemActionsMenu, NqLineItemMoney } from "../line-item-editor";
import { NqEmptyState } from "../states";
import NqPosCloseDialog from "./NqPosCloseDialog.vue";
import NqPosHoldDialog from "./NqPosHoldDialog.vue";
import NqPosParkedDialog from "./NqPosParkedDialog.vue";
import NqPosPayDialog from "./NqPosPayDialog.vue";
import NqPosRow from "./NqPosRow.vue";
import { posDrawerSummary, posSaleParts, posSettle, posVariance, type PosTender } from "./pos-math";
import { usePosRegisterStrings } from "./strings";
import type { PosBasketLine, PosParkedSale, PosProduct, PosRegisterProps, PosSale, PosSaleRecord, PosSession } from "./types";

// A touch point-of-sale register: a product grid, a basket, a cash-drawer session and a checkout for walk-in customers.
// Money is integer minor units end to end. It records nothing itself: `onCheckout` and `onCloseRegister` do.
const props = withDefaults(defineProps<PosRegisterProps>(), {
  categories: () => [],
  currency: undefined,
  taxMode: "exclusive",
  defaultTaxBps: 0,
  session: undefined,
  defaultSession: null,
  cashier: "",
  defaultSales: () => [],
  parkedSales: undefined,
  defaultParkedSales: () => [],
  onCheckout: undefined,
  onCloseRegister: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:session": [session: PosSession | null];
  "update:parkedSales": [sales: PosParkedSale[]];
  park: [sale: PosParkedSale];
  resume: [sale: PosParkedSale];
}>();

const currency = useCurrency(() => props.currency);
const { t, locale } = usePosRegisterStrings(() => props.labels);

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const innerSession = ref<PosSession | null>(props.defaultSession);
const session = computed(() => (props.session !== undefined ? props.session : innerSession.value));
const sales = ref<PosSaleRecord[]>([...props.defaultSales]);
const innerParked = ref<PosParkedSale[]>([...props.defaultParkedSales]);
const parked = computed(() => (props.parkedSales !== undefined ? props.parkedSales : innerParked.value));
const holding = ref(false);
const parkedOpen = ref(false);
const basket = ref<PosBasketLine[]>([]);
const query = ref("");
const category = ref("all");
const floatMinor = ref<number | null>(0);
const paying = ref(false);
const closing = ref(false);
const done = ref<PosSale | null>(null);
const searchWrap = ref<HTMLElement | null>(null);
const focusSearch = () => searchWrap.value?.querySelector("input")?.focus();

function setSession(s: PosSession | null) {
  innerSession.value = s;
  emit("update:session", s);
}

const totals = computed(() =>
  computeLineItems(
    basket.value.map((l) => ({ id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, taxBps: l.taxBps })),
    { taxMode: props.taxMode, defaultTaxBps: props.defaultTaxBps },
  ),
);
const itemCount = computed(() => basket.value.reduce((n, l) => n + l.quantity, 0));
const inBasket = (productId: string) => basket.value.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0);

const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.products.filter((p) => (category.value === "all" || p.category === category.value) && (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode === q));
});
const categoryTabs = computed(() => [{ id: "all", label: t.value.all }, ...props.categories]);

const available = (p: PosProduct) => (p.stock === undefined ? Infinity : p.stock - inBasket(p.id));

function add(p: PosProduct) {
  if (available(p) <= 0) return;
  const found = basket.value.find((l) => l.productId === p.id);
  if (found) basket.value = basket.value.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
  else basket.value = [...basket.value, { id: uid("pos"), productId: p.id, name: p.name, quantity: 1, unitPrice: p.price, taxBps: p.taxBps }];
}
function bump(id: string, by: number) {
  basket.value = basket.value.flatMap((l) => (l.id !== id ? [l] : l.quantity + by <= 0 ? [] : [{ ...l, quantity: l.quantity + by }]));
}
function canBump(l: PosBasketLine) {
  const p = props.products.find((x) => x.id === l.productId);
  return !p || available(p) > 0;
}
function lineActions(l: PosBasketLine): ContextMenuAction[] {
  return [
    { id: "inc", label: t.value.increase, icon: Plus, onSelect: () => bump(l.id, 1), disabled: !canBump(l), group: "qty" },
    { id: "dec", label: t.value.decrease, icon: Minus, onSelect: () => bump(l.id, -1), group: "qty" },
    { id: "remove", label: t.value.remove, icon: Trash2, danger: true, onSelect: () => bump(l.id, -l.quantity), group: "danger" },
  ];
}
const lineTotal = (id: string) => totals.value.lines.find((x) => x.id === id)?.total ?? 0;

function scan(code: string) {
  const c = code.trim().toLowerCase();
  if (!c) return;
  const hit = props.products.find((p) => p.barcode === code.trim() || p.sku?.toLowerCase() === c) ?? (visible.value.length === 1 ? visible.value[0] : undefined);
  if (hit) {
    add(hit);
    query.value = "";
  }
}

function setParked(next: PosParkedSale[]) {
  if (props.parkedSales === undefined) innerParked.value = next;
  emit("update:parkedSales", next);
}
function park(note: string) {
  const sale: PosParkedSale = { id: uid("parked"), at: new Date().toISOString(), cashier: session.value?.cashier ?? props.cashier, ...(note ? { note } : {}), lines: basket.value, totals: totals.value };
  setParked([...parked.value, sale]);
  basket.value = [];
  emit("park", sale);
  holding.value = false;
  focusSearch();
}
function resume(sale: PosParkedSale) {
  setParked(parked.value.filter((p) => p.id !== sale.id));
  basket.value = sale.lines;
  emit("resume", sale);
  parkedOpen.value = false;
}
const discard = (sale: PosParkedSale) => setParked(parked.value.filter((p) => p.id !== sale.id));

const drawer = computed(() =>
  posDrawerSummary(
    session.value?.openingFloat ?? 0,
    sales.value.map((s) => ({ method: s.method === "split" ? "cash" : s.method, total: s.totals.total, parts: s.tenders ? posSaleParts(s.totals.total, s.tenders) : undefined })),
  ),
);
const time = (iso: string) => new Intl.DateTimeFormat(locale.value, { timeStyle: "short" }).format(new Date(iso));

function openRegister() {
  sales.value = [];
  basket.value = [];
  setSession({ id: uid("session"), cashier: props.cashier, openedAt: new Date().toISOString(), openingFloat: floatMinor.value ?? 0 });
}
function onPayOpen(o: boolean) {
  paying.value = o;
  if (!o) done.value = null;
}
async function onPay(tenders: PosTender[]) {
  const settled = posSettle(totals.value.total, tenders);
  const sale: PosSale = {
    id: uid("sale"),
    number: `POS-${String(1001 + sales.value.length)}`,
    at: new Date().toISOString(),
    cashier: session.value?.cashier ?? "",
    lines: basket.value,
    totals: totals.value,
    method: tenders.length === 1 && tenders[0] ? tenders[0].method : "split",
    tendered: settled.paid,
    change: settled.change,
    tenders,
    customerId: null,
  };
  await props.onCheckout?.(sale);
  sales.value = [...sales.value, sale];
  basket.value = [];
  done.value = sale;
}
function onNew() {
  paying.value = false;
  done.value = null;
  focusSearch();
}
async function onClose(counted: number) {
  const s = session.value;
  if (!s) return;
  await props.onCloseRegister?.({ ...drawer.value, session: s, counted, variance: posVariance(drawer.value.expectedCash, counted), closedAt: new Date().toISOString() });
  closing.value = false;
  basket.value = [];
  setSession(null);
}
</script>

<template>
  <section v-if="!session" data-slot="pos-register" data-state="closed" :class="cn('@container flex w-full flex-col gap-4', props.class)">
    <NqEmptyState :icon="Lock" :title="t.closedTitle" :description="t.closedText">
      <div class="flex w-full max-w-xs flex-col gap-3">
        <label class="flex flex-col gap-1.5 text-start text-label text-foreground">
          {{ t.openingFloat }}
          <NqCurrencyInput :model-value="floatMinor" :currency="currency" :min="0" :aria-label="t.openingFloat" @update:model-value="(v: number | null) => (floatMinor = v)" />
        </label>
        <NqButton variant="primary" size="lg" :disabled="floatMinor === null" @click="openRegister">{{ t.openRegister }}</NqButton>
      </div>
    </NqEmptyState>
  </section>

  <section v-else data-slot="pos-register" data-state="open" :class="cn('@container flex w-full flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-center gap-2">
      <NqBadge variant="success">{{ t.sessionOpen }}</NqBadge>
      <span class="text-body-sm text-muted-foreground">
        {{ session.cashier ? `${session.cashier} · ` : "" }}{{ t.sessionSince }} <bdi>{{ time(session.openedAt) }}</bdi>
      </span>
      <NqButton variant="secondary" size="sm" class="ms-auto" @click="parkedOpen = true">
        <Clock aria-hidden="true" />
        {{ t.parked }}
        <NqBadge v-if="parked.length" variant="neutral"><bdi>{{ parked.length }}</bdi></NqBadge>
      </NqButton>
      <NqButton variant="secondary" size="sm" @click="closing = true">
        <Banknote aria-hidden="true" />
        {{ t.drawer }}
      </NqButton>
    </header>

    <div class="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
      <div class="flex min-w-0 flex-col gap-3">
        <div ref="searchWrap" class="relative">
          <ScanBarcode aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <NqInput v-model="query" :placeholder="t.search" :aria-label="t.search" :title="t.searchHint" autocomplete="off" class="ps-9" @keydown.enter.prevent="scan(query as string)" />
        </div>
        <div v-if="props.categories.length" role="group" :aria-label="t.all" class="flex gap-2 overflow-x-auto pb-1">
          <NqButton v-for="c in categoryTabs" :key="c.id" size="sm" :variant="category === c.id ? 'primary' : 'secondary'" :aria-pressed="category === c.id" class="shrink-0" @click="category = c.id">
            {{ c.label }}
          </NqButton>
        </div>
        <NqEmptyState v-if="visible.length === 0" :title="t.noProducts" :description="t.noProductsText" />
        <ul v-else class="grid grid-cols-2 gap-2 @lg:grid-cols-3 @5xl:grid-cols-4">
          <li v-for="p in visible" :key="p.id">
            <button
              type="button"
              :disabled="available(p) <= 0"
              class="flex min-h-24 w-full touch-manipulation flex-col items-start justify-between gap-2 rounded-floating border border-border bg-card p-3 text-start transition-colors hover:bg-nq-hover active:bg-nq-hover disabled:cursor-not-allowed disabled:opacity-50"
              @click="add(p)"
            >
              <span class="flex w-full items-start gap-2">
                <span v-if="$slots.artwork || p.artwork" aria-hidden="true">
                  <slot name="artwork" :product="p"><component :is="p.artwork" /></slot>
                </span>
                <span class="line-clamp-2 text-label text-foreground">{{ p.name }}</span>
              </span>
              <span class="flex w-full items-end justify-between gap-2">
                <NqLineItemMoney :minor="p.price" :currency="currency" class="text-body-sm text-foreground" />
                <NqBadge v-if="available(p) <= 0" variant="danger">{{ t.outOfStock }}</NqBadge>
                <NqBadge v-else-if="p.stock !== undefined && available(p) <= 10" variant="warning">
                  <bdi>{{ available(p) }}</bdi> {{ t.left }}
                </NqBadge>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <aside :aria-label="t.basket" class="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3 @3xl:sticky @3xl:top-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="flex items-center gap-2 text-h3 text-foreground">
            <ShoppingBasket aria-hidden="true" class="size-4" />
            {{ t.basket }}
            <NqBadge v-if="itemCount" variant="neutral"><bdi>{{ itemCount }}</bdi></NqBadge>
          </h2>
          <span class="text-caption text-muted-foreground">{{ t.walkIn }}</span>
        </div>
        <NqEmptyState v-if="basket.length === 0" :title="t.emptyBasket" :description="t.emptyBasketText" class="py-8" />
        <ul v-else class="flex flex-col divide-y divide-border">
          <li v-for="l in basket" :key="l.id" data-slot="pos-line">
          <NqContextMenuActions :actions="lineActions(l)" class="flex flex-col gap-2 py-2.5">
            <div class="flex items-start justify-between gap-2">
              <span class="text-label text-foreground">{{ l.name }}</span>
              <NqLineItemMoney :minor="lineTotal(l.id)" :currency="currency" class="text-label text-foreground" />
            </div>
            <div class="flex items-center gap-1">
              <NqButton variant="secondary" size="icon" :aria-label="`${t.decrease}, ${l.name}`" @click="bump(l.id, -1)"><Minus aria-hidden="true" /></NqButton>
              <output :aria-label="`${t.qty}, ${l.name}`" class="min-w-10 text-center text-label tabular-nums">{{ l.quantity }}</output>
              <NqButton variant="secondary" size="icon" :aria-label="`${t.increase}, ${l.name}`" :disabled="!canBump(l)" @click="bump(l.id, 1)"><Plus aria-hidden="true" /></NqButton>
              <span class="ms-2 text-caption text-muted-foreground"><NqLineItemMoney :minor="l.unitPrice" :currency="currency" /></span>
              <NqLineItemActionsMenu class="ms-auto" :actions="lineActions(l)" :label="`${t.lineActions}, ${l.name}`" />
            </div>
          </NqContextMenuActions>
          </li>
        </ul>
        <dl class="flex flex-col gap-1.5 border-t border-border pt-3">
          <NqPosRow :label="t.subtotal"><NqLineItemMoney :minor="totals.subtotal" :currency="currency" /></NqPosRow>
          <NqPosRow v-if="totals.discountTotal" :label="t.discount"><NqLineItemMoney :minor="-totals.discountTotal" :currency="currency" /></NqPosRow>
          <NqPosRow :label="t.tax"><NqLineItemMoney :minor="totals.taxTotal" :currency="currency" /></NqPosRow>
          <NqPosRow :label="t.total" strong><NqLineItemMoney :minor="totals.total" :currency="currency" /></NqPosRow>
        </dl>
        <div class="flex gap-2">
          <NqButton variant="primary" size="lg" class="flex-1" :disabled="basket.length === 0" @click="paying = true">
            {{ t.charge }} <NqLineItemMoney :minor="totals.total" :currency="currency" />
          </NqButton>
          <NqButton variant="secondary" size="lg" :disabled="basket.length === 0" :aria-label="t.hold" :title="t.hold" @click="holding = true"><Pause aria-hidden="true" /></NqButton>
          <NqButton variant="secondary" size="lg" :disabled="basket.length === 0" :aria-label="t.clear" :title="t.clear" @click="basket = []"><Trash2 aria-hidden="true" /></NqButton>
        </div>
      </aside>
    </div>

    <div v-if="basket.length" class="sticky bottom-2 z-10 flex items-center gap-3 rounded-card border border-border bg-card p-2 shadow-md @3xl:hidden">
      <span class="ps-2 text-body-sm text-muted-foreground"><bdi>{{ itemCount }}</bdi> {{ t.items }}</span>
      <NqButton variant="secondary" size="lg" class="ms-auto" :aria-label="t.hold" :title="t.hold" @click="holding = true"><Pause aria-hidden="true" /></NqButton>
      <NqButton variant="primary" size="lg" @click="paying = true">{{ t.charge }} <NqLineItemMoney :minor="totals.total" :currency="currency" /></NqButton>
    </div>

    <NqPosHoldDialog v-model:open="holding" :t="t" @park="park" />
    <NqPosParkedDialog v-model:open="parkedOpen" :parked="parked" :basket-has-items="basket.length > 0" :currency="currency" :time="time" :t="t" @resume="resume" @discard="discard" />
    <NqPosPayDialog :open="paying" :done="done" :currency="currency" :totals="totals" :t="t" :on-pay="onPay" @update:open="onPayOpen" @new="onNew" />
    <NqPosCloseDialog v-model:open="closing" :currency="currency" :drawer="drawer" :t="t" :on-close="onClose" />
  </section>
</template>
