<script setup lang="ts">
import { computed, ref } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import type { Artifact, ArtifactAction } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// A row of action buttons. A button with `confirm` asks in a dialog first. The callback may return `{ error }` or reject to show a failure.
const props = defineProps<{
  actions: readonly ArtifactAction[];
  artifact: Artifact;
  onAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
  labels?: Partial<ArtifactRendererLabels>;
}>();
const { t, tx } = useArtifactI18n(() => props.labels);
const busy = ref<string | null>(null);
const asking = ref<ArtifactAction | null>(null);
const error = ref<string | null>(null);
const open = computed({ get: () => asking.value !== null, set: (v: boolean) => !v && (asking.value = null) });

async function run(a: ArtifactAction) {
  busy.value = a.id;
  error.value = null;
  try {
    const r = await props.onAction?.(a.id, props.artifact);
    if (r && r.error) error.value = r.error;
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : t.value.failed;
  }
  busy.value = null;
}
function press(a: ArtifactAction) {
  if (a.confirm) asking.value = a;
  else void run(a);
}
function confirmed() {
  const a = asking.value;
  asking.value = null;
  if (a) void run(a);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <NqButton v-for="a in props.actions" :key="a.id" :variant="a.variant ?? 'secondary'" :loading="busy === a.id" :disabled="busy !== null && busy !== a.id" @click="press(a)">
      {{ tx(a.label) }}
    </NqButton>
  </div>
  <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
  <NqDialog v-model:open="open">
    <NqDialogContent data-slot="artifact-confirm">
      <NqDialogHeader>
        <NqDialogTitle>{{ asking ? tx(asking.label) : "" }}</NqDialogTitle>
        <NqDialogDescription>{{ asking ? tx(asking.confirm) : "" }}</NqDialogDescription>
      </NqDialogHeader>
      <NqDialogFooter>
        <NqButton variant="ghost" @click="asking = null">{{ t.cancel }}</NqButton>
        <NqButton :variant="asking?.variant === 'danger' ? 'danger' : 'primary'" @click="confirmed">{{ t.confirm }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
