<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed } from "vue";
import { NqBadge } from "../badge";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import type { WorkLabel } from "../status-label-manager/status-label-logic";
import type { IssueViewStrings } from "./strings";
import NqStatusDot from "./NqStatusDot.vue";

// The labels of an issue as chips; clicking opens a checkbox list to toggle them.
const props = defineProps<{ labelId: string; labels: WorkLabel[]; value: string[]; disabled?: boolean; t: IssueViewStrings }>();
const emit = defineEmits<{ change: [ids: string[]] }>();
const chosen = computed(() => props.labels.filter((l) => props.value.includes(l.id)));
const toggle = (id: string) => emit("change", props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id]);
</script>

<template>
  <NqPopover>
    <NqPopoverTrigger
      :disabled="props.disabled"
      :data-disabled="props.disabled ? '' : undefined"
      :aria-labelledby="props.labelId"
      type="button"
      class="flex min-h-control-sm w-full min-w-0 flex-wrap items-center gap-1 rounded-control px-2 py-1 text-start text-body outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-disabled:opacity-50"
    >
      <span v-if="chosen.length === 0" class="text-muted-foreground">{{ props.t.noLabels }}</span>
      <NqBadge v-for="l in chosen" v-else :key="l.id" variant="tag" :hue="l.hue">{{ l.name }}</NqBadge>
    </NqPopoverTrigger>
    <NqPopoverContent align="start" class="w-56 p-1">
      <ul :aria-label="props.t.pickLabels" class="m-0 flex max-h-64 list-none flex-col overflow-y-auto p-0">
        <li v-for="l in props.labels" :key="l.id">
          <button
            type="button"
            role="checkbox"
            :aria-checked="props.value.includes(l.id)"
            class="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:bg-nq-hover"
            @click="toggle(l.id)"
          >
            <NqStatusDot :hue="l.hue" />
            <span class="min-w-0 flex-1 truncate">{{ l.name }}</span>
            <Check v-if="props.value.includes(l.id)" aria-hidden="true" class="size-4 text-foreground" />
          </button>
        </li>
      </ul>
    </NqPopoverContent>
  </NqPopover>
</template>
