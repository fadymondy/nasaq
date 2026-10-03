<script setup lang="ts">
import { Ban, CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqSpinner } from "../spinner";
import type { DeployStatus } from "./deploy-format";

// The status glyph: a spinner while running, otherwise a distinct shape per status so it reads without colour.
const props = defineProps<{ status: DeployStatus; class?: HTMLAttributes["class"] }>();
const ICON: Record<Exclude<DeployStatus, "running">, Component> = {
  pending: CircleDashed,
  success: CircleCheck,
  failed: CircleX,
  skipped: CircleMinus,
  cancelled: Ban,
};
const TEXT: Record<DeployStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-nq-info-text",
  success: "text-nq-success-text",
  failed: "text-nq-danger-text",
  skipped: "text-muted-foreground",
  cancelled: "text-nq-warning-text",
};
const glyph = computed(() => (props.status === "running" ? null : ICON[props.status]));
</script>

<template>
  <NqSpinner v-if="props.status === 'running'" :class="cn('size-4', TEXT.running, props.class)" />
  <component :is="glyph" v-else aria-hidden="true" :class="cn('size-4', TEXT[props.status], props.class)" />
</template>
