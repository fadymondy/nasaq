<script setup lang="ts">
import { History } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime, useFormatNumber } from "../numeric";
import NqWorkflowPanelHeader from "./NqWorkflowPanelHeader.vue";
import { useCanvasLabels, type WorkflowCanvasLabels } from "./labels";
import type { WorkflowVersion } from "./workflow-model";

// Every save, newest first. Choosing one draws it on the canvas, read-only, beside the list; it can then be
// restored (with a confirmation).
interface Props {
  versions: WorkflowVersion[];
  /** The version the workflow is at now. */
  currentVersion: number;
  /** The version drawn on the canvas read-only, if any. */
  previewing?: number | null;
  canRestore?: boolean;
  /** Restore is itself a new version. Return `{ error }` to show it. Without it there is no Restore button. */
  onRestore?: (version: WorkflowVersion) => Promise<void | { error?: string }>;
  labels?: Partial<WorkflowCanvasLabels>;
}
const props = withDefaults(defineProps<Props>(), { previewing: null, canRestore: true, onRestore: undefined, labels: undefined });
const emit = defineEmits<{ preview: [version: WorkflowVersion | null]; close: [] }>();

const { t } = useCanvasLabels(() => props.labels);
const fmt = useFormatNumber();
const confirm = ref<WorkflowVersion | null>(null);
// The dialog closes itself on the action press, so the version to restore is kept apart from its open state.
let chosen: WorkflowVersion | null = null;
const ask = (v: WorkflowVersion) => ((chosen = v), (confirm.value = v));
const busy = ref(false);
const error = ref<string | null>(null);
const sorted = computed(() => [...props.versions].sort((a, b) => b.version - a.version));
const dateFormat = { dateStyle: "medium", timeStyle: "short" } as const;

async function restore(v: WorkflowVersion) {
  if (!props.onRestore) return;
  busy.value = true;
  error.value = null;
  let res: void | { error?: string };
  try {
    res = await props.onRestore(v);
  } finally {
    busy.value = false;
  }
  if (res && res.error) error.value = res.error;
  else emit("preview", null);
}
</script>

<template>
  <div data-slot="workflow-versions-panel" class="flex h-full min-h-0 flex-col">
    <NqWorkflowPanelHeader :title="t.versionsTitle" :hint="t.versionsHint" :close-label="t.close" @close="emit('close')">
      <template #icon><History aria-hidden="true" /></template>
    </NqWorkflowPanelHeader>
    <p v-if="error" role="alert" class="border-b border-border bg-nq-danger-soft px-4 py-2 text-body-sm text-nq-danger-text">{{ error }}</p>
    <ol class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      <li v-for="v in sorted" :key="v.version" :data-version-row="v.version" :class="cn('px-4 py-3', props.previewing === v.version && 'bg-nq-selected')">
        <button
          type="button"
          :aria-pressed="props.previewing === v.version"
          class="block w-full text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          @click="emit('preview', v.version === props.currentVersion || props.previewing === v.version ? null : v)"
        >
          <span class="flex flex-wrap items-center gap-2">
            <span class="text-label text-foreground">{{ t.versionLabel(fmt(v.version)) }}</span>
            <NqBadge v-if="v.version === props.currentVersion" variant="success">{{ t.current }}</NqBadge>
            <NqBadge v-if="props.previewing === v.version" variant="info">{{ t.preview }}</NqBadge>
          </span>
          <span class="block text-caption text-muted-foreground">
            <NqDateTime :value="v.savedAt" :format="dateFormat" />
            <template v-if="v.author"> · {{ t.by(v.author) }}</template>
          </span>
          <span v-if="v.note" class="mt-1 block text-body-sm text-foreground">{{ v.note }}</span>
        </button>
        <NqButton v-if="v.version !== props.currentVersion && props.onRestore && props.canRestore" variant="secondary" size="sm" class="mt-2" data-restore @click="ask(v)">{{ t.restore }}</NqButton>
      </li>
    </ol>
    <NqAlertDialog :open="confirm !== null" @update:open="(o: boolean) => !o && (confirm = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ confirm ? t.restoreTitle(fmt(confirm.version)) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.restoreBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction variant="primary" data-slot="workflow-restore-confirm" :disabled="busy" @click="chosen && restore(chosen)">{{ busy ? t.restoring : t.restore }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
