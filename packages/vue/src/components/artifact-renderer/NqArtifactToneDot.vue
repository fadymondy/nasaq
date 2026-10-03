<script setup lang="ts">
import { cn } from "../../lib/cn";
import type { ArtifactTone } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// A coloured dot with the tone in words for screen readers, so the tone is never colour alone.
const props = defineProps<{ tone: ArtifactTone; labels?: Partial<ArtifactRendererLabels> }>();
const { t } = useArtifactI18n(() => props.labels);
const TONE_DOT: Record<ArtifactTone, string> = { neutral: "bg-muted-foreground", success: "bg-nq-success", warning: "bg-nq-warning", danger: "bg-nq-danger", info: "bg-nq-info" };
</script>

<template>
  <span aria-hidden="true" :data-tone="props.tone" :class="cn('inline-block size-2 shrink-0 rounded-full', TONE_DOT[props.tone])" />
  <span class="sr-only">{{ t.tones[props.tone] }}: </span>
</template>
