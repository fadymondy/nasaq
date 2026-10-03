<script setup lang="ts">
import { ComboboxGroup } from "reka-ui";
import type { HTMLAttributes } from "vue";

// A named set of items. Put an NqComboboxLabel first.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ComboboxGroup data-slot="combobox-group" :class="props.class"><slot /></ComboboxGroup>
</template>
