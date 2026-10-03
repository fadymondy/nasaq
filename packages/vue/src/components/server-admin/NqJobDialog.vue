<script setup lang="ts">
import { ref, watch } from "vue";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqStatus } from "../status";
import type { ServerAdminLabels } from "./strings";
import type { QueueJob } from "./types";

// The job detail dialog of NqJobQueueMonitor. Internal: use NqJobQueueMonitor.
const props = defineProps<{ job: QueueJob | null; tone: Record<string, "neutral" | "info" | "success" | "warning" | "danger">; t: ServerAdminLabels }>();
const emit = defineEmits<{ close: [] }>();
const held = ref<QueueJob | null>(props.job);
watch(
  () => props.job,
  (j) => j && (held.value = j),
);
</script>

<template>
  <NqDialog :open="props.job !== null" @update:open="(open: boolean) => !open && emit('close')">
    <NqDialogContent data-slot="job-detail" class="max-w-2xl">
      <NqDialogHeader>
        <NqDialogTitle>
          <bdi dir="ltr">{{ held?.name }}</bdi>
        </NqDialogTitle>
        <NqDialogDescription>
          <span v-if="held" class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <NqStatus :tone="props.tone[held.status]">{{ props.t.jobStatuses[held.status] }}</NqStatus>
            <bdi dir="ltr" class="font-mono text-caption">{{ held.queue }} / {{ held.id }}</bdi>
            <span>{{ props.t.attempts }}: {{ held.maxAttempts ? props.t.of(held.attempts, held.maxAttempts) : held.attempts }}</span>
          </span>
        </NqDialogDescription>
      </NqDialogHeader>
      <NqCodeBlock v-if="held?.error" :code="held.error" language="text" :label="props.t.errorLabel" :filename="props.t.errorLabel" pre-class-name="max-h-64" />
      <p v-else class="text-body-sm text-muted-foreground">{{ props.t.noError }}</p>
      <NqCodeBlock v-if="held?.payload" :code="held.payload" language="json" :label="props.t.payloadLabel" :filename="props.t.payloadLabel" pre-class-name="max-h-48" />
      <NqDialogFooter>
        <NqButton type="button" variant="secondary" @click="emit('close')">{{ props.t.close }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
