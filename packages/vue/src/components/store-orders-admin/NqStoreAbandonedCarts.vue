<script setup lang="ts">
import { Mail, MailCheck, ShoppingCart, Wallet } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput, NqTextarea } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import NqStoreMoney from "./NqStoreMoney.vue";
import { type AbandonedCart, type RecoveryRules, type RecoveryStatus, canSendRecovery, cartIdleMinutes, cartItemCount, cartValue, recoveryDiscount, recoveryStats, recoveryStatus } from "./abandoned-logic";
import { useStoreAdminStrings, type StoreAdminLabels } from "./strings";

// Carts that were left behind, with how long they have been idle, what they are worth and whether the shopper can be
// emailed again. Sending is gated by `canSendRecovery`: idle long enough, not in cooldown, under the email limit.
export interface StoreRecoveryEmail {
  cartId: string;
  /** Percent off offered in the email, 0 for none. */
  discountPercent: number;
  /** Discount in minor units at the current cart value. */
  discountAmount: number;
  message: string;
}

const STATUS_VARIANT: Record<RecoveryStatus, "info" | "warning" | "success" | "neutral" | "danger"> = {
  new: "warning",
  emailed: "info",
  recovered: "success",
  lost: "neutral",
  "no-email": "neutral",
};

const props = withDefaults(
  defineProps<{
    carts: readonly AbandonedCart[];
    /** Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Reference time. Pass it so the list is stable and testable. Default: the current time. */
    now?: number | Date;
    rules?: RecoveryRules;
    /** Largest discount an email may offer, in percent. Default 20. */
    maxDiscountPercent?: number;
    onSendRecovery?: (email: StoreRecoveryEmail) => void;
    loading?: boolean;
    error?: boolean;
    onRetry?: () => void;
    labels?: StoreAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { maxDiscountPercent: 20 },
);

const currency = useCurrency(() => props.currency);
const { t, ar } = useStoreAdminStrings(() => props.labels);
const fallbackNow = Date.now();
const clock = computed(() => props.now ?? fallbackNow);
const stats = computed(() => recoveryStats(props.carts, clock.value, props.rules));
const target = ref<AbandonedCart | null>(null);
const percent = ref("0");
const message = ref("");

const sorted = computed(() => [...props.carts].sort((a, b) => cartValue(b) - cartValue(a)));
const pct = computed(() => Math.min(Math.max(Number.parseInt(percent.value, 10) || 0, 0), props.maxDiscountPercent));

const open = (cart: AbandonedCart) => {
  target.value = cart;
  percent.value = "0";
  message.value = "";
};
const send = () => {
  const cart = target.value;
  if (!cart) return;
  props.onSendRecovery?.({ cartId: cart.id, discountPercent: pct.value, discountAmount: recoveryDiscount(cartValue(cart), pct.value), message: message.value.trim() });
  target.value = null;
};

const blockText = (cart: AbandonedCart): string | null => {
  const gate = canSendRecovery(cart, clock.value, props.rules);
  if (gate.ok) return null;
  switch (gate.reason) {
    case "recovered":
      return t.value.blockRecovered;
    case "lost":
      return t.value.blockLost;
    case "no-email":
      return t.value.blockNoEmail;
    case "too-soon":
      return t.value.blockTooSoon(gate.waitMinutes ?? 0);
    case "cooldown":
      return t.value.blockCooldown(Math.ceil((gate.waitMinutes ?? 0) / 60));
    default:
      return t.value.blockLimit;
  }
};
const idleText = (minutes: number) => (minutes < 60 ? t.value.idleMinutes(minutes) : minutes < 60 * 48 ? t.value.idleHours(Math.floor(minutes / 60)) : t.value.idleDays(Math.floor(minutes / 1440)));
const rows = computed(() =>
  sorted.value.map((cart) => ({
    cart,
    status: recoveryStatus(cart, clock.value, props.rules),
    gate: canSendRecovery(cart, clock.value, props.rules),
    why: blockText(cart),
    idle: idleText(cartIdleMinutes(cart, clock.value)),
  })),
);
</script>

<template>
  <div v-if="props.error" :class="props.class">
    <NqEmptyState :title="t.loadErrorCarts">
      <template v-if="props.onRetry" #actions>
        <NqButton size="sm" variant="secondary" @click="props.onRetry?.()">{{ t.retry }}</NqButton>
      </template>
    </NqEmptyState>
  </div>
  <section v-else data-slot="store-abandoned-carts" :aria-label="t.abandoned" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqStatCard :loading="props.loading" :label="t.statAbandoned" :value="stats.carts"><template #icon><ShoppingCart /></template></NqStatCard>
      <NqStatCard :loading="props.loading" :label="t.statAtRisk"><template #icon><Wallet /></template><template #value><NqStoreMoney :amount="stats.atRisk" :currency="currency" /></template></NqStatCard>
      <NqStatCard :loading="props.loading" :label="t.statRecovered" :value="stats.recovered"><template #icon><MailCheck /></template></NqStatCard>
      <NqStatCard :loading="props.loading" :label="t.statRate" :value="stats.rateBps / 10000" :format="{ style: 'percent', maximumFractionDigits: 0 }"><template #icon><Mail /></template></NqStatCard>
    </NqStatGrid>

    <div v-if="props.loading" class="flex flex-col gap-2">
      <NqSkeleton class="h-16" />
      <NqSkeleton class="h-16" />
      <NqSkeleton class="h-16" />
    </div>
    <NqEmptyState v-else-if="sorted.length === 0" :title="t.noCarts" :description="t.noCartsText" />
    <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
      <li v-for="row in rows" :key="row.cart.id" class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-border bg-card p-3">
        <div class="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <span class="truncate font-medium">{{ row.cart.customer?.name ?? t.guest }}</span>
          <bdi v-if="row.cart.customer?.email" dir="ltr" class="truncate text-start text-body-sm text-muted-foreground">{{ row.cart.customer.email }}</bdi>
          <span class="truncate text-body-sm text-muted-foreground">{{ row.cart.lines.map((l) => l.name).join(ar ? "، " : ", ") }}</span>
        </div>
        <div class="flex flex-col gap-0.5 text-body-sm">
          <NqStoreMoney :amount="cartValue(row.cart)" :currency="currency" class="font-medium" />
          <span class="text-muted-foreground"><NqNum :value="cartItemCount(row.cart)" /> {{ t.items }}</span>
        </div>
        <div class="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
          <span>{{ t.stage[row.cart.stage] }}</span>
          <span>{{ row.idle }}</span>
        </div>
        <div class="flex flex-col items-start gap-1">
          <NqBadge :variant="STATUS_VARIANT[row.status]">{{ t.recovery[row.status] }}</NqBadge>
          <span v-if="row.cart.emailsSent > 0" class="text-caption text-muted-foreground">
            {{ t.emailsSent(row.cart.emailsSent) }}<template v-if="row.cart.lastEmailAt">{{ " · " }}<NqDateTime :value="row.cart.lastEmailAt" :format="{ dateStyle: 'medium' }" /></template>
          </span>
        </div>
        <div class="ms-auto flex flex-col items-end gap-1">
          <NqButton size="sm" variant="secondary" :disabled="!row.gate.ok || !props.onSendRecovery" @click="open(row.cart)">
            <Mail aria-hidden="true" />
            {{ t.sendRecovery }}
          </NqButton>
          <span v-if="row.why" class="text-caption text-muted-foreground">{{ row.why }}</span>
        </div>
      </li>
    </ul>

    <NqDialog :open="target !== null" @update:open="(o: boolean) => !o && (target = null)">
      <NqDialogContent class="max-w-md">
        <form v-if="target" class="flex flex-col gap-4" @submit.prevent="send">
          <NqDialogHeader>
            <NqDialogTitle>{{ t.recoveryTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ t.recoveryText }} <bdi dir="ltr">{{ target.customer?.email }}</bdi></NqDialogDescription>
          </NqDialogHeader>
          <label class="flex flex-col gap-1 text-body-sm">
            <span class="font-medium">{{ t.discountPercent }}</span>
            <NqInput v-model="percent" type="number" inputmode="numeric" min="0" :max="props.maxDiscountPercent" />
            <span class="text-caption text-muted-foreground">
              {{ t.discountHint(props.maxDiscountPercent) }}<template v-if="pct > 0">{{ " " }}<NqStoreMoney :amount="recoveryDiscount(cartValue(target), pct)" :currency="currency" /></template>
            </span>
          </label>
          <label class="flex flex-col gap-1 text-body-sm">
            <span class="font-medium">{{ t.recoveryMessage }}</span>
            <NqTextarea v-model="message" :rows="3" :placeholder="t.recoveryPlaceholder" />
          </label>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" @click="target = null">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary">
              <Mail aria-hidden="true" />
              {{ t.sendRecovery }}
            </NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
