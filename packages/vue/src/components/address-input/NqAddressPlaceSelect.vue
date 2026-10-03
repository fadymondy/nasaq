<script setup lang="ts">
import { computed, useId } from "vue";
import { NqCombobox, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { NqCountryFlag } from "../country-flag";
import { NqField, NqFieldLabel } from "../field";
import type { AddressInputLabels } from "./address-types";

// One of the three cascading selects of NqAddressInput (country, city, area). Internal.
interface Option {
  value: number;
  label: string;
  search: string;
  iso?: string;
}
const props = defineProps<{
  label: string;
  placeholder: string;
  options: Option[];
  value: number | undefined;
  disabled?: boolean;
  invalid?: boolean;
  status: "idle" | "loading" | "ready" | "error";
  t: AddressInputLabels;
  dir: "ltr" | "rtl";
  slotName: string;
  flags?: boolean;
}>();
const emit = defineEmits<{ change: [id: number | undefined] }>();

const id = `nq-address-${useId()}`;
const selected = computed(() => props.options.find((o) => o.value === props.value) ?? null);
const match = (item: unknown, query: string) => normalizeForSearch((item as Option).search).includes(normalizeForSearch(query));
const onPick = (next: unknown) => emit("change", (next as Option | null | undefined)?.value);
</script>

<template>
  <NqField :data-slot="props.slotName" :disabled="props.disabled">
    <NqFieldLabel :for="id">{{ props.label }}</NqFieldLabel>
    <NqCombobox :items="props.options" :model-value="selected" :filter="match" :disabled="props.disabled" :dir="props.dir" @update:model-value="onPick">
      <NqComboboxInput :id="id" :invalid="props.invalid" :placeholder="props.placeholder" :clear-label="props.t.clear" :trigger-label="props.t.open" />
      <NqComboboxContent>
        <NqComboboxList v-slot="{ items: list }">
          <NqComboboxItem v-for="item in (list as Option[])" :key="item.value" :value="item" :text-value="item.search">
            <span v-if="props.flags && item.iso" class="flex items-center gap-2">
              <NqCountryFlag :code="item.iso" class="text-[1rem]" />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            </span>
            <template v-else>{{ item.label }}</template>
          </NqComboboxItem>
        </NqComboboxList>
        <NqComboboxEmpty>{{ props.status === "loading" ? props.t.loading : props.status === "error" ? props.t.loadError : props.t.empty }}</NqComboboxEmpty>
      </NqComboboxContent>
    </NqCombobox>
  </NqField>
</template>
