<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqArtifactRenderer from "./NqArtifactRenderer.vue";
import type { Artifact, PickerArtifact } from "./artifact-renderer-logic";
import type { ArtifactRendererLabels } from "./strings";

// Several artifacts in a row of the conversation, one after another. Each is validated on its own.
const props = withDefaults(
  defineProps<{
    artifacts: readonly unknown[];
    allowHtml?: boolean;
    onAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
    onPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
    labels?: Partial<ArtifactRendererLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { allowHtml: false, onAction: undefined, onPick: undefined, labels: undefined },
);
</script>

<template>
  <div data-slot="artifact-list" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <NqArtifactRenderer v-for="(a, i) in props.artifacts" :key="i" :artifact="a" :allow-html="props.allowHtml" :on-action="props.onAction" :on-pick="props.onPick" :labels="props.labels" />
  </div>
</template>
