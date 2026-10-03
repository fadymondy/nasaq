<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { NqCombobox, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList, comboboxFilter } from "../combobox";
import type { LineItemEditorLine, LineItemEditorProduct, LineItemEditorStrings } from "./labels";

// The product search of one line (internal). Typing sets the name (a free line) unless free lines are off;
// choosing a product fills the name, price and tax rate through `pick`.
interface Props {
  line: LineItemEditorLine;
  products: readonly LineItemEditorProduct[];
  allowFree: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  label: string;
  t: LineItemEditorStrings;
}
const props = defineProps<Props>();
const emit = defineEmits<{ pick: [product: LineItemEditorProduct]; name: [name: string] }>();

type Entry = { value: string; label: string; product: LineItemEditorProduct };
const items = computed<Entry[]>(() => props.products.map((p) => ({ value: p.id, label: p.name, product: p })));
const selected = computed(() => items.value.find((i) => i.value === props.line.productId) ?? null);
const touched = ref(false);
const invalid = computed(() => touched.value && !props.line.name.trim());
const root = ref<HTMLElement | null>(null);
onMounted(() => {
  const input = root.value?.querySelector<HTMLInputElement>("input");
  if (input && !input.value && props.line.name) input.value = props.line.name;
  if (props.autoFocus) input?.focus();
});
watch(
  () => props.line.name,
  (name) => {
    // A name changed from outside (a picked product) must reach the input; free typing already matches.
    const input = root.value?.querySelector<HTMLInputElement>("input");
    if (input && input.value !== name && document.activeElement !== input) input.value = name;
  },
);

function onModel(next: unknown) {
  const entry = next as Entry | null;
  if (entry) emit("pick", entry.product);
}
function onSearch(text: string) {
  if (props.allowFree) emit("name", text);
}
function onBlur(e: FocusEvent) {
  touched.value = true;
  if (!props.allowFree) (e.target as HTMLInputElement).value = props.line.name;
}
const filter = (item: unknown, query: string) => comboboxFilter(item as Entry, query, (x) => `${x.product.name} ${x.product.sku ?? ""}`);
const emptyText = computed(() => (props.allowFree ? props.t.noMatch : props.t.noMatch.split(".")[0] + "."));
</script>

<template>
  <div v-if="props.readOnly" class="min-w-0 py-1.5">
    <p class="truncate text-body text-foreground">{{ props.line.name }}</p>
    <p v-if="selected?.product.sku" class="truncate text-caption text-muted-foreground"><bdi dir="ltr">{{ selected.product.sku }}</bdi></p>
  </div>
  <div v-else ref="root" class="flex min-w-0 flex-col gap-1">
    <NqCombobox :items="items" :model-value="selected" :disabled="props.disabled" :filter="filter" @update:model-value="onModel" @search="onSearch">
      <NqComboboxInput
        :clearable="false"
        :placeholder="props.t.itemPlaceholder"
        :aria-label="props.label"
        :invalid="invalid"
        :trigger-label="props.t.open"
        :clear-label="props.t.clear"
        @blur="onBlur"
      />
      <NqComboboxContent>
        <NqComboboxEmpty>{{ emptyText }}</NqComboboxEmpty>
        <NqComboboxList v-slot="{ items: list }">
          <NqComboboxItem v-for="e in (list as Entry[])" :key="e.value" :value="e">
            <span class="flex min-w-0 items-baseline justify-between gap-3">
              <span class="min-w-0 truncate">
                <bdi>{{ e.product.name }}</bdi>
                <span v-if="e.product.sku" class="ms-2 text-caption text-muted-foreground"><bdi dir="ltr">{{ e.product.sku }}</bdi></span>
              </span>
            </span>
          </NqComboboxItem>
        </NqComboboxList>
      </NqComboboxContent>
    </NqCombobox>
    <p v-if="invalid" role="alert" class="text-caption text-nq-danger-text">{{ props.t.nameRequired }}</p>
    <p v-else-if="selected" class="truncate text-caption text-muted-foreground">
      <bdi v-if="selected.product.sku" dir="ltr">{{ selected.product.sku }}</bdi>
      <template v-if="selected.product.sku && selected.product.stock !== undefined"> · </template>
      <span v-if="selected.product.stock !== undefined"><bdi>{{ selected.product.stock }}</bdi> {{ selected.product.unit ?? "" }} {{ props.t.inStock }}</span>
    </p>
    <p v-else-if="props.line.name" class="truncate text-caption text-muted-foreground">{{ props.t.freeLine }}</p>
  </div>
</template>
