<script setup lang="ts">
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, NotebookText, X } from "lucide-vue-next";
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { NqTooltip } from "../tooltip";
import NqSlideView from "./NqSlideView.vue";
import { clampIndex, formatElapsed, keyAction, progressOf, slideTitle, swipeAction, type Deck } from "./presentation-math";
import { usePresentationStrings, type PresentationLabels } from "./presentation-strings";

/**
 * Plays a deck full screen. Arrow keys, Space, Page Up and Down, Home and End move between slides (arrows follow
 * the reading direction), swiping works on touch, a progress bar and counter show where you are, `N` opens the
 * presenter notes with the next slide and a timer, `F` toggles full screen and Esc exits.
 */
interface Props {
  deck: Deck;
  open: boolean;
  /** Controlled slide index (zero based). Listen to `update:index`. */
  index?: number;
  defaultIndex?: number;
  /** Ask the browser for full screen when the player opens. Default true. */
  fullscreen?: boolean;
  /** Start with the presenter notes panel open. Default false. */
  defaultShowNotes?: boolean;
  labels?: PresentationLabels;
}
const props = withDefaults(defineProps<Props>(), { index: undefined, defaultIndex: 0, fullscreen: true, defaultShowNotes: false, labels: undefined });
const emit = defineEmits<{ "update:open": [open: boolean]; "update:index": [index: number] }>();

const { locale, isRtl, t } = usePresentationStrings(() => props.labels);
const n = (v: number) => formatNumber(v, locale.value);
const count = computed(() => props.deck.slides.length);
const inner = ref(props.defaultIndex);
const index = computed(() => clampIndex(props.index ?? inner.value, count.value));
const slide = computed(() => props.deck.slides[index.value]);
const upNext = computed(() => props.deck.slides[index.value + 1]);

const notes = ref(props.defaultShowNotes);
const isFull = ref(false);
const chrome = ref(true);
const elapsed = ref(0);
const popup = ref<{ $el: HTMLElement } | null>(null);
const stage = ref<HTMLElement | null>(null);
let swipe: { x: number; y: number } | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;
let clock: ReturnType<typeof setInterval> | undefined;

const popupEl = () => popup.value?.$el ?? null;

function go(next: number) {
  const target = clampIndex(next, count.value);
  if (target === index.value) return;
  inner.value = target;
  emit("update:index", target);
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else void popupEl()?.requestFullscreen?.()?.catch(() => undefined);
}
const onFullscreen = () => (isFull.value = document.fullscreenElement === popupEl());

function wake() {
  chrome.value = true;
  clearTimeout(idle);
  idle = setTimeout(() => (chrome.value = false), 2600);
}

function stop() {
  document.removeEventListener("fullscreenchange", onFullscreen);
  clearInterval(clock);
  clearTimeout(idle);
  if (document.fullscreenElement) void document.exitFullscreen?.()?.catch(() => undefined);
}

// Full screen follows the player: on open, and released on close. The index restarts from defaultIndex each time it opens.
watch(
  () => props.open,
  (open) => {
    stop();
    if (!open) return;
    inner.value = props.defaultIndex;
    elapsed.value = 0;
    document.addEventListener("fullscreenchange", onFullscreen);
    clock = setInterval(() => elapsed.value++, 1000);
    wake();
    void Promise.resolve().then(() => {
      const el = popupEl();
      if (props.fullscreen && el?.requestFullscreen) void el.requestFullscreen()?.catch(() => undefined);
    });
  },
  { immediate: true },
);
onBeforeUnmount(stop);

function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const action = keyAction(e.key, isRtl.value);
  if (!action) return;
  // Space and Enter belong to a focused button; the stage and the dialog body use them to advance.
  if ((e.key === " " || e.key === "Enter") && e.target instanceof HTMLElement && e.target.closest("button")) return;
  e.preventDefault();
  wake();
  if (action === "next") go(index.value + 1);
  else if (action === "prev") go(index.value - 1);
  else if (action === "first") go(0);
  else if (action === "last") go(count.value - 1);
  else if (action === "notes") notes.value = !notes.value;
  else if (action === "fullscreen") toggleFullscreen();
}
const onPointerDown = (e: PointerEvent) => (swipe = { x: e.clientX, y: e.clientY });
function onPointerUp(e: PointerEvent) {
  const start = swipe;
  swipe = null;
  if (!start) return;
  const action = swipeAction(e.clientX - start.x, e.clientY - start.y, isRtl.value);
  if (action === "next") go(index.value + 1);
  else if (action === "prev") go(index.value - 1);
}

const atStart = computed(() => index.value === 0);
const atEnd = computed(() => index.value >= count.value - 1);
const chromeClass = computed(() => cn("transition-opacity duration-200 ease-nq", chrome.value ? "opacity-100" : "opacity-0 focus-within:opacity-100 hover:opacity-100"));
// Space taken by the controls and the notes panel, so the slide keeps 16:9 inside what is left.
const reserved = computed(() => (notes.value ? "19rem" : "6rem"));
const ghost = "text-nq-bg hover:bg-nq-bg/10";
</script>

