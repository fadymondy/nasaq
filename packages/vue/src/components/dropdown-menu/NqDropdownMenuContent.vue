<script setup lang="ts">
import { DropdownMenuContent, DropdownMenuPortal, injectDropdownMenuRootContext } from "reka-ui";
import { inject, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { presence } from "../../lib/presence";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { physicalSide, type PopupSide } from "../popover";
import { menuPopupClass } from "./menu-styles";

interface Props {
  /** Prefer "inline-start" / "inline-end" over physical "left" / "right": the logical sides mirror in RTL. */
  side?: PopupSide;
  align?: "start" | "center" | "end";
  /** Gap to the trigger in px. */
  sideOffset?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "bottom", align: "start", sideOffset: 4 });
defineOptions({ inheritAttrs: false });
const nq = useNasaq();
const open = injectDropdownMenuRootContext().open;
const content = ref<{ $el: HTMLElement } | null>(null);
// Held true past the close until the exit transition ends, so Reka keeps the menu mounted while it fades.
const keep = ref(open.value);
// Reka's ref resolves to a comment placeholder first; the popup element is its next sibling.
function popupEl(): HTMLElement | null {
  const el = content.value?.$el as Node | undefined;
  if (!el) return null;
  const host = (["#text", "#comment"].includes(el.nodeName) ? (el as Element).nextElementSibling : el) as HTMLElement | null;
  const slot = '[data-slot="dropdown-menu-content"]';
  return host?.matches(slot) ? host : (host?.querySelector<HTMLElement>(slot) ?? null);
}
watch(open, async (isOpen) => {
  if (isOpen) {
    keep.value = true;
    await nextTick();
    await nextTick();
    const el = popupEl();
    if (!el) return;
    el.removeAttribute("data-ending-style");
    presence.onBeforeEnter(el);
    presence.onEnter(el, () => {});
    return;
  }
  const el = popupEl();
  if (!el) {
    keep.value = false;
    return;
  }
  presence.onLeave(el, () => {
    if (!open.value) keep.value = false;
  });
});
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      ref="content"
      :force-mount="keep"
      data-slot="dropdown-menu-content"
      :data-open="open ? '' : undefined"
      :data-closed="open ? undefined : ''"
      v-bind="$attrs"
      :loop="true"
      :side="physicalSide(props.side, nq.isRtl.value)"
      :align="props.align"
      :side-offset="props.sideOffset"
      :style="{ '--available-height': 'var(--reka-dropdown-menu-content-available-height)' }"
      :class="cn(menuPopupClass, props.class)"
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
