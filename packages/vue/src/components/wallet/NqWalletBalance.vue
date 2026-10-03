<script setup lang="ts">
import { Eye, EyeOff, Landmark, Plus, WalletCards } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqSparkline } from "../chart";
import { NqNum } from "../numeric";
import { NqSkeleton } from "../states";
import { walletStrings, type WalletLabels } from "./strings";

// The balance card: a large figure that can be hidden, pending money, a trend line, and Add funds / Withdraw.
interface Props {
  balance: number;
  /** Money on its way in or out that is not yet in the balance. */
  pending?: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Balance for the last days, oldest first, for the trend line. */
  trend?: readonly number[];
  /** Shows the Add funds button. */
  onTopUp?: () => void;
  /** Shows the Withdraw button (disabled while the balance is zero). */
  onPayout?: () => void;
  loading?: boolean;
  labels?: WalletLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { pending: undefined, currency: undefined, trend: undefined, onTopUp: undefined, onPayout: undefined, loading: false });
const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => walletStrings(nq.locale.value, props.labels));
const hidden = ref(false);
const money = computed(() => ({ style: "currency", currency: currency.value }) as const);
const pendingMoney = computed(() => ({ ...money.value, signDisplay: "exceptZero" }) as const);
</script>

<template>
  <NqCard data-slot="wallet-balance" :aria-busy="props.loading || undefined" :class="cn('gap-4 px-0', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2" class="flex items-center gap-2 text-muted-foreground">
        <WalletCards aria-hidden="true" class="size-4" />
        {{ t.balance }}
      </NqCardTitle>
      <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
        <NqButton size="icon-sm" variant="ghost" :aria-pressed="hidden" :aria-label="hidden ? t.show : t.hide" @click="hidden = !hidden">
          <EyeOff v-if="hidden" aria-hidden="true" />
          <Eye v-else aria-hidden="true" />
        </NqButton>
      </div>
    </NqCardHeader>
    <NqCardContent class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1">
        <NqSkeleton v-if="props.loading" class="h-9 w-40" />
        <p v-else-if="hidden" class="text-h1 tracking-tight text-foreground" :aria-label="t.hidden">
          <span aria-hidden="true">••••••</span>
        </p>
        <p v-else class="text-h1 font-semibold tracking-tight text-foreground">
          <NqNum :value="props.balance" :format="money" />
        </p>
        <p v-if="props.pending" class="text-body-sm text-muted-foreground">
          {{ t.pending }}: <span v-if="hidden" aria-hidden="true">••••</span><NqNum v-else :value="props.pending" :format="pendingMoney" />
        </p>
      </div>
      <NqSparkline v-if="props.trend && props.trend.length > 1 && !hidden" :data="props.trend" :label="t.trend" class="h-10 w-32" />
    </NqCardContent>
    <NqCardContent v-if="props.onTopUp || props.onPayout" class="flex flex-wrap gap-2">
      <NqButton v-if="props.onTopUp" variant="primary" @click="props.onTopUp()">
        <Plus aria-hidden="true" />
        {{ t.topUp }}
      </NqButton>
      <NqButton v-if="props.onPayout" :disabled="props.balance <= 0" @click="props.onPayout()">
        <Landmark aria-hidden="true" />
        {{ t.payout }}
      </NqButton>
    </NqCardContent>
  </NqCard>
</template>
