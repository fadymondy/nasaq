<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { dirOf } from "../../lib/locale";
import { useNasaq } from "../../provider";
import { autoplayInterval, carouselStrings, measureCarousel, scrollLeftFor, selectedSnap, stepTarget, type CarouselAlign } from "./carousel-logic";
import { CAROUSEL_KEY } from "./context";

// A swipeable slide carousel on native CSS scroll-snap. The reading direction mirrors swipes, arrows and slide order.
// Compose NqCarouselContent, NqCarouselItem, NqCarouselPrevious, NqCarouselNext and NqCarouselDots.
interface Props {
  /** Wrap around at the ends. Default false. */
  loop?: boolean;
  /** Where the active slide rests in the viewport. Default "start". */
  align?: CarouselAlign;
  /** Advance on a timer. `true` uses 5000 ms; a number is the interval in ms. Off under `prefers-reduced-motion`. */
  autoplay?: boolean | number;
  /** Accessible name of the carousel. Localise it. */
  label?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { loop: false, align: "start", autoplay: false, label: undefined, locale: undefined, dir: undefined });
const emit = defineEmits<{ select: [index: number]; ready: [api: { scrollTo(i: number): void; scrollPrev(): void; scrollNext(): void }] }>();

const nasaq = useNasaq();
const locale = computed(() => props.locale ?? nasaq.locale.value);
const dir = computed(() => props.dir ?? (props.locale ? dirOf(props.locale) : nasaq.direction.value));
const rtl = computed(() => dir.value === "rtl");
const t = computed(() => carouselStrings(locale.value));

const viewport = ref<HTMLElement | null>(null);
const canPrev = ref(false);
const canNext = ref(false);
const selected = ref(0);
const count = ref(0);
const version = ref(0);
const playing = ref(true);
const paused = ref(false);
const reduced = ref(false);
const align = computed(() => props.align);
const autoplayEnabled = computed(() => autoplayInterval(props.autoplay) > 0 && !reduced.value);
let snaps: number[] = [];

function slidesOf(el: HTMLElement) {
  return [...(el.querySelector('[data-slot="carousel-content"]')?.children ?? [])] as HTMLElement[];
}

function sync() {
  const el = viewport.value;
  if (!el) return;
  const m = measureCarousel(el, slidesOf(el), props.align, rtl.value);
  snaps = m.snaps;
  const index = selectedSnap(m);
  const total = m.snaps.length;
  canPrev.value = props.loop ? total > 1 : m.progress > 1;
  canNext.value = props.loop ? total > 1 : m.progress < m.max - 1;
  if (index !== selected.value) {
    selected.value = index;
    emit("select", index);
  }
  count.value = total;
  version.value++;
}

function scrollTo(index: number) {
  const el = viewport.value;
  if (!el || !snaps.length) return;
  const to = Math.min(snaps.length - 1, Math.max(0, index));
  el.scrollTo({ left: scrollLeftFor(snaps[to] ?? 0, rtl.value), behavior: reduced.value ? "auto" : "smooth" });
}
const scrollPrev = () => scrollTo(stepTarget(selected.value, count.value, -1, props.loop));
const scrollNext = () => scrollTo(stepTarget(selected.value, count.value, 1, props.loop));

provide(CAROUSEL_KEY, {
  viewport,
  rtl,
  locale,
  align,
  canPrev,
  canNext,
  selected,
  count,
  version,
  autoplayEnabled,
  playing,
  setPlaying: (v: boolean) => (playing.value = v),
  scrollPrev,
  scrollNext,
  scrollTo,
  sync,
});

let timer: ReturnType<typeof setInterval> | undefined;
function restartTimer() {
  clearInterval(timer);
  timer = undefined;
  if (!autoplayEnabled.value || !playing.value || paused.value) return;
  timer = setInterval(() => {
    if (document.hidden) return;
    scrollTo(selected.value < count.value - 1 ? selected.value + 1 : 0);
  }, autoplayInterval(props.autoplay));
}

let mq: MediaQueryList | undefined;
const onMq = () => (reduced.value = Boolean(mq?.matches));
onMounted(() => {
  if (typeof window.matchMedia === "function") {
    mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    onMq();
    mq.addEventListener?.("change", onMq);
  }
  sync();
  restartTimer();
  emit("ready", { scrollTo, scrollPrev, scrollNext });
});
onBeforeUnmount(() => {
  clearInterval(timer);
  mq?.removeEventListener?.("change", onMq);
});

watch([autoplayEnabled, playing, paused, () => props.autoplay], restartTimer, { flush: "post" });
watch([() => props.align, rtl], () => sync(), { flush: "post" });

function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
  // Right means "toward the end of the list" in LTR and toward the start in RTL.
  const toEnd = rtl.value ? "ArrowLeft" : "ArrowRight";
  const toStart = rtl.value ? "ArrowRight" : "ArrowLeft";
  if (event.key === toStart) {
    event.preventDefault();
    scrollPrev();
  } else if (event.key === toEnd) {
    event.preventDefault();
    scrollNext();
  }
}

function onFocusOut(e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) paused.value = false;
}
</script>

<template>
  <div
    role="region"
    aria-roledescription="carousel"
    :aria-label="props.label ?? t.carousel"
    :dir="dir"
    :lang="locale"
    tabindex="0"
    data-slot="carousel"
    :class="cn('relative rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', props.class)"
    @keydown="onKeydown"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="onFocusOut"
    @pointerdown.capture="playing = false"
  >
    <slot />
    <!-- Live region: only while autoplay is off, so a rotating carousel does not chatter. -->
    <div class="sr-only" :aria-live="autoplayEnabled && playing ? 'off' : 'polite'" aria-atomic="true">
      {{ count ? t.slide(selected + 1, count) : "" }}
    </div>
  </div>
</template>
