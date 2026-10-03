<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import { onBeforeUnmount, ref, useSlots } from "vue";
import { cn } from "../../lib/cn";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqIcon } from "../icon";
import { NqPopover, NqPopoverContent, NqPopoverTitle, NqPopoverTrigger } from "../popover";
import { useSidebarCollapsed } from "./context";
import { sidebarItemClass } from "./variants";

/**
 * A parent item that expands to sub-items (shadcn NavMain). Put `NqSidebarSubItem`s in the default slot and the
 * icon in the `icon` slot. On the collapsed rail the icon opens a flyout with the sub-items.
 */
interface Props {
  label: string;
  /** Marks the parent when one of its children is the current page. */
  active?: boolean;
  defaultOpen?: boolean;
}
const props = withDefaults(defineProps<Props>(), { active: false, defaultOpen: false });
const slots = useSlots();
const collapsed = useSidebarCollapsed();

const flyout = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
// Hover opens the flyout after 100ms and closes it 150ms after the pointer leaves, like React's openOnHover.
function hover(open: boolean) {
  clearTimeout(timer);
  timer = setTimeout(() => (flyout.value = open), open ? 100 : 150);
}
onBeforeUnmount(() => clearTimeout(timer));
function onPopupClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) flyout.value = false;
}
</script>

<template>
  <!-- The rail has no room to expand in place, so the sub-items open in a flyout beside it. -->
  <NqPopover v-if="collapsed" v-model:open="flyout">
    <NqPopoverTrigger as-child>
      <button
        type="button"
        :aria-label="props.label"
        data-slot="sidebar-nest"
        :class="cn(sidebarItemClass(props.active), 'data-popup-open:bg-nq-hover data-popup-open:text-foreground')"
        @mouseenter="hover(true)"
        @mouseleave="hover(false)"
      >
        <slot name="icon" />
      </button>
    </NqPopoverTrigger>
    <NqPopoverContent
      side="inline-end"
      align="start"
      :side-offset="8"
      data-slot="sidebar-nest-flyout"
      class="w-auto min-w-44 p-1 text-popover-foreground"
      @click="onPopupClick"
      @mouseenter="hover(true)"
      @mouseleave="hover(false)"
    >
      <NqPopoverTitle class="px-2 pt-1 pb-1.5 text-caption font-medium text-muted-foreground">{{ props.label }}</NqPopoverTitle>
      <div class="flex flex-col gap-0.5"><slot /></div>
    </NqPopoverContent>
  </NqPopover>
  <NqCollapsible v-else :default-open="props.defaultOpen || props.active" data-slot="sidebar-nest" class="group/nest flex flex-col">
    <NqCollapsibleTrigger as="button" :class="cn(sidebarItemClass(false), props.active && 'font-medium text-foreground')">
      <span v-if="slots.icon" data-slot="sidebar-icon" class="contents"><slot name="icon" /></span>
      <span class="min-w-0 flex-1 truncate">{{ props.label }}</span>
      <NqIcon
        :icon="ChevronRight"
        directional
        class="ms-auto size-3.5! text-muted-foreground transition-[rotate] duration-200 ease-nq group-data-open/nest:rotate-90 rtl:group-data-open/nest:-rotate-90"
      />
    </NqCollapsibleTrigger>
    <NqCollapsiblePanel>
      <div class="ms-4 mt-0.5 flex flex-col gap-0.5 border-s border-border ps-2"><slot /></div>
    </NqCollapsiblePanel>
  </NqCollapsible>
</template>
