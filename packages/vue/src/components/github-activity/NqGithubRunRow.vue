<script setup lang="ts">
import { CircleCheck, CircleDashed, CircleSlash, CircleX, Play, RefreshCw, type LucideIcon } from "lucide-vue-next";
import { ref } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { formatDuration } from "../deploy-view/deploy-format";
import { NqDateTime } from "../numeric";
import { NqStatus } from "../status";
import { isActive, runTone, type ActivityTone, type RunStatus } from "./github-activity-format";
import NqGithubBranch from "./NqGithubBranch.vue";
import NqGithubRef from "./NqGithubRef.vue";
import NqGithubSha from "./NqGithubSha.vue";
import type { GithubActivityLabels } from "./strings";
import type { GithubRun } from "./types";

// One workflow run row, with its own busy state for Re-run. Internal to NqGithubActivity.
const props = defineProps<{ run: GithubRun; t: GithubActivityLabels; rerun?: (id: string) => Promise<unknown> | unknown }>();

const runIcon: Record<RunStatus, LucideIcon> = {
  queued: CircleDashed,
  in_progress: RefreshCw,
  success: CircleCheck,
  failure: CircleX,
  cancelled: CircleSlash,
  skipped: CircleSlash,
};
const toneText: Record<ActivityTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};
const pending = ref(false);
async function onClick() {
  pending.value = true;
  try {
    await props.rerun?.(props.run.id);
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <li data-slot="github-run" :data-status="props.run.status" class="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0">
    <component
      :is="runIcon[props.run.status]"
      aria-hidden="true"
      :class="cn('mt-0.5 size-4 shrink-0', toneText[runTone[props.run.status]], props.run.status === 'in_progress' && 'motion-safe:animate-spin')"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <NqGithubRef :href="props.run.href" class="text-label text-foreground" dir="auto">{{ props.run.name }}</NqGithubRef>
        <span v-if="props.run.number != null" dir="ltr" class="text-caption text-muted-foreground">#{{ props.run.number }}</span>
        <NqStatus :tone="runTone[props.run.status]">{{ props.t.runStatus[props.run.status] }}</NqStatus>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <NqGithubBranch v-if="props.run.branch" :name="props.run.branch" />
        <NqGithubSha v-if="props.run.sha" :sha="props.run.sha" />
        <NqBadge v-if="props.run.event" variant="outline"><bdi dir="ltr">{{ props.run.event }}</bdi></NqBadge>
        <bdi v-if="props.run.actor">{{ props.t.startedBy(props.run.actor.login) }}</bdi>
        <NqDateTime :value="props.run.startedAt" relative />
        <span v-if="props.run.durationMs != null" dir="ltr" class="tabular-nums">{{ formatDuration(props.run.durationMs, props.t.duration) }}</span>
      </div>
    </div>
    <NqButton
      v-if="props.rerun && !isActive(props.run.status)"
      type="button"
      size="sm"
      variant="secondary"
      :loading="pending"
      :aria-label="props.t.rerunFor(props.run.name)"
      @click="onClick"
    >
      <Play aria-hidden="true" />
      {{ props.t.rerun }}
    </NqButton>
  </li>
</template>
