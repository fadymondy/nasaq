<script setup lang="ts">
import {
  NqCombobox,
  NqComboboxContent,
  NqComboboxEmpty,
  NqComboboxInput,
  NqComboboxItem,
  NqComboboxList,
  NqField,
  NqFieldLabel,
} from "@fadymondy/nasaq/vue";

const COUNTRIES = [
  { value: "sa", label: "Saudi Arabia" },
  { value: "eg", label: "Egypt" },
  { value: "jo", label: "Jordan" },
];
</script>

<template>
  <NqField>
    <NqFieldLabel>Country</NqFieldLabel>
    <NqCombobox :items="COUNTRIES">
      <NqComboboxInput placeholder="Search a country…" />
      <NqComboboxContent>
        <NqComboboxEmpty>No results</NqComboboxEmpty>
        <NqComboboxList v-slot="{ items }">
          <NqComboboxItem v-for="item in items as typeof COUNTRIES" :key="item.value" :value="item">{{ item.label }}</NqComboboxItem>
        </NqComboboxList>
      </NqComboboxContent>
    </NqCombobox>
  </NqField>
</template>
