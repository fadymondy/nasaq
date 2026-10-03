<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import type { ProfileAvailability } from "./personal-model";
import { usePersonalStrings, type PersonalWidgetLabels } from "./strings";

// "Available for work" with a status dot. The text carries the meaning; the dot is decoration.
interface Props {
  status: ProfileAvailability;
  /** Extra text after the status: "from November". */
  note?: string;
  labels?: PersonalWidgetLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = usePersonalStrings(() => props.labels);
const VARIANT = { open: "success", limited: "warning", closed: "neutral" } as const;
</script>

<template>
  <NqBadge data-slot="availability-badge" :data-status="props.status" :variant="VARIANT[props.status]" :class="cn('h-6 gap-1.5 px-2 text-body-sm', props.class)">
    <span aria-hidden="true" :class="cn('size-1.5 rounded-full bg-current', props.status === 'open' && 'motion-safe:animate-pulse')" />
    {{ t.availability[props.status] }}
    <span v-if="props.note || $slots.default" class="font-normal opacity-80"><slot>{{ props.note }}</slot></span>
  </NqBadge>
</template>
