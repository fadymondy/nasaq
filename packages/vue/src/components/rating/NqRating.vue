<script setup lang="ts">
import { Star } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useFormatNumber } from "../numeric";

// A single star, the average and an optional count: "★ 4.8 · 2.1K workspaces". One star, not five: a row of
// part-filled stars is hard to read at small sizes and says nothing the number doesn't.
interface Props {
  /** Average score, e.g. 4.8. */
  value: number;
  /** Top of the scale. Default 5. */
  max?: number;
  /** How many people or workspaces rated or use it. Shown compact: 2.1K. */
  count?: number;
  /** What `count` counts: "workspaces", "reviews". Localise it. */
  countLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { max: 5, count: undefined, countLabel: undefined });
const nq = useNasaq();
const fmt = useFormatNumber();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const score = computed(() => fmt(props.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const total = computed(() => (props.count === undefined ? "" : fmt(props.count, { notation: "compact" })));
const spoken = computed(() => {
  const tail = props.count === undefined ? "" : `, ${total.value} ${props.countLabel ?? ""}`;
  return (ar.value ? `التقييم ${score.value} من ${props.max}${props.count === undefined ? "" : `، ${total.value} ${props.countLabel ?? ""}`}` : `Rated ${score.value} out of ${props.max}${tail}`).trim();
});
</script>

<template>
  <span data-slot="rating" :class="cn('inline-flex items-center gap-1.5 text-caption text-muted-foreground', props.class)">
    <span class="sr-only">{{ spoken }}</span>
    <Star aria-hidden="true" class="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
    <bdi aria-hidden="true" class="tabular-nums text-foreground">{{ score }}</bdi>
    <span v-if="props.count !== undefined" aria-hidden="true" class="truncate">
      <span class="me-1.5">·</span>
      <bdi class="tabular-nums">{{ total }}</bdi>
      <template v-if="props.countLabel">{{ ` ${props.countLabel}` }}</template>
    </span>
  </span>
</template>
