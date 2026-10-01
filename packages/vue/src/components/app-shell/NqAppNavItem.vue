<script setup lang="ts">
import { inject, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NAV_KEY } from "./context";
import { APP_NAV_BAR_ITEM } from "./variants";

/**
 * A tab: the current one gets a solid underline and stronger text, never colour alone. Slots: default (the
 * label), `icon` (shown on the mobile bar and in its "More" drawer; give every item one) and `trailing` (a count
 * or "New" after the label; on the mobile bar it becomes a dot on the icon).
 */
interface Props {
  active?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { active: false });
const slots = useSlots();
const nav = inject(NAV_KEY, { placement: "tabs" as const, onNavigate: undefined, icons: true });
</script>

<template>
  <a
    v-if="nav.placement === 'bar'"
    data-slot="app-nav-item"
    :data-active="props.active ? '' : undefined"
    :aria-current="props.active ? 'page' : undefined"
    :class="cn(APP_NAV_BAR_ITEM, props.active && 'font-medium text-foreground', props.class)"
    @click="nav.onNavigate?.()"
  >
    <span class="relative inline-flex">
      <slot name="icon" />
      <span v-if="slots.trailing" aria-hidden="true" class="absolute -end-1 -top-0.5 size-2 rounded-full bg-nq-accent ring-2 ring-background" />
    </span>
    <span class="max-w-full truncate"><slot /></span>
  </a>
  <a
    v-else-if="nav.placement === 'sheet'"
    data-slot="app-nav-item"
    :data-active="props.active ? '' : undefined"
    :aria-current="props.active ? 'page' : undefined"
    :class="
      cn(
        'flex h-11 items-center gap-3 rounded-control px-3 text-body text-foreground outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover [&_svg]:size-5 [&_svg]:text-muted-foreground',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        props.active && 'bg-nq-selected font-medium',
        props.class,
      )
    "
    @click="nav.onNavigate?.()"
  >
    <slot name="icon" />
    <span class="min-w-0 flex-1 truncate"><slot /></span>
    <span v-if="slots.trailing" class="text-caption text-muted-foreground tabular-nums"><slot name="trailing" /></span>
  </a>
  <a
    v-else
    data-slot="app-nav-item"
    :aria-current="props.active ? 'page' : undefined"
    :class="
      cn(
        'relative flex h-11 shrink-0 items-center gap-2 px-2 text-body-sm whitespace-nowrap text-muted-foreground outline-none',
        'transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4',
        'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent',
        'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-nq-focus',
        props.active && 'font-medium text-foreground after:bg-foreground',
        props.class,
      )
    "
  >
    <slot v-if="nav.icons !== false" name="icon" />
    <slot />
    <span v-if="slots.trailing" class="text-caption text-muted-foreground tabular-nums"><slot name="trailing" /></span>
  </a>
</template>
