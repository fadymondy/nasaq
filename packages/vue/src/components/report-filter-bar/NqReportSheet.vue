<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { formatDate } from "../numeric";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { REPORT_FILTER_STRINGS, type ReportFilterBarLabels } from "./strings";

// The page a report prints on. On screen it is a bordered sheet; when printed it drops the frame and everything else on the
// page, breaks between sections, and keeps colours. Anything with `data-print-hide` (or `print:hidden`) stays off paper.
// Write chart and table sections as `<section>` so a page break never cuts one in half.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  [data-slot="report-sheet"], [data-slot="report-sheet"] * { visibility: visible !important; }
  [data-slot="report-sheet"] { position: absolute; inset-inline-start: 0; inset-block-start: 0; width: 100%; box-shadow: none; border: 0; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  [data-slot="report-sheet"] [data-print-hide] { display: none !important; }
  [data-slot="report-sheet"] section, [data-slot="report-sheet"] tr, [data-slot="report-sheet"] figure { break-inside: avoid; }
}
@page { margin: 14mm; }`;

interface Props {
  title?: string;
  subtitle?: string;
  /** What the report was filtered by, printed under the title so a paper copy is self-explanatory. */
  filters?: readonly { label: string; value: string }[];
  /** When the report was made. Default: now, when it first shows. */
  generatedAt?: Date;
  timeZone?: string;
  class?: HTMLAttributes["class"];
  labels?: Partial<ReportFilterBarLabels>;
}
const props = withDefaults(defineProps<Props>(), { title: undefined, subtitle: undefined, filters: undefined, generatedAt: undefined, timeZone: undefined, labels: undefined });
defineSlots<{ default?: () => unknown; title?: () => unknown; subtitle?: () => unknown; toolbar?: () => unknown; footer?: () => unknown }>();

const t = useAnalyticsLabels(REPORT_FILTER_STRINGS, () => props.labels);
const nq = useNasaq();
const made = props.generatedAt ?? new Date();
const stamp = computed(() => formatDate(made, nq.locale.value, { dateStyle: "medium", timeStyle: "short", ...(props.timeZone ? { timeZone: props.timeZone } : {}) }));
</script>

<template>
  <article data-slot="report-sheet" :class="cn('flex w-full min-w-0 flex-col gap-6 rounded-card border border-border bg-card p-4 sm:p-6', props.class)">
    <component :is="'style'">{{ PRINT_CSS }}</component>
    <header class="flex flex-col gap-2 border-b border-border pb-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <h1 class="text-title text-foreground"><slot name="title">{{ props.title }}</slot></h1>
          <p v-if="$slots.subtitle || props.subtitle" class="text-body text-muted-foreground"><slot name="subtitle">{{ props.subtitle }}</slot></p>
        </div>
        <div v-if="$slots.toolbar" data-print-hide class="flex items-center gap-2 print:hidden"><slot name="toolbar" /></div>
      </div>
      <dl v-if="props.filters?.length" :aria-label="t.reportFilters" class="flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
        <div v-for="f in props.filters" :key="f.label" class="flex gap-1.5">
          <dt class="text-muted-foreground">{{ f.label }}:</dt>
          <dd class="text-foreground">{{ f.value }}</dd>
        </div>
      </dl>
      <p class="text-caption text-muted-foreground">{{ t.generated }} {{ stamp }}</p>
    </header>
    <slot />
    <footer v-if="$slots.footer" class="border-t border-border pt-3 text-caption text-muted-foreground"><slot name="footer" /></footer>
  </article>
</template>
