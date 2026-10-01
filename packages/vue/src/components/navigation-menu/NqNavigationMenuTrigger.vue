<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { injectNavigationMenuContext, injectNavigationMenuItemContext, NavigationMenuTrigger } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { triggerClass } from "./triggerClass";

// The trigger for a mega menu panel. It carries its own chevron, which turns while the panel is open.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const menu = injectNavigationMenuContext();
const item = injectNavigationMenuItemContext();
const open = computed(() => menu.modelValue.value !== "" && menu.modelValue.value === item.value);
</script>

<template>
  <NavigationMenuTrigger data-slot="navigation-menu-trigger" :data-popup-open="open ? '' : undefined" :class="cn(triggerClass, props.class)">
    <slot />
    <span
      :data-popup-open="open ? '' : undefined"
      class="inline-flex transition-transform duration-200 ease-nq data-popup-open:rotate-180 motion-reduce:transition-none"
    >
      <ChevronDown aria-hidden="true" class="size-4 text-muted-foreground" />
    </span>
  </NavigationMenuTrigger>
</template>
