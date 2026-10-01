<script setup lang="ts">
import { Maximize2, Minus, Plus } from "lucide-vue-next";
import { NqButton } from "../button";
import type { GraphViewLabels } from "./types";

// The zoom in, zoom out and fit buttons at the start-bottom corner of a graph surface.
defineProps<{ t: GraphViewLabels }>();
const emit = defineEmits<{ zoom: [factor: number]; fit: [] }>();
</script>

<template>
  <div class="absolute start-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-control border border-border bg-card shadow-xs" role="group" :aria-label="t.zoomIn">
    <NqButton variant="ghost" size="icon-sm" class="rounded-none" :aria-label="t.zoomIn" :title="t.zoomIn" @click="emit('zoom', 1.3)"><Plus aria-hidden="true" /></NqButton>
    <NqButton variant="ghost" size="icon-sm" class="rounded-none border-t border-border" :aria-label="t.zoomOut" :title="t.zoomOut" @click="emit('zoom', 1 / 1.3)"><Minus aria-hidden="true" /></NqButton>
    <NqButton variant="ghost" size="icon-sm" class="rounded-none border-t border-border" :aria-label="t.fit" :title="t.fit" @click="emit('fit')"><Maximize2 aria-hidden="true" /></NqButton>
  </div>
</template>
