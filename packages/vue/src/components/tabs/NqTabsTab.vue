<script setup lang="ts">
import { injectTabsRootContext, TabsTrigger } from "reka-ui";
import { computed, inject, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TABS_VARIANT } from "./context";

// One tab. Give it the same `value` as its NqTabsPanel.
interface Props {
  value: string | number;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const variant = inject(TABS_VARIANT, ref("segmented" as const));
const root = injectTabsRootContext();
// Base UI marks the selected tab with data-active; the React classes style that attribute.
const active = computed(() => root.modelValue.value === props.value);
</script>

<template>
  <TabsTrigger
    data-slot="tabs-tab"
    :value="props.value"
    :disabled="props.disabled"
    :data-active="active ? '' : undefined"
    :class="
      cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-label text-muted-foreground outline-none transition-colors duration-150 ease-nq',
        'hover:text-foreground data-active:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        variant === 'segmented' ? 'h-7 rounded-[calc(var(--radius-control)-2px)] px-3' : 'h-9 px-0.5',
        props.class,
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
