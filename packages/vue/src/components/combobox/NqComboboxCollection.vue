<script setup lang="ts">
import { computed, inject } from "vue";
import { COMBOBOX_KEY } from "./context";

// Renders a group's items narrowed by the typed text: <NqComboboxCollection :items="group.items" v-slot="{ items }">.
const props = defineProps<{ items: readonly unknown[] }>();
const ctx = inject(COMBOBOX_KEY);
if (!ctx) throw new Error("NqComboboxCollection must be inside NqCombobox");
const filtered = computed(() => ctx.filterList(props.items));
</script>

<template>
  <slot :items="filtered" />
</template>
