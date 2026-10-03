<script setup lang="ts">
import { ChevronRight, RotateCcw } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqAnsiText, useFollowScroll } from "../terminal";
import { formatDuration, stepDuration, tailLines } from "./deploy-format";
import NqDeployStatusIcon from "./NqDeployStatusIcon.vue";
import type { DeployViewLabels } from "./strings";
import type { DeployResult, DeployStep } from "./types";

// One row of NqDeployView. Internal: use NqDeployView.
const props = defineProps<{
  step: DeployStep;
  index: number;
  now: number;
  open: boolean;
  onRetry?: (stepId: string) => Promise<DeployResult> | DeployResult;
  maxLogLines: number;
  logHeight: string;
  t: DeployViewLabels;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const duration = computed(() => stepDuration(props.step, props.now));
const retrying = ref(false);
const retryError = ref<string | undefined>();
const logs = computed(() => (props.step.logs ? tailLines(props.step.logs, props.maxLogLines) : null));
const running = computed(() => props.step.status === "running");
const { el, following, setFollowing, onScroll } = useFollowScroll<HTMLPreElement>(() => logs.value?.text.length ?? 0, true);

async function retry() {
  if (!props.onRetry) return;
  retrying.value = true;
  retryError.value = undefined;
  try {
    const result = await props.onRetry(props.step.id);
    if (result && "error" in result && result.error) retryError.value = result.error;
  } catch {
    retryError.value = props.t.retryFailed;
  } finally {
    retrying.value = false;
  }
}
</script>

<template>
  <li data-slot="deploy-step" :data-status="props.step.status" class="border-b border-border last:border-b-0">
    <NqCollapsible :open="props.open" @update:open="emit('update:open', $event)">
      <div class="flex items-center gap-1 pe-2">
        <NqCollapsibleTrigger
          :aria-label="props.t.stepLabel(props.index + 1, props.step.name, props.t.status[props.step.status])"
          :class="
            cn(
              'group/step flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
            )
          "
        >
          <ChevronRight
            aria-hidden="true"
            class="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[panel-open]/step:rotate-90 rtl:-scale-x-100 rtl:group-data-[panel-open]/step:-rotate-90"
          />
          <NqDeployStatusIcon :status="props.step.status" class="shrink-0" />
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-label text-foreground">{{ props.step.name }}</span>
            <bdi v-if="props.step.command" dir="ltr" class="truncate text-start font-mono text-caption text-muted-foreground">{{ props.step.command }}</bdi>
          </span>
          <span class="hidden shrink-0 text-caption text-muted-foreground sm:inline">{{ props.t.status[props.step.status] }}</span>
          <bdi dir="ltr" class="w-16 shrink-0 text-end font-mono text-caption text-muted-foreground tabular-nums">{{
            duration === undefined ? "" : formatDuration(duration, props.t.units)
          }}</bdi>
        </NqCollapsibleTrigger>
        <NqButton v-if="props.onRetry && (props.step.status === 'failed' || props.step.status === 'cancelled')" type="button" size="sm" variant="secondary" :loading="retrying" @click="retry">
          <RotateCcw aria-hidden="true" class="rtl:-scale-x-100" />
          {{ props.t.retry }}
        </NqButton>
      </div>
      <NqCollapsiblePanel>
        <div class="flex flex-col gap-2 px-4 pb-4 ps-11">
          <NqAlert v-if="props.step.error || retryError" tone="danger" role="alert">{{ retryError ?? props.step.error }}</NqAlert>
          <div class="relative overflow-hidden rounded-control border border-border bg-nq-surface-soft" dir="ltr">
            <p v-if="logs?.hidden" class="border-b border-border px-3 py-1 text-caption text-muted-foreground">{{ props.t.trimmed(logs.hidden) }}</p>
            <pre
              ref="el"
              role="log"
              :aria-label="props.t.logs(props.step.name)"
              aria-live="off"
              tabindex="0"
              :style="{ maxHeight: props.logHeight }"
              class="m-0 overflow-auto p-3 font-mono text-code text-nq-fg-body outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
              @scroll="onScroll"
            ><code v-if="logs" class="block w-max min-w-full"><NqAnsiText :text="logs.text" /></code><span v-else class="text-muted-foreground">{{ running ? props.t.waitingLogs : props.t.noLogs }}</span></pre>
            <NqButton v-if="running && !following" type="button" size="sm" variant="secondary" class="absolute end-2 bottom-2" @click="setFollowing(true)">{{ props.t.jump }}</NqButton>
          </div>
        </div>
      </NqCollapsiblePanel>
    </NqCollapsible>
  </li>
</template>
