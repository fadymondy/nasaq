<script setup lang="ts">
import { ArrowDownToLine, CircleAlert, CircleCheck, RefreshCw } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { clampUpdatePercent, type UpdateStatus } from "./app-update-format";
import type { AppUpdateLabels } from "./strings";
import { fill, useAppUpdateLabels } from "./use-labels";

// A small pill for a title bar or header. It says an update is available, shows the download as it runs, and turns
// into "Restart to update" when it is ready. Pressing it opens your NqUpdateSheet or starts the restart (listen to `click`).
interface Props {
  status: UpdateStatus;
  /** 0 to 100, while `downloading`. */
  progress?: number;
  version?: string;
  labels?: Partial<AppUpdateLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { progress: 0, version: undefined, labels: undefined });
const { t } = useAppUpdateLabels(() => props.labels);
const percent = computed(() => Math.round(clampUpdatePercent(props.progress)));
const text = computed(
  () =>
    ({
      available: t.value.pillAvailable,
      downloading: fill(t.value.pillDownloading, { percent: percent.value }),
      ready: t.value.pillReady,
      error: t.value.pillError,
    })[props.status],
);
const Icon = computed(() => ({ available: ArrowDownToLine, downloading: RefreshCw, ready: CircleCheck, error: CircleAlert })[props.status]);
</script>

<template>
  <button
    type="button"
    data-slot="update-pill"
    :data-status="props.status"
    :title="props.version ? fill(t.pillHint, { version: props.version }) : undefined"
    :class="
      cn(
        'relative inline-flex h-control-sm items-center gap-1.5 overflow-hidden rounded-full border px-3 text-label outline-none focus-visible:outline-2 focus-visible:outline-nq-focus',
        props.status === 'ready' && 'border-nq-success/40 bg-nq-success-soft text-nq-success-text',
        props.status === 'error' && 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text',
        (props.status === 'available' || props.status === 'downloading') && 'border-border bg-card text-foreground hover:bg-nq-hover',
        props.class,
      )
    "
  >
    <span
      v-if="props.status === 'downloading'"
      aria-hidden="true"
      data-slot="update-pill-fill"
      class="absolute inset-y-0 start-0 bg-primary/15 transition-[inline-size] duration-300 ease-nq motion-reduce:transition-none"
      :style="{ inlineSize: `${percent}%` }"
    />
    <component :is="Icon" aria-hidden="true" :class="cn('relative size-3.5', props.status === 'downloading' && 'motion-safe:animate-spin')" />
    <span class="relative" aria-live="polite">{{ text }}</span>
  </button>
</template>
