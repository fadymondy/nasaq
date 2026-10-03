<script setup lang="ts">
import { CircleCheck, RotateCw } from "lucide-vue-next";
import NqAlert from "../alert/NqAlert.vue";
import NqBadge from "../badge/NqBadge.vue";
import NqButton from "../button/NqButton.vue";
import NqDateTime from "../numeric/NqDateTime.vue";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetFooter, NqSheetHeader, NqSheetTitle } from "../sheet";
import { formatUpdateSize, type AppRelease, type UpdateStatus } from "./app-update-format";
import NqUpdateNotes from "./NqUpdateNotes.vue";
import NqUpdateProgress from "./NqUpdateProgress.vue";
import type { AppUpdateLabels } from "./strings";
import { fill, useAppUpdateLabels } from "./use-labels";

// The update details in a side sheet: release notes, size, then the download with speed and time left, then Restart or
// Later. It is controlled (v-model:open), and it never downloads or restarts by itself: you drive `status` and `progress`.
interface Props {
  open: boolean;
  release: AppRelease;
  status: UpdateStatus;
  /** 0 to 100 while downloading. */
  progress?: number;
  /** Bytes per second while downloading. */
  speed?: number;
  /** Starts the download from `available`, and again after an `error`. */
  onDownload?: () => void;
  /** Restarts into the new version from `ready`. */
  onRestart?: () => void;
  /** "Later". Closes the sheet by default. */
  onLater?: () => void;
  side?: "end" | "start" | "bottom";
  labels?: Partial<AppUpdateLabels>;
}
const props = withDefaults(defineProps<Props>(), { progress: 0, speed: undefined, onDownload: undefined, onRestart: undefined, onLater: undefined, side: "end", labels: undefined });
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const { t, locale } = useAppUpdateLabels(() => props.labels);
function later() {
  props.onLater?.();
  emit("update:open", false);
}
</script>

<template>
  <NqSheet :open="props.open" @update:open="(v: boolean) => emit('update:open', v)">
    <NqSheetContent :side="props.side" data-slot="update-sheet" :data-status="props.status">
      <NqSheetHeader>
        <NqSheetTitle class="text-h3">{{ fill(t.sheetTitle, { version: props.release.version }) }}</NqSheetTitle>
        <NqSheetDescription class="flex flex-wrap items-center gap-2">
          <span>{{ fill(t.sheetDescription, { build: props.release.build }) }}</span>
          <NqDateTime v-if="props.release.date !== undefined" :value="props.release.date" :format="{ dateStyle: 'medium' }" />
          <NqBadge v-if="props.release.channel === 'beta'" variant="warning">{{ t.beta }}</NqBadge>
        </NqSheetDescription>
      </NqSheetHeader>
      <NqSheetBody class="flex flex-col gap-5 p-4">
        <NqUpdateNotes :notes="props.release.notes" :t="t" />
        <p v-if="props.release.size" class="flex items-center justify-between text-body-sm">
          <span class="text-muted-foreground">{{ t.size }}</span>
          <span dir="ltr" class="tabular-nums">{{ formatUpdateSize(props.release.size, locale) }}</span>
        </p>
        <NqUpdateProgress v-if="props.status === 'downloading'" :progress="props.progress" :speed="props.speed" :total-bytes="props.release.size" :t="t" :locale="locale" />
        <NqAlert v-if="props.status === 'ready'" tone="success" :icon="CircleCheck">{{ t.readyNote }}</NqAlert>
        <NqAlert v-if="props.status === 'error'" tone="danger">{{ t.errorNote }}</NqAlert>
      </NqSheetBody>
      <NqSheetFooter class="justify-end">
        <NqButton variant="ghost" @click="later">{{ t.later }}</NqButton>
        <NqButton v-if="props.status === 'ready'" variant="primary" @click="props.onRestart?.()">
          <RotateCw aria-hidden="true" />
          {{ t.restart }}
        </NqButton>
        <NqButton v-else variant="primary" :loading="props.status === 'downloading'" @click="props.onDownload?.()">
          {{ props.status === "error" ? t.retry : t.download }}
        </NqButton>
      </NqSheetFooter>
    </NqSheetContent>
  </NqSheet>
</template>
