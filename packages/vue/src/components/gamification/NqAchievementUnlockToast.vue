<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqButton from "../button/NqButton.vue";
import NqAchievementMedal from "./NqAchievementMedal.vue";
import { RARITY_STYLE, type GamificationLabels } from "./strings";
import type { Achievement } from "./types";
import { useKit } from "./use-kit";

// The celebration when something is earned: the medal pops in with a burst of dots. With prefers-reduced-motion
// it appears as a still card with no burst and no pop. Screen readers hear "Achievement unlocked" and the title
// through a polite live region that stays mounted, so mount this once and drive it with `open`.
interface Props {
  /** The achievement just earned. `null` or `open` false hides the toast. */
  achievement: Achievement | null;
  open: boolean;
  /** Hides itself after this many ms. Paused while hovered or focused. Default 6000, 0 keeps it open. */
  duration?: number;
  /** Fixed to the bottom corner (default), or in the flow of the page. */
  floating?: boolean;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { duration: 6000, floating: true, labels: undefined });
const emit = defineEmits<{ close: []; view: [id: string] }>();
const instance = getCurrentInstance();
const hasView = computed(() => typeof instance?.vnode.props?.onView !== "undefined");
const { t, num } = useKit(() => props.labels);

const BURST_DOTS = 10;
const reduced = ref(false);
let query: MediaQueryList | undefined;
const onMotion = () => {
  reduced.value = !!query?.matches;
};
onMounted(() => {
  if (typeof window.matchMedia !== "function") return;
  query = window.matchMedia("(prefers-reduced-motion: reduce)");
  onMotion();
  query.addEventListener("change", onMotion);
});

const paused = ref(false);
const card = ref<HTMLElement | null>(null);
const medal = ref<HTMLElement | null>(null);
const burst = ref<HTMLElement | null>(null);
const shown = computed(() => (props.open && props.achievement ? props.achievement : null));
const rarity = computed(() => shown.value?.rarity ?? "common");

let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [shown.value?.id, paused.value, props.duration, !!shown.value] as const,
  ([, isPaused, duration, isShown]) => {
    clearTimeout(timer);
    if (!isShown || isPaused || duration <= 0) return;
    timer = setTimeout(() => emit("close"), duration);
  },
  { immediate: true },
);

let anims: (Animation | undefined)[] = [];
const cancelAll = () => {
  for (const a of anims) {
    a?.finished?.catch(() => {});
    a?.cancel();
  }
  anims = [];
};
watch(
  () => [shown.value?.id, !!shown.value, reduced.value] as const,
  async ([, isShown, isReduced]) => {
    cancelAll();
    if (!isShown || isReduced) return;
    await nextTick();
    anims = [
      card.value?.animate?.([{ transform: "translateY(16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both" }),
      medal.value?.animate?.([{ transform: "scale(0.5)" }, { transform: "scale(1.18)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out", delay: 120, fill: "both" }),
      ...Array.from(burst.value?.children ?? []).map((child, i) => {
        const angle = (i / BURST_DOTS) * Math.PI * 2;
        const distance = 34 + (i % 2) * 10;
        return (child as HTMLElement).animate?.(
          [
            { transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1)`, opacity: 0 },
          ],
          { duration: 800, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both", delay: 60 },
        );
      }),
    ];
  },
  { immediate: true, flush: "post" },
);

onBeforeUnmount(() => {
  clearTimeout(timer);
  cancelAll();
  query?.removeEventListener("change", onMotion);
});
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    data-slot="achievement-unlock-toast"
    :class="cn(props.floating ? 'pointer-events-none fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:end-4 sm:w-96' : 'w-full', props.class)"
  >
    <div
      v-if="shown"
      ref="card"
      :data-rarity="rarity"
      :class="cn('pointer-events-auto relative flex items-center gap-3 rounded-floating border bg-popover p-3 text-popover-foreground shadow-floating', RARITY_STYLE[rarity].ring)"
      @pointerenter="paused = true"
      @pointerleave="paused = false"
      @focusin="paused = true"
      @focusout="paused = false"
    >
      <span class="relative shrink-0">
        <span ref="medal" class="inline-block">
          <NqAchievementMedal :achievement="{ ...shown, earnedAt: shown.earnedAt ?? new Date() }" size="md" />
        </span>
        <span v-if="!reduced" ref="burst" aria-hidden="true" class="pointer-events-none absolute inset-0">
          <span v-for="i in BURST_DOTS" :key="i" :class="cn('absolute start-1/2 top-1/2 size-1.5 rounded-full opacity-0', (i - 1) % 3 === 0 ? 'bg-nq-accent' : (i - 1) % 3 === 1 ? 'bg-nq-success' : 'bg-nq-info')" />
        </span>
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-eyebrow text-nq-accent-text">{{ t.unlocked }}</span>
        <span dir="auto" class="truncate text-label text-foreground">{{ shown.title }}</span>
        <span class="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
          <span>{{ t.rarity[rarity] }}</span>
          <span v-if="shown.xp" class="text-nq-accent-text">{{ t.xpReward(num(shown.xp)) }}</span>
        </span>
      </div>
      <NqButton v-if="hasView" size="sm" variant="secondary" @click="emit('view', shown.id)">{{ t.view }}</NqButton>
      <NqButton variant="ghost" size="icon-sm" :aria-label="t.dismiss" @click="emit('close')"><X aria-hidden="true" /></NqButton>
    </div>
  </div>
</template>
