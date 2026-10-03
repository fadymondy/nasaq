<script setup lang="ts">
import { MenubarTrigger, injectMenubarMenuContext, injectMenubarRootContext } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ disabled?: boolean; class?: HTMLAttributes["class"] }>();
const root = injectMenubarRootContext();
const menu = injectMenubarMenuContext();
const open = computed(() => root.modelValue.value === menu.value);
</script>

<template>
  <MenubarTrigger
    data-slot="menubar-trigger"
    :disabled="props.disabled"
    :data-popup-open="open ? '' : undefined"
    :class="
      cn(
        'inline-flex h-full min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center rounded-control px-2.5 text-label text-foreground outline-none',
        'hover:bg-nq-hover data-popup-open:bg-nq-selected focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </MenubarTrigger>
</template>
