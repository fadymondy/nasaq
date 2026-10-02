<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqBreakdownTable, type BreakdownRow, type BreakdownTableLabels } from "../breakdown-table";
import { countryName, flagEmoji } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import type { FormatNumberOptions } from "../numeric";

// Visitors or clicks by country: a flag, the country name in the reader's language, a bar, the figure, its share and the
// change. Flags are emoji text; names come from `Intl.DisplayNames`. Built on NqBreakdownTable.
const STRINGS = {
  en: { country: "Country", unknown: "Unknown", title: "Countries" },
  ar: { country: "الدولة", unknown: "غير معروفة", title: "الدول" },
};

export type GeoListLabels = typeof STRINGS.en;

export interface GeoRow {
  /** ISO 3166-1 alpha-2 code: "SA", "EG". Anything else shows as Unknown. The name is localised for you. */
  code: string;
  value: number;
  previous?: number;
}

const props = withDefaults(
  defineProps<{
    rows: readonly GeoRow[];
    /** Heading of the value column: "Users", "Clicks". */
    valueLabel: string;
    title?: string;
    description?: string;
    format?: FormatNumberOptions;
    /** Rows shown before "Show all". Default 8. */
    limit?: number;
    invert?: boolean;
    color?: string;
    loading?: boolean;
    class?: HTMLAttributes["class"];
    labels?: Partial<GeoListLabels> & { table?: Partial<BreakdownTableLabels> };
  }>(),
  { title: undefined, description: undefined, format: undefined, limit: 8, invert: false, color: undefined, loading: false, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();

const flags = computed(() => new Map(props.rows.map((r) => [r.code, flagEmoji(r.code)])));
const tableRows = computed<BreakdownRow[]>(() =>
  props.rows.map((r) => ({
    id: r.code,
    value: r.value,
    previous: r.previous,
    label: flags.value.get(r.code) ? countryName(r.code, nq.locale.value) : t.value.unknown,
  })),
);
</script>

<template>
  <NqBreakdownTable
    :class="props.class"
    :title="title ?? t.title"
    :description="description"
    :dimension-label="t.country"
    :value-label="valueLabel"
    :format="format"
    :limit="limit"
    :invert="invert"
    :color="color"
    :loading="loading"
    :labels="labels?.table"
    :rows="tableRows"
  >
    <template #label="{ row }">
      <span class="inline-flex items-center gap-2">
        <span v-if="flags.get(row.id)" aria-hidden="true" class="text-base leading-none">{{ flags.get(row.id) }}</span>
        {{ row.label }}
      </span>
    </template>
  </NqBreakdownTable>
</template>
