<script setup lang="ts">
import { Award } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqDateTime } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { useLoyaltyStrings, type LoyaltyPromoLabels } from "./strings";
import type { PointsEntry, PointsEntryKind } from "./types";

// The points ledger, newest first: what was earned, redeemed or lapsed, with the balance after each line.
// Direction is a sign and a label, not colour alone.
interface Props {
  entries: readonly PointsEntry[];
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { loading: false, labels: undefined });
const { t, n } = useLoyaltyStrings(() => props.labels);
const titleId = `nq-points-${useId()}`;
const KIND_TONE: Record<PointsEntryKind, StatusTone> = { earn: "success", redeem: "info", expire: "warning", adjust: "neutral" };
const sorted = computed(() => [...props.entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
const sign = (p: number) => (p > 0 ? "+" : p < 0 ? "−" : "");
</script>

<template>
  <section data-slot="points-history" :aria-labelledby="titleId" :class="cn('flex flex-col gap-2', props.class)">
    <h2 :id="titleId" class="text-h3 text-foreground">{{ t.history }}</h2>
    <div v-if="props.loading" aria-busy="true" class="flex flex-col gap-2">
      <NqSkeleton class="h-12 w-full" />
      <NqSkeleton class="h-12 w-full" />
    </div>
    <NqEmptyState v-else-if="sorted.length === 0" :icon="Award" :title="t.noHistory" :description="t.noHistoryHint" />
    <ul v-else class="flex flex-col divide-y divide-border rounded-card border border-border">
      <li v-for="e in sorted" :key="e.id" class="flex items-center justify-between gap-3 px-3 py-2.5">
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="truncate text-body-sm text-foreground">{{ e.note }}</span>
          <span class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
            <NqStatus :tone="KIND_TONE[e.kind]">{{ t.kinds[e.kind] }}</NqStatus>
            <NqDateTime :value="e.date" :format="{ dateStyle: 'medium' }" />
          </span>
        </div>
        <div class="flex shrink-0 flex-col items-end">
          <span class="text-body-sm font-medium tabular-nums text-foreground">
            <bdi dir="ltr">{{ sign(e.points) }}{{ n(Math.abs(e.points)) }}</bdi>
          </span>
          <span v-if="e.balanceAfter !== undefined" class="text-caption text-muted-foreground">{{ t.balanceAfter(n(e.balanceAfter)) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
