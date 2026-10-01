<script setup lang="ts">
import { useAttrs, useSlots, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useSidebarCollapsed } from "./context";
import NqRailTooltip from "./NqRailTooltip.vue";
import { sidebarItemClass } from "./variants";
import { slotText } from "./vnodes";

/**
 * A sidebar link. Active state = background + stronger text, never colour alone. Slots: default (the label),
 * `icon`, `trailing` (a count or status at the inline end, hidden on the collapsed rail).
 */
interface Props {
  active?: boolean;
  /**
   * Tooltip and accessible name on the collapsed rail. Defaults to the label when it is plain text; with
   * richer content pass `tooltip` (or `aria-label`), or the rail item has no name.
   */
  tooltip?: string;
  /** The element or component to render. Default "a"; pass your router link (`RouterLink`, Inertia `Link`). */
  as?: string | Component;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { active: false, tooltip: undefined, as: "a" });
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const slots = useSlots();
const collapsed = useSidebarCollapsed();
const name = () => props.tooltip ?? slotText(slots.default?.()) ?? (attrs["aria-label"] as string | undefined);
</script>

<template>
  <NqRailTooltip :enabled="collapsed && !!name()" :content="name()">
    <component
      :is="props.as"
      data-slot="sidebar-item"
      :aria-current="props.active ? 'page' : undefined"
      :class="cn(sidebarItemClass(props.active), props.class)"
      v-bind="attrs"
      :aria-label="collapsed ? name() : (attrs['aria-label'] as string | undefined)"
    >
      <span v-if="slots.icon" data-slot="sidebar-icon" class="contents"><slot name="icon" /></span>
      <span v-if="!collapsed" class="min-w-0 flex-1 truncate"><slot /></span>
      <span v-if="slots.trailing && !collapsed" class="ms-auto text-caption text-muted-foreground tabular-nums"><slot name="trailing" /></span>
    </component>
  </NqRailTooltip>
</template>
