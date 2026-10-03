<script setup lang="ts">
import { injectPopoverRootContext, PopoverContent, PopoverPortal, useId } from "reka-ui";
import { computed, provide, ref, watchPostEffect, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { POPOVER_CONTENT } from "./context";
import { physicalSide, popupEl, usePopupPresence, type PopupSide } from "./popup";

interface Props {
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: PopupSide;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "bottom", align: "center", sideOffset: 6 });
defineOptions({ inheritAttrs: false });
const root = injectPopoverRootContext();
const nq = useNasaq();
const side = computed(() => physicalSide(props.side, nq.isRtl.value));

const host = ref<{ $el?: Element } | null>(null);
const { mounted, starting, ending } = usePopupPresence(root.open, () => popupEl(host.value, "popover-content"));

const ids = { titleId: useId(undefined, "nq-popover-title"), descriptionId: useId(undefined, "nq-popover-description"), hasTitle: ref(false), hasDescription: ref(false) };
provide(POPOVER_CONTENT, ids);

// Reka labels the content by its trigger; Base UI labels it by the title and description, so point it there.
watchPostEffect(() => {
  void mounted.value;
  const el = popupEl(host.value, "popover-content");
  if (!el) return;
  for (const [attr, id, has] of [
    ["aria-labelledby", ids.titleId, ids.hasTitle.value],
    ["aria-describedby", ids.descriptionId, ids.hasDescription.value],
  ] as const) {
    if (has) el.setAttribute(attr, id);
    else if (el.getAttribute(attr) === id) el.removeAttribute(attr);
  }
});
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      v-if="mounted"
      ref="host"
      force-mount
      data-slot="popover-content"
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
    </PopoverContent>
  </PopoverPortal>
</template>
