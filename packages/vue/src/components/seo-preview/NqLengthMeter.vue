<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqMeter } from "../progress";
import { NqStatus } from "../status";
import { lengthMeter, type LengthStatus, type SeoField } from "./seo-math";
import { SEO_STRINGS, type SeoPreviewLabels } from "./seo-strings";

// A character-count meter for a title or meta description: the count against the limit, a toned bar and the verdict in words.
interface Props {
  field: SeoField;
  text: string;
  /** Visible name, e.g. "Title". Default: the field name. */
  label?: string;
  labels?: Partial<SeoPreviewLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { label: undefined, labels: undefined });
const t = useAnalyticsLabels(SEO_STRINGS, () => props.labels);
const TONE: Record<LengthStatus, "neutral" | "warning" | "success" | "danger"> = { empty: "neutral", short: "warning", good: "success", long: "danger" };
const m = computed(() => lengthMeter(props.field, props.text));
const tone = computed(() => TONE[m.value.status]);
const verdict = computed(() => (m.value.status === "long" ? t.value.long(m.value.over) : t.value[m.value.status]));
const name = computed(() => props.label ?? (props.field === "title" ? t.value.fieldTitle : t.value.fieldDescription));
</script>

<template>
  <div data-slot="length-meter" :data-status="m.status" :class="cn('flex flex-col gap-1.5', props.class)">
    <div class="flex items-baseline justify-between gap-3 text-caption">
      <span class="min-w-0 truncate text-muted-foreground">{{ name }}</span>
      <bdi class="shrink-0 tabular-nums text-muted-foreground">{{ t.length(m.length, m.max) }}</bdi>
    </div>
    <NqMeter :value="m.length" :min="0" :max="m.max" :tone="tone === 'neutral' ? 'default' : tone" size="sm" :aria-label="t.lengthOf(name)" :value-text="t.length(m.length, m.max)" :show-value="false" />
    <NqStatus :tone="tone" class="text-caption">{{ verdict }}</NqStatus>
  </div>
</template>
