<script setup lang="ts">
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqErrorState, NqSkeleton } from "../states";
import type { ApmPanelsLabels } from "./strings";

// Internal: what every APM panel shows in place of its body while it is failing, loading or empty.
defineProps<{
  error?: string | boolean;
  loading?: boolean;
  empty?: boolean;
  onRetry?: () => void;
  t: ApmPanelsLabels;
  /** Tailwind height of the loading and empty boxes, e.g. "h-64". */
  height: string;
}>();
</script>

<template>
  <NqErrorState v-if="error" :title="typeof error === 'string' ? error : t.loadError">
    <template v-if="onRetry" #actions>
      <NqButton size="sm" @click="onRetry()">{{ t.retry }}</NqButton>
    </template>
  </NqErrorState>
  <NqSkeleton v-else-if="loading" :class="cn('w-full', height)" />
  <div v-else-if="empty" :class="cn('grid place-items-center text-body-sm text-muted-foreground', height)">{{ t.empty }}</div>
  <slot v-else />
</template>
