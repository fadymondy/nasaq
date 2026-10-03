<script setup lang="ts">
import { ComboboxRoot } from "reka-ui";
import { computed, provide, ref, watch } from "vue";
import { COMBOBOX_KEY, comboboxFilter } from "./context";

// Root. Pass `items` (`{ value, label }[]`) and `multiple` for chips. Filtering is Arabic-aware by default;
// pass `:filter="null"` to turn it off (async search: update `items` yourself on `@search`).
// Items are the model values (objects), as in the React Combobox. Without `items` (hand-written NqComboboxItem
// children) Reka's own filter runs instead.
interface Props {
  /** The chosen item (single) or items (multiple). Use `v-model`. */
  modelValue?: unknown;
  defaultValue?: unknown;
  /** Choose several: modelValue is then an array and the control is NqComboboxChips. */
  multiple?: boolean;
  /** The choices, `{ value, label }[]`. Needed for the Arabic-aware filter and the empty state. */
  items?: readonly unknown[];
  /** Replaces the match: `(item, query) => boolean`. `null` disables filtering. */
  filter?: ((item: unknown, query: string) => boolean) | null;
  /** How two items are compared. A key name or a function. Default `value`. */
  by?: string | ((a: unknown, b: unknown) => boolean);
  /** Text for an item (chips, the input after choosing). Default: `label`, else `String(item)`. */
  itemToString?: (item: unknown) => string;
  open?: boolean;
  defaultOpen?: boolean;
  /** Form field name (a hidden input carries the value). */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  dir?: "ltr" | "rtl";
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  items: undefined,
  filter: undefined,
  by: "value",
  itemToString: undefined,
  open: undefined,
  name: undefined,
  dir: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: unknown];
  "update:open": [open: boolean];
  /** The typed text changed. */
  search: [query: string];
}>();

const inner = ref<unknown>(props.defaultValue ?? (props.multiple ? [] : undefined));
const current = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const multiple = computed(() => props.multiple);
const search = ref("");
const labelOf = (item: unknown): string => {
  if (item === null || item === undefined) return "";
  if (props.itemToString) return props.itemToString(item);
  return String((item as { label?: unknown }).label ?? item);
};
const same = (a: unknown, b: unknown): boolean => {
  if (typeof props.by === "function") return props.by(a, b);
  const key = (x: unknown) => (x !== null && typeof x === "object" ? (x as Record<string, unknown>)[props.by as string] : x);
  return key(a) === key(b);
};
const filterList = (list: readonly unknown[]) => {
  const fn = props.filter === undefined ? comboboxFilter : props.filter;
  if (!fn || !search.value) return list;
  return list.filter((item) => fn(item, search.value));
};
const items = computed(() => filterList(props.items ?? []));
const selectedList = computed<unknown[]>(() => (props.multiple ? ((current.value as unknown[] | undefined) ?? []) : current.value == null ? [] : [current.value]));

function set(next: unknown) {
  inner.value = next;
  emit("update:modelValue", next);
}
provide(COMBOBOX_KEY, {
  multiple,
  current,
  items,
  filterList,
  search,
  isSelected: (item) => selectedList.value.some((x) => same(x, item)),
  remove: (item) => set(selectedList.value.filter((x) => !same(x, item))),
  clear: () => {
    search.value = "";
    set(props.multiple ? [] : undefined);
  },
  hasValue: computed(() => selectedList.value.length > 0),
  disabled: computed(() => Boolean(props.disabled)),
  labelOf,
});

watch(search, (q) => emit("search", q));
// Typed text belongs to one opening; choosing or closing starts the next one clean.
const ownOpen = ref(props.defaultOpen ?? false);
const isOpen = computed(() => props.open ?? ownOpen.value);
function onOpen(next: boolean) {
  ownOpen.value = next;
  if (!next) search.value = "";
  emit("update:open", next);
}
// Reka filters by itself only when we are not. With `items` the filter above runs and Reka's is skipped.
const ignoreFilter = computed(() => props.items !== undefined || props.filter === null);
</script>

<template>
  <ComboboxRoot
    data-slot="combobox"
    :model-value="(current as never)"
    :multiple="props.multiple"
    :open="isOpen"
    :by="props.by"
    :name="props.name"
    :disabled="props.disabled"
    :required="props.required"
    :dir="props.dir"
    :ignore-filter="ignoreFilter"
    @update:model-value="set"
    @update:open="onOpen"
  >
    <slot :open="isOpen" :model-value="current" />
  </ComboboxRoot>
</template>
