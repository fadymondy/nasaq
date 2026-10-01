<script setup lang="ts">
import { injectTabsRootContext } from "reka-ui";
import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TABS_VARIANT } from "./context";

// The moving highlight behind (segmented) or under (underline) the active tab.
// Sets the same --active-tab-* variables Base UI does, so the classes are the React ones.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const variant = inject(TABS_VARIANT, ref("segmented" as const));
const root = injectTabsRootContext();
const el = ref<HTMLElement>();
const style = ref<Record<string, string>>({});

function measure() {
  const tab = el.value?.parentElement?.querySelector<HTMLElement>('[data-slot="tabs-tab"][data-active]');
  if (!tab) return (style.value = { display: "none" });
  style.value = {
    "--active-tab-left": `${tab.offsetLeft}px`,
    "--active-tab-top": `${tab.offsetTop}px`,
    "--active-tab-width": `${tab.offsetWidth}px`,
    "--active-tab-height": `${tab.offsetHeight}px`,
  };
}

let ro: ResizeObserver | undefined;
onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && el.value?.parentElement) {
    ro = new ResizeObserver(measure);
    ro.observe(el.value.parentElement);
  }
});
onBeforeUnmount(() => ro?.disconnect());
watch(() => root.modelValue.value, () => nextTick(measure));
</script>

<template>
  <span
    ref="el"
    data-slot="tabs-indicator"
    aria-hidden="true"
    :style="style"
    :class="
      cn(
        'absolute -z-10 transition-[left,width] duration-200 ease-nq',
        'left-[var(--active-tab-left)] w-[var(--active-tab-width)]',
        variant === 'segmented'
          ? 'top-[var(--active-tab-top)] h-[var(--active-tab-height)] rounded-[calc(var(--radius-control)-2px)] bg-background shadow-xs'
          : 'bottom-0 h-0.5 rounded-full bg-primary',
        props.class,
      )
    "
  />
</template>
