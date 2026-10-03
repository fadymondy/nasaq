<script setup lang="ts">
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, injectDialogRootContext } from "reka-ui";
import { computed, inject, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { useT } from "../../provider";
import { overlayCloseClass } from "../dialog/variants";
import { CLOSE_RATIO, CLOSE_VELOCITY, DRAWER_CONTEXT, SLIDE_OUT_MS } from "./context";

interface Props {
  /** Show the drag handle (and enable swipe-down-to-close). Default true. */
  showHandle?: boolean;
  showClose?: boolean;
  /** Label for the close button. Defaults to "Close" / "إغلاق" by the Nasaq locale. */
  closeLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { showHandle: true, showClose: true });
defineOptions({ inheritAttrs: false });
const root = injectDialogRootContext();
const ctx = inject(DRAWER_CONTEXT, null);
const t = useT();
const popup = ref<{ $el: HTMLElement } | null>(null);
let drag: { startY: number; lastY: number; lastT: number; velocity: number } | null = null;

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function onPointerDown(e: PointerEvent) {
  if (!ctx || (e.pointerType === "mouse" && e.button !== 0)) return;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  drag = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 };
  ctx.dragging.value = true;
}
function onPointerMove(e: PointerEvent) {
  if (!ctx || !drag) return;
  const dt = Math.max(1, e.timeStamp - drag.lastT);
  drag.velocity = (e.clientY - drag.lastY) / dt;
  drag.lastY = e.clientY;
  drag.lastT = e.timeStamp;
  // Only downwards: dragging up past the resting position does nothing.
  ctx.offset.value = Math.max(0, e.clientY - drag.startY);
}
function finish(e: PointerEvent, cancelled: boolean) {
  const d = drag;
  if (!ctx || !d) return;
  drag = null;
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  ctx.dragging.value = false;
  const height = popup.value?.$el?.offsetHeight ?? 0;
  const shouldClose = !cancelled && (ctx.offset.value > height * CLOSE_RATIO || d.velocity > CLOSE_VELOCITY);
  if (!shouldClose) {
    ctx.offset.value = 0; // snap back
    return;
  }
  if (reducedMotion()) {
    ctx.close();
    return;
  }
  ctx.offset.value = height; // slide the rest of the way out, then close
  window.setTimeout(ctx.close, SLIDE_OUT_MS);
}

const moved = computed(() => (ctx ? ctx.offset.value > 0 || ctx.dragging.value : false));
const style = computed(() => (moved.value ? { translate: `0 ${ctx?.offset.value ?? 0}px` } : undefined));
</script>

<template>
  <DialogPortal>
    <Transition v-bind="presence">
      <DialogOverlay
        v-if="root.open.value"
        force-mount
        data-slot="drawer-backdrop"
        class="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none dark:bg-nq-bg/60"
      />
    </Transition>
    <Transition v-bind="presence">
      <DialogContent
        v-if="root.open.value"
        ref="popup"
        force-mount
        data-slot="drawer-content"
        :data-dragging="ctx?.dragging.value ? '' : undefined"
        :style="style"
        v-bind="$attrs"
        :class="
          cn(
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-floating border border-b-0 border-border bg-popover text-popover-foreground shadow-floating outline-none',
            'transition-[translate,opacity] duration-200 ease-nq data-starting-style:translate-y-8 data-starting-style:opacity-0 data-ending-style:translate-y-8 data-ending-style:opacity-0',
            'data-dragging:transition-none motion-reduce:transition-none',
            props.class,
          )
        "
      >
        <div
          v-if="props.showHandle"
          data-slot="drawer-handle"
          aria-hidden="true"
          class="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="finish($event, false)"
          @pointercancel="finish($event, true)"
        >
          <span class="h-1 w-10 rounded-full bg-nq-line-strong" />
        </div>
        <slot />
        <DialogClose v-if="props.showClose" data-slot="drawer-close" :aria-label="props.closeLabel ?? t('Close', 'إغلاق')" :class="overlayCloseClass">
          <X />
        </DialogClose>
      </DialogContent>
    </Transition>
  </DialogPortal>
</template>
