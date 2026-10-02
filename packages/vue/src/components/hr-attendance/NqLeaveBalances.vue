<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqProgress } from "../progress";
import { NqSkeleton } from "../states";
import { leaveBalance, todayKey, type LeaveBalance, type LeaveCalendar, type LeaveRequestLike } from "./hr-math";
import { useHrStrings, type HrAttendanceLabels } from "./strings";
import type { LeaveType } from "./types";

// One card per leave type: days left, a bar of used and pending against the entitlement, and how the type accrues.
const props = withDefaults(
  defineProps<{
    types: readonly LeaveType[];
    /** The person's requests. Approved ones count as used, pending ones as held. */
    requests: readonly LeaveRequestLike[];
    /** The leave year. Default: the year of `asOf`. */
    year?: number;
    /** The day the balances are worked out for, "2026-09-30". Default today. */
    asOf?: string;
    /** Days carried in from last year, by type id. */
    carriedOver?: Readonly<Record<string, number>>;
    calendar?: LeaveCalendar;
    /** Shows a Request leave button on each card. */
    onRequest?: (typeId: string) => void;
    loading?: boolean;
    labels?: HrAttendanceLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { year: undefined, asOf: undefined, carriedOver: undefined, calendar: undefined, onRequest: undefined, loading: false, labels: undefined },
);

const { t, n } = useHrStrings(() => props.labels);
const titleId = `nq-leave-balances-${useId()}`;
const cards = computed(() => {
  const today = props.asOf ?? todayKey();
  const y = props.year ?? Number(today.slice(0, 4));
  return props.types.map((type) => {
    const b: LeaveBalance = leaveBalance(type, props.requests, { year: y, asOf: today, carriedOver: props.carriedOver?.[type.id], calendar: props.calendar });
    return { type, b, limited: type.limited !== false };
  });
});
</script>

<template>
  <section data-slot="leave-balances" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <h2 :id="titleId" class="text-h3 text-foreground">{{ t.balances }}</h2>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <NqCard v-for="{ type, b, limited } in cards" :key="type.id" data-slot="leave-balance" :data-type="type.id" class="gap-3 px-0">
        <NqCardHeader>
          <NqCardTitle as="h3" class="text-body font-medium">{{ type.name }}</NqCardTitle>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-2">
          <NqSkeleton v-if="props.loading" class="h-8 w-24" />
          <p v-else-if="limited" class="flex items-baseline gap-1.5 text-foreground">
            <span class="text-h2 font-semibold tabular-nums">{{ n(b.available) }}</span>
            <span class="text-body-sm text-muted-foreground">{{ t.remaining }}</span>
          </p>
          <p v-else class="flex items-baseline gap-1.5 text-foreground">
            <span class="text-h3 font-semibold">{{ t.unlimited }}</span>
            <span class="text-body-sm text-muted-foreground">{{ t.daysTaken(n(b.used)) }}</span>
          </p>
          <NqProgress
            v-if="limited"
            size="sm"
            :aria-label="`${type.name}: ${t.used}`"
            :value="b.entitled ? Math.min(100, Math.round(((b.used + b.pending) / b.entitled) * 100)) : 0"
            :tone="b.remaining <= 0 ? 'danger' : 'default'"
            :show-value="false"
          />
          <dl v-if="limited" class="grid grid-cols-3 gap-2 text-caption">
            <div>
              <dt class="text-muted-foreground">{{ t.entitled }}</dt>
              <dd class="tabular-nums text-foreground">{{ n(b.entitled) }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t.used }}</dt>
              <dd class="tabular-nums text-foreground">{{ n(b.used) }}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t.pendingDays }}</dt>
              <dd class="tabular-nums text-foreground">{{ n(b.pending) }}</dd>
            </div>
          </dl>
          <p class="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
            <span v-if="(type.accrual ?? 'upfront') === 'monthly'">{{ t.accrues }}</span>
            <span v-if="type.carryOverMax">{{ t.carry(n(type.carryOverMax)) }}</span>
          </p>
        </NqCardContent>
        <NqCardContent v-if="props.onRequest">
          <NqButton size="sm" @click="props.onRequest?.(type.id)">
            <Plus aria-hidden="true" />
            {{ t.requestLeave }}
          </NqButton>
        </NqCardContent>
      </NqCard>
    </div>
  </section>
</template>
