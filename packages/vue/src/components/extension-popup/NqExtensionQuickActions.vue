<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useExtensionStrings, type ExtensionPopupLabels } from "./strings";
import type { ExtensionQuickAction } from "./types";

// A grid of icon-over-label shortcuts (open the app, capture this page, copy a link).
interface Props {
  actions: readonly ExtensionQuickAction[];
  columns?: 2 | 3;
  labels?: ExtensionPopupLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { columns: 2, labels: undefined });
const { t } = useExtensionStrings(() => props.labels);
</script>

<template>
  <div data-slot="extension-quick-actions" role="group" :aria-label="t.quickActions" :class="cn('grid gap-2', props.columns === 3 ? 'grid-cols-3' : 'grid-cols-2', props.class)">
    <button
      v-for="action in props.actions"
      :key="action.id"
      type="button"
      :disabled="action.disabled"
      class="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-2 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50"
      @click="action.onSelect()"
    >
      <component :is="action.icon" aria-hidden="true" class="size-5 text-primary" />
      <span class="max-w-full truncate">{{ action.label }}</span>
      <ExternalLink v-if="action.external" aria-hidden="true" class="absolute top-1.5 end-1.5 size-3 text-muted-foreground rtl:-scale-x-100" />
    </button>
  </div>
</template>
