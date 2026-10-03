<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import { useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqIcon } from "../icon";
import { useSidebarCollapsed } from "./context";

/**
 * A labelled section of the sidebar. `label` (or the `label` slot) is the heading, the `action` slot an icon
 * button at its inline end ("New project"), and `collapsible` lets the user fold the group by its label.
 */
interface Props {
  label?: string;
  /** Lets the user fold the group away by its label. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { collapsible: false, defaultOpen: true });
const slots = useSlots();
const collapsed = useSidebarCollapsed();
const hasLabel = () => Boolean(props.label || slots.label);
</script>

<template>
  <NqCollapsible v-if="props.collapsible && !collapsed" :default-open="props.defaultOpen" data-slot="sidebar-group" :class="cn('group/group flex flex-col', props.class)">
    <div v-if="hasLabel()" class="group/label flex h-[calc(var(--spacing-nav-row)-4px)] items-center gap-1 ps-2 pe-1">
      <NqCollapsibleTrigger
        as="button"
        class="flex min-w-0 flex-1 items-center gap-1 text-caption font-medium text-muted-foreground rounded-[3px] text-start outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-3"
      >
        <span class="truncate"><slot name="label">{{ props.label }}</slot></span>
        <NqIcon
          :icon="ChevronRight"
          directional
          class="opacity-0 transition-[rotate,opacity] duration-200 ease-nq group-hover/label:opacity-100 group-focus-within/label:opacity-100 group-data-open/group:rotate-90 rtl:group-data-open/group:-rotate-90"
        />
      </NqCollapsibleTrigger>
      <slot name="action" />
    </div>
    <NqCollapsiblePanel>
      <div class="flex flex-col gap-0.5"><slot /></div>
    </NqCollapsiblePanel>
  </NqCollapsible>
  <div
    v-else
    data-slot="sidebar-group"
    role="group"
    :aria-label="collapsed ? props.label : undefined"
    :class="cn('flex flex-col', collapsed && 'border-t border-border pt-3 first:border-0 first:pt-0', props.class)"
  >
    <div v-if="hasLabel() && !collapsed" class="group/label flex h-[calc(var(--spacing-nav-row)-4px)] items-center gap-1 ps-2 pe-1">
      <div class="min-w-0 flex-1 truncate text-caption font-medium text-muted-foreground"><slot name="label">{{ props.label }}</slot></div>
      <slot name="action" />
    </div>
    <div class="flex flex-col gap-0.5"><slot /></div>
  </div>
</template>
