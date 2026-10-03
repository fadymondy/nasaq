<script setup lang="ts">
import { computed, ref, type HTMLAttributes, type VNodeChild } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { changeRatio } from "../metric-tiles/analytics-math";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { NqSkeleton } from "../states";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";

// A top-N table where each row carries a bar sized against the largest value: the label, the measure, its share of the total
// and its change against the previous period. Used for channels, sources, pages, devices and countries.

const STRINGS = {
  en: { share: "Share", change: "Change", showAll: (n: number) => `Show all ${n}`, showLess: "Show fewer", empty: "No data for this period", top: (n: number) => `Top ${n}` },
  ar: { share: "النسبة", change: "التغيّر", showAll: (n: number) => `عرض الكل (${n})`, showLess: "عرض أقل", empty: "لا بيانات لهذه الفترة", top: (n: number) => `أعلى ${n}` },
};
export type BreakdownTableLabels = typeof STRINGS.en;

export interface BreakdownRow {
  id: string;
  /** What the row is: a channel, a page path, a device. Localise it. For a flag or icon use the `label` slot. */
  label: string;
  /** The measure for the current period. */
  value: number;
  /** The same measure for the previous period. Adds the change column. */
  previous?: number;
  /** Where the row goes, for example a page report. */
  href?: string;
}

export interface BreakdownColumn {
  id: string;
  header: string;
  /** The cell's content: text or a vnode. Or fill the `cell-<id>` slot. */
  cell?: (row: BreakdownRow) => VNodeChild;
  align?: "start" | "end";
}