<template>
  <DialogRoot :open="props.open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogPortal>
      <DialogContent
        ref="popup"
        :dir="isRtl ? 'rtl' : 'ltr'"
        data-slot="deck-player"
        class="fixed inset-0 z-[70] flex flex-col bg-nq-fg text-nq-bg outline-none"
        @keydown="onKeydown"
        @pointermove="wake"
        @open-auto-focus.prevent="stage?.focus()"
      >
        <DialogTitle class="sr-only">{{ props.deck.title || t.player }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t.keys }}</DialogDescription>
        <div
          role="progressbar"
          :aria-label="t.progress"
          :aria-valuemin="1"
          :aria-valuemax="Math.max(1, count)"
          :aria-valuenow="count ? index + 1 : 0"
          :aria-valuetext="count ? t.slideOf(n(index + 1), n(count)) : t.emptyDeck"
          class="h-1 w-full shrink-0 bg-nq-bg/15"
        >
          <div class="h-full bg-primary transition-[width] duration-200 ease-nq" :style="{ width: `${progressOf(index, count) * 100}%` }" />
        </div>

        <div
          ref="stage"
          tabindex="-1"
          style="touch-action: pan-y"
          class="relative flex min-h-0 flex-1 items-center justify-center p-3 outline-none sm:p-6"
          @pointerdown="onPointerDown"
          @pointerup="onPointerUp"
          @pointercancel="swipe = null"
        >
          <div v-if="slide" :key="slide.id" class="w-full" :style="{ maxWidth: `calc((100dvh - ${reserved}) * 16 / 9)` }">
            <NqSlideView :slide="slide" class="rounded-card shadow-floating" />
          </div>
          <p v-else class="text-body text-nq-bg/70">{{ t.emptyDeck }}</p>
        </div>

        <div class="sr-only" role="status" aria-live="polite">{{ slide ? `${t.slideOf(n(index + 1), n(count))}: ${slideTitle(slide, t.untitled)}` : "" }}</div>

        <section v-if="notes" :aria-label="t.notes" class="grid max-h-[13rem] shrink-0 grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto border-t border-nq-bg/15 bg-nq-fg p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div class="min-w-0">
            <p class="mb-1 text-caption font-medium text-nq-bg/60">{{ t.notes }}</p>
            <p dir="auto" class="whitespace-pre-line text-start text-body text-nq-bg">
              <template v-if="slide?.notes?.trim()">{{ slide.notes }}</template>
              <span v-else class="text-nq-bg/50">{{ t.noNotes }}</span>
            </p>
          </div>
          <div class="hidden min-w-0 sm:block">
            <p class="mb-1 text-caption font-medium text-nq-bg/60">{{ t.upNext }}</p>
            <NqSlideView v-if="upNext" :slide="upNext" decorative class="rounded-control border border-nq-bg/20" />
            <div v-else class="flex aspect-video items-center justify-center rounded-control border border-dashed border-nq-bg/30 text-caption text-nq-bg/60">{{ t.endOfDeck }}</div>
          </div>
        </section>

        <div :class="cn('flex shrink-0 items-center gap-2 px-3 py-2 sm:px-4', chromeClass)">
          <NqTooltip :content="t.close">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.close" :class="ghost" @click="emit('update:open', false)"><X aria-hidden="true" /></NqButton>
          </NqTooltip>
          <span dir="ltr" class="text-caption text-nq-bg/60 tabular-nums" :aria-label="t.elapsed">{{ formatElapsed(elapsed) }}</span>
          <div class="mx-auto flex items-center gap-2">
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.previous" :disabled="atStart" :class="ghost" @click="go(index - 1)"><NqIcon :icon="ChevronLeft" directional /></NqButton>
            <span class="min-w-16 text-center text-label text-nq-bg tabular-nums" aria-hidden="true">{{ count ? `${n(index + 1)} / ${n(count)}` : "0" }}</span>
            <NqButton size="icon-sm" variant="ghost" :aria-label="t.next" :disabled="atEnd" :class="ghost" @click="go(index + 1)"><NqIcon :icon="ChevronRight" directional /></NqButton>
          </div>
          <NqTooltip :content="notes ? t.hideNotes : t.showNotes">
            <NqButton size="icon-sm" variant="ghost" :aria-label="notes ? t.hideNotes : t.showNotes" :aria-pressed="notes" :class="cn(ghost, notes && 'bg-nq-bg/15')" @click="notes = !notes"><NotebookText aria-hidden="true" /></NqButton>
          </NqTooltip>
          <NqTooltip :content="isFull ? t.exitFullscreen : t.enterFullscreen">
            <NqButton size="icon-sm" variant="ghost" :aria-label="isFull ? t.exitFullscreen : t.enterFullscreen" :class="ghost" @click="toggleFullscreen">
              <Minimize2 v-if="isFull" aria-hidden="true" />
              <Maximize2 v-else aria-hidden="true" />
            </NqButton>
          </NqTooltip>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
