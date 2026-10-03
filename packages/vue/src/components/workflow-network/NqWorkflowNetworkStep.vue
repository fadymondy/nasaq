<script setup lang="ts">
import { ArrowRight, Cpu, Flag, GitBranch, UserCheck } from "lucide-vue-next";
import { computed, type Component } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import type { WorkflowNetworkKind, WorkflowNetworkStep } from "./types";

// One card of the diagram. Internal to NqWorkflowNetwork.
const props = defineProps<{ step: WorkflowNetworkStep; hot: boolean; kindLabel: string; clickable: boolean }>();
const emit = defineEmits<{ click: [] }>();

const KIND_ICON: Record<WorkflowNetworkKind, Component> = { step: ArrowRight, decision: GitBranch, human: UserCheck, system: Cpu, output: Flag };
const KIND_STYLE: Record<WorkflowNetworkKind, string> = {
  step: "",
  decision: "border-nq-accent/60",
  human: "border-dashed",
  system: "bg-secondary",
  output: "border-nq-brand/50",
};

const kind = computed(() => props.step.kind ?? "step");
const icon = computed(() => props.step.icon ?? KIND_ICON[kind.value]);
const cls = computed(() =>
  cn(
    "relative flex w-full min-w-0 flex-col items-stretch gap-1.5 rounded-card border border-border bg-card p-3 text-start shadow-xs",
    KIND_STYLE[kind.value],
    props.hot && "ring-2 ring-nq-brand ring-offset-2 ring-offset-background",
    props.clickable && "cursor-pointer outline-none transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  ),
);
</script>

<template>
  <component :is="clickable ? 'button' : 'div'" :type="clickable ? 'button' : undefined" :data-step="step.id" :data-kind="kind" :class="cls" @click="clickable && emit('click')">
    <span class="flex items-center gap-2">
      <span
        :class="
          cn(
            'flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground [&_svg]:size-4',
            kind === 'decision' && 'rotate-45 rounded-[8px]',
            kind === 'output' && 'border-nq-brand/40 bg-nq-brand text-white',
          )
        "
      >
        <span :class="cn('flex', kind === 'decision' && '-rotate-45')">
          <component :is="icon" aria-hidden="true" :class="cn(kind === 'step' && !step.icon && 'rtl:-scale-x-100')" />
        </span>
      </span>
      <span class="min-w-0 flex-1 text-label leading-tight text-foreground">{{ step.title }}</span>
    </span>
    <span v-if="step.description" class="text-caption text-muted-foreground">{{ step.description }}</span>
    <span v-if="step.owner || kind !== 'step'" class="flex flex-wrap items-center gap-1.5">
      <NqBadge v-if="step.owner" variant="neutral">{{ step.owner }}</NqBadge>
      <NqBadge v-if="kind !== 'step'" variant="outline">{{ kindLabel }}</NqBadge>
    </span>
  </component>
</template>
