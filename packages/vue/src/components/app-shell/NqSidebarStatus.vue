<script setup lang="ts">
import { useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useSidebarCollapsed } from "./context";
import NqRailTooltip from "./NqRailTooltip.vue";
import { STATUS_DOT } from "./variants";
import { slotText } from "./vnodes";

/** The service status line at the foot of the sidebar, usually a link to the status page. On the rail it is a dot with a tooltip. */
interface Props {
  tone?: keyof typeof STATUS_DOT;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tone: "success" });
defineOptions({ inheritAttrs: false });
const slots = useSlots();
const collapsed = useSidebarCollapsed();
const text = () => slotText(slots.default?.());
</script>

<template>
  <NqRailTooltip :enabled="collapsed" :content="text()">
    <a
      data-slot="sidebar-status"
      v-bind="$attrs"
      :data-tone="props.tone"
      :aria-label="collapsed ? text() : undefined"
      :class="
        cn(
          'flex h-nav-row items-center gap-2 rounded-control px-2 text-caption text-muted-foreground outline-none',
          'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          'group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0',
          props.class,
        )
      "
    >
      <span aria-hidden="true" :class="cn('size-2 shrink-0 rounded-full', STATUS_DOT[props.tone], props.tone !== 'success' && 'animate-pulse motion-reduce:animate-none')" />
      <span v-if="!collapsed" class="min-w-0 flex-1 truncate"><slot /></span>
    </a>
  </NqRailTooltip>
</template>
