<script setup lang="ts">
import { Minus, Plus, Sparkles } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCurrencyInput } from "../currency-input";
import { NqField, NqFieldLabel, NqInput } from "../field";
import StoreMoney from "./StoreMoney.vue";
import type { CommerceProduct } from "./commerce";
import { evaluateDiscounts, normalizeDiscountCode, type Discount, type DiscountLine } from "./discount-logic";
import type { StoreSettingsLabels } from "./strings";
import type { SimCollection } from "./types";
import { useSettingsStrings } from "./use-settings";

// Runs `evaluateDiscounts` on a sample basket, so a merchant sees which discounts apply, what each takes off, and why
// the others do not. Codes are typed like a customer would. The same function can run on your server at checkout.
const props = withDefaults(
  defineProps<{
    discounts: readonly Discount[];
    products: readonly CommerceProduct[];
    collections?: readonly SimCollection[];
    /** ISO 4217 code of the store. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    now: Date;
    labels?: StoreSettingsLabels;
  }>(),
  { collections: () => [], currency: undefined, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, n } = useSettingsStrings(() => props.labels);
const id = useId();
const qty = ref<Record<string, number>>(Object.fromEntries(props.products.slice(0, 2).map((p, i) => [p.id, i + 1])));
const shipping = ref(5000);
const codes = ref("");
const orders = ref("0");

const lines = computed<DiscountLine[]>(() =>
  props.products
    .filter((p) => (qty.value[p.id] ?? 0) > 0 && p.variants[0])
    .map((p) => {
      const v = p.variants[0];
      return { id: p.id, productId: p.id, collectionIds: props.collections.filter((c) => c.productIds.includes(p.id)).map((c) => c.id), unitPrice: v?.price ?? 0, quantity: qty.value[p.id] ?? 0, ...(v?.compareAt !== undefined ? { compareAt: v.compareAt } : {}) };
    }),
);
const codeList = computed(() => codes.value.split(/[\s,]+/).map(normalizeDiscountCode).filter(Boolean));
const result = computed(() => evaluateDiscounts(props.discounts, { lines: lines.value, shipping: shipping.value, codes: codeList.value, now: props.now, customer: { ordersCount: Number(orders.value) || 0 } }));
const totalPay = computed(() => result.value.goodsAfter + result.value.shippingAfter);
const bump = (pid: string, by: number) => (qty.value = { ...qty.value, [pid]: Math.max(0, (qty.value[pid] ?? 0) + by) });
</script>

<template>
  <NqCard class="w-full" data-slot="discount-simulator">
    <NqCardHeader>
      <NqCardTitle as="h3" class="flex items-center gap-2">
        <Sparkles aria-hidden="true" class="size-4 text-muted-foreground" />
        {{ t.simulator }}
      </NqCardTitle>
    </NqCardHeader>
    <NqCardContent class="grid gap-4">
      <p class="text-body-sm text-muted-foreground">{{ t.simulatorHint }}</p>
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div class="grid content-start gap-3">
          <ul class="grid gap-1.5" :aria-label="t.basket">
            <li v-for="p in props.products.slice(0, 8)" :key="p.id" class="flex min-w-0 items-center justify-between gap-2 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
              <span class="min-w-0">
                <span class="block truncate font-medium text-foreground">{{ p.name }}</span>
                <span class="text-caption text-muted-foreground"><StoreMoney :minor="p.variants[0]?.price ?? 0" :currency="currency" /></span>
              </span>
              <span class="flex items-center gap-1">
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="`${t.decrease}: ${p.name}`" :disabled="(qty[p.id] ?? 0) === 0" @click="bump(p.id, -1)">
                  <Minus aria-hidden="true" />
                </NqButton>
                <span class="w-6 text-center tabular-nums" aria-live="polite">{{ n(qty[p.id] ?? 0) }}</span>
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="`${t.increase}: ${p.name}`" @click="bump(p.id, 1)">
                  <Plus aria-hidden="true" />
                </NqButton>
              </span>
            </li>
          </ul>
          <div class="grid gap-3 sm:grid-cols-3">
            <NqField>
              <NqFieldLabel>{{ t.shippingCharge }}</NqFieldLabel>
              <NqCurrencyInput :currency="currency" :model-value="shipping" :aria-label="t.shippingCharge" @update:model-value="(v: number | null) => (shipping = v ?? 0)" />
            </NqField>
            <NqField>
              <NqFieldLabel :for="`${id}-codes`">{{ t.codesTyped }}</NqFieldLabel>
              <NqInput :id="`${id}-codes`" v-model="codes" ltr class="uppercase" placeholder="SUMMER10" />
            </NqField>
            <NqField>
              <NqFieldLabel :for="`${id}-orders`">{{ t.pastOrders }}</NqFieldLabel>
              <NqInput :id="`${id}-orders`" ltr inputmode="numeric" :model-value="orders" @update:model-value="(v) => (orders = String(v ?? '').replace(/\D/g, ''))" />
            </NqField>
          </div>
        </div>

        <div role="status" aria-live="polite" class="grid content-start gap-3 rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm">
          <p v-if="lines.length === 0" class="text-muted-foreground">{{ t.basketEmpty }}</p>
          <template v-else>
            <dl class="grid gap-1">
              <div class="flex min-w-0 items-center justify-between gap-3">
                <dt class="min-w-0 text-muted-foreground">{{ t.subtotal }}</dt>
                <dd class="shrink-0 text-foreground"><StoreMoney :minor="result.subtotal" :currency="currency" /></dd>
              </div>
              <div v-for="a in result.applied" :key="a.id" class="flex min-w-0 items-center justify-between gap-3">
                <dt class="min-w-0 text-muted-foreground">
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="truncate">{{ a.title }}</span>
                    <NqBadge v-if="a.capped" variant="warning">{{ t.capped }}</NqBadge>
                    <NqBadge v-if="a.freeUnits !== undefined" variant="info">{{ t.freeUnits(n(a.freeUnits)) }}</NqBadge>
                  </span>
                </dt>
                <dd class="shrink-0 text-foreground"><span class="text-nq-success-text">−<StoreMoney :minor="a.amount" :currency="currency" /></span></dd>
              </div>
              <div class="flex min-w-0 items-center justify-between gap-3">
                <dt class="min-w-0 text-muted-foreground">{{ t.shippingCharge }}</dt>
                <dd class="shrink-0 text-foreground">
                  <span v-if="result.shippingDiscount > 0"><s class="text-muted-foreground"><StoreMoney :minor="shipping" :currency="currency" /></s> <StoreMoney :minor="result.shippingAfter" :currency="currency" /></span>
                  <StoreMoney v-else :minor="shipping" :currency="currency" />
                </dd>
              </div>
              <div class="mt-1 border-t border-border pt-1.5">
                <div class="flex min-w-0 items-center justify-between gap-3">
                  <dt class="min-w-0 text-muted-foreground"><span class="font-semibold text-foreground">{{ t.customerPays }}</span></dt>
                  <dd class="shrink-0 text-foreground"><span class="font-semibold text-foreground"><StoreMoney :minor="totalPay" :currency="currency" /></span></dd>
                </div>
              </div>
            </dl>
            <p v-if="result.applied.length === 0" class="text-muted-foreground">{{ t.nothingApplies }}</p>
            <div v-if="result.rejected.length > 0" class="grid gap-1 border-t border-border pt-2">
              <p class="text-caption font-medium text-muted-foreground">{{ t.notApplied }}</p>
              <ul class="grid gap-0.5 text-caption text-muted-foreground">
                <li v-for="r in result.rejected" :key="r.id">
                  <span class="font-medium text-foreground">{{ r.title }}</span>: {{ t.rejections[r.reason] }}{{ r.with ? ` (${props.discounts.find((d) => d.id === r.with)?.title ?? r.with})` : "" }}
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </NqCardContent>
  </NqCard>
</template>
