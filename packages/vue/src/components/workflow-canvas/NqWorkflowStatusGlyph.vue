<script setup lang="ts">
import { CircleCheck, CircleX, Clock, MinusCircle } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqSpinner } from "../spinner";
import { STATUS_TONE, type WorkflowStatus } from "./workflow-model";

// Every status has its own shape, so state never relies on colour alone.
const props = defineProps<{
  status: WorkflowStatus;
  /** When set the glyph is announced with this text; otherwise it is decorative. */
  label?: string;
  class?: HTMLAttributes["class"];
}>();
const cls = computed(() => cn("size-4 shrink-0", STATUS_TONE[props.status], props.class));
const icon = computed(() => (props.status === "success" ? CircleCheck : props.status === "error" ? CircleX : props.status === "skipped" ? MinusCircle : props.status === "waiting" ? Clock : null));
</script>

<template>
  <NqSpinner v-if="props.status === 'running'" :class="cls" :label="props.label" />
  <component :is="icon" v-else-if="icon" :class="cls" :role="props.label ? 'img' : undefined" :aria-label="props.label" :aria-hidden="props.label ? undefined : 'true'" />
</template>
