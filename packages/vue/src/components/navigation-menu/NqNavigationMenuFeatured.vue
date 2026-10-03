<script setup lang="ts">
import { NavigationMenuLink } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The featured card slot: a highlighted block next to the link list (a launch, a case study). It is a link,
// so pass `href`; put any content inside.
const props = defineProps<{ href?: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NavigationMenuLink
    data-slot="navigation-menu-featured"
    :href="props.href"
    :class="
      cn(
        'flex min-w-56 flex-col items-start justify-end gap-1.5 rounded-card border border-border bg-nq-surface-soft p-4 text-start no-underline outline-none transition-colors duration-150 ease-nq',
        'hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        props.class,
      )
    "
  >
    <slot />
  </NavigationMenuLink>
</template>
