<script setup lang="ts">
import { MessageSquarePlus } from "lucide-vue-next";
import { computed, onMounted, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import {
  moveLauncherSpot,
  normalizePosition,
  parseLauncherSpot,
  snapLauncherSpot,
  spotFromPosition,
  type FeedbackLauncherPosition,
  type FeedbackLauncherShape,
  type FeedbackLauncherSpot,
} from "./feedback-reporter-utils";
import { feedbackStrings, type FeedbackReporterLabels } from "./strings";

// The floating feedback button: a pill, a circle or a tab on the screen edge, in a corner or the middle of a side. Sides are
// logical: `end` is the right in English and the left in Arabic. It only draws the button and emits `click`; open your report dialog from it.
interface Props {
  shape?: FeedbackLauncherShape;
  position?: FeedbackLauncherPosition;
  /** The words on the pill and tab, and the accessible name of the circle. Defaults to "Feedback" / "ملاحظات". */
  label?: string;
  /** A count on the corner, for example the reports already open on this page. */
  count?: number;
  /** `fixed` sits on the screen, `absolute` in a `relative` parent (previews). Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Replaces the default icon (a lucide-vue-next component). */
  icon?: Component;
  /** Lets the visitor drag the launcher aside; on release it snaps to the nearer side. Alt + arrow keys move it too. */
  movable?: boolean;
  /** Where a movable launcher's spot is saved in `localStorage`. Default `"nasaq-feedback-launcher"`; `null` keeps it in memory. */
  storageKey?: string | null;
  /** A controlled spot. Without it the launcher keeps its own, from `defaultSpot`, the saved one or `position`. */
  spot?: FeedbackLauncherSpot | null;
  defaultSpot?: FeedbackLauncherSpot;
  labels?: FeedbackReporterLabels;
  title?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { shape: "pill", position: "bottom-end", label: undefined, count: undefined, placement: "fixed", icon: undefined, movable: false, storageKey: "nasaq-feedback-launcher", spot: undefined, defaultSpot: undefined, labels: undefined, title: undefined });
const emit = defineEmits<{ click: [event: MouseEvent]; spotChange: [spot: FeedbackLauncherSpot] }>();
const DRAG_THRESHOLD = 4;

const nq = useNasaq();
const text = computed(() => props.label ?? feedbackStrings(nq.locale.value, props.labels).launcher);
const hint = computed(() => props.title ?? (props.movable ? feedbackStrings(nq.locale.value, props.labels).moveHint : undefined));
const where = computed(() => normalizePosition(props.shape, props.position));
const glyph = computed(() => props.icon ?? MessageSquarePlus);

const el = ref<HTMLButtonElement | null>(null);
const ownSpot = ref<FeedbackLauncherSpot | null>(props.defaultSpot ?? null);
const spot = computed(() => (props.movable ? (props.spot !== undefined ? props.spot : ownSpot.value) : null));
const dragAt = ref<{ left: number; top: number } | null>(null);
let drag: { id: number; startX: number; startY: number; offX: number; offY: number; moved: boolean } | null = null;
let swallowClick = false;

// Read the saved spot after mount, so the server and first client render agree.
onMounted(() => {
  if (!props.movable || !props.storageKey || props.defaultSpot || typeof localStorage === "undefined") return;
  const saved = parseLauncherSpot(localStorage.getItem(props.storageKey));
  if (saved) ownSpot.value = saved;
});

function commit(next: FeedbackLauncherSpot) {
  ownSpot.value = next;
  if (props.storageKey && typeof localStorage !== "undefined") localStorage.setItem(props.storageKey, JSON.stringify(next));
  emit("spotChange", next);
}
// The area the launcher moves in: the screen, or its positioned parent in a preview.
function area() {
  const parent = props.placement === "absolute" ? el.value?.offsetParent : null;
  return parent ? parent.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}
const isRtl = () => (el.value ? getComputedStyle(el.value).direction === "rtl" : false);

function onPointerDown(e: PointerEvent) {
  if (!props.movable || e.defaultPrevented || e.button !== 0) return;
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - box.left, offY: e.clientY - box.top, moved: false };
}
function onPointerMove(e: PointerEvent) {
  const d = drag;
  if (!d || d.id !== e.pointerId) return;
  const target = e.currentTarget as HTMLElement;
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
    d.moved = true;
    target.setPointerCapture?.(e.pointerId);
  }
  const box = area();
  dragAt.value = {
    left: Math.min(Math.max(e.clientX - d.offX - box.left, 0), box.width - target.offsetWidth),
    top: Math.min(Math.max(e.clientY - d.offY - box.top, 0), box.height - target.offsetHeight),
  };
}
function onPointerUp(e: PointerEvent) {
  const d = drag;
  drag = null;
  if (!d?.moved || d.id !== e.pointerId) return;
  swallowClick = true;
  const target = e.currentTarget as HTMLElement;
  const box = area();
  const center = { x: e.clientX - d.offX - box.left + target.offsetWidth / 2, y: e.clientY - d.offY - box.top + target.offsetHeight / 2 };
  dragAt.value = null;
  commit(snapLauncherSpot(center, box, isRtl(), target.offsetHeight));
}
function onPointerCancel() {
  drag = null;
  dragAt.value = null;
}
function onKeyDown(e: KeyboardEvent) {
  if (!props.movable || e.defaultPrevented || !e.altKey) return;
  const rtl = isRtl();
  const move = e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : e.key === "ArrowLeft" ? (rtl ? "end" : "start") : e.key === "ArrowRight" ? (rtl ? "start" : "end") : null;
  if (!move) return;
  e.preventDefault();
  commit(moveLauncherSpot(spot.value ?? spotFromPosition(where.value), move));
}
function onClick(e: MouseEvent) {
  // A drag ends with a click on the button; it should not open the report.
  if (swallowClick) {
    swallowClick = false;
    e.preventDefault();
    return;
  }
  emit("click", e);
}

