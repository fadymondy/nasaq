<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../ai-states";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import { chromeLiveAnnouncements, chromeStep, type ChromeAnnouncement } from "./store-chrome-model";
import { storeChromeFill, useStoreChromeStrings, type StoreChromeLabels } from "./strings";

// A thin bar above the header. Several messages rotate on a timer that stops on hover, focus and reduced motion, and can
// be stepped by hand. Each message can be dismissed. It announces changes politely only when stepped manually.
export interface StoreAnnouncement extends ChromeAnnouncement {
  /** The message. Keep it to one line. */
  content: string;
  /** Makes the whole message a link. */
  href?: string;
}

const props = withDefaults(
  defineProps<{
    items: readonly StoreAnnouncement[];
    /** Milliseconds each message stays. 0 or reduced motion turns rotation off. Default 5000. */
    interval?: number;
    /** Show the close button. Default true. */
    dismissible?: boolean;
    /** Ids to treat as dismissed (controlled). Without it the bar remembers dismissals itself. */
    dismissedIds?: readonly string[];
    /** Clock for the from/until windows; default now. Mostly for tests and stories. */
    now?: number;
    labels?: StoreChromeLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { interval: 5000, dismissible: true, dismissedIds: undefined, now: undefined, labels: undefined },
);
const emit = defineEmits<{ dismiss: [id: string] }>();

const { t } = useStoreChromeStrings(() => props.labels);
const fmt = useFormatNumber();
const reduced = usePrefersReducedMotion();
const innerDismissed = ref<string[]>([]);
const index = ref(0);
const hold = ref(false);
const manual = ref(false);
const dismissed = computed(() => props.dismissedIds ?? innerDismissed.value);
const live = computed(() => chromeLiveAnnouncements(props.items, dismissed.value, props.now ?? Date.now()));
const at = computed(() => Math.min(index.value, Math.max(live.value.length - 1, 0)));
const current = computed(() => live.value[at.value]);
const rotating = computed(() => live.value.length > 1 && props.interval > 0 && !reduced.value && !hold.value);

let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  [rotating, index, () => props.interval, () => live.value.length],
  () => {
    clearTimeout(timer);
    if (rotating.value) timer = setTimeout(() => (index.value = chromeStep(index.value, live.value.length, 1)), props.interval);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));

function step(s: 1 | -1) {
  manual.value = true;
  index.value = chromeStep(index.value, live.value.length, s);
}
function dismiss() {
  const c = current.value;
  if (!c) return;
  innerDismissed.value = [...innerDismissed.value, c.id];
  emit("dismiss", c.id);
}
const iconBtn = "text-current hover:bg-white/15";
</script>

<template>
  <div
    v-if="current"
    data-slot="store-announcement-bar"
    role="region"
    aria-roledescription="carousel"
    :aria-label="t.announcements"
    :class="cn('flex min-h-9 items-center gap-2 bg-primary px-3 text-body-sm text-primary-foreground', props.class)"
    @mouseenter="hold = true"
    @mouseleave="hold = false"
    @focusin="hold = true"
    @focusout="hold = false"
  >
    <NqButton v-if="live.length > 1" size="icon-sm" variant="ghost" :aria-label="t.previousAnnouncement" :class="iconBtn" @click="step(-1)">
      <NqIcon :icon="ChevronLeft" />
    </NqButton>
    <span v-else class="size-control-sm shrink-0" aria-hidden="true" />
    <p :key="current.id" :aria-live="manual ? 'polite' : 'off'" aria-atomic="true" class="min-w-0 flex-1 truncate text-center motion-safe:animate-in motion-safe:fade-in">
      <a v-if="current.href" :href="current.href" class="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">{{ current.content }}</a>
      <template v-else>{{ current.content }}</template>
      <span v-if="live.length > 1" class="sr-only"> ({{ storeChromeFill(t.announcementOf, { n: fmt(at + 1), total: fmt(live.length) }) }})</span>
    </p>
    <NqButton v-if="live.length > 1" size="icon-sm" variant="ghost" :aria-label="t.nextAnnouncement" :class="iconBtn" @click="step(1)">
      <NqIcon :icon="ChevronRight" />
    </NqButton>
    <NqButton v-if="props.dismissible" size="icon-sm" variant="ghost" :aria-label="t.dismiss" :class="iconBtn" @click="dismiss">
      <NqIcon :icon="X" />
    </NqButton>
    <span v-else class="size-control-sm shrink-0" aria-hidden="true" />
  </div>
</template>
