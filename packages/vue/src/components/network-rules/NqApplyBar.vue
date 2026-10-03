<script setup lang="ts">
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import type { NetworkStrings } from "./strings";

// The staged-changes bar under each rules table: how many changes, Discard and Apply. Internal.
const props = defineProps<{ count: number; applying: boolean; t: NetworkStrings; warning?: string | null }>();
const emit = defineEmits<{ apply: []; discard: [] }>();
</script>

<template>
  <div
    data-slot="network-rules-apply"
    :data-dirty="props.count > 0 || undefined"
    :class="cn('flex flex-wrap items-center gap-3 rounded-control border px-3 py-2', props.count > 0 ? 'border-nq-warning/40 bg-nq-warning-soft' : 'border-border bg-card')"
  >
    <div class="min-w-0 flex-1">
      <p class="text-label text-foreground" role="status">{{ props.count > 0 ? props.t.staged(props.count) : props.t.upToDate }}</p>
      <p v-if="props.count > 0" class="text-body-sm text-muted-foreground">{{ props.warning ?? props.t.stagedHint }}</p>
    </div>
    <NqButton type="button" variant="ghost" size="sm" :disabled="props.count === 0 || props.applying" @click="emit('discard')">{{ props.t.discard }}</NqButton>
    <NqButton type="button" variant="primary" size="sm" :disabled="props.count === 0" :loading="props.applying" @click="emit('apply')">{{ props.t.apply }}</NqButton>
  </div>
</template>
