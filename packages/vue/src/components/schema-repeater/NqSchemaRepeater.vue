<script setup lang="ts">
import { computed, provide, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { formatDate } from "../numeric";
import type { RepeaterLabels } from "../repeater";
import { dateOf, SCHEMA, schemaStrings } from "./context";
import NqSchemaRows from "./NqSchemaRows.vue";
import { SCHEMA_MESSAGES, type RowErrors, type SchemaField, type SchemaMessages, type SchemaRow, type SchemaValidation, validateRows } from "./schema";

/**
 * A repeater whose rows are generated from a field schema: text, number, select, switch, date and nested
 * repeaters, each with validation (required, lengths, ranges, patterns, your own rules). The value is plain
 * JSON. Errors show as soon as a field is edited, or all at once with `showErrors`.
 */
interface Props {
  /** What each row contains. */
  fields: readonly SchemaField[];
  /** Rows cannot be removed below this count, and validation asks for at least this many. */
  min?: number;
  /** "Add" and "Duplicate" stop here. */
  max?: number;
  /** Accessible name of the list, and the name used in the row-count messages. Localise it. */
  label?: string;
  /** Key of a text field whose value titles each row. Default: "Item 1", "Item 2"… */
  titleKey?: string;
  /** Custom row heading. Wins over `titleKey`. */
  rowTitle?: (row: SchemaRow, index: number) => string | undefined;
  /** Reveal every error now, for example after a failed submit. Otherwise a field shows its error once it was edited. */
  showErrors?: boolean;
  /** Errors from the server, by row and field key. They show at once. */
  errors?: readonly RowErrors[];
  /** Override any built-in message (English or Arabic by the Nasaq locale). */
  messages?: Partial<SchemaMessages>;
  /** Override the repeater strings: add, remove, duplicate, empty, … */
  labels?: RepeaterLabels;
  addLabel?: string;
  empty?: string;
  reorderable?: boolean;
  duplicable?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  min: undefined,
  max: undefined,
  label: undefined,
  titleKey: undefined,
  rowTitle: undefined,
  showErrors: false,
  errors: undefined,
  messages: undefined,
  labels: undefined,
  addLabel: undefined,
  empty: undefined,
  reorderable: undefined,
  duplicable: undefined,
  collapsible: undefined,
  defaultCollapsed: undefined,
  disabled: undefined,
});
/** The rows: one object per row, keyed by `field.key`. */
const value = defineModel<SchemaRow[]>({ default: () => [] });
/** Fired when the number of issues changes, with the full result. Use it to enable or block Save. */
const emit = defineEmits<{ validate: [result: SchemaValidation] }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => schemaStrings(locale.value));
const messages = computed<SchemaMessages>(() => ({ ...SCHEMA_MESSAGES[locale.value.startsWith("ar") ? "ar" : "en"], ...props.messages }));
const name = computed(() => props.label ?? t.value.itemsLabel);
const validation = computed(() =>
  validateRows(props.fields, value.value, {
    min: props.min,
    max: props.max,
    label: name.value,
    messages: messages.value,
    formatDate: (iso) => formatDate(dateOf(iso) ?? iso, locale.value, { dateStyle: "medium" }),
  }),
);
watch(
  () => `${validation.value.count}|${validation.value.message ?? ""}`,
  () => emit("validate", validation.value),
  { immediate: true },
);

const touched = ref<ReadonlySet<string>>(new Set());
const listTouched = ref(false);
provide(SCHEMA, {
  messages,
  locale,
  showErrors: computed(() => props.showErrors),
  touched,
  touch: (id) => {
    if (!touched.value.has(id)) touched.value = new Set(touched.value).add(id);
  },
  repeaterProps: computed(() => ({ reorderable: props.reorderable, duplicable: props.duplicable, collapsible: props.collapsible, disabled: props.disabled, labels: props.labels })),
});
const countMessage = computed(() => (validation.value.message && (props.showErrors || listTouched.value) ? validation.value.message : undefined));
function onChange(next: SchemaRow[]) {
  listTouched.value = true;
  value.value = next;
}
</script>

<template>
  <div data-slot="schema-repeater" :class="cn('flex flex-col gap-2', props.class)">
    <NqSchemaRows
      :model-value="value"
      :fields="props.fields"
      :issues="validation.rows"
      :server-issues="props.errors"
      :min="props.min"
      :max="props.max"
      :label="name"
      :title-key="props.titleKey"
      :row-title="props.rowTitle"
      :add-label="props.addLabel"
      :empty="props.empty"
      :default-collapsed="props.defaultCollapsed"
      @update:model-value="onChange"
    />
    <p v-if="countMessage" role="alert" data-slot="schema-repeater-error" class="text-caption text-nq-danger-text">{{ countMessage }}</p>
  </div>
</template>
