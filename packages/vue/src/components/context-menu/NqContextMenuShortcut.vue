<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import NqDropdownMenuShortcut from "../dropdown-menu/NqDropdownMenuShortcut.vue";

// The same hint as the dropdown menu's: not mirrored (dir="ltr").
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NqDropdownMenuShortcut :class="props.class"><slot /></NqDropdownMenuShortcut>
</template>
