<script setup lang="ts">
import { NavigationMenuLink } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { triggerClass } from "./triggerClass";

// A top-level link that sits in the bar beside the triggers ("Pricing", "Blog").
const props = defineProps<{ href?: string; active?: boolean; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NavigationMenuLink
    data-slot="navigation-menu-link"
    :href="props.href"
    :active="props.active"
    :class="cn(triggerClass, 'data-active:bg-nq-selected', props.class)"
  >
    <slot />
  </NavigationMenuLink>
</template>
