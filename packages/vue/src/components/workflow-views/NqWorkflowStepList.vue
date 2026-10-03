<script setup lang="ts">
import { GitBranch } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { workflowStepKind, type WorkflowTreeStep } from "./workflow-views-logic";

// The numbered outline of NqWorkflowViews. Recursive: loops and branches render another list inside the item.
defineOptions({ name: "NqWorkflowStepList" });
const props = defineProps<{
  steps: readonly WorkflowTreeStep[];
  prefix: string;
  kinds: Record<string, string>;
  clickable: boolean;
  highlight?: string;
}>();
const emit = defineEmits<{ "step-click": [step: WorkflowTreeStep] }>();
</script>

<template>
  <ol class="flex flex-col gap-2">
    <li v-for="(step, i) in props.steps" :key="step.id" data-slot="workflow-step" :data-step="step.id" :data-kind="workflowStepKind(step)" class="flex flex-col gap-2">
      <component
        :is="props.clickable ? 'button' : 'div'"
        :type="props.clickable ? 'button' : undefined"
        :aria-current="step.id === props.highlight ? 'step' : undefined"
        :class="
          cn(
            'flex w-full items-start gap-3 rounded-control border bg-card px-3 py-2.5 text-start',
            step.id === props.highlight ? 'border-primary bg-nq-selected' : 'border-border',
            props.clickable &&
              'outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
          )
        "
        @click="props.clickable ? emit('step-click', step) : undefined"
      >
        <bdi dir="ltr" class="min-w-8 pt-px font-mono text-caption text-muted-foreground tabular-nums">{{ `${props.prefix}${i + 1}` }}</bdi>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="flex flex-wrap items-center gap-2">
            <span dir="auto" class="text-label text-foreground">{{ step.title }}</span>
            <NqBadge v-if="workflowStepKind(step) !== 'step'" :variant="workflowStepKind(step) === 'decision' ? 'info' : 'neutral'">{{ props.kinds[workflowStepKind(step)] }}</NqBadge>
          </span>
          <span v-if="step.description" dir="auto" class="text-caption text-muted-foreground">{{ step.description }}</span>
        </span>
        <span v-if="step.owner" dir="auto" class="shrink-0 text-caption text-muted-foreground">{{ step.owner }}</span>
      </component>
      <div v-if="step.children?.length" class="ms-5 border-s border-border ps-4">
        <NqWorkflowStepList :steps="step.children" :prefix="`${props.prefix}${i + 1}.`" :kinds="props.kinds" :clickable="props.clickable" :highlight="props.highlight" @step-click="emit('step-click', $event)" />
      </div>
      <div v-for="(branch, j) in step.branches ?? []" :key="`${branch.label}-${j}`" data-slot="workflow-branch" class="ms-5 flex flex-col gap-2 border-s border-dashed border-nq-line-strong ps-4">
        <span class="flex items-center gap-2 text-caption text-muted-foreground">
          <GitBranch aria-hidden="true" class="size-3.5" />
          <span dir="auto">{{ branch.label }}</span>
        </span>
        <NqWorkflowStepList
          v-if="branch.steps.length"
          :steps="branch.steps"
          :prefix="`${props.prefix}${i + 1}.${String.fromCharCode(97 + j)}.`"
          :kinds="props.kinds"
          :clickable="props.clickable"
          :highlight="props.highlight"
          @step-click="emit('step-click', $event)"
        />
      </div>
    </li>
  </ol>
</template>
