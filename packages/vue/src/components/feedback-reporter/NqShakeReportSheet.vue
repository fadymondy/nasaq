<script setup lang="ts">
import { Bug, Vibrate } from "lucide-vue-next";
import { computed, useId } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqSheet, NqSheetContent, NqSheetDescription, NqSheetHeader, NqSheetTitle } from "../sheet";
import { NqSwitch } from "../switch";
import { feedbackStrings, type FeedbackReporterLabels } from "./strings";

// The bottom sheet that answers a shake: "Something wrong? Report a problem", with a way to turn shaking off. Open it from
// `useShakeToReport`'s `onShake` and start the report from `onReport`. `v-model:open` controls it.
interface Props {
  open: boolean;
  /** Opens your report dialog. */
  onReport: () => void;
  /** Lets the person turn shake-to-report off from the sheet itself. Pass `onEnabledChange` to show the setting. */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  labels?: FeedbackReporterLabels;
}
const props = withDefaults(defineProps<Props>(), { enabled: undefined, onEnabledChange: undefined, labels: undefined });
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => feedbackStrings(nq.locale.value, props.labels));
const settingId = useId();

function report() {
  emit("update:open", false);
  props.onReport();
}
</script>

<template>
  <NqSheet :open="props.open" @update:open="(v: boolean) => emit('update:open', v)">
    <NqSheetContent side="bottom" data-slot="shake-report-sheet" class="pb-[env(safe-area-inset-bottom)]">
      <NqSheetHeader class="items-start">
        <span aria-hidden="true" class="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-secondary">
          <Vibrate class="size-5" />
        </span>
        <NqSheetTitle class="text-h3">{{ t.shakeTitle }}</NqSheetTitle>
        <NqSheetDescription class="text-body-sm">{{ t.shakeDescription }}</NqSheetDescription>
      </NqSheetHeader>
      <div class="flex flex-col gap-3 p-4">
        <NqButton variant="primary" size="lg" @click="report">
          <Bug aria-hidden="true" />
          {{ t.shakeReport }}
        </NqButton>
        <NqButton variant="ghost" @click="emit('update:open', false)">{{ t.shakeDismiss }}</NqButton>
        <div v-if="props.onEnabledChange" class="mt-1 flex items-center justify-between gap-4 border-t border-border pt-3">
          <div class="flex flex-col">
            <span :id="settingId" class="text-label">{{ t.shakeSetting }}</span>
            <span class="text-caption text-muted-foreground">{{ t.shakeSettingHint }}</span>
          </div>
          <NqSwitch :model-value="props.enabled ?? true" :aria-labelledby="settingId" @update:model-value="(v: boolean) => props.onEnabledChange?.(v)" />
        </div>
      </div>
    </NqSheetContent>
  </NqSheet>
</template>
