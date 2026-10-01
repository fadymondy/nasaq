<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { nextTrickle } from "./route-progress-math";

// A thin bar along the top edge for navigation and background work. It is decoration for sighted people and a
// progressbar role for everyone else. The fill grows from the inline start, so in Arabic it grows from the right.
// Drive it with `active` (see useRouteProgress), or pin it with `value`.
interface Props {
  /** Work is running. The bar starts, creeps toward 94% and jumps to 100% when this turns false. */
  active?: boolean;
  /** Pin the bar to an exact percentage (0 to 100). Overrides `active`; the bar hides itself at 100. */
  value?: number;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  /** `fixed` sits on the top of the screen, `absolute` on the top of a `relative` parent. Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Milliseconds between creeps. Default 250. */
  interval?: number;
  /** Accessible name. Defaults to "Loading" / "جارٍ التحميل". */
  label?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { active: false, tone: "default", placement: "fixed", interval: 250 });
const t = useT();

const tones = {
  default: "bg-primary",
  info: "bg-nq-info",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
};

const auto = ref(0);
const visible = ref(false);
const pinned = computed(() => props.value !== undefined);

let timer: ReturnType<typeof setInterval> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
function clear() {
  clearInterval(timer);
  clearTimeout(hideTimer);
}
watch(
  () => [props.active, pinned.value, props.interval] as const,
  ([active, isPinned, interval]) => {
    clear();
    if (isPinned) return;
    if (active) {
      visible.value = true;
      if (auto.value === 0 || auto.value === 100) auto.value = 6;
      timer = setInterval(() => (auto.value = nextTrickle(auto.value)), interval);
      return;
    }
    if (auto.value > 0) auto.value = 100;
    hideTimer = setTimeout(() => {
      visible.value = false;
      auto.value = 0;
    }, 300);
  },
  { immediate: true },
);
onBeforeUnmount(clear);

const shown = computed(() => (pinned.value ? Math.max(0, Math.min(100, props.value!)) : auto.value));
const show = computed(() => (pinned.value ? shown.value > 0 && shown.value < 100 : visible.value));
</script>

<template>
  <div
    role="progressbar"
    :aria-label="props.label ?? t('Loading', 'جارٍ التحميل')"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="Math.round(shown)"
    :aria-hidden="show ? undefined : true"
    data-slot="route-progress"
    :data-state="show ? 'active' : 'idle'"
    :class="
      cn(
        'pointer-events-none inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ease-nq motion-reduce:transition-none',
        props.placement,
        show ? 'opacity-100' : 'opacity-0',
        props.class,
      )
    "
  >
    <div
      data-slot="route-progress-bar"
      :class="cn('h-full rounded-e-full transition-[inline-size] duration-200 ease-nq motion-reduce:transition-none', tones[props.tone])"
      :style="{ inlineSize: `${shown}%` }"
    />
  </div>
</template>
