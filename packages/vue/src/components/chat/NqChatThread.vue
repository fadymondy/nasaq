<script setup lang="ts">
import { ArrowDown } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";

/** How close to the end, in px, still counts as "at the bottom". */
const STICK_THRESHOLD = 48;

// The scrolling message list. It follows new content (also a message that grows while streaming) as long as the reader is at the
// bottom; once they scroll up it stops, and a "Jump to latest" button appears.
const props = defineProps<{
  /** Accessible name of the log. Default "Conversation" / "المحادثة". */
  label?: string;
  /** Accessible name of the jump button shown when the reader has scrolled up. */
  jumpLabel?: string;
  /** Classes for the inner column that holds the messages. */
  contentClassName?: HTMLAttributes["class"];
  class?: HTMLAttributes["class"];
}>();
const t = useT();
const scroller = ref<HTMLDivElement | null>(null);
const content = ref<HTMLDivElement | null>(null);
const away = ref(false);
let stuck = true;
let observer: ResizeObserver | undefined;

function toBottom(smooth = false) {
  const el = scroller.value;
  if (!el) return;
  if (typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  else el.scrollTop = el.scrollHeight;
}

function onScroll() {
  const el = scroller.value;
  if (!el) return;
  const near = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD;
  stuck = near;
  away.value = !near;
}

function jump() {
  stuck = true;
  toBottom(true);
}

onMounted(() => {
  toBottom();
  if (content.value && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => {
      if (stuck) toBottom();
    });
    observer.observe(content.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div data-slot="chat-thread" :class="cn('relative flex min-h-0 flex-col', props.class)">
    <div
      ref="scroller"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      :aria-label="props.label ?? t('Conversation', 'المحادثة')"
      tabindex="0"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
      @scroll="onScroll"
    >
      <div ref="content" :class="cn('flex flex-col gap-4 p-4', props.contentClassName)">
        <slot />
      </div>
    </div>
    <NqButton
      v-if="away"
      type="button"
      variant="secondary"
      size="icon-sm"
      :aria-label="props.jumpLabel ?? t('Jump to latest', 'الانتقال إلى الأحدث')"
      data-slot="chat-jump"
      class="absolute end-4 bottom-3 rounded-full shadow-sm"
      @click="jump"
    >
      <ArrowDown aria-hidden="true" />
    </NqButton>
  </div>
</template>
