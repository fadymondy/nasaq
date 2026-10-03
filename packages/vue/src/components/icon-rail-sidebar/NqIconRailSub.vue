<script setup lang="ts">
import { NqSidebarContent, NqSidebarGroup, NqSidebarItem, NqSidebarNest, NqSidebarSubItem } from "../app-shell";
import { provide, ref } from "vue";
import { RAIL_KEY } from "../app-shell/context";
import type { RailLink, RailSection } from "./types";

// The sub-sidebar of NqIconRailSidebar: the chosen section's pages, in groups. Internal.
const props = defineProps<{
  id?: string;
  section: RailSection;
  label: string;
  activeItem?: string;
}>();
const emit = defineEmits<{ pick: [link: RailLink, event: MouseEvent] }>();
// The sub-sidebar is never the collapsed rail; say so, so its items render labels outside an app shell too.
provide(RAIL_KEY, ref(false));
</script>

<template>
  <nav
    :id="props.id"
    :aria-label="`${props.label}: ${props.section.title ?? props.section.label}`"
    data-slot="icon-rail-sub"
    class="flex w-60 shrink-0 flex-col gap-2 overflow-hidden border-e border-border bg-background p-shell"
  >
    <div class="flex h-8 shrink-0 items-center gap-1 ps-2">
      <h2 class="min-w-0 flex-1 truncate text-label text-foreground">{{ props.section.title ?? props.section.label }}</h2>
      <slot name="action" />
    </div>
    <slot name="header" />
    <NqSidebarContent>
      <NqSidebarGroup v-for="group in props.section.groups" :key="group.id" :label="group.label">
        <template v-for="item in group.items" :key="item.id">
          <NqSidebarNest v-if="item.children?.length" :label="item.label" :active="item.children.some((c) => c.id === props.activeItem)">
            <template v-if="item.icon" #icon><component :is="item.icon" /></template>
            <NqSidebarSubItem v-for="child in item.children" :key="child.id" :href="child.href ?? '#'" :active="props.activeItem === child.id" @click="emit('pick', child, $event)">
              {{ child.label }}
            </NqSidebarSubItem>
          </NqSidebarNest>
          <NqSidebarItem v-else :href="item.href ?? '#'" :active="props.activeItem === item.id" @click="emit('pick', item, $event)">
            <template v-if="item.icon" #icon><component :is="item.icon" /></template>
            {{ item.label }}
            <template v-if="item.badge" #trailing>{{ item.badge }}</template>
          </NqSidebarItem>
        </template>
      </NqSidebarGroup>
    </NqSidebarContent>
    <div v-if="$slots.footer" class="shrink-0"><slot name="footer" /></div>
  </nav>
</template>
