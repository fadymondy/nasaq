<script setup lang="ts">
import { NqNum } from "../numeric";
import type { ArtifactCell } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// One value in a card field, list row or table cell: a dash for null, a locale number, Yes or No, or the text.
const props = defineProps<{ value: ArtifactCell; labels?: Partial<ArtifactRendererLabels> }>();
const { t } = useArtifactI18n(() => props.labels);
</script>

<template>
  <span v-if="props.value === null" class="text-muted-foreground">—</span>
  <NqNum v-else-if="typeof props.value === 'number'" :value="props.value" />
  <span v-else-if="typeof props.value === 'boolean'">{{ props.value ? t.yes : t.no }}</span>
  <template v-else>{{ props.value }}</template>
</template>
