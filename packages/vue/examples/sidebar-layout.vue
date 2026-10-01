<script setup lang="ts">
import { NqButton, NqSidebarCustomize, NqSidebarSortable, NqSidebarSortableItem, useSidebarLayout } from "@fadymondy/nasaq/vue";
import { Inbox, LayoutDashboard, ListTodo } from "lucide-vue-next";
import { ref } from "vue";

const ENTRIES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, required: true, href: "/" },
  { id: "inbox", label: "Inbox", icon: Inbox, href: "/inbox" },
  { id: "issues", label: "My issues", icon: ListTodo, href: "/issues" },
];

const customizing = ref(false);
const layout = useSidebarLayout("my-app-nav", ENTRIES.map((e) => e.id));
const byId = new Map(ENTRIES.map((e) => [e.id, e]));
const itemClass =
  "relative flex h-nav-row w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4 [&_svg]:shrink-0";
</script>

<template>
  <nav class="flex w-64 flex-col gap-1 rounded-floating border border-border bg-sidebar p-2" aria-label="Main">
    <NqSidebarSortable :ids="layout.visible" :on-move="layout.move">
      <NqSidebarSortableItem v-for="id in layout.visible" :id="id" :key="id">
        <a :href="byId.get(id)!.href" :class="itemClass">
          <component :is="byId.get(id)!.icon" />
          <span class="min-w-0 flex-1 truncate">{{ byId.get(id)!.label }}</span>
        </a>
      </NqSidebarSortableItem>
    </NqSidebarSortable>
    <NqButton variant="ghost" size="sm" @click="customizing = true">Customize sidebar</NqButton>
    <NqSidebarCustomize v-model:open="customizing" :sections="[{ id: 'main', items: ENTRIES, layout }]" />
  </nav>
</template>
