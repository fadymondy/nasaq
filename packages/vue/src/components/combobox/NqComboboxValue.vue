<script setup lang="ts">
import { inject } from "vue";
import { COMBOBOX_KEY } from "./context";

// The current value as text, or through the slot: <NqComboboxValue v-slot="{ value }">…</NqComboboxValue>.
// `value` is the chosen item (single) or the array of items (multiple).
const ctx = inject(COMBOBOX_KEY);
if (!ctx) throw new Error("NqComboboxValue must be inside NqCombobox");
const text = () => (Array.isArray(ctx.current.value) ? ctx.current.value.map(ctx.labelOf).join(", ") : ctx.labelOf(ctx.current.value));
</script>

<template>
  <slot :value="ctx.current.value">{{ text() }}</slot>
</template>
