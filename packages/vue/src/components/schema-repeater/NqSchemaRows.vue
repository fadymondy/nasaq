<script setup lang="ts">
import { computed } from "vue";
import { NqBadge } from "../badge";
import { formatDate, formatNumber } from "../numeric";
import { NqRepeater } from "../repeater";
import { dateOf, schemaStrings, useSchema } from "./context";
import NqSchemaField from "./NqSchemaField.vue";
import { countIssues, defaultRow, type RowErrors, type SchemaField, type SchemaRow } from "./schema";

// The rows of one level of a schema: the top list, or a nested repeater's list.
interface Props {
  fields: readonly SchemaField[];
  issues: readonly RowErrors[];
  serverIssues?: readonly RowErrors[];
  min?: number;
  max?: number;
  label?: string;
  titleKey?: string;
  rowTitle?: (row: SchemaRow, index: number) => string | undefined;
  addLabel?: string;
  empty?: string;
  defaultCollapsed?: boolean;
}
const props = defineProps<Props>();
const model = defineModel<SchemaRow[]>({ required: true });

const clone = (row: SchemaRow): SchemaRow => structuredClone(row);
const { locale, showErrors, touched, repeaterProps } = useSchema();
const t = computed(() => schemaStrings(locale.value));

/** One line that says what a row holds, for the collapsed header: the first few filled values. */
function summaryOf(row: SchemaRow): string {
  const parts: string[] = [];
  for (const field of props.fields) {
    if (parts.length >= 3) break;
    if (field.key === props.titleKey || field.type === "switch" || field.type === "repeater") continue;
    const value = row[field.key];
    if (value === null || value === undefined || value === "") continue;
    if (field.type === "select") parts.push(field.options.find((o) => o.value === value)?.label ?? String(value));
    else if (field.type === "number" && typeof value === "number") parts.push(`${formatNumber(value, locale.value)}${field.unit ? ` ${field.unit}` : ""}`);
    else if (field.type === "date") {
      const date = dateOf(value);
      parts.push(date ? formatDate(date, locale.value, { dateStyle: "medium" }) : String(value));
    } else parts.push(String(value));
  }
  return parts.join(" · ");
}

function titleOf(row: SchemaRow, index: number): string {
  const custom = props.rowTitle?.(row, index);
  if (custom) return custom;
  const key = props.titleKey;
  return key && typeof row[key] === "string" && row[key] ? (row[key] as string) : "";
}

function issueCount(index: number, id: string): number {
  const rowIssues = props.issues[index];
  const count = rowIssues ? countIssues([rowIssues]) : 0;
  if (!count) return 0;
  const seen = showErrors.value || [...touched.value].some((k) => k.startsWith(`${id}.`)) || Boolean(props.serverIssues?.[index]);
  return seen ? count : 0;
}
</script>

<template>
  <NqRepeater
    v-model="model"
    :create-item="() => defaultRow(props.fields)"
    :clone-item="(row: SchemaRow) => clone(row)"
    :min="props.min"
    :max="props.max"
    :label="props.label"
    :add-label="props.addLabel"
    :empty="props.empty"
    :default-collapsed="props.defaultCollapsed"
    :reorderable="repeaterProps.reorderable"
    :duplicable="repeaterProps.duplicable"
    :collapsible="repeaterProps.collapsible"
    :disabled="repeaterProps.disabled"
    :labels="repeaterProps.labels"
    :row-title="titleOf"
    :row-summary="summaryOf"
  >
    <template #meta="{ index, id }">
      <NqBadge v-if="issueCount(index, id)" variant="danger" data-slot="schema-repeater-issues">{{ t.issues(formatNumber(issueCount(index, id), locale)) }}</NqBadge>
    </template>
    <template #default="{ item: row, index, id, disabled, update }">
      <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <template v-for="field in props.fields" :key="field.key">
          <NqSchemaField
            v-if="!field.hidden?.(row)"
            :field="field"
            :row-id="id"
            :model-value="row[field.key]"
            :issue="props.issues[index]?.[field.key]"
            :server-issue="props.serverIssues?.[index]?.[field.key]"
            :disabled="disabled"
            @update:model-value="(next: unknown) => update((cur: SchemaRow) => ({ ...cur, [field.key]: next }))"
          />
        </template>
      </div>
    </template>
  </NqRepeater>
</template>
