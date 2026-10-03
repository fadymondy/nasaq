<script setup lang="ts">
import { ChevronDown, FilePlus2, FileX2, Pencil } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCheckbox } from "../checkbox";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqNum } from "../numeric";
import { diffLines, diffStats } from "../version-history/diff";
import { agentChangeKind, type AgentChange, type AgentRisk } from "./agent-steps-logic";
import type { AgentStepsLabels } from "./agent-steps-strings";
import NqAgentDiff from "./NqAgentDiff.vue";

// One proposed change in NqAgentConfirm: kind, title, target, risk, +/- counts and a collapsible diff.
const props = defineProps<{
  change: AgentChange;
  checked: boolean;
  defaultOpen: boolean;
  disabled: boolean;
  selectable: boolean;
  riskText: string;
  t: AgentStepsLabels;
}>();
const emit = defineEmits<{ toggle: [] }>();

const RISK: Record<AgentRisk, "neutral" | "warning" | "danger"> = { low: "neutral", medium: "warning", high: "danger" };
const KIND_ICON = { create: FilePlus2, edit: Pencil, delete: FileX2 } as const;

const open = ref(props.defaultOpen);
const kind = computed(() => agentChangeKind(props.change));
const stats = computed(() => diffStats(diffLines(props.change.before ?? "", props.change.after ?? "")));
const kindText = computed(() => ({ create: props.t.created, edit: props.t.edited, delete: props.t.deleted })[kind.value]);
</script>

<template>
  <li
    data-slot="agent-change"
    :data-kind="kind"
    :data-checked="props.checked ? '' : undefined"
    :class="cn('rounded-control border border-border bg-background transition-opacity duration-150 ease-nq', !props.checked && props.selectable && 'opacity-60')"
  >
    <NqCollapsible v-model:open="open">
      <div class="flex items-start gap-3 p-3">
        <NqCheckbox v-if="props.selectable" :model-value="props.checked" :disabled="props.disabled" :aria-label="props.t.selectChange(props.change.title)" class="mt-1" @update:model-value="emit('toggle')" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <component :is="KIND_ICON[kind]" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            <span dir="auto" class="text-body-sm font-medium text-foreground">{{ props.change.title }}</span>
            <NqBadge variant="outline">{{ kindText }}</NqBadge>
            <NqBadge v-if="props.change.risk && props.change.risk !== 'low'" :variant="RISK[props.change.risk]">{{ props.riskText }}</NqBadge>
          </div>
          <bdi v-if="props.change.target" dir="ltr" class="truncate font-mono text-caption text-muted-foreground">{{ props.change.target }}</bdi>
          <p v-if="props.change.description" dir="auto" class="text-caption text-muted-foreground">{{ props.change.description }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span class="flex flex-col items-end text-caption tabular-nums sm:flex-row sm:gap-2">
            <span class="text-nq-success-text">
              <span aria-hidden="true">+</span>
              <NqNum :value="stats.added" />
              <span class="sr-only"> {{ props.t.added(stats.added) }}</span>
            </span>
            <span class="text-nq-danger-text">
              <span aria-hidden="true">−</span>
              <NqNum :value="stats.removed" />
              <span class="sr-only"> {{ props.t.removed(stats.removed) }}</span>
            </span>
          </span>
          <NqCollapsibleTrigger
            :aria-label="open ? props.t.hideDiff : props.t.viewDiff"
            class="grid size-7 place-items-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          >
            <ChevronDown aria-hidden="true" :class="cn('size-4 transition-transform duration-150 ease-nq', open && 'rotate-180')" />
          </NqCollapsibleTrigger>
        </div>
      </div>
      <NqCollapsiblePanel>
        <div class="border-t border-border p-3">
          <NqAgentDiff :before="props.change.before" :after="props.change.after" :labels="props.t" />
        </div>
      </NqCollapsiblePanel>
    </NqCollapsible>
  </li>
</template>
