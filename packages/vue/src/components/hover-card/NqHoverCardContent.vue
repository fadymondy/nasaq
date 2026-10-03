<script setup lang="ts">
import { HoverCardContent, HoverCardPortal, injectHoverCardRootContext } from "reka-ui";
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
const props = withDefaults(defineProps<Props>(), { side: "bottom", align: "center", sideOffset: 6 });
defineOptions({ inheritAttrs: false });
const root = injectHoverCardRootContext();
const nq = useNasaq();
const side = computed(() => physicalSide(props.side, nq.isRtl.value));
const host = ref<{ $el?: Element } | null>(null);
const { mounted, starting, ending } = usePopupPresence(root.open, () => popupEl(host.value, "hover-card-content"));
</script>

<template>
  <HoverCardPortal>
    <HoverCardContent
      v-if="mounted"
      ref="host"
      force-mount
      data-slot="hover-card-content"
      v-bind="$attrs"
      :side="side"
      :align="props.align"
      :side-offset="props.sideOffset"
      :data-open="root.open.value ? '' : undefined"
      :data-closed="root.open.value ? undefined : ''"
      :data-starting-style="starting ? '' : undefined"
      :data-ending-style="ending ? '' : undefined"
      :style="{ '--available-width': 'var(--reka-popper-available-width)' }"
      :class="
        cn(
          'z-50 w-72 max-w-[var(--available-width)] rounded-floating border border-border bg-popover p-4 text-body-sm text-popover-foreground shadow-floating outline-none',
          'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
          props.class,
        )
      "
    >
      <slot />
    </HoverCardContent>
  </HoverCardPortal>
</template>
