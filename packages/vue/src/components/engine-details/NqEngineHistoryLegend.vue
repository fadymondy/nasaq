<script setup lang="ts">
import { CircleCheck, CircleDashed, CircleX } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useHealthLabels } from "../engine-card/health-format";
import { CELL, GLYPH_TONE } from "./cell";
import { STRIP_STRINGS, type HistoryStripLabels } from "./strings";

// The three verdicts with their shape and words. Put it under a strip or chart.
interface Props {
  labels?: Partial<HistoryStripLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const { t } = useHealthLabels(STRIP_STRINGS, () => props.labels);
const GLYPH = { on_protocol: CircleCheck, off_protocol: CircleX, unevaluated: CircleDashed } as const;
const VERDICTS = ["on_protocol", "off_protocol", "unevaluated"] as const;
</script>

<template>
  <ul data-slot="engine-history-legend" :aria-label="t.legend" :class="cn('m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground', props.class)">
    <li v-for="v in VERDICTS" :key="v" class="flex items-center gap-1.5">
      <span aria-hidden="true" :class="cn('size-3', CELL[v])" />
      <component :is="GLYPH[v]" aria-hidden="true" :class="cn('size-3.5', GLYPH_TONE[v])" />
      {{ t.verdicts[v] }}
    </li>
  </ul>
</template>
