<script setup lang="ts">
import { injectTooltipRootContext, TooltipContent, TooltipPortal } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { physicalSide, popupEl, usePopupPresence, type PopupSide } from "../popover/popup";

interface Props {
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: PopupSide;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "top", align: undefined, sideOffset: 6 });
defineOptions({ inheritAttrs: false });
const root = injectTooltipRootContext();
const nq = useNasaq();
const side = computed(() => physicalSide(props.side, nq.isRtl.value));
const host = ref<{ $el?: Element } | null>(null);
const { mounted, starting, ending } = usePopupPresence(root.open, () => popupEl(host.value, "tooltip-content"));
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-if="mounted"
      ref="host"
      force-mount
      data-slot="tooltip-content"
      v-bind="$attrs"
      :side="side"
      :align="props.align"
      :side-offset="props.sideOffset"
      :data-open="root.open.value ? '' : undefined"
      :data-closed="root.open.value ? undefined : ''"
      :data-starting-style="starting ? '' : undefined"
      :data-ending-style="ending ? '' : undefined"
      :class="
        cn(
          // Inverted surface: ink on ivory grounds, ivory on navy.
          'z-50 max-w-64 rounded-control bg-foreground px-2 py-1 text-caption text-background',
          'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
          props.class,
        )
      "
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
