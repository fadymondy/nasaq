<script setup lang="ts">
import { computed } from "vue";
import { NqAvatar } from "../avatar";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import type { StatusHue } from "../status-label-manager/status-label-logic";
import type { IssuePriority, IssueType } from "./issue-logic";
import NqPriorityIcon from "./NqPriorityIcon.vue";
import NqStatusDot from "./NqStatusDot.vue";
import NqTypeIcon from "./NqTypeIcon.vue";

// A borderless select that reads like text until hovered: one row of IssueProperties.
export type IssueOptionIcon = { status: StatusHue | undefined } | { priority: IssuePriority } | { type: IssueType } | { avatar: { name: string; src?: string | undefined } };
export interface IssueOption {
  value: string;
  label: string;
  icon?: IssueOptionIcon;
}

const NONE = "__none__";
const props = defineProps<{
  labelId: string;
  value: string | null | undefined;
  options: IssueOption[];
  disabled?: boolean;
  /** Adds an empty choice with this label. */
  none?: string;
}>();
const emit = defineEmits<{ change: [value: string | null] }>();
const all = computed<IssueOption[]>(() => (props.none ? [{ value: NONE, label: props.none }, ...props.options] : props.options));
const current = computed(() => props.value ?? (props.none ? NONE : ""));
const onChange = (v: string | number | null) => emit("change", v === NONE || v == null ? null : String(v));
</script>

<template>
  <NqSelect :model-value="current" :disabled="props.disabled" @update:model-value="onChange">
    <NqSelectTrigger :aria-labelledby="props.labelId" class="h-control-sm border-transparent bg-transparent px-2 hover:bg-nq-hover">
      <NqSelectValue />
    </NqSelectTrigger>
    <NqSelectContent>
      <NqSelectItem v-for="o in all" :key="o.value" :value="o.value">
        <span class="flex min-w-0 items-center gap-2">
          <template v-if="o.icon">
            <NqStatusDot v-if="'status' in o.icon" :hue="o.icon.status" />
            <NqPriorityIcon v-else-if="'priority' in o.icon" :priority="o.icon.priority" />
            <NqTypeIcon v-else-if="'type' in o.icon" :type="o.icon.type" />
            <NqAvatar v-else :name="o.icon.avatar.name" :src="o.icon.avatar.src" size="xs" />
          </template>
          {{ o.label }}
        </span>
      </NqSelectItem>
    </NqSelectContent>
  </NqSelect>
</template>
