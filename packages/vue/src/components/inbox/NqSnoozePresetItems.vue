<script setup lang="ts">
import { computed } from "vue";
import { useFormatDate } from "../numeric";
import { snoozePresets, type DateLike, type SnoozePresetId } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";
import { MENU_KITS, type MenuKitName } from "./menu-kit";

// The four snooze presets as menu items (internal: used by the snooze menu and the row menus).
const props = withDefaults(defineProps<{ onPick: (at: number) => void; now?: DateLike; labels?: Partial<InboxLabels>; kit?: MenuKitName }>(), { kit: "dropdown" });
const t = useInboxLabels(() => props.labels);
const fmt = useFormatDate();
const Item = computed(() => MENU_KITS[props.kit].Item);
const LABEL: Record<SnoozePresetId, "snoozeLater" | "snoozeTomorrow" | "snoozeWeekend" | "snoozeNextWeek"> = {
  later: "snoozeLater",
  tomorrow: "snoozeTomorrow",
  weekend: "snoozeWeekend",
  nextWeek: "snoozeNextWeek",
};
const presets = computed(() => snoozePresets(props.now));
</script>

<template>
  <component :is="Item" v-for="p in presets" :key="p.id" @select="props.onPick(p.at)">
    <span class="flex-1">{{ t[LABEL[p.id]] }}</span>
    <span class="text-caption text-muted-foreground">{{ fmt.date(p.at, p.id === "later" ? { timeStyle: "short" } : { weekday: "short", hour: "numeric", minute: "2-digit" }) }}</span>
  </component>
</template>
