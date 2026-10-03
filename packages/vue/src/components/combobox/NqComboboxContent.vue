<script setup lang="ts">
import { ComboboxContent, ComboboxPortal } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The popup. Opens under the control (the chips box in multiple mode) and as wide as it.
interface Props {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "bottom", align: "start", sideOffset: 4 });
</script>

<template>
  <ComboboxPortal>
    <ComboboxContent
      data-slot="combobox-content"
      position="popper"
      :side="props.side"
      :align="props.align"
      :side-offset="props.sideOffset"
      :style="{ '--anchor-width': 'var(--reka-popper-anchor-width)', '--available-height': 'var(--reka-popper-available-height)' }"
      :class="
        cn(
          'z-50 w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
          'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
          props.class,
        )
      "
    >
      <slot />
    </ComboboxContent>
  </ComboboxPortal>
</template>
