<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, onMounted, onBeforeUnmount, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useSidebarCollapsed } from "../app-shell";
import { useCommandPaletteOpen } from "../commands";
import { isApplePlatform } from "../commands";
import { isolate } from "../icon";
import { NqKbd } from "../text";
import { NqTooltip } from "../tooltip";

// The "Search... Cmd+K" field that opens the NqCommandPalette (shadcn sidebar, Linear). On the collapsed rail,
// or with `variant="icon"`, it is an icon button with a tooltip.
interface Props {
  label?: string;
  /** "field" is the sidebar's "Search... Cmd+K" box; "icon" is a header button (e.g. on mobile). */
  variant?: "field" | "icon";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { label: undefined, variant: "field" });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
defineOptions({ inheritAttrs: false });

const palette = useCommandPaletteOpen();
const nq = useNasaq();
const railState = useSidebarCollapsed();
const rail = computed(() => Boolean(railState.value));
const label = computed(() => props.label ?? (nq.locale.value.startsWith("ar") ? "بحث…" : "Search…"));
const compact = computed(() => rail.value || props.variant === "icon");

// "Cmd" on Apple platforms, "Ctrl" elsewhere; follows <html data-platform>.
const mod = ref("Ctrl");
let observer: MutationObserver | undefined;
onMounted(() => {
  const sync = () => (mod.value = isApplePlatform() ? "⌘" : "Ctrl");
  sync();
  observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] });
});
onBeforeUnmount(() => observer?.disconnect());

function onClick(event: MouseEvent) {
  emit("click", event);
  if (!event.defaultPrevented) palette.setOpen(true);
}
</script>

<template>
  <NqTooltip v-if="compact" :content="`${label} ${isolate(mod === '⌘' ? '⌘K' : `${mod}+K`, 'ltr')}`" :side="props.variant === 'icon' ? 'bottom' : 'inline-end'">
    <button
      type="button"
      data-slot="search-trigger"
      aria-keyshortcuts="Meta+K Control+K"
      :aria-label="label"
      v-bind="$attrs"
      :class="
        cn(
          'flex h-control min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control border border-border bg-card px-2 text-body-sm text-muted-foreground',
          'transition-colors duration-150 ease-nq outline-none hover:border-nq-line-strong hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0',
          'size-control justify-center border-transparent bg-transparent px-0 hover:bg-nq-hover',
          props.class,
        )
      "
      @click="onClick"
    >
      <Search aria-hidden="true" />
    </button>
  </NqTooltip>
  <button
    v-else
    type="button"
    data-slot="search-trigger"
    aria-keyshortcuts="Meta+K Control+K"
    v-bind="$attrs"
    :class="
      cn(
        'flex h-control min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control border border-border bg-card px-2 text-body-sm text-muted-foreground',
        'transition-colors duration-150 ease-nq outline-none hover:border-nq-line-strong hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0',
        props.class,
      )
    "
    @click="onClick"
  >
    <Search aria-hidden="true" />
    <span class="flex-1 truncate text-start">{{ label }}</span>
    <span class="flex gap-0.5" dir="ltr">
      <NqKbd>{{ mod }}</NqKbd>
      <NqKbd>K</NqKbd>
    </span>
  </button>
</template>
