<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import { RANK_BUCKETS, type RankBucket, type RankDistribution } from "./rank-math";

// Keywords by ranking band, top 3, 4 to 10, 11 to 100 and not ranking, as one stacked bar with a legend of counts and shares.
const BUCKET_BAR: Record<RankBucket, string> = { top3: "bg-nq-success", top10: "bg-nq-info", top100: "bg-nq-warning", unranked: "bg-nq-line-strong" };

const props = defineProps<{
  distribution: RankDistribution;
  title?: string;
  description?: string;
  labels?: Partial<KeywordTrackerLabels>;
  class?: HTMLAttributes["class"];
}>();
const t = useAnalyticsLabels(KEYWORD_STRINGS, () => props.labels);
const pct = (n: number) => (props.distribution.total > 0 ? n / props.distribution.total : 0);
const summary = computed(() => {
  const fmt = (n: number) => new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 }).format(pct(n));
  return RANK_BUCKETS.map((b) => t.value.bucketCount(t.value.bucket[b], props.distribution[b], fmt(props.distribution[b]))).join(". ");
});
const percent = { style: "percent", maximumFractionDigits: 0 } as const;
</script>

<template>
  <NqCard data-slot="rank-distribution" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ props.title ?? t.distributionTitle }}</NqCardTitle>
      <NqCardDescription>{{ props.description ?? t.distributionDescription }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <div role="img" :aria-label="summary" class="flex h-3 w-full overflow-hidden rounded-full bg-nq-surface-soft">
        <template v-for="b in RANK_BUCKETS" :key="b">
          <span v-if="props.distribution[b] > 0" :data-bucket="b" :class="cn('h-full', BUCKET_BAR[b])" :style="{ width: `${pct(props.distribution[b]) * 100}%` }" />
        </template>
      </div>
      <ul class="grid grid-cols-2 gap-x-4 gap-y-3">
        <li v-for="b in RANK_BUCKETS" :key="b" :data-bucket="b" class="flex items-start gap-2">
          <span aria-hidden="true" :class="cn('mt-1.5 size-2.5 shrink-0 rounded-full', BUCKET_BAR[b])" />
          <div class="flex min-w-0 flex-col leading-tight">
            <span class="text-caption text-muted-foreground">{{ t.bucket[b] }}</span>
            <span class="text-label text-foreground">
              <NqNum :value="props.distribution[b]" />
              <span class="text-caption font-normal text-muted-foreground"> <NqNum :value="pct(props.distribution[b])" :format="percent" /></span>
            </span>
          </div>
        </li>
      </ul>
    </NqCardContent>
  </NqCard>
</template>
