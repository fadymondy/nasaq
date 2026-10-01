<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { clampSwipe, isHorizontalIntent, restOffset, settleSwipe, toInlineOffset, type SwipeState } from "./mobile-nav-math";
import { useMobileNav } from "./strings";

export interface SwipeAction extends Omit<ContextMenuAction, "danger" | "group" | "icon"> {
  icon: Component;
  tone?: "default" | "primary" | "warning" | "danger";
}

// A list row that slides sideways to reveal actions, the way phone lists do. The same actions are in the context
// menu, so keyboard and mouse people are not left out. Swipe direction follows the reading direction.
interface Props {
  /** Revealed by swiping toward the inline end (rightward in LTR): a pin, a read toggle. */
  startActions?: readonly SwipeAction[];
  /** Revealed by swiping toward the inline start (leftward in LTR): archive, delete. */
  endActions?: readonly SwipeAction[];
  /** Also open the actions from a context-click, long-press, Shift+F10 or the Menu key. Default true. */
  contextMenu?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { startActions: () => [], endActions: () => [], contextMenu: true, disabled: false });
// openChange: a panel opened or closed.
const emit = defineEmits<{ openChange: [state: SwipeState] }>();
defineOptions({ inheritAttrs: false });

const ACTION_WIDTH = 76;
const toneClass: Record<NonNullable<SwipeAction["tone"]>, string> = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary text-primary-foreground",
  warning: "bg-nq-warning text-background",
  danger: "bg-nq-danger text-background",
};

interface Gesture {
  x: number;
  y: number;
  base: number;
  t: number;
  horizontal: boolean;
  last: number;
  velocity: number;
}

const { rtl } = useMobileNav();
const startWidth = computed(() => props.startActions.length * ACTION_WIDTH);
const endWidth = computed(() => props.endActions.length * ACTION_WIDTH);
const state = ref<SwipeState>("closed");
const drag = ref<number | null>(null);
let gesture: Gesture | null = null;
let moved = false;
const root = ref<HTMLDivElement | null>(null);

function setOpen(next: SwipeState) {
  state.value = next;
  emit("openChange", next);
}

// Close on any press outside.
const away = (event: PointerEvent) => {
  if (!root.value?.contains(event.target as Node)) setOpen("closed");
};
watch(
  state,
  (s) => {
    if (s === "closed") document.removeEventListener("pointerdown", away);
    else document.addEventListener("pointerdown", away);
  },
  { flush: "sync" },
);
onBeforeUnmount(() => document.removeEventListener("pointerdown", away));

const offset = computed(() => drag.value ?? restOffset(state.value, startWidth.value, endWidth.value));
const physical = computed(() => (rtl.value ? -offset.value : offset.value));

function onPointerDown(event: PointerEvent) {
  if (props.disabled || (!startWidth.value && !endWidth.value) || event.pointerType === "mouse") return;
  gesture = { x: event.clientX, y: event.clientY, base: restOffset(state.value, startWidth.value, endWidth.value), t: event.timeStamp, horizontal: false, last: 0, velocity: 0 };
  moved = false;
}
function onPointerMove(event: PointerEvent) {
  const g = gesture;
  if (!g) return;
  const dx = event.clientX - g.x;
  const dy = event.clientY - g.y;
  if (!g.horizontal) {
    if (isHorizontalIntent(dx, dy)) {
      g.horizontal = true;
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } else {
      if (Math.abs(dy) > 8) gesture = null;
      return;
    }
  }
  moved = true;
  const inline = g.base + toInlineOffset(dx, rtl.value);
  const dt = Math.max(1, event.timeStamp - g.t);
  g.velocity = (inline - g.last) / dt;
  g.last = inline;
  g.t = event.timeStamp;
  drag.value = clampSwipe(inline, startWidth.value, endWidth.value);
}
function finish() {
  const g = gesture;
  gesture = null;
  if (!g || drag.value === null) return;
  const next = settleSwipe(drag.value, startWidth.value, endWidth.value, { velocity: g.velocity });
  drag.value = null;
  setOpen(next);
}
function run(action: SwipeAction) {
  if (action.disabled) return;
  setOpen("closed");
  action.onSelect();
}
// A drag must not count as a tap on the row's own link or button, and a tap on an open row closes it.
function onClickCapture(event: MouseEvent) {
  if (moved) {
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  } else if (state.value !== "closed" && !(event.target as HTMLElement).closest("[data-slot=swipe-actions]")) {
    event.preventDefault();
    event.stopPropagation();
    setOpen("closed");
  }
}
const menuActions = computed<ContextMenuAction[]>(() => [...props.startActions, ...props.endActions].map((a) => ({ ...a, danger: a.tone === "danger" })));
const panels = computed(() => [
  { side: "start" as const, list: props.startActions },
  { side: "end" as const, list: props.endActions },
]);
</script>

<template>
  <NqContextMenuActions :actions="menuActions" :disabled="!props.contextMenu || props.disabled" class="contents">
    <div
      ref="root"
      data-slot="swipe-action-row"
      :data-state="state"
      v-bind="$attrs"
      :class="cn('relative overflow-hidden bg-card', props.class)"
      @click.capture="onClickCapture"
    >
      <template v-for="panel in panels" :key="panel.side">
        <!-- Inert until open, so hidden buttons are not tab stops. -->
        <div
          v-if="panel.list.length"
          data-slot="swipe-actions"
          :data-side="panel.side"
          :inert="state !== panel.side"
          :class="cn('absolute inset-y-0 flex', panel.side === 'start' ? 'start-0' : 'end-0')"
          :style="{ width: `${panel.list.length * ACTION_WIDTH}px` }"
        >
          <button
            v-for="action in panel.list"
            :key="action.id"
            type="button"
            :disabled="action.disabled"
            :class="
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 px-1 text-caption outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50',
                toneClass[action.tone ?? 'default'],
              )
            "
            @click="run(action)"
          >
            <component :is="action.icon" aria-hidden="true" class="size-5" />
            <span class="max-w-full truncate">{{ action.label }}</span>
          </button>
        </div>
      </template>
      <div
        data-slot="swipe-surface"
        :class="cn('relative bg-card [touch-action:pan-y]', drag === null && 'transition-transform duration-200 ease-nq')"
        :style="{ transform: `translateX(${physical}px)` }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="finish"
        @pointercancel="finish"
      >
        <slot />
      </div>
    </div>
  </NqContextMenuActions>
</template>
