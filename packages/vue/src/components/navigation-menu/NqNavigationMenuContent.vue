<script setup lang="ts">
import { injectNavigationMenuContext, injectNavigationMenuItemContext, NavigationMenuContent } from "reka-ui";
import { computed, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useActivationDirection, usePanelPresence } from "./usePanelPresence";

// The panel body for one trigger. Content fades and slides in from the side the previous panel was on:
// data-starting-style / data-ending-style with data-activation-direction, as in React.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const menu = injectNavigationMenuContext();
const item = injectNavigationMenuItemContext();
const open = computed(() => menu.modelValue.value !== "" && menu.modelValue.value === item.value);
const content = ref<{ $el: HTMLElement } | null>(null);
const getEl = () => content.value?.$el;
const { shown } = usePanelPresence(open, getEl);
const { direction, watchEl } = useActivationDirection(getEl);
onMounted(watchEl);
watch(() => content.value?.$el, watchEl, { flush: "post" });
</script>

<template>
  <NavigationMenuContent
    ref="content"
    force-mount
    data-slot="navigation-menu-content"
    :data-activation-direction="direction"
    :style="shown ? undefined : { display: 'none' }"
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
