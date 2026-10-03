<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import NqCreateWorkspaceForm from "./NqCreateWorkspaceForm.vue";
import { workspaceStrings, type WorkspaceSettingsLabels } from "./strings";
import type { SlugCheck, WorkspaceSubmitResult, WorkspaceValues } from "./types";

// The create dialog behind the "Add workspace" item of a workspace switcher. Closes when onSubmit resolves without an error.
const props = withDefaults(
  defineProps<{
    open: boolean;
    onSubmit: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
    checkSlug?: (slug: string) => Promise<SlugCheck>;
    slugPrefix?: string;
    showSlug?: boolean;
    labels?: WorkspaceSettingsLabels;
  }>(),
  { checkSlug: undefined, slugPrefix: undefined, showSlug: false, labels: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();
const nq = useNasaq();
const t = computed(() => ({ ...workspaceStrings(nq.locale.value), ...props.labels }));

async function submit(values: WorkspaceValues) {
  const result = await props.onSubmit(values);
  if (!(result && typeof result === "object" && (result.error || result.fieldErrors))) emit("update:open", false);
  return result;
}
</script>

<template>
  <NqDialog :open="open" @update:open="(next: boolean) => emit('update:open', next)">
    <NqDialogContent class="max-w-md">
      <NqDialogHeader>
        <NqDialogTitle>{{ t.createTitle }}</NqDialogTitle>
        <NqDialogDescription>{{ t.createBody }}</NqDialogDescription>
      </NqDialogHeader>
      <NqCreateWorkspaceForm :key="String(open)" :labels="labels" :check-slug="checkSlug" :slug-prefix="slugPrefix" :show-slug="showSlug" :on-cancel="() => emit('update:open', false)" :on-submit="submit" />
    </NqDialogContent>
  </NqDialog>
</template>
