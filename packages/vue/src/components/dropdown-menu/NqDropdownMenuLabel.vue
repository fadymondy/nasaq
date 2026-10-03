<script setup lang="ts">
import { DropdownMenuLabel } from "reka-ui";
import { inject, onBeforeUnmount, onMounted, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { MENU_GROUP } from "./context";

// A heading in the menu. Inside an NqDropdownMenuGroup it names the group; anywhere else it is a plain heading.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const group = inject(MENU_GROUP, null);
onMounted(() => group && (group.hasLabel.value = true));
onBeforeUnmount(() => group && (group.hasLabel.value = false));
const classes = (extra?: HTMLAttributes["class"]) => cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", extra);
</script>

<template>
  <DropdownMenuLabel v-if="group" :id="group.labelId" data-slot="dropdown-menu-label" :class="classes(props.class)"><slot /></DropdownMenuLabel>
  <div v-else data-slot="dropdown-menu-label" role="presentation" :class="classes(props.class)"><slot /></div>
</template>
