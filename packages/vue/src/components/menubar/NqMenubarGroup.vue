<script setup lang="ts">
import { MenubarGroup, useId } from "reka-ui";
import { provide, ref } from "vue";
import { MENU_GROUP } from "./context";

// Wrap a label and its items to have the group announced.
const ctx = { labelId: useId(undefined, "nq-menu-group-label"), hasLabel: ref(false) };
provide(MENU_GROUP, ctx);
</script>

<template>
  <MenubarGroup data-slot="menubar-group" :aria-labelledby="ctx.hasLabel.value ? ctx.labelId : undefined"><slot /></MenubarGroup>
</template>
