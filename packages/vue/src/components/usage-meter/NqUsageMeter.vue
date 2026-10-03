<script setup lang="ts">
import { CircleAlert, Infinity as InfinityIcon, TriangleAlert } from "lucide-vue-next";
import { computed, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqMeter } from "../progress";
import { useCurrency } from "../../provider";
import { formatAmount, useUsageLabels, type UsageKind, type UsageMeterLabels } from "./strings";
import { usageTone, type UsageThresholds, type UsageTone } from "./usage-math";

// A quantity used against its limit: a count, money or hours. The bar turns warning at 75% and danger at 90% (adjustable), and past
// the limit it says by how much. State is spelled out with an icon and text, never colour alone. Unlimited plans show the amount
// used and an Unlimited badge instead of a bar.
interface Props {
  /** What is metered: "Seats", "API calls", "Storage". Localise it. Or use the `label` slot. */
  label?: string;
  /** Plain-text name for the meter's accessible name, when the label is a slot. */
  ariaLabel?: string;
  used: number;
  /** The limit. `null` is unlimited: no bar, just the amount used. */
  limit: number | null;
  /** `count` (default) with an optional `unit`, `money` in `currency`, or `hours`. */
  kind?: UsageKind;
  /** Noun after a count: "seats", "GB". Localise it. */
  unit?: string;
  /** ISO 4217 code for `money`. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Fraction at which the fill turns warning (default 0.75) and danger (default 0.9). */
  thresholds?: UsageThresholds;
  /** A position on the bar as a fraction (0 to 1): how much of the period has gone. Draws a tick. */
  marker?: number;
  /** A line at the end of the row, for example a projection or "Resets on 1 Oct". Replaces the remaining amount. Or use the `hint` slot. */
  hint?: string;
  size?: "sm" | "md";
  labels?: UsageMeterLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { label: undefined, ariaLabel: undefined, kind: "count", unit: undefined, currency: undefined, thresholds: undefined, marker: undefined, hint: undefined, size: "md", labels: undefined });
const slots = useSlots();
const { locale, t } = useUsageLabels(() => props.labels);
const currency = useCurrency(() => props.currency);
const tone = computed<UsageTone>(() => usageTone(props.used, props.limit, props.thresholds));
const amount = (n: number) => formatAmount(n, props.kind, locale.value, t.value, props.unit, currency.value);
const hasHint = computed(() => props.hint !== undefined || !!slots.hint);

const meterTone = { ok: "default", warning: "warning", danger: "danger", over: "danger" } as const;
const statusText: Record<UsageTone, string> = { ok: "", warning: "text-nq-warning-text", danger: "text-nq-danger-text", over: "text-nq-danger-text" };
</script>

<template>
  <div data-slot="usage-meter" :data-tone="tone" :data-unlimited="limit === null ? true : undefined" :class="cn('flex min-w-0 flex-col gap-1.5', props.class)">
    <div class="flex items-baseline justify-between gap-3 text-body-sm">
      <span data-slot="usage-meter-label" class="min-w-0 truncate text-label text-foreground"><slot name="label">{{ label }}</slot></span>
      <span data-slot="usage-meter-value" class="shrink-0 text-muted-foreground tabular-nums">
        <bdi class="text-foreground">{{ amount(used) }}</bdi>
        <template v-if="limit !== null">
          {{ " " }}{{ t.of }} <bdi>{{ amount(limit) }}</bdi>
        </template>
      </span>
    </div>
    <div v-if="limit === null">
      <NqBadge variant="neutral" data-slot="usage-meter-unlimited">
        <InfinityIcon aria-hidden="true" />
        {{ t.unlimited }}
      </NqBadge>
    </div>
    <div v-else class="relative">
      <NqMeter
        :aria-label="ariaLabel ?? label"
        :size="size"
        :value="limit > 0 ? Math.min(used, limit) : used > 0 ? 1 : 0"
        :max="limit > 0 ? limit : 1"
        :tone="meterTone[tone]"
        :value-text="`${amount(used)} ${t.of} ${amount(limit)}`"
      />
      <span
        v-if="marker !== undefined"
        data-slot="usage-meter-marker"
        aria-hidden="true"
        class="pointer-events-none absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-foreground/60"
        :style="{ insetInlineStart: `${Math.min(100, Math.max(0, marker * 100))}%` }"
      />
    </div>
    <div v-if="limit !== null && (tone !== 'ok' || hasHint || limit > used)" class="flex flex-wrap items-center justify-between gap-x-3 text-caption text-muted-foreground">
      <span v-if="tone !== 'ok'" data-slot="usage-meter-status" :role="tone === 'over' ? 'alert' : undefined" :class="cn('inline-flex items-center gap-1 text-label', statusText[tone])">
        <component :is="tone === 'warning' ? TriangleAlert : CircleAlert" aria-hidden="true" class="size-3.5 shrink-0" />
        {{ tone === "over" ? t.over(amount(used - limit)) : tone === "danger" ? t.danger : t.warning }}
      </span>
      <span v-else />
      <span v-if="hasHint"><slot name="hint">{{ hint }}</slot></span>
      <span v-else-if="tone !== 'over'">{{ t.left(amount(Math.max(0, limit - used))) }}</span>
    </div>
  </div>
</template>
