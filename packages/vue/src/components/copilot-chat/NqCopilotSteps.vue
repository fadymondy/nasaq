<script setup lang="ts">
import { Check, ChevronDown, Loader2, TriangleAlert } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { copilotStepCounts, type CopilotStep } from "./copilot-format";
import { copilotWords, type CopilotChatLabels } from "./labels";

// The tool calls behind an answer, folded into one line ("Used 3 tools") that opens into the list.
const props = defineProps<{ steps: readonly CopilotStep[]; streaming?: boolean; labels?: Partial<CopilotChatLabels> }>();
const nq = useNasaq();
const t = computed(() => copilotWords(nq.locale.value, props.labels));
const c = computed(() => copilotStepCounts(props.steps));
const open = ref(false);
const current = computed(() => props.steps.find((s) => s.status === "running"));
const summary = computed(() => (current.value ? current.value.label : c.value.error > 0 ? t.value.stepFailed : t.value.usedSteps(c.value.total)));
</script>

<template>
  <NqCollapsible v-if="c.total > 0" v-model:open="open" data-slot="copilot-steps" class="rounded-control border border-border bg-secondary">
    <NqCollapsibleTrigger as="button" class="flex min-h-control-sm w-full items-center gap-2 px-3 py-1.5 text-start text-caption text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
      <Loader2 v-if="current && props.streaming !== false" aria-hidden="true" class="size-3.5 shrink-0 motion-safe:animate-spin" />
      <TriangleAlert v-else-if="c.error > 0" aria-hidden="true" class="size-3.5 shrink-0 text-nq-danger-text" />
      <Check v-else aria-hidden="true" class="size-3.5 shrink-0 text-nq-success-text" />
      <span class="min-w-0 flex-1 truncate">{{ summary }}</span>
      <ChevronDown aria-hidden="true" :class="cn('size-3.5 shrink-0 transition-transform duration-150 ease-nq', open && 'rotate-180')" />
    </NqCollapsibleTrigger>
    <NqCollapsiblePanel>
      <ol class="flex flex-col gap-2 border-t border-border px-3 py-2">
        <li v-for="s in props.steps" :key="s.id" :data-status="s.status" class="flex items-start gap-2 text-caption">
          <span class="mt-0.5 shrink-0" aria-hidden="true">
            <Loader2 v-if="s.status === 'running'" class="size-3.5 motion-safe:animate-spin" />
            <TriangleAlert v-else-if="s.status === 'error'" class="size-3.5 text-nq-danger-text" />
            <Check v-else class="size-3.5 text-nq-success-text" />
          </span>
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="text-foreground">
              {{ s.label }}
              <code v-if="s.tool" dir="ltr" class="ms-2 rounded-sm bg-card px-1 font-mono text-[0.85em] text-muted-foreground">{{ s.tool }}</code>
            </span>
            <span v-if="s.detail" dir="auto" class="truncate font-mono text-muted-foreground">{{ s.detail }}</span>
          </span>
        </li>
      </ol>
    </NqCollapsiblePanel>
  </NqCollapsible>
</template>
