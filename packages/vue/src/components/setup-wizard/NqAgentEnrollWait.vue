<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { formatCountdown, useAuthLocale } from "../auth-layout/auth-utils";
import { NqButton } from "../button";
import { NqCopyField } from "../copy-button";
import { NqSpinner } from "../spinner";
import { fill, STRINGS, type SetupWizardLabels } from "./strings";

// The guided-connect step: shows the command, then waits live for the agent to check in. Poll on the host, feed `status` and
// `agent`; the status region is announced politely as it changes. The retry button shows for timeout and failed when @retry is listened to.
// Slot: hint (guidance under the command).
interface EnrolledAgent {
  name: string;
  host?: string;
  version?: string;
  system?: string;
}
interface Props {
  /** The install or enrol command the person runs on their machine. */
  command: string;
  /** Poll your server and pass the result. `waiting` shows the live spinner. */
  status: "waiting" | "connected" | "timeout" | "failed";
  /** Set once `connected`. */
  agent?: EnrolledAgent;
  /** Seconds spent waiting, to show a running timer. */
  elapsed?: number;
  /** Message from the agent or server when `failed`. */
  error?: string;
  labels?: Partial<SetupWizardLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { agent: undefined, elapsed: undefined, error: undefined, labels: undefined });
const emit = defineEmits<{ retry: [] }>();
const hasRetry = Boolean(getCurrentInstance()?.vnode.props?.onRetry);
const locale = useAuthLocale();
const t = computed<SetupWizardLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
</script>

<template>
  <div data-slot="agent-enroll-wait" :data-status="props.status" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-col gap-1.5">
      <span class="text-label text-foreground">{{ t.command }}</span>
      <NqCopyField :value="props.command" :label="t.command" class="font-mono" />
      <p v-if="$slots.hint" class="text-caption text-muted-foreground"><slot name="hint" /></p>
    </div>
    <div aria-live="polite" data-slot="agent-enroll-status">
      <div v-if="props.status === 'waiting'" role="status" class="flex items-start gap-3 rounded-control border border-border bg-muted/50 p-4">
        <NqSpinner class="mt-0.5 size-5 text-muted-foreground" />
        <div class="flex flex-col gap-0.5">
          <p class="text-label text-foreground">{{ t.waiting }}</p>
          <p class="text-body-sm text-muted-foreground">{{ t.waitingHint }}</p>
          <p v-if="props.elapsed !== undefined" dir="ltr" class="text-caption text-muted-foreground tabular-nums">{{ fill(t.elapsed, { time: formatCountdown(props.elapsed) }) }}</p>
        </div>
      </div>
      <NqAlert v-if="props.status === 'connected'" tone="success" :title="t.connected">
        <dl v-if="props.agent" class="m-0 mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt class="text-muted-foreground">{{ props.agent.name }}</dt>
          <dd class="m-0" />
          <template v-if="props.agent.host">
            <dt class="text-muted-foreground">{{ t.host }}</dt>
            <dd dir="ltr" class="m-0 text-start font-mono">{{ props.agent.host }}</dd>
          </template>
          <template v-if="props.agent.system">
            <dt class="text-muted-foreground">{{ t.system }}</dt>
            <dd dir="ltr" class="m-0 text-start">{{ props.agent.system }}</dd>
          </template>
          <template v-if="props.agent.version">
            <dt class="text-muted-foreground">{{ t.version }}</dt>
            <dd dir="ltr" class="m-0 text-start font-mono">{{ props.agent.version }}</dd>
          </template>
        </dl>
      </NqAlert>
      <NqAlert v-if="props.status === 'timeout' || props.status === 'failed'" :tone="props.status === 'failed' ? 'danger' : 'warning'" :title="props.status === 'failed' ? t.failedEnroll : t.timeout">
        <template v-if="hasRetry" #action>
          <NqButton size="sm" variant="secondary" @click="emit('retry')">
            <RefreshCw aria-hidden="true" />
            {{ t.retry }}
          </NqButton>
        </template>
        {{ props.status === "failed" && props.error ? props.error : t.timeoutHint }}
      </NqAlert>
    </div>
  </div>
</template>
