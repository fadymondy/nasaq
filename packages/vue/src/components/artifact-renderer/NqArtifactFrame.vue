<script setup lang="ts">
import { NqCard, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import type { Artifact } from "./artifact-renderer-logic";
import { useArtifactI18n } from "./strings";

// The card every artifact sits in: title and description from the artifact, then the content, then an optional footer and note.
const props = defineProps<{ artifact: Artifact; note?: string; hasFooter?: boolean }>();
const { tx } = useArtifactI18n(() => undefined);
</script>

<template>
  <NqCard data-slot="artifact" :data-kind="props.artifact.kind" class="min-w-0">
    <NqCardHeader v-if="tx(props.artifact.title) || tx(props.artifact.description)">
      <NqCardTitle v-if="tx(props.artifact.title)" dir="auto">{{ tx(props.artifact.title) }}</NqCardTitle>
      <NqCardDescription v-if="tx(props.artifact.description)" dir="auto">{{ tx(props.artifact.description) }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3"><slot /></NqCardContent>
    <NqCardFooter v-if="props.hasFooter || props.note" class="flex flex-col items-stretch gap-3">
      <slot name="footer" />
      <p v-if="props.note" data-slot="artifact-note" dir="auto" class="text-caption text-muted-foreground">{{ props.note }}</p>
    </NqCardFooter>
  </NqCard>
</template>
