<script setup lang="ts">
import { computed } from "vue";
import { useId } from "reka-ui";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import type { ReportFilterBarLabels } from "./strings";
import type { ReportFilterField } from "./useReportFilters";

// One filter of the bar: a label above a select, a multi-select popover or a toggle group (internal to NqReportFilterBar).
// The "no filter" choice uses a placeholder value because the select and toggle items reject an empty string.
const ALL = "__nq-all__";
const props = defineProps<{ field: ReportFilterField; values: string[]; t: ReportFilterBarLabels }>();
const emit = defineEmits<{ change: [values: string[]] }>();

const id = useId(undefined, "nq-report-filter");
const allLabel = computed(() => props.field.allLabel ?? props.t.all);
const summary = computed(() =>
  props.values.length === 0 ? allLabel.value : props.values.length === 1 ? (props.field.options.find((o) => o.value === props.values[0])?.label ?? props.values[0]) : props.t.selected(props.values.length),
);
const onSelect = (v: string | number | null) => emit("change", v && v !== ALL ? [String(v)] : []);
const onToggle = (v: string[]) => emit("change", v.filter((x) => x !== ALL).slice(-1));
const onCheck = (value: string, on: boolean) => emit("change", on ? [...props.values, value] : props.values.filter((v) => v !== value));
</script>

<template>
  <div data-slot="report-filter-field" class="flex min-w-0 flex-col gap-1">
    <span :id="id" class="text-caption text-muted-foreground">{{ props.field.label }}</span>
    <NqSelect v-if="props.field.kind === 'select'" :model-value="props.values[0] ?? ALL" @update:model-value="onSelect">
      <NqSelectTrigger :aria-labelledby="id" class="h-control-sm w-auto min-w-36 max-w-full">
        <NqSelectValue />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem :value="ALL">{{ allLabel }}</NqSelectItem>
        <NqSelectItem v-for="o in props.field.options" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
    <NqToggleGroup v-else-if="props.field.kind === 'toggle'" :aria-labelledby="id" :model-value="props.values.length ? props.values : [ALL]" @update:model-value="onToggle">
      <NqToggle :value="ALL" :aria-label="allLabel">{{ allLabel }}</NqToggle>
      <NqToggle v-for="o in props.field.options" :key="o.value" :value="o.value">{{ o.label }}</NqToggle>
    </NqToggleGroup>
    <NqPopover v-else>
      <NqPopoverTrigger as-child>
        <NqButton variant="secondary" size="sm" :aria-labelledby="id" class="min-w-36 justify-between">{{ summary }}</NqButton>
      </NqPopoverTrigger>
      <NqPopoverContent align="start" class="w-64 p-1">
        <ul class="flex max-h-64 flex-col overflow-y-auto">
          <li v-for="o in props.field.options" :key="o.value">
            <label class="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-sm hover:bg-nq-hover">
              <NqCheckbox :model-value="props.values.includes(o.value)" @update:model-value="(on: boolean) => onCheck(o.value, on)" />
              <span class="min-w-0 flex-1 truncate">{{ o.label }}</span>
            </label>
          </li>
        </ul>
        <div class="border-t border-border p-1">
          <NqButton variant="ghost" size="sm" :disabled="props.values.length === 0" @click="emit('change', [])">{{ props.t.clear }}</NqButton>
        </div>
      </NqPopoverContent>
    </NqPopover>
  </div>
</template>
