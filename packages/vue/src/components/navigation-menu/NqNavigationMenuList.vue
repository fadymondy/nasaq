<script setup lang="ts">
import { NavigationMenuList } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NavigationMenuList data-slot="navigation-menu-list" :class="cn('relative m-0 flex list-none items-center gap-0.5 p-0', props.class)">
    <slot />
  </NavigationMenuList>
</template>
