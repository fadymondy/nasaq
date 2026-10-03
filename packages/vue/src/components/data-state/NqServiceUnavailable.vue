<script setup lang="ts">
import { CloudOff } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqEmptyState } from "../states";
import { dataStateStrings, type DataStateLabels } from "./data-state-logic";

// An inline 503 card: the backend or a plugin is down, not the page. Shows "Try again" when `onRetry` is set;
// the `actions` slot replaces it.
interface Props {
  title?: string;
  description?: string;
  icon?: Component;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
  labels?: Partial<DataStateLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { icon: () => CloudOff });
const nasaq = useNasaq();
const l = computed<DataStateLabels>(() => ({ ...dataStateStrings[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
</script>

<template>
  <NqEmptyState
    data-slot="service-unavailable"
    role="status"
    :icon="props.icon"
    :title="props.title ?? l.unavailableTitle"
    :description="props.description ?? l.unavailableBody"
    :class="props.class"
  >
    <template v-if="$slots.actions || props.onRetry" #actions>
      <slot name="actions">
        <NqButton size="sm" @click="props.onRetry?.()">{{ l.retry }}</NqButton>
      </slot>
    </template>
  </NqEmptyState>
</template>
