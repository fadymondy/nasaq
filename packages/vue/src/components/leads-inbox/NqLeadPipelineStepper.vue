<script setup lang="ts">
import { ArrowRight, Check } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { leadPipelineStates, type LeadStatus } from "./leads-inbox-logic";
import type { LeadsInboxLabels } from "./strings";

// The stage stepper of one lead: done, current and to-do, with words as well as marks. Internal.
const props = defineProps<{ status: LeadStatus; t: LeadsInboxLabels }>();
const steps = computed(() => leadPipelineStates(props.status));
</script>

<template>
  <ol :aria-label="props.t.pipeline" class="flex flex-wrap items-center gap-1.5">
    <li v-for="(s, i) in steps" :key="s.status" :aria-current="s.state === 'current' ? 'step' : undefined" class="flex items-center gap-1.5">
      <span
        :class="
          cn(
            'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption',
            s.state === 'current' ? 'border-primary bg-primary text-primary-foreground' : s.state === 'done' ? 'border-nq-success/40 bg-nq-success-soft text-nq-success-text' : 'border-border text-muted-foreground',
          )
        "
      >
        <Check v-if="s.state === 'done'" aria-hidden="true" class="size-3" />
        {{ props.t.statuses[s.status] }}
      </span>
      <ArrowRight v-if="i < steps.length - 1" aria-hidden="true" class="size-3 text-muted-foreground rtl:-scale-x-100" />
    </li>
  </ol>
</template>
