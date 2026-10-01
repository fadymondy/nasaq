<script setup lang="ts">
import { NavigationMenuContent } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The panel body for one trigger. Content fades and slides in from the side the previous panel was on.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NavigationMenuContent
    data-slot="navigation-menu-content"
    :class="
      cn(
        'h-full w-max min-w-64 max-w-[min(100vw-2rem,52rem)] p-3',
        'transition-[opacity,translate] duration-300 ease-nq motion-reduce:transition-none',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
        'data-starting-style:data-[activation-direction=left]:-translate-x-1/2 data-starting-style:data-[activation-direction=right]:translate-x-1/2',
        'data-ending-style:data-[activation-direction=left]:translate-x-1/2 data-ending-style:data-[activation-direction=right]:-translate-x-1/2',
        props.class,
      )
    "
  >
    <slot />
  </NavigationMenuContent>
</template>
