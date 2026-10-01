<script setup lang="ts">
import { injectSelectRootContext, SelectContent, SelectPortal, SelectViewport } from "reka-ui";
import { nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";

// The list. Opens below the trigger and as wide as it; `alignItemWithTrigger` overlays the selected item on it.
// Enter and exit use Base UI's model (lib/presence): data-starting-style on mount, data-ending-style until the
// fade ends. While closed Reka keeps the items registered offscreen so the trigger can show the chosen label.
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
const content = ref<{ $el: HTMLElement } | null>(null);
// Held true past the close until the exit transition ends, so Reka keeps the list mounted while it fades.
const keep = ref(root.open.value);

watch(
  () => root.open.value,
  async (open) => {
    if (open) {
      keep.value = true;
      await nextTick();
      const el = content.value?.$el;
      if (!el) return;
      el.removeAttribute("data-ending-style");
      presence.onBeforeEnter(el);
      presence.onEnter(el, () => {});
      return;
    }
    const el = content.value?.$el;
    if (!el) {
      keep.value = false;
      return;
    }
    presence.onLeave(el, () => {
      if (!root.open.value) keep.value = false;
    });
  },
);
</script>

<template>
  <SelectPortal>
    <SelectContent
      ref="content"
      :force-mount="keep"
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
