<script setup lang="ts">
import { Star } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import { NqRating } from "../rating";
import { useReviewStrings, type ProductReviewsLabels } from "./labels";
import { fitSummary, histogramPercent, STAR_LEVELS, type ReviewFit, type ReviewSummary, type StarLevel } from "./review-logic";

// The rating at a glance: the average, the review count and a star histogram. Each histogram row is a toggle button:
// choose it to filter the reviews to that many stars. Without `selectable` the histogram is read-only.
interface Props {
  summary: ReviewSummary;
  /** Star levels currently filtering the list; their rows are pressed. */
  selectedStars?: readonly StarLevel[];
  /** Render the histogram rows as toggle buttons (they emit `toggle-star`). */
  selectable?: boolean;
  /** Fit split from the reviews, shown as a three-way bar when at least one reviewer answered. */
  fit?: ReturnType<typeof fitSummary>;
  labels?: ProductReviewsLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ "toggle-star": [level: StarLevel] }>();
const { t } = useReviewStrings(() => props.labels);
const fmt = useFormatNumber();
const selected = computed(() => new Set<number>(props.selectedStars ?? []));
const fitRows = computed<{ key: ReviewFit; label: string; pct: number }[]>(() =>
  props.fit && props.fit.answered
    ? [
        { key: "small", label: t.value.fitSmall, pct: props.fit.small },
        { key: "true", label: t.value.fitTrue, pct: props.fit.true },
        { key: "large", label: t.value.fitLarge, pct: props.fit.large },
      ]
    : [],
);
const pct = (n: number) => fmt(n / 100, { style: "percent" });
</script>

<template>
  <section data-slot="product-review-summary" :aria-label="t.reviews" :class="cn('grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10', props.class)">
    <div class="flex flex-col gap-1">
      <p class="flex items-baseline gap-2">
        <bdi class="text-display tabular-nums text-foreground">{{ fmt(summary.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }}</bdi>
        <span class="text-body text-muted-foreground">/ <bdi>{{ fmt(5) }}</bdi></span>
      </p>
      <NqRating :value="summary.average" :count="summary.count" :count-label="t.reviewsCount" />
      <p class="text-caption text-muted-foreground">{{ t.basedOn(fmt(summary.count), summary.count) }}</p>
    </div>
    <div class="flex min-w-0 flex-col gap-4">
      <ul role="group" :aria-label="t.histogram" class="flex flex-col gap-1">
        <li v-for="level in STAR_LEVELS" :key="level">
          <component
            :is="selectable ? 'button' : 'div'"
            :type="selectable ? 'button' : undefined"
            :aria-pressed="selectable ? selected.has(level) : undefined"
            :aria-label="selectable ? t.filterByStars(fmt(level), fmt(summary.histogram[level])) : `${t.starsRow(fmt(level))}, ${fmt(summary.histogram[level])}`"
            :role="selectable ? undefined : 'text'"
            :class="
              selectable
                ? cn(
                    'flex w-full items-center gap-3 rounded-control px-2 py-1 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
                    selected.has(level) && 'bg-nq-selected',
                  )
                : 'flex items-center gap-3 px-2 py-1'
            "
            @click="selectable && emit('toggle-star', level)"
          >
            <span class="inline-flex w-9 shrink-0 items-center gap-1 text-label tabular-nums text-foreground">
              <bdi>{{ fmt(level) }}</bdi>
              <Star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />
            </span>
            <span aria-hidden="true" class="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
              <span class="absolute inset-y-0 start-0 rounded-full bg-nq-accent transition-[width] duration-300 ease-nq motion-reduce:transition-none" :style="{ width: `${histogramPercent(summary.histogram, level, summary.count)}%` }" />
            </span>
            <span class="w-10 shrink-0 text-end text-caption tabular-nums text-muted-foreground">
              <bdi>{{ fmt(summary.histogram[level]) }}</bdi>
            </span>
          </component>
        </li>
      </ul>
      <div v-if="fitRows.length > 0" class="flex flex-col gap-1.5">
        <p class="text-label text-foreground">{{ t.fitSummary(fmt(fit!.answered)) }}</p>
        <div role="img" :aria-label="fitRows.map((r) => `${r.label} ${pct(r.pct)}`).join(', ')" class="flex h-2 overflow-hidden rounded-full bg-secondary">
          <span v-for="(r, i) in fitRows" :key="r.key" :class="cn('h-full', i === 1 ? 'bg-nq-success' : 'bg-nq-line-strong')" :style="{ width: `${r.pct}%` }" />
        </div>
        <ul class="flex justify-between gap-2 text-caption text-muted-foreground">
          <li v-for="r in fitRows" :key="r.key">
            {{ r.label }} <bdi class="tabular-nums">{{ pct(r.pct) }}</bdi>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
