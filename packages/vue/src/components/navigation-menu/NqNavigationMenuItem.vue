<script setup lang="ts">
import { NavigationMenuItem } from "reka-ui";

const props = defineProps<{ value?: string }>();
</script>

<template>
  <NavigationMenuItem :value="props.value"><slot /></NavigationMenuItem>
</template>
