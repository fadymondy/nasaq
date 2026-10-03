<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { RotateCw, Sparkles } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import NqAlert from "../alert/NqAlert.vue";
import NqButton from "../button/NqButton.vue";
import NqProductLogo from "../product-mark/NqProductLogo.vue";
import { formatUpdateSize, isUpdateRequired, type AppRelease, type UpdateStatus } from "./app-update-format";
import NqUpdateNotes from "./NqUpdateNotes.vue";
import NqUpdateProgress from "./NqUpdateProgress.vue";
import type { AppUpdateLabels } from "./strings";
import { fill, useAppUpdateLabels } from "./use-labels";

// Wraps the app. While the running build is at or above `minSupportedBuild` it renders the default slot. Below it, it
// renders a full screen with no way to dismiss: the only path is to download and restart. The `logo` slot replaces the
// provider brand logo.
interface Props {
  /** The build running now. */
  currentBuild: number;
  /** The oldest build the server still supports. Below it, the gate blocks. */
  minSupportedBuild: number | null | undefined;
  /** The release to update to. */
  release: AppRelease;
  status: UpdateStatus;
  progress?: number;
  speed?: number;
  onDownload?: () => void;
  onRestart?: () => void;
  labels?: Partial<AppUpdateLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { progress: 0, speed: undefined, onDownload: undefined, onRestart: undefined, labels: undefined });
defineOptions({ inheritAttrs: false });
const { t, locale } = useAppUpdateLabels(() => props.labels);
const required = computed(() => isUpdateRequired(props.currentBuild, props.minSupportedBuild));
</script>

<template>
  <slot v-if="!required" />
  <main
    v-else
    v-bind="$attrs"
    data-slot="forced-update-gate"
    :data-status="props.status"
    :class="cn('flex min-h-dvh flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground', props.class)"
  >
    <slot name="logo"><NqProductLogo :size="24" /></slot>
    <div class="flex w-full max-w-md flex-col items-center gap-5">
      <span aria-hidden="true" class="inline-flex size-12 items-center justify-center rounded-card border border-border bg-card text-nq-warning-text">
        <Sparkles class="size-6" />
      </span>
      <div class="flex flex-col gap-2">
        <h1 class="text-h2">{{ t.forcedTitle }}</h1>
        <p class="text-body text-muted-foreground">{{ t.forcedBody }}</p>
        <p class="text-caption text-muted-foreground">{{ fill(t.forcedVersions, { current: props.currentBuild, min: props.minSupportedBuild ?? "" }) }}</p>
      </div>
      <div class="w-full rounded-card border border-border bg-card p-4 text-start">
        <div class="mb-3 flex items-center justify-between gap-2">
          <span class="text-label">{{ fill(t.sheetTitle, { version: props.release.version }) }}</span>
          <span v-if="props.release.size" dir="ltr" class="text-caption text-muted-foreground tabular-nums">{{ formatUpdateSize(props.release.size, locale) }}</span>
        </div>
        <NqUpdateNotes :notes="props.release.notes?.slice(0, 3)" :t="t" />
        <NqUpdateProgress v-if="props.status === 'downloading'" :progress="props.progress" :speed="props.speed" :total-bytes="props.release.size" :t="t" :locale="locale" />
        <NqAlert v-if="props.status === 'error'" tone="danger" class="mt-3">{{ t.errorNote }}</NqAlert>
      </div>
      <NqButton v-if="props.status === 'ready'" variant="primary" size="lg" @click="props.onRestart?.()">
        <RotateCw aria-hidden="true" />
        {{ t.restart }}
      </NqButton>
      <NqButton v-else variant="primary" size="lg" :loading="props.status === 'downloading'" @click="props.onDownload?.()">
        {{ props.status === "error" ? t.retry : t.download }}
      </NqButton>
    </div>
  </main>
</template>
