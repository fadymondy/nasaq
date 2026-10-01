<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { DesktopIconItem, DesktopIconOpenOn } from "./desktop-icons-logic";

// One icon on the desktop: a tile and a two-line label. Enter or Space opens it.
interface Props {
  item: DesktopIconItem;
  selected?: boolean;
  openOn?: DesktopIconOpenOn;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { selected: false, openOn: "auto" });
const emit = defineEmits<{ open: [item: DesktopIconItem]; select: [item: DesktopIconItem] }>();
defineOptions({ inheritAttrs: false });

const coarse = ref(false);
let query: MediaQueryList | undefined;
const onChange = () => (coarse.value = Boolean(query?.matches));
onMounted(() => {
  query = window.matchMedia?.("(pointer: coarse)");
  if (!query) return;
  coarse.value = query.matches;
  query.addEventListener("change", onChange);
});
onBeforeUnmount(() => query?.removeEventListener("change", onChange));
const single = computed(() => props.openOn === "click" || (props.openOn === "auto" && coarse.value));

function onClick() {
  emit("select", props.item);
  if (single.value) emit("open", props.item);
}
function onDoubleClick() {
  if (!single.value) emit("open", props.item);
}
function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("open", props.item);
  }
}
</script>

<template>
  <button
    type="button"
    data-slot="desktop-icon"
    :data-selected="props.selected ? '' : undefined"
    :aria-pressed="props.selected"
    v-bind="$attrs"
    :class="
      cn(
        'group flex w-22 select-none flex-col items-center gap-1.5 rounded-lg p-1.5 text-center outline-none',
        'transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus',
        props.selected ? 'bg-primary/15 ring-1 ring-primary/40' : 'hover:bg-nq-hover',
        props.class,
      )
    "
    @click="onClick"
    @dblclick="onDoubleClick"
    @keydown="onKeyDown"
  >
    <span aria-hidden="true" class="size-12 shrink-0"><component :is="props.item.icon" /></span>
    <span :class="cn('line-clamp-2 max-w-full rounded-sm px-1 text-caption font-medium break-words', props.selected ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-foreground')">
      {{ props.item.title }}
    </span>
  </button>
</template>
