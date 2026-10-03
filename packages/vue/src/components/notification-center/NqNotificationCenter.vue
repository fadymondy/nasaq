<script setup lang="ts">
import { Bell } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqNum } from "../numeric";
import { NqPopover, NqPopoverContent, NqPopoverTrigger, type PopupSide } from "../popover";
import { NqSheet, NqSheetContent, NqSheetTrigger } from "../sheet";
import NqNotificationCenterBody from "./NqNotificationCenterBody.vue";
import { NOTIFICATION_CENTER_STRINGS, type NotificationCenterItem, type NotificationCenterLabels, type NotificationItemActions } from "./strings";

// A bell button with an unread badge that opens a popover of notifications, with All / Unread tabs and
// "Mark all read". Controlled: you own the items and the read state. The `header` slot adds content above the tabs.
interface Props {
  items: readonly NotificationCenterItem[];
  /** Actions for a row ("Mark as read", "Mute"…). They open as a context menu on context-click, Shift+F10 or the Menu key. */
  itemActions?: NotificationItemActions;
  /** Open `itemActions` as a context menu. Default true; false keeps the browser's menu. */
  contextMenu?: boolean;
  /** Total unread when it is more than the loaded `items` (server count). Defaults to the count in `items`. */
  unreadCount?: number;
  /** v-model:open */
  open?: boolean;
  defaultOpen?: boolean;
  /** Override any built-in string. Defaults come from the Nasaq locale ("en" / "ar"). */
  labels?: Partial<NotificationCenterLabels>;
  /** `popover` drops down from the bell. `sheet` slides in a full-height side panel, like a desktop notification centre. Default `popover`. */
  variant?: "popover" | "sheet";
  /** Popover side. With `variant="sheet"`, the edge the panel slides from (`end` by default). */
  side?: PopupSide | "start" | "end";
  align?: "start" | "center" | "end";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  itemActions: undefined,
  contextMenu: true,
  unreadCount: undefined,
  open: undefined,
  defaultOpen: false,
  labels: undefined,
  variant: "popover",
  side: undefined,
  align: "end",
});
// itemClick: a row was pressed (mark it read in your state here). markAllRead: the "Mark all read" button.
const emit = defineEmits<{ "update:open": [open: boolean]; itemClick: [item: NotificationCenterItem]; markAllRead: [] }>();
defineOptions({ inheritAttrs: false });

const CAP = 99;
const nq = useNasaq();
const t = computed<NotificationCenterLabels>(() => ({ ...NOTIFICATION_CENTER_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const count = computed(() => props.unreadCount ?? props.items.filter((i) => i.unread).length);
const sheet = computed(() => props.variant === "sheet");
const popoverSide = computed<PopupSide>(() => (props.side === "start" || props.side === "end" || props.side === undefined ? "bottom" : props.side));
</script>

<template>
  <div data-slot="notification-center" :data-variant="props.variant" v-bind="$attrs" :class="cn('inline-flex', props.class)">
    <component :is="sheet ? NqSheet : NqPopover" :open="props.open" :default-open="props.defaultOpen" @update:open="emit('update:open', $event)">
      <component :is="sheet ? NqSheetTrigger : NqPopoverTrigger" as-child>
        <NqButton variant="ghost" size="icon" :aria-label="t.trigger(count)" class="relative">
          <Bell />
          <NqBadge
            v-if="count > 0"
            variant="accent"
            data-slot="notification-center-badge"
            aria-hidden="true"
            class="pointer-events-none absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
          >
            <template v-if="count > CAP"><NqNum :value="CAP" />+</template>
            <NqNum v-else :value="count" />
          </NqBadge>
        </NqButton>
      </component>
      <NqSheetContent v-if="sheet" :side="props.side === 'start' ? 'start' : 'end'" class="w-[min(26rem,100vw)] pt-1">
        <NqNotificationCenterBody :items="props.items" :count="count" :t="t" sheet :context-menu="props.contextMenu" :item-actions="props.itemActions" @item-click="emit('itemClick', $event)" @mark-all-read="emit('markAllRead')">
          <template v-if="$slots.header" #header><slot name="header" /></template>
        </NqNotificationCenterBody>
      </NqSheetContent>
      <NqPopoverContent v-else :side="popoverSide" :align="props.align" class="w-[min(24rem,calc(100vw-1rem))] p-0">
        <NqNotificationCenterBody :items="props.items" :count="count" :t="t" :sheet="false" :context-menu="props.contextMenu" :item-actions="props.itemActions" @item-click="emit('itemClick', $event)" @mark-all-read="emit('markAllRead')">
          <template v-if="$slots.header" #header><slot name="header" /></template>
        </NqNotificationCenterBody>
      </NqPopoverContent>
    </component>
  </div>
</template>