const props = withDefaults(
  defineProps<{
    rows: readonly BreakdownRow[];
    title?: string;
    description?: string;
    /** Heading of the first column: "Channel", "Page". */
    dimensionLabel: string;
    /** Heading of the value column: "Sessions", "Clicks". */
    valueLabel: string;
    format?: FormatNumberOptions;
    /** Rows shown before "Show all". Default 8. */
    limit?: number;
    /** Show each row's share of the total. Default true. */
    showShare?: boolean;
    /** Lower is better (load time, errors), so a rise is the bad tone. */
    invert?: boolean;
    /** Bar colour, normally a token. Default the brand colour. */
    color?: string;
    /** Row labels are code, paths or URLs: keep them left-to-right inside RTL. */
    ltrLabels?: boolean;
    /** Extra columns after the value. */
    columns?: readonly BreakdownColumn[];
    /** Accessible name of the table. Default: the title. */
    label?: string;
    loading?: boolean;
    labels?: Partial<BreakdownTableLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    title: undefined,
    description: undefined,
    format: undefined,
    limit: 8,
    showShare: true,
    invert: false,
    color: "var(--primary)",
    ltrLabels: false,
    columns: undefined,
    label: undefined,
    loading: false,
    labels: undefined,
  },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const all = ref(false);
const sorted = computed(() => [...props.rows].sort((a, b) => b.value - a.value));
const total = computed(() => sorted.value.reduce((sum, r) => sum + r.value, 0));
const max = computed(() => sorted.value[0]?.value ?? 0);
const shown = computed(() => (all.value ? sorted.value : sorted.value.slice(0, props.limit)));
const hasPrevious = computed(() => props.rows.some((r) => r.previous !== undefined));

function view(row: BreakdownRow) {
  const delta = changeRatio(row.value, row.previous);
  const good = delta === undefined || delta === 0 ? undefined : delta > 0 !== props.invert;
  return { delta, good, width: max.value > 0 ? Math.max(2, (row.value / max.value) * 100) : 0 };
}

// Renders a column's `cell` function (text or vnodes) inside the template.
const RenderCell = (p: { fn: (row: BreakdownRow) => VNodeChild; row: BreakdownRow }) => p.fn(p.row);
</script>

<template>
  <NqCard data-slot="breakdown-table" :aria-busy="loading || undefined" :class="props.class">
    <NqCardHeader v-if="title || description || $slots.title || $slots.description || $slots.action">
      <NqCardTitle v-if="title || $slots.title" as="h3"><slot name="title">{{ title }}</slot></NqCardTitle>
      <NqCardDescription v-if="description || $slots.description"><slot name="description">{{ description }}</slot></NqCardDescription>
      <NqCardAction v-if="$slots.action"><slot name="action" /></NqCardAction>
    </NqCardHeader>
    <NqCardContent class="px-0">
      <div v-if="loading" class="flex flex-col gap-3 px-4">
        <NqSkeleton v-for="i in 5" :key="i" class="h-8 w-full" />
      </div>
      <p v-else-if="sorted.length === 0" class="px-4 py-8 text-center text-body-sm text-muted-foreground">{{ t.empty }}</p>
      <NqTable v-else :label="label ?? title">
        <NqTableHeader>
          <NqTableRow>
            <NqTableHead>{{ dimensionLabel }}</NqTableHead>
            <NqTableHead class="text-end">{{ valueLabel }}</NqTableHead>
            <NqTableHead v-if="showShare" class="hidden text-end sm:table-cell">{{ t.share }}</NqTableHead>
            <NqTableHead v-if="hasPrevious" class="text-end">{{ t.change }}</NqTableHead>
            <NqTableHead v-for="c in columns" :key="c.id" :class="c.align === 'end' ? 'text-end' : undefined">{{ c.header }}</NqTableHead>
          </NqTableRow>
        </NqTableHeader>
        <NqTableBody>
          <NqTableRow v-for="row in shown" :key="row.id" :data-row="row.id">
            <NqTableCell class="min-w-40 max-w-0 sm:min-w-56">
              <a v-if="row.href" :href="row.href" class="block truncate text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">
                <bdi v-if="ltrLabels" dir="ltr" class="block truncate"><slot name="label" :row="row">{{ row.label }}</slot></bdi>
                <span v-else class="block truncate" dir="auto"><slot name="label" :row="row">{{ row.label }}</slot></span>
              </a>
              <template v-else>
                <bdi v-if="ltrLabels" dir="ltr" class="block truncate"><slot name="label" :row="row">{{ row.label }}</slot></bdi>
                <span v-else class="block truncate" dir="auto"><slot name="label" :row="row">{{ row.label }}</slot></span>
              </template>
              <span aria-hidden="true" data-slot="breakdown-bar" class="mt-1.5 block h-1.5 rounded-full bg-nq-surface-soft">
                <span class="block h-full rounded-full bg-[var(--bar)]" :style="{ '--bar': color, width: `${view(row).width}%` }" />
              </span>
            </NqTableCell>
            <NqTableCell class="text-end tabular-nums"><NqNum :value="row.value" :format="format" /></NqTableCell>
            <NqTableCell v-if="showShare" class="hidden text-end tabular-nums text-muted-foreground sm:table-cell">
              <NqNum :value="total > 0 ? row.value / total : 0" :format="{ style: 'percent', maximumFractionDigits: 1 }" />
            </NqTableCell>
            <NqTableCell
              v-if="hasPrevious"
              :class="cn('text-end tabular-nums', view(row).good === undefined ? 'text-muted-foreground' : view(row).good ? 'text-nq-success-text' : 'text-nq-danger-text')"
            >
              <template v-if="view(row).delta === undefined">–</template>
              <NqNum v-else :value="view(row).delta!" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" />
            </NqTableCell>
            <NqTableCell v-for="c in columns" :key="c.id" :class="c.align === 'end' ? 'text-end tabular-nums' : undefined">
              <slot :name="`cell-${c.id}`" :row="row"><RenderCell v-if="c.cell" :fn="c.cell" :row="row" /></slot>
            </NqTableCell>
          </NqTableRow>
        </NqTableBody>
      </NqTable>
      <div v-if="!loading && sorted.length > limit" class="flex justify-center px-4 pt-3">
        <NqButton size="sm" variant="ghost" :aria-expanded="all" @click="all = !all">{{ all ? t.showLess : t.showAll(sorted.length) }}</NqButton>
      </div>
    </NqCardContent>
  </NqCard>
</template>
