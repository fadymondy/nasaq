<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { useSidebarCollapsed } from "./context";

interface Props {
  /**
   * `always` (default): item icons show everywhere.
   * `mobile`: a text-only list on the desktop column; icons return in the phone sheet, where they help
   * scanning, and on the collapsed rail, where they are all there is.
   */
  icons?: "always" | "mobile";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { icons: "always" });
const collapsed = useSidebarCollapsed();
const t = useT();
</script>

<template>
  <nav
    data-slot="sidebar"
    :aria-label="t('Main', 'الرئيسية')"
    :data-collapsed="collapsed ? '' : undefined"
    :data-icons="props.icons"
    :class="
      cn(
        'group/sidebar flex h-full flex-col gap-shell overflow-y-auto overflow-x-hidden p-shell',
        // The desktop column and the phone sheet share this element; md+ is only ever the column.
        props.icons === 'mobile' && !collapsed && 'md:[&_[data-slot=sidebar-icon]]:hidden',
        props.class,
      )
    "
  >
    <slot />
  </nav>
</template>
