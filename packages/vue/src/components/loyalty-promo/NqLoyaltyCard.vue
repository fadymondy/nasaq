<script setup lang="ts">
import { Award } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqRewardCard } from "../gamification";
import { NqDateTime } from "../numeric";
import { NqProgress } from "../progress";
import { NqQrCode } from "../qr-code";
import { NqSkeleton } from "../states";
import { expiringPoints, loyaltyTier, type PointsLot } from "./loyalty-logic";
import { dayOf, todayKey, useLoyaltyStrings, type LoyaltyPromoLabels, type LoyaltyResult } from "./strings";
import type { LoyaltyReward, LoyaltyTier } from "./types";

// A customer's loyalty status: points balance, tier with progress to the next, expiring points, a scannable member code and rewards to redeem.
interface Props {
  /** The customer's name. */
  name: string;
  /** Spendable points. */
  balance: number;
  /** Points earned over all time, which decides the tier. Default `balance`. */
  lifetimePoints?: number;
  tiers?: readonly LoyaltyTier[];
  /** Points with expiry dates. The soonest lapse inside `expiryWarningDays` is called out. */
  lots?: readonly PointsLot[];
  /** Default 30. */
  expiryWarningDays?: number;
  /** Day key used for expiry maths. Default today. */
  asOf?: string;
  memberSince?: Date | number | string;
  /** Shown as a QR code the till can scan. */
  memberCode?: string;
  rewards?: readonly LoyaltyReward[];
  /** Redeems a reward. Resolve `{ error }` to show a message. */
  onRedeem?: (reward: LoyaltyReward) => Promise<LoyaltyResult>;
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  lifetimePoints: undefined,
  tiers: undefined,
  lots: undefined,
  expiryWarningDays: 30,
  asOf: undefined,
  memberSince: undefined,
  memberCode: undefined,
  rewards: undefined,
  onRedeem: undefined,
  loading: false,
  labels: undefined,
});
const { t, n } = useLoyaltyStrings(() => props.labels);
const state = computed(() => (props.tiers?.length ? loyaltyTier(props.lifetimePoints ?? props.balance, props.tiers) : null));
const soon = computed(() => (props.lots ? expiringPoints(props.lots, props.asOf ?? todayKey(), props.expiryWarningDays) : null));
const titleId = `nq-loyalty-${useId()}`;
const claim = (r: LoyaltyReward) => (props.onRedeem ? () => props.onRedeem!(r).then((x) => (x ? x : undefined)) : undefined);
</script>

<template>
  <NqCard v-if="props.loading" data-slot="loyalty-card" aria-busy="true" :class="cn('gap-4 p-4', props.class)">
    <NqSkeleton class="h-5 w-1/3" />
    <NqSkeleton class="h-10 w-1/2" />
    <NqSkeleton class="h-2 w-full" />
  </NqCard>
  <NqCard v-else data-slot="loyalty-card" :aria-labelledby="titleId" :class="cn('gap-4 px-0', props.class)">
    <NqCardHeader class="items-start">
      <div class="flex min-w-0 flex-col gap-0.5">
        <NqCardTitle as="h2" :id="titleId">{{ props.name }}</NqCardTitle>
        <p v-if="props.memberSince" class="text-caption text-muted-foreground">
          {{ t.memberSince("") }}<NqDateTime :value="props.memberSince" :format="{ dateStyle: 'medium' }" />
        </p>
      </div>
      <NqBadge v-if="state?.tier" variant="brand">
        <Award aria-hidden="true" />
        {{ state.tier.name }}
      </NqBadge>
    </NqCardHeader>
    <NqCardContent class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div class="flex min-w-0 flex-col gap-3">
        <p class="flex flex-col">
          <span class="text-caption text-muted-foreground">{{ t.pointsBalance }}</span>
          <span class="flex items-baseline gap-1.5">
            <span class="text-display font-semibold tabular-nums text-foreground">{{ n(props.balance) }}</span>
            <span class="text-body-sm text-muted-foreground">{{ t.points }}</span>
          </span>
        </p>
        <div v-if="state" class="flex flex-col gap-1.5">
          <NqProgress size="md" :aria-label="t.tier" :value="state.progress" :show-value="false" />
          <p class="text-caption text-muted-foreground">{{ state.next ? t.toNext(n(state.toNext), state.next.name) : t.topTier }}</p>
          <p v-if="state.tier?.perk" class="text-caption text-foreground">{{ state.tier.perk }}</p>
        </div>
        <p v-if="soon && soon.points > 0 && soon.on" role="status" class="rounded-card bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
          {{ t.expiring(n(soon.points), "") }}<NqDateTime :value="dayOf(soon.on)" :format="{ dateStyle: 'medium' }" />
        </p>
      </div>
      <div v-if="props.memberCode" class="flex flex-col items-center gap-1.5">
        <NqQrCode :value="props.memberCode" :size="112" :label="`${t.memberCode}: ${props.memberCode}`" />
        <bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{ props.memberCode }}</bdi>
      </div>
    </NqCardContent>
    <NqCardContent v-if="props.rewards" class="flex flex-col gap-2">
      <h3 class="text-label text-foreground">{{ t.rewards }}</h3>
      <p v-if="props.rewards.length === 0" class="text-body-sm text-muted-foreground">{{ t.noRewards }}</p>
      <div v-else class="grid gap-3 sm:grid-cols-2">
        <NqRewardCard v-for="r in props.rewards" :key="r.id" :title="r.title" :description="r.description" :cost="r.cost" :balance="props.balance" :on-claim="claim(r)">
          <template v-if="r.art" #art><component :is="r.art" /></template>
        </NqRewardCard>
      </div>
    </NqCardContent>
  </NqCard>
</template>
