<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next";
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqNum } from "../numeric";
import { NqProductMark } from "../product-mark";
import NqLogoLoader from "./NqLogoLoader.vue";
import { clampPercent } from "./loader-frames";
import { useBrandLoaderStrings, type BrandLoadersLabels } from "./strings";

interface BootError {
  /** What went wrong, in words a person can act on. Never a stack trace. */
  message: string;
  /** Technical details for support: a request id, status code, build number. Shown in mono, copyable. */
  detail?: string;
}

interface Props {
  /** Product name under the mark. Omit when the mark speaks for itself. */
  name?: string;
  /** `loading` (default) or `failed`. */
  state?: "loading" | "failed";
  /** What the app is doing right now: "Loading your workspace". */
  stage?: string;
  /** 0..100 to show a determinate ring and percentage; leave out for an endless ring. */
  progress?: number | null;
  /** After this many ms of loading, show the "taking longer" line. 0 turns it off. Default 8000. */
  slowAfterMs?: number;
  /** Set with `state="failed"`. */
  error?: BootError;
  labels?: Partial<BrandLoadersLabels>;
  class?: HTMLAttributes["class"];
}

// The full-screen screen shown while an app boots. It states what is happening, says so plainly when loading is slow,
// and when start-up fails it says that too, with a retry (when an @retry listener is set) and copyable details.
// Slots: `mark` (the host's official mark), `footer`.
const props = withDefaults(defineProps<Props>(), { state: "loading", progress: null, slowAfterMs: 8000 });
const emit = defineEmits<{ retry: [] }>();
const base = useBrandLoaderStrings();
const t = computed(() => ({ ...base.value, ...props.labels }));
const hasRetry = Boolean(getCurrentInstance()?.vnode.props?.onRetry);

const slow = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [props.state, props.slowAfterMs, props.stage] as const,
  () => {
    clearTimeout(timer);
    slow.value = false;
    if (props.state !== "loading" || props.slowAfterMs <= 0) return;
    timer = setTimeout(() => (slow.value = true), props.slowAfterMs);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
const failed = computed(() => props.state === "failed");
</script>

<template>
  <div
    data-slot="boot-splash"
    :data-state="props.state"
    :aria-busy="!failed || undefined"
    :class="cn('flex min-h-dvh flex-col items-center bg-background p-6 text-foreground', props.class)"
  >
    <div class="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
      <span v-if="failed" data-slot="boot-splash-mark" aria-hidden="true" class="inline-flex items-center justify-center" style="width: 96px; height: 96px">
        <slot name="mark"><NqProductMark :size="56" title="" /></slot>
      </span>
      <NqLogoLoader v-else :size="56" variant="ring" :value="props.progress" :label="props.stage ?? t.starting">
        <template v-if="$slots.mark" #mark><slot name="mark" /></template>
      </NqLogoLoader>
      <p v-if="props.name" class="text-h3 text-foreground">{{ props.name }}</p>
      <div v-if="failed" role="alert" class="flex w-full flex-col items-center gap-3">
        <h1 class="text-h3 text-foreground">{{ t.failedTitle }}</h1>
        <p class="text-body-sm text-foreground">{{ props.error?.message ?? t.failedBody }}</p>
        <p v-if="props.error?.message" class="text-caption text-muted-foreground">{{ t.failedBody }}</p>
        <div v-if="props.error?.detail" class="flex w-full items-center gap-2 rounded-control border border-border bg-muted py-1 ps-3 pe-1">
          <span class="sr-only">{{ t.details }}</span>
          <code dir="ltr" class="min-w-0 flex-1 truncate text-start font-mono text-caption text-foreground">{{ props.error.detail }}</code>
          <NqCopyButton :value="props.error.detail" :label="t.copyDetails" />
        </div>
        <NqButton v-if="hasRetry" variant="primary" @click="emit('retry')">
          <RefreshCw aria-hidden="true" />
          {{ t.retry }}
        </NqButton>
      </div>
      <div v-else class="flex flex-col items-center gap-1.5" role="status" aria-live="polite">
        <p class="text-body-sm text-foreground">{{ props.stage ?? t.starting }}</p>
        <p v-if="typeof props.progress === 'number'" class="text-caption text-muted-foreground tabular-nums">
          <NqNum :value="Math.round(clampPercent(props.progress))" />%
        </p>
        <p v-if="slow" class="text-caption text-muted-foreground">{{ t.slow }}</p>
      </div>
    </div>
    <div v-if="$slots.footer" class="text-caption text-muted-foreground"><slot name="footer" /></div>
  </div>
</template>
