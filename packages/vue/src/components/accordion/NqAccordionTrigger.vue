<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { AccordionHeader, AccordionTrigger, injectAccordionItemContext } from "reka-ui";
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { ACCORDION_PANEL_ID } from "./context";

// Header + trigger in one: a full-width button with the title at the inline start and a chevron that turns when open.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const item = injectAccordionItemContext();
const panelId = inject(ACCORDION_PANEL_ID, undefined);
</script>

<template>
  <AccordionHeader data-slot="accordion-header" class="m-0 flex">
    <AccordionTrigger
      data-slot="accordion-trigger"
      :aria-controls="panelId"
      :data-panel-open="item.open.value ? '' : undefined"
      :class="
        cn(
          'group flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-label text-foreground outline-none',
          'transition-colors duration-150 ease-nq hover:bg-nq-hover',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          'data-disabled:pointer-events-none data-disabled:opacity-50',
          props.class,
        )
      "
    >
      <slot />
      <NqIcon :icon="ChevronDown" class="text-muted-foreground transition-transform duration-200 ease-nq motion-reduce:transition-none group-data-panel-open:rotate-180" />
    </AccordionTrigger>
  </AccordionHeader>
</template>
