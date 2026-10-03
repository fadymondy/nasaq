<script setup lang="ts">
import { TabsList } from "reka-ui";
import { provide, toRef, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TABS_VARIANT } from "./context";

// The row of tabs. Scrolls sideways when it doesn't fit. Put an NqTabsIndicator last inside it.
interface Props {
  /** "segmented" (default): a tinted track, for a few short options. "underline": a line under the active tab, for page sections. */
  variant?: "segmented" | "underline";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "segmented" });
provide(TABS_VARIANT, toRef(props, "variant"));
</script>

<template>
  <TabsList
    data-slot="tabs-list"
    :data-variant="props.variant"
    :class="
      cn(
        'relative z-0 flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        props.variant === 'segmented' ? 'w-fit gap-0.5 rounded-control bg-secondary p-0.5' : 'gap-4 border-b border-border',
        props.class,
      )
    "
  >
    <slot />
  </TabsList>
</template>