const tabSide = computed(() => (spot.value ? (spot.value.side === "end" ? "edge-end" : "edge-start") : where.value));
const placed = computed(() => {
  if (dragAt.value) return { left: `${dragAt.value.left}px`, top: `${dragAt.value.top}px`, transition: "none" };
  if (!spot.value) return undefined;
  return { top: `${spot.value.y * 100}%`, [spot.value.side === "end" ? "insetInlineEnd" : "insetInlineStart"]: props.shape === "tab" ? "0px" : "1rem" };
});

const positionClass: Record<FeedbackLauncherPosition, string> = {
  "bottom-end": "bottom-4 end-4",
  "bottom-start": "bottom-4 start-4",
  "top-end": "top-4 end-4",
  "top-start": "top-4 start-4",
  "edge-end": "end-0 top-1/2 -translate-y-1/2",
  "edge-start": "start-0 top-1/2 -translate-y-1/2",
};
</script>

<template>
  <button
    ref="el"
    type="button"
    data-slot="feedback-launcher"
    :data-shape="props.shape"
    :data-position="spot ? undefined : where"
    :data-side="spot?.side"
    :data-movable="props.movable || undefined"
    :data-dragging="dragAt ? true : undefined"
    :aria-keyshortcuts="props.movable ? 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight' : undefined"
    :title="hint"
    :style="placed"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeyDown"
    @click="onClick"
    :aria-label="props.shape === 'circle' ? text : undefined"
    :class="
      cn(
        'z-40 inline-flex items-center justify-center gap-2 bg-primary text-label text-primary-foreground shadow-floating outline-none',
        'transition-[filter,translate] duration-150 ease-nq hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        props.placement,
        dragAt ? 'cursor-grabbing select-none' : spot ? '-translate-y-1/2' : positionClass[where],
        props.movable && 'touch-none',
        props.shape === 'pill' && 'h-control rounded-full px-4',
        props.shape === 'circle' && 'relative size-12 rounded-full',
        props.shape === 'tab' && (tabSide === 'edge-end' ? 'rounded-s-card' : 'rounded-e-card') + ' flex-col px-2 py-3',
        props.class,
      )
    "
  >
    <component :is="glyph" aria-hidden="true" class="size-4" />
    <span v-if="props.shape !== 'circle'" :class="cn(props.shape === 'tab' && '[writing-mode:vertical-rl] rtl:rotate-180')">{{ text }}</span>
    <span
      v-if="props.count"
      :aria-hidden="props.shape !== 'circle'"
      :class="cn('inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-caption text-foreground tabular-nums', props.shape === 'circle' && 'absolute -end-1 -top-1 h-5 border border-border')"
      >{{ props.count }}</span
    >
  </button>
</template>
