<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { diffLines, diffStats, foldDiff } from "../version-history/diff";
import { agentStepsStrings, type AgentStepsLabels } from "./agent-steps-strings";

// Line diff of two texts: numbers, plus and minus marks, runs of unchanged lines folded. Always left to right.
const props = withDefaults(
  defineProps<{
    before?: string;
    after?: string;
    /** Unchanged lines kept around each change. Default 2. */
    context?: number;
    labels?: Partial<AgentStepsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { before: "", after: "", context: 2, labels: undefined },
);
const nq = useNasaq();
const t = computed(() => agentStepsStrings(nq.locale.value, props.labels));
const lines = computed(() => diffLines(props.before, props.after));
const items = computed(() => foldDiff(lines.value, props.context));
const changed = computed(() => diffStats(lines.value).changed);
</script>

<template>
  <p v-if="!changed" data-slot="agent-diff" :class="cn('text-caption text-muted-foreground', props.class)">{{ t.noChange }}</p>
  <div v-else dir="ltr" role="table" :aria-label="t.diffLabel" data-slot="agent-diff" :class="cn('overflow-x-auto rounded-control border border-border font-mono text-code', props.class)">
    <template v-for="(it, i) in items" :key="it.type === 'gap' ? `g${i}` : `${it.oldLine ?? '-'}:${it.newLine ?? '-'}:${i}`">
      <div v-if="it.type === 'gap'" role="row" dir="auto" class="bg-nq-surface-soft px-3 py-1 text-center text-caption text-muted-foreground">{{ t.unchanged(it.count) }}</div>
      <div v-else role="row" :data-diff="it.type" :class="cn('flex min-w-max', it.type === 'add' && 'bg-nq-success-soft', it.type === 'del' && 'bg-nq-danger-soft')">
        <span role="cell" aria-hidden="true" class="w-9 shrink-0 select-none px-2 text-end tabular-nums text-muted-foreground">{{ it.oldLine ?? "" }}</span>
        <span role="cell" aria-hidden="true" class="w-9 shrink-0 select-none px-2 text-end tabular-nums text-muted-foreground">{{ it.newLine ?? "" }}</span>
        <span role="cell" :aria-label="it.type === 'add' ? t.lineAdded : it.type === 'del' ? t.lineRemoved : undefined" class="w-5 shrink-0 select-none text-center font-semibold">{{ it.type === "add" ? "+" : it.type === "del" ? "−" : "" }}</span>
        <span role="cell" class="whitespace-pre pe-3 text-foreground">{{ it.text || " " }}</span>
      </div>
    </template>
  </div>
</template>
