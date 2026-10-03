<script setup lang="ts">
import { TriangleAlert } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, useFormatNumber, type FormatNumberOptions } from "../numeric";
import { ringFraction, ringGeometry, ringToneFor, type RingTone } from "./chart-extras-math";
import { CHART_EXTRAS_STRINGS, type ChartExtrasLabels } from "./strings";

// A ring that fills clockwise (counter-clockwise in RTL) with the figure in its middle. Tone comes with the figure and
// an optional `caption`, and `tone="auto"` adds a warning icon beyond `warnAt`, so meaning never rests on colour alone.
const PERCENT_WHOLE: FormatNumberOptions = { style: "percent", maximumFractionDigits: 0 };
const ringStroke: Record<RingTone, string> = {
  default: "var(--primary)",
  info: "var(--nq-info)",
  success: "var(--nq-success)",
  warning: "var(--nq-warning)",
  danger: "var(--nq-danger)",
};

const props = withDefaults(
  defineProps<{
    value: number;
    /** Value that fills the ring. Default 100. */
    max?: number;
    min?: number;
    /** Fixed tone, or "auto" to go warning at `warnAt` and danger at `dangerAt` of the range (usage). Default "default". */
    tone?: RingTone | "auto";
    warnAt?: number;
    dangerAt?: number;
    /** Diameter in px. Default 96. */
    size?: number;
    /** Stroke width in a 100 unit box. Default 8. */
    thickness?: number;
    /** Small text under the middle figure. (Or the `caption` slot.) */
    caption?: string;
    /** Accessible name: what is being measured. */
    label: string;
    /** Text read out with the value. Default: "<n>% complete". */
    valueText?: string;
    labels?: Partial<ChartExtrasLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { max: 100, min: 0, tone: "default", warnAt: 0.8, dangerAt: 0.95, size: 96, thickness: 8, caption: undefined, valueText: undefined, labels: undefined },
);

const t = useAnalyticsLabels(CHART_EXTRAS_STRINGS, () => props.labels);
const fmt = useFormatNumber();
const fraction = computed(() => ringFraction(props.value, props.max, props.min));
const resolved = computed<RingTone>(() => (props.tone === "auto" ? ringToneFor(fraction.value, props.warnAt, props.dangerAt) : props.tone));
const geo = computed(() => ringGeometry(fraction.value, props.thickness));
const pct = computed(() => fmt(fraction.value, PERCENT_WHOLE));
</script>

<template>
  <div
    data-slot="progress-ring"
    :data-tone="resolved"
    role="progressbar"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="Math.min(max, Math.max(min, value))"
    :aria-valuetext="valueText ?? t.ring(pct)"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :class="cn('relative inline-grid shrink-0 place-items-center', props.class)"
  >
    <svg viewBox="0 0 100 100" aria-hidden="true" class="absolute inset-0 size-full -rotate-90 rtl:-scale-x-100 rtl:rotate-90">
      <circle cx="50" cy="50" :r="geo.radius" fill="none" :stroke-width="thickness" class="stroke-nq-surface-soft" />
      <circle
        v-if="fraction > 0"
        cx="50"
        cy="50"
        :r="geo.radius"
        fill="none"
        :stroke-width="thickness"
        :stroke-linecap="fraction >= 1 ? 'butt' : 'round'"
        :stroke-dasharray="`${geo.dash} ${geo.gap}`"
        :style="{ stroke: ringStroke[resolved] }"
        class="transition-[stroke-dasharray] duration-300 ease-nq motion-reduce:transition-none"
      />
    </svg>
    <div class="relative flex max-w-[70%] flex-col items-center text-center leading-tight">
      <span class="inline-flex items-center gap-1 text-label tabular-nums text-foreground" :style="{ fontSize: `${Math.max(11, size * 0.2)}px` }">
        <TriangleAlert v-if="resolved === 'danger' || resolved === 'warning'" aria-hidden="true" class="size-[0.8em] shrink-0" />
        <slot><NqNum :value="fraction" :format="PERCENT_WHOLE" /></slot>
      </span>
      <span v-if="caption || $slots.caption" class="text-caption text-muted-foreground"><slot name="caption">{{ caption }}</slot></span>
    </div>
  </div>
</template>
