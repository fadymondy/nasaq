<script setup lang="ts">
import { TooltipProvider } from "reka-ui";
import type { PopupSide } from "../popover/popup";
import NqTooltipContent from "./NqTooltipContent.vue";
import NqTooltipRoot from "./NqTooltipRoot.vue";
import NqTooltipTrigger from "./NqTooltipTrigger.vue";

// Shorthand: <NqTooltip content="Archive"><NqButton size="icon" aria-label="Archive">...</NqButton></NqTooltip>
interface Props {
  /** Supplementary text only: never the sole carrier of meaning (tooltips are hidden on touch). Or use the #content slot. */
  content?: string;
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: PopupSide;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Hover delay before opening, in ms. */
  delay?: number;
  /** Controlled open state (v-model:open). */
  open?: boolean;
}
const props = withDefaults(defineProps<Props>(), { content: undefined, side: undefined, align: undefined, sideOffset: undefined, delay: undefined, open: undefined });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <TooltipProvider :delay-duration="600">
    <NqTooltipRoot :open="props.open" :delay="props.delay" @update:open="emits('update:open', $event)">
      <NqTooltipTrigger as-child><slot /></NqTooltipTrigger>
      <NqTooltipContent :side="props.side" :align="props.align" :side-offset="props.sideOffset">
        <slot name="content">{{ props.content }}</slot>
      </NqTooltipContent>
    </NqTooltipRoot>
  </TooltipProvider>
</template>
