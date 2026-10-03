<script setup lang="ts">
import { MenubarPortal, MenubarSubContent } from "reka-ui";
import { inject, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { presence } from "../../lib/presence";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { physicalSide, type PopupSide } from "../popover";
import { MENU_SUB_OPEN } from "./context";
import { menuPopupClass } from "../dropdown-menu/menu-styles";

interface Props {
  /** Logical by default, so the submenu opens toward the inline end and mirrors in RTL. */
  side?: PopupSide;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { side: "inline-end", align: "start", sideOffset: -4 });
defineOptions({ inheritAttrs: false });
const nq = useNasaq();
const open = inject(MENU_SUB_OPEN, ref(false));
const content = ref<{ $el: HTMLElement } | null>(null);
// Held true past the close until the exit transition ends, so Reka keeps the menu mounted while it fades.
const keep = ref(open.value);
// Reka's ref resolves to a comment placeholder first; the popup element is its next sibling.
function popupEl(): HTMLElement | null {
  const el = content.value?.$el as Node | undefined;
  if (!el) return null;
  const host = (["#text", "#comment"].includes(el.nodeName) ? (el as Element).nextElementSibling : el) as HTMLElement | null;
  const slot = '[data-slot="menubar-sub-content"]';
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
  <MenubarPortal>
    <MenubarSubContent
      ref="content"
      :force-mount="keep"
      data-slot="menubar-sub-content"
      :data-open="open ? '' : undefined"
      :data-closed="open ? undefined : ''"
      v-bind="$attrs"
      :loop="true"
      :side="physicalSide(props.side, nq.isRtl.value)"
      :align="props.align"
      :side-offset="props.sideOffset"
      :align-offset="-4"
      :style="{ '--available-height': 'var(--reka-menubar-content-available-height)' }"
      :class="cn(menuPopupClass, props.class)"
    >
      <slot />
    </MenubarSubContent>
  </MenubarPortal>
</template>
