<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqInput } from "../field";
import { filterApps } from "./desktop-math";
import { useDesktopStrings, type DesktopApp, type DesktopShellLabels } from "./strings";

// A full-desktop overlay with a search box and a grid of app icons. Escape or a click outside closes it.
interface Props {
  apps: readonly DesktopApp[];
  labels?: DesktopShellLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const emit = defineEmits<{ select: [app: DesktopApp]; close: [] }>();
const { t } = useDesktopStrings(() => props.labels);
const query = ref("");
const shown = computed(() => filterApps(props.apps, query.value));
const root = ref<HTMLElement | null>(null);
onMounted(() => root.value?.querySelector<HTMLInputElement>("input")?.focus());

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.stopPropagation();
    emit("close");
  }
}
function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement;
  if (target === event.currentTarget || target.dataset.launchpadGrid !== undefined) emit("close");
}
function onSearchKey(event: KeyboardEvent) {
  const first = shown.value[0];
  if (event.key === "Enter" && first) emit("select", first);
}
</script>

<template>
  <div
    ref="root"
    data-slot="desktop-launchpad"
    role="dialog"
    aria-modal="true"
    :aria-label="t.launchpad"
    :class="cn('absolute inset-0 z-[900] flex flex-col items-center gap-8 overflow-y-auto bg-background/70 px-6 pt-10 pb-28 backdrop-blur-xl', props.class)"
    @keydown="onKeyDown"
    @pointerdown="onPointerDown"
  >
    <div class="relative w-full max-w-xs">
      <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
      <NqInput v-model="query" type="search" :aria-label="t.searchApps" :placeholder="t.searchApps" class="ps-9" @keydown="onSearchKey" />
    </div>
    <ul v-if="shown.length" data-launchpad-grid="" class="grid w-full max-w-3xl grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-4 gap-y-6">
      <li v-for="app in shown" :key="app.id" class="flex justify-center">
        <button
          type="button"
          class="flex w-22 flex-col items-center gap-2 rounded-xl p-1 text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="emit('select', app)"
        >
          <span class="size-16"><component :is="app.icon" /></span>
          <span class="max-w-full truncate">{{ app.title }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="text-body text-muted-foreground">{{ t.noApps }}</p>
  </div>
</template>
