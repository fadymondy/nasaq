<script setup lang="ts">
import { ref } from "vue";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import type { RunHistoryLabels } from "./labels";
import type { RunScreenshot } from "./run-model";

// Thumbnails of what a step saw; one opens enlarged in a dialog with its alt text.
const props = defineProps<{ shots: RunScreenshot[]; t: RunHistoryLabels }>();
const open = ref<RunScreenshot | null>(null);
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-label text-foreground">{{ props.t.shots }}</p>
    <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <li v-for="s in props.shots" :key="s.src">
        <button
          type="button"
          :aria-label="props.t.openShot(s.alt)"
          class="block w-full overflow-hidden rounded-control border border-border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          @click="open = s"
        >
          <img :src="s.src" :alt="s.alt" loading="lazy" class="aspect-video w-full object-cover" />
        </button>
        <p v-if="s.caption" class="mt-1 truncate text-caption text-muted-foreground">{{ s.caption }}</p>
      </li>
    </ul>
    <NqDialog :open="open !== null" @update:open="(o: boolean) => !o && (open = null)">
      <NqDialogContent class="max-w-3xl">
        <NqDialogHeader>
          <NqDialogTitle>{{ open?.alt }}</NqDialogTitle>
          <NqDialogDescription v-if="open?.caption">{{ open.caption }}</NqDialogDescription>
          <NqDialogDescription v-else class="sr-only">{{ open?.alt }}</NqDialogDescription>
        </NqDialogHeader>
        <img v-if="open" :src="open.src" :alt="open.alt" class="max-h-[70dvh] w-full rounded-control border border-border object-contain" />
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
