<script setup lang="ts">
import { Clock } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuLabel, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqInput } from "../field";
import NqSnoozePresetItems from "./NqSnoozePresetItems.vue";
import { toTime, type DateLike } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// Snooze presets (later today, tomorrow morning, this weekend, next week) plus a custom date and time.
// The `trigger` slot replaces the default icon button (give its element an accessible name).
const props = defineProps<{
  /** Called with a wake-up time (ms since epoch), or `null` to unsnooze. */
  onSnooze: (until: number | null) => void;
  /** Set when the conversation is already snoozed: adds an Unsnooze item. */
  snoozedUntil?: DateLike | null;
  /** Anchor for the presets. Default now. */
  now?: DateLike;
  labels?: Partial<InboxLabels>;
}>();
const t = useInboxLabels(() => props.labels);
const custom = ref(false);
const value = ref("");
const min = computed(() => {
  const d = new Date(toTime(props.now ?? Date.now()));
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
});
const at = computed(() => (value.value ? new Date(value.value).getTime() : Number.NaN));

function confirm() {
  custom.value = false;
  props.onSnooze(at.value);
}
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <slot name="trigger">
        <NqButton type="button" variant="ghost" size="icon" :aria-label="t.snooze">
          <Clock aria-hidden="true" />
        </NqButton>
      </slot>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-56">
      <NqDropdownMenuLabel>{{ t.snooze }}</NqDropdownMenuLabel>
      <NqSnoozePresetItems :now="props.now" :labels="props.labels" :on-pick="(when: number) => props.onSnooze(when)" />
      <NqDropdownMenuItem @select="custom = true">{{ t.snoozeCustom }}</NqDropdownMenuItem>
      <template v-if="props.snoozedUntil">
        <NqDropdownMenuSeparator />
        <NqDropdownMenuItem @select="props.onSnooze(null)">{{ t.unsnooze }}</NqDropdownMenuItem>
      </template>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
  <NqDialog v-model:open="custom">
    <NqDialogContent class="max-w-sm">
      <NqDialogHeader>
        <NqDialogTitle>{{ t.snoozeCustom }}</NqDialogTitle>
      </NqDialogHeader>
      <label class="flex flex-col gap-1.5 text-label text-foreground">
        {{ t.snoozeCustomLabel }}
        <NqInput v-model="value" ltr type="datetime-local" :min="min" />
      </label>
      <NqDialogFooter>
        <NqButton type="button" variant="secondary" @click="custom = false">{{ t.cancel }}</NqButton>
        <NqButton type="button" variant="primary" :disabled="!Number.isFinite(at)" @click="confirm">{{ t.snoozeConfirm }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
