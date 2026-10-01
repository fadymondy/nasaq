<script setup lang="ts">
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { COMBOBOX_KEY } from "./context";

// The list. The default slot gets `items`: the root items narrowed by the typed text.
// <NqComboboxList v-slot="{ items }"><NqComboboxItem v-for="item in items" :key="item.value" :value="item">{{ item.label }}</NqComboboxItem></NqComboboxList>
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const ctx = inject(COMBOBOX_KEY);
if (!ctx) throw new Error("NqComboboxList must be inside NqCombobox");
</script>

<template>
  <div data-slot="combobox-list" :class="cn('outline-none', props.class)">
    <slot :items="ctx.items.value" />
  </div>
</template>
