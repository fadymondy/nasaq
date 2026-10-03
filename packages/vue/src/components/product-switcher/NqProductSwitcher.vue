<script setup lang="ts">
import { ArrowUpRight, LayoutGrid } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqIcon } from "../icon";
import { NqPopover, NqPopoverClose, NqPopoverContent, NqPopoverTitle, NqPopoverTrigger } from "../popover";
import { NqTooltip } from "../tooltip";
import NqProductIcon from "./NqProductIcon.vue";
import { accentOf, type Product } from "./types";
import { useProductCommands } from "./use-product-commands";

// The app launcher (Google apps grid, Linear/Atlassian product switcher). Each product shows its
// official mark, never recoloured; its accent appears only as the "current" marker. The default slot replaces the trigger icon.
// Products with `href` render as links; otherwise listen to `@select`.
interface Props {
  products: Product[];
  /** The product the user is in. */
  current?: string;
  /** Adds an "All apps" footer link (e.g. to an app store). */
  allHref?: string;
  /** Registers "Switch to..." commands in the command palette. Default true. */
  registerCommands?: boolean;
  labels?: { trigger?: string; heading?: string; all?: string };
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { current: undefined, allHref: undefined, registerCommands: true, labels: undefined });
// select: a tile was chosen. viewAll: the "All apps" button (when there is no `allHref`).
const emit = defineEmits<{ select: [product: Product]; viewAll: [] }>();
const hasViewAll = typeof (getCurrentInstance()?.vnode.props ?? {}).onViewAll !== "undefined";

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const triggerLabel = computed(() => props.labels?.trigger ?? (ar.value ? "التطبيقات" : "Apps"));
useProductCommands(
  () => (props.registerCommands ? props.products : []),
  (p) => emit("select", p),
  () => props.current,
);

const COLUMNS = 3;

/** Arrow keys move through the grid; the inline axis follows dir. */
function onGridKey(event: KeyboardEvent) {
  const grid = event.currentTarget as HTMLElement;
  const tiles = [...grid.querySelectorAll<HTMLElement>("[data-slot=product-tile]")];
  const i = tiles.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  const rtl = getComputedStyle(grid).direction === "rtl";
  const step: Record<string, number> = {
    ArrowRight: rtl ? -1 : 1,
    ArrowLeft: rtl ? 1 : -1,
    ArrowDown: COLUMNS,
    ArrowUp: -COLUMNS,
    Home: -i,
    End: tiles.length - 1 - i,
  };
  const d = step[event.key];
  if (d === undefined) return;
  event.preventDefault();
  tiles[Math.min(tiles.length - 1, Math.max(0, i + d))]?.focus();
}
</script>

<template>
  <NqPopover>
    <NqTooltip :content="triggerLabel">
      <NqPopoverTrigger
        as="button"
        type="button"
        data-slot="product-switcher-trigger"
        :aria-label="triggerLabel"
        :class="
          cn(
            'inline-flex size-control-sm items-center justify-center rounded-control text-muted-foreground outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground data-popup-open:bg-nq-selected data-popup-open:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4',
            props.class,
          )
        "
      >
        <slot><LayoutGrid aria-hidden="true" /></slot>
      </NqPopoverTrigger>
    </NqTooltip>
    <NqPopoverContent side="bottom" align="end" :side-offset="6" data-slot="product-switcher" class="w-[19rem] p-1.5 text-body">
      <NqPopoverTitle class="px-2 pt-1.5 pb-2 text-caption font-medium text-muted-foreground">{{ props.labels?.heading ?? triggerLabel }}</NqPopoverTitle>
      <div role="group" class="grid grid-cols-3 gap-1" @keydown="onGridKey">
        <NqPopoverClose
          v-for="p in props.products"
          :key="p.id"
          :as="p.href ? 'a' : 'button'"
          :href="p.href"
          :type="p.href ? undefined : 'button'"
          data-slot="product-tile"
          :aria-current="p.id === props.current ? 'page' : undefined"
          :title="p.description"
          :style="{ '--product-accent': accentOf(p) ?? 'var(--nq-accent)' }"
          class="group relative flex flex-col items-center gap-1.5 rounded-control px-1 pt-3 pb-2 text-center outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus aria-[current]:bg-nq-selected"
          @click="emit('select', p)"
        >
          <span class="relative inline-flex size-10 items-center justify-center rounded-control border border-border bg-card">
            <NqProductIcon :product="p" :size="24" />
            <span
              v-if="p.badge"
              class="absolute -end-1.5 -top-1.5 min-w-4 rounded-full bg-nq-danger-solid px-1 text-center text-[10px] leading-4 font-medium text-nq-on-danger tabular-nums"
            >
              {{ p.badge }}
            </span>
          </span>
          <span class="w-full truncate text-caption text-foreground">{{ p.name }}</span>
          <!-- The brand accent marks the current product; the logo itself is never tinted. -->
          <span aria-hidden="true" class="absolute inset-x-5 bottom-0.5 h-0.5 rounded-full bg-(--product-accent) opacity-0 group-aria-[current]:opacity-100" />
        </NqPopoverClose>
      </div>
      <NqPopoverClose
        v-if="props.allHref || hasViewAll"
        :as="props.allHref ? 'a' : 'button'"
        :href="props.allHref"
        :type="props.allHref ? undefined : 'button'"
        class="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-control border-t border-border text-body-sm text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="emit('viewAll')"
      >
        {{ props.labels?.all ?? (ar ? "كل التطبيقات" : "All apps") }}
        <NqIcon :icon="ArrowUpRight" directional class="size-3.5" />
      </NqPopoverClose>
    </NqPopoverContent>
  </NqPopover>
</template>
