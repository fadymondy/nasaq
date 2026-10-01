<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqMenubar, NqMenubarContent, NqMenubarItem, NqMenubarMenu, NqMenubarSeparator, NqMenubarTrigger } from "../menubar";
import { useDesktopStrings, type DesktopMenu, type DesktopShellLabels } from "./strings";

// The bar across the top of the desktop. Built on the menubar, so arrows and hover-switching work.
// Slots: `start` (a logo, before the app name) and `end` (clock, battery, status icons).
interface Props {
  /** The name of the app that has focus, shown first in bold. */
  appName?: string;
  menus?: readonly DesktopMenu[];
  labels?: DesktopShellLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { appName: undefined, menus: () => [], labels: undefined });
const { t } = useDesktopStrings(() => props.labels);
</script>

<template>
  <div
    data-slot="desktop-menu-bar"
    role="presentation"
    :aria-label="t.menuBar"
    :class="cn('flex h-8 shrink-0 items-center gap-1 border-b border-border/60 bg-card/70 px-2 text-caption backdrop-blur-md', props.class)"
  >
    <slot name="start" />
    <span v-if="props.appName" class="px-2 text-label font-semibold text-foreground">{{ props.appName }}</span>
    <NqMenubar v-if="props.menus.length" class="h-6 min-h-0 border-0 bg-transparent p-0">
      <NqMenubarMenu v-for="menu in props.menus" :key="menu.id" :value="menu.id">
        <NqMenubarTrigger class="min-h-0 px-2 text-caption">{{ menu.label }}</NqMenubarTrigger>
        <NqMenubarContent>
          <div v-for="item in menu.items" :key="item.id" role="none">
            <NqMenubarSeparator v-if="item.separated" />
            <NqMenubarItem :variant="item.danger ? 'danger' : 'default'" :shortcut="item.shortcut" :disabled="item.disabled" @select="item.onSelect?.()">
              {{ item.label }}
            </NqMenubarItem>
          </div>
        </NqMenubarContent>
      </NqMenubarMenu>
    </NqMenubar>
    <div class="ms-auto flex items-center gap-3 px-2 text-muted-foreground"><slot name="end" /></div>
  </div>
</template>
