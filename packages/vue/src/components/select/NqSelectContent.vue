<script setup lang="ts">
import { injectSelectRootContext, SelectContent, SelectPortal, SelectViewport } from "reka-ui";
import { nextTick, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The list. Opens below the trigger and as wide as it; `alignItemWithTrigger` overlays the selected item on it.
interface Props {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Overlay the selected item on the trigger (the native select feel). Default false: the list opens below. */
  alignItemWithTrigger?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "bottom", align: "start", sideOffset: 4, alignItemWithTrigger: false });
const root = injectSelectRootContext();
const id = useId();

// Base UI's enter state: mounted with data-starting-style, removed two frames later so the fade runs.
watch(
  () => root.open.value,
  async (open) => {
    if (!open) return;
    await nextTick();
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("data-starting-style", "");
    requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute("data-starting-style")));
  },
);
</script>

<template>
  <SelectPortal>
    <SelectContent
      :id="id"
      data-slot="select-content"
      :position="props.alignItemWithTrigger ? 'item-aligned' : 'popper'"
      :side="props.side"
      :align="props.align"
      :side-offset="props.sideOffset"
      :data-open="root.open.value ? '' : undefined"
      :data-closed="root.open.value ? undefined : ''"
      :style="{ '--anchor-width': 'var(--reka-select-trigger-width)', '--available-height': 'var(--reka-select-content-available-height)' }"
      :class="
        cn(
          'z-50 min-w-[var(--anchor-width)] max-h-[var(--available-height)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
          'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
          props.class,
        )
      "
    >
      <SelectViewport><slot /></SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
