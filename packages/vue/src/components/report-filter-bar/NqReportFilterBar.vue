<script setup lang="ts">
import { RotateCcw, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import NqTimeRangePicker from "../time-range-picker/NqTimeRangePicker.vue";
import type { RelativePreset, TimeComparison, TimeRangeWeekday } from "../time-range-picker/time-range-math";
import NqReportFilterField from "./NqReportFilterField.vue";
import { activeFilterCount, cleanFieldValues, emptyReportFilters, type ReportFilterFieldSpec, type ReportFilterState } from "./report-filter-math";
import { REPORT_FILTER_STRINGS, type ReportFilterBarLabels } from "./strings";
import { REPORT_DEFAULT_RANGE, type ReportFilterField } from "./useReportFilters";

// The filters of a report: a period (presets, week, custom days, optional comparison) and any number of choice filters,
// with removable chips for what is applied and a reset. It only edits `state`; use `useReportFilters` to keep that state
// in the URL, `NqSavedReportViews` to name it and `NqReportExportMenu` to take it away.
interface Props {
  fields: readonly ReportFilterField[];
  /** The current filters (`v-model:state`). */
  state: ReportFilterState;
  /** What "reset" returns to and what counts as applied. Default: the last 30 days, no comparison, no filters. */
  defaults?: ReportFilterState;
  /** Options for the period picker (`timeZone`, `weekStartsOn`, `now`...), or false to hide it. */
  range?: false | { presets?: readonly RelativePreset[]; allowWeek?: boolean; allowCustom?: boolean; allowFuture?: boolean; timeZone?: string; weekStartsOn?: TimeRangeWeekday; showSummary?: boolean; now?: Date };
  /** Show "Compare with" beside the period. Default false. */
  comparison?: boolean;
  /** Presets for the period picker (shortcut for `range.presets`). */
  presets?: readonly RelativePreset[];
  class?: HTMLAttributes["class"];
  labels?: Partial<ReportFilterBarLabels>;
}
const props = withDefaults(defineProps<Props>(), { defaults: undefined, range: undefined, comparison: false, presets: undefined, labels: undefined });
const emit = defineEmits<{ "update:state": [state: ReportFilterState] }>();

const t = useAnalyticsLabels(REPORT_FILTER_STRINGS, () => props.labels);
const specs = computed(() => props.fields as readonly ReportFilterFieldSpec[]);
const base = computed(() => props.defaults ?? emptyReportFilters(specs.value, REPORT_DEFAULT_RANGE));
const count = computed(() => activeFilterCount(props.state, specs.value, base.value));
const rangeProps = computed(() => (props.range === false ? {} : { ...props.range, presets: props.presets ?? props.range?.presets }));
const valuesOf = (f: ReportFilterField) => cleanFieldValues(f, props.state.fields[f.id] ?? []);
const setField = (id: string, values: string[]) => emit("update:state", { ...props.state, fields: { ...props.state.fields, [id]: values } });
const chips = computed(() =>
  props.fields.flatMap((f) => valuesOf(f).map((v) => ({ field: f, value: v, label: f.options.find((o) => o.value === v)?.label ?? v }))),
);
const removeChip = (c: { field: ReportFilterField; value: string }) =>
  setField(c.field.id, cleanFieldValues(c.field, (props.state.fields[c.field.id] ?? []).filter((v) => v !== c.value)));
</script>

<template>
  <div data-slot="report-filter-bar" role="group" :aria-label="t.filters" :class="cn('flex w-full min-w-0 flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <NqTimeRangePicker
        v-if="props.range !== false"
        v-bind="rangeProps"
        :model-value="props.state.range"
        :comparison="props.comparison ? props.state.comparison : undefined"
        :on-comparison-change="props.comparison ? (mode: TimeComparison) => emit('update:state', { ...props.state, comparison: mode }) : undefined"
        @update:model-value="(next) => emit('update:state', { ...props.state, range: next })"
      />
      <NqReportFilterField v-for="f in props.fields" :key="f.id" :field="f" :values="valuesOf(f)" :t="t" @change="(v) => setField(f.id, v)" />
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <span aria-live="polite" class="text-caption text-muted-foreground">{{ count > 0 ? t.active(count) : "" }}</span>
        <NqButton variant="ghost" size="sm" :disabled="count === 0" @click="emit('update:state', base)">
          <RotateCcw aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.reset }}
        </NqButton>
        <slot name="actions" />
      </div>
    </div>
    <ul v-if="chips.length > 0" data-slot="report-filter-chips" class="flex flex-wrap gap-1.5" :aria-label="t.filters">
      <li v-for="c in chips" :key="`${c.field.id}:${c.value}`">
        <NqBadge variant="outline" class="gap-1 pe-1">
          <span class="text-muted-foreground">{{ c.field.label }}:</span> {{ c.label }}
          <button
            type="button"
            :aria-label="t.removeFilter(`${c.field.label}: ${c.label}`)"
            class="inline-flex size-4 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="removeChip(c)"
          >
            <X aria-hidden="true" class="size-3" />
          </button>
        </NqBadge>
      </li>
    </ul>
  </div>
</template>
