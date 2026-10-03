<script setup lang="ts">
import { ChevronDown, ChevronUp } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { useStrings, type TextUtilitiesLabels } from "./strings";

// Long content collapsed to a height with a fade and a "Show more" button. The button only appears when the content is
// actually taller than the limit, and it drives `aria-expanded` on a real button. Use NqProgressiveList for lists.
interface Props {
  /** Height in px while collapsed. Default 96. */
  collapsedHeight?: number;
  defaultExpanded?: boolean;
  labels?: TextUtilitiesLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { collapsedHeight: 96, defaultExpanded: false, labels: undefined });
const model = defineModel<boolean | undefined>("expanded", { default: undefined });
const { t } = useStrings(() => props.labels);
const id = useId();
const own = ref(props.defaultExpanded);
const expanded = computed(() => model.value ?? own.value);
const body = ref<HTMLElement>();
const overflows = ref(false);
let observer: ResizeObserver | undefined;

const check = () => {
  if (body.value) overflows.value = body.value.scrollHeight > props.collapsedHeight + 1;
};
onMounted(() => {
  check();
  if (typeof ResizeObserver === "undefined" || !body.value) return;
  observer = new ResizeObserver(check);
  observer.observe(body.value);
});
onBeforeUnmount(() => observer?.disconnect());

const toggle = () => {
  const next = !expanded.value;
  own.value = next;
  model.value = next;
};
const mask = computed(() => (overflows.value && !expanded.value ? "linear-gradient(to bottom, black calc(100% - 32px), transparent)" : undefined));
</script>

<template>
  <div data-slot="progressive-reveal" :data-expanded="expanded || undefined" :class="cn('flex flex-col items-start gap-2', props.class)">
    <div
      :id="id"
      ref="body"
      class="w-full overflow-hidden"
      :style="{ maxHeight: expanded ? undefined : `${props.collapsedHeight}px`, maskImage: mask, WebkitMaskImage: mask }"
    >
      <slot />
    </div>
    <NqButton v-if="overflows || expanded" variant="ghost" size="sm" :aria-expanded="expanded" :aria-controls="id" @click="toggle">
      <ChevronUp v-if="expanded" aria-hidden="true" />
      <ChevronDown v-else aria-hidden="true" />
      {{ expanded ? t.showLess : t.showMore }}
    </NqButton>
  </div>
</template>
