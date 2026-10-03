<script setup lang="ts">
import { MenubarMenu } from "reka-ui";

// One menu in the bar: a trigger and its content.
defineProps<{ value?: string }>();
</script>

<template>
  <MenubarMenu :value="value"><slot /></MenubarMenu>
</template>
