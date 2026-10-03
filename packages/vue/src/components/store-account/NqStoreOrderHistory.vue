<script setup lang="ts">
import { Package, RotateCcw, Search, Truck } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton, buttonVariants } from "../button";
import { NqInput } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "../store-order-timeline/order-labels";
import { trackingUrl } from "../store-order-timeline/timeline-model";
import NqStoreMoney from "../store-orders-admin/NqStoreMoney.vue";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { ORDER_GROUPS, filterCustomerOrders, newestOrdersFirst, orderGroupCounts, reorderPlan, type OrderGroup, type ReorderPlan } from "./account-logic";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import type { CommerceOrder, CommerceProduct } from "./commerce";
import NqStoreReorderNotice from "./NqStoreReorderNotice.vue";

// The customer's order history: filter by status group, search, open an order, track it or order it again.
const props = withDefaults(
  defineProps<{
    orders: readonly CommerceOrder[];
    /** Current catalogue, used to decide what "Order again" can add today. */
    products?: readonly CommerceProduct[];
    /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    trackingTemplate?: string;
    onOpenOrder?: (order: CommerceOrder) => void;
    /** Called with the lines that can go in the cart. The list shows what was added, reduced or skipped. */
    onReorder?: (order: CommerceOrder, plan: ReorderPlan) => void;
    onOpenCart?: () => void;
    loading?: boolean;
    error?: boolean;
    onRetry?: () => void;
    labels?: StoreAccountLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { products: () => [] },
);

const currency = useCurrency(() => props.currency);
const { t, ar } = useStoreAccountStrings(() => props.labels);
const group = ref<OrderGroup>("all");
const query = ref("");
const notice = ref<ReorderPlan | null>(null);
const counts = computed(() => orderGroupCounts(props.orders));
const shown = computed(() => newestOrdersFirst(filterCustomerOrders(props.orders, { group: group.value, query: query.value })));
const lang = computed(() => (ar.value ? "ar" : "en"));

function reorder(order: CommerceOrder) {
  const plan = reorderPlan(order, props.products);
  notice.value = plan;
  if (plan.add.length) props.onReorder?.(order, plan);
}
function clear() {
  group.value = "all";
  query.value = "";
}
const countOf = (order: CommerceOrder) => order.lines.reduce((s, l) => s + l.quantity, 0);
</script>

<template>
  <NqErrorState v-if="props.error" :title="t.loadError">
    <template v-if="props.onRetry" #actions>
      <NqButton size="sm" variant="secondary" @click="props.onRetry()">{{ t.retry }}</NqButton>
    </template>
  </NqErrorState>

  <section v-else data-slot="store-order-history" :aria-label="t.ordersTitle" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-col gap-3">
      <div class="relative">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <NqInput v-model="query" type="search" :aria-label="t.searchOrders" :placeholder="t.searchOrders" class="ps-9" />
      </div>
      <div class="-mx-1 overflow-x-auto px-1 pb-1">
        <NqToggleGroup :aria-label="t.ordersTitle" :model-value="[group]" @update:model-value="(v: string[]) => v[0] && (group = v[0] as OrderGroup)">
          <NqToggle v-for="g in ORDER_GROUPS" :key="g" :value="g">
            {{ t.groups[g] }}
            <NqNum :value="counts[g]" class="ms-1.5 text-muted-foreground" />
          </NqToggle>
        </NqToggleGroup>
      </div>
    </div>

    <NqStoreReorderNotice v-if="notice" :plan="notice" :t="t" :on-open-cart="props.onOpenCart" />

    <div v-if="props.loading" class="flex flex-col gap-3" aria-busy="true">
      <NqSkeleton class="h-32" />
      <NqSkeleton class="h-32" />
      <NqSkeleton class="h-32" />
    </div>
    <template v-else-if="shown.length === 0">
      <NqEmptyState v-if="props.orders.length === 0" :icon="Package" :title="t.noOrders" :description="t.noOrdersText" />
      <NqEmptyState v-else :icon="Search" :title="t.noMatch" :description="t.noMatchHint">
        <template #actions>
          <NqButton size="sm" variant="secondary" @click="clear">{{ t.clearFilters }}</NqButton>
        </template>
      </NqEmptyState>
    </template>
    <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
      <li v-for="order in shown" :key="order.id" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="font-semibold">{{ t.order }} <bdi>{{ order.number }}</bdi></span>
            <span class="text-body-sm text-muted-foreground">{{ t.placedOn }} <NqDateTime :value="order.placedAt" :format="{ dateStyle: 'medium' }" /></span>
          </div>
          <NqBadge :variant="ORDER_STATUS_VARIANT[order.status]">{{ ORDER_STATUS_LABEL[order.status][lang] }}</NqBadge>
        </div>
        <div class="flex items-center gap-2 overflow-hidden">
          <span v-for="line in order.lines.slice(0, 4)" :key="line.id" class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
            <img v-if="line.image" :src="line.image" :alt="line.name" class="size-full object-cover" />
            <Package v-else aria-hidden="true" class="size-6 text-muted-foreground" />
          </span>
          <span v-if="order.lines.length > 4" class="text-body-sm text-muted-foreground">+<NqNum :value="order.lines.length - 4" /></span>
          <span class="ms-auto flex shrink-0 flex-col items-end text-body-sm">
            <NqStoreMoney :amount="order.totals.total" :currency="currency" class="font-semibold" />
            <span class="text-muted-foreground"><NqNum :value="countOf(order)" /> {{ t.items }}</span>
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <NqButton size="sm" variant="secondary" @click="props.onOpenOrder?.(order)">{{ t.viewOrder }}</NqButton>
          <a v-if="trackingUrl(order.tracking, props.trackingTemplate)" :href="trackingUrl(order.tracking, props.trackingTemplate)" target="_blank" rel="noreferrer" :class="cn(buttonVariants({ variant: 'ghost', size: 'sm' }))">
            <Truck aria-hidden="true" />
            {{ t.trackOrder }}
          </a>
          <NqButton size="sm" variant="ghost" @click="reorder(order)">
            <RotateCcw aria-hidden="true" />
            {{ t.orderAgain }}
          </NqButton>
        </div>
      </li>
    </ul>
  </section>
</template>
