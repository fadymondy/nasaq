<script setup lang="ts">
import { BellOff, CheckCheck } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqContextMenuActions } from "../context-menu";
import { NqNotificationItem } from "../notification-item";
import { formatRelativeTime, NqNum } from "../numeric";
import { NqSheetTitle } from "../sheet";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import type { NotificationCenterItem, NotificationCenterLabels, NotificationItemActions } from "./strings";

// The tabs, header and lists of NqNotificationCenter, shared by its popover and sheet variants. Internal.
const props = defineProps<{
  items: readonly NotificationCenterItem[];
  count: number;
  t: NotificationCenterLabels;
  sheet: boolean;
  contextMenu: boolean;
  itemActions?: NotificationItemActions;
}>();
const emit = defineEmits<{ itemClick: [item: NotificationCenterItem]; markAllRead: [] }>();
const nq = useNasaq();
const tab = ref("all");
const unreadItems = computed(() => props.items.filter((i) => i.unread));
const panels = computed(() => [
  { id: "all", rows: props.items, unread: false },
  { id: "unread", rows: unreadItems.value, unread: true },
]);
const time = (item: NotificationCenterItem) => (item.time !== undefined ? formatRelativeTime(item.time, nq.locale.value, { style: "narrow" }) : undefined);
const dateTime = (item: NotificationCenterItem) => (item.time !== undefined ? new Date(item.time).toISOString() : undefined);
</script>

<template>
  <NqTabs v-model="tab" :class="cn('gap-0', props.sheet && 'min-h-0 flex-1')">
    <div :class="cn('flex items-center justify-between gap-2 border-b border-border px-4 pt-3', props.sheet && 'border-0 pe-12')">
      <NqSheetTitle v-if="props.sheet" class="text-label text-foreground">{{ props.t.title }}</NqSheetTitle>
      <p v-else class="text-label text-foreground">{{ props.t.title }}</p>
      <NqButton variant="ghost" size="sm" :disabled="props.count === 0" class="-mt-1" @click="emit('markAllRead')">
        <CheckCheck />
        {{ props.t.markAllRead }}
      </NqButton>
    </div>
    <div v-if="$slots.header" data-slot="notification-center-header" class="border-b border-border px-4 py-3"><slot name="header" /></div>
    <NqTabsList variant="underline" class="border-border px-4">
      <NqTabsTab value="all">{{ props.t.all }}</NqTabsTab>
      <NqTabsTab value="unread">
        {{ props.t.unread }}
        <NqNum v-if="props.count > 0" :value="props.count" class="text-caption text-muted-foreground" />
      </NqTabsTab>
      <NqTabsIndicator />
    </NqTabsList>
    <NqTabsPanel v-for="panel in panels" :key="panel.id" :value="panel.id" :class="cn(props.sheet && 'flex min-h-0 flex-1 flex-col')">
      <NqEmptyState
        v-if="panel.rows.length === 0"
        :icon="BellOff"
        class="border-0 py-10"
        :title="panel.unread ? props.t.emptyUnread : props.t.emptyAll"
        :description="panel.unread ? props.t.emptyUnreadDescription : props.t.emptyAllDescription"
      />
      <ul v-else :class="cn('m-0 list-none divide-y divide-border overflow-y-auto overscroll-contain p-0', props.sheet ? 'min-h-0 flex-1' : 'max-h-96')">
        <NqContextMenuActions v-for="item in panel.rows" :key="item.id" as="li" :actions="props.itemActions?.(item) ?? []" :disabled="!props.contextMenu">
          <NqNotificationItem
            :actor="item.actor"
            :title="item.title"
            :description="item.description"
            :href="item.href"
            :unread="item.unread"
            :unread-label="nq.locale.value.startsWith('ar') ? 'غير مقروء' : 'Unread'"
            :time="time(item)"
            :date-time="dateTime(item)"
            @click="emit('itemClick', item)"
          >
            <template v-if="item.icon" #icon><component :is="item.icon" /></template>
          </NqNotificationItem>
        </NqContextMenuActions>
      </ul>
    </NqTabsPanel>
  </NqTabs>
</template>
