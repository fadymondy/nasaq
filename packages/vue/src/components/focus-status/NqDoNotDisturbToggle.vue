<script setup lang="ts">
import { BellOff } from "lucide-vue-next";
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqSwitch } from "../switch";
import { fillFocusStatus, useFocusStatusStrings, type FocusStatusLabels } from "./strings";

// A switch row for "Do not disturb", with a one-line description.
interface Props {
  /** On or off: `v-model`. */
  modelValue: boolean;
  /** Text after "Until", for example "6:00 PM". Shown while on. */
  until?: string;
  disabled?: boolean;
  labels?: FocusStatusLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const t = useFocusStatusStrings(() => props.labels);
const id = `nq-dnd-${useId()}`;
</script>

<template>
  <div data-slot="do-not-disturb" :data-state="props.modelValue ? 'on' : 'off'" :class="cn('flex items-center justify-between gap-4', props.class)">
    <div class="flex min-w-0 flex-col gap-0.5">
      <label :for="id" class="inline-flex items-center gap-2 text-label text-foreground">
        <BellOff aria-hidden="true" class="size-4 text-muted-foreground" />
        {{ t.dndLabel }}
      </label>
      <p class="text-body-sm text-muted-foreground">
        {{ t.dndHint }}
        <span v-if="props.modelValue && props.until" class="ms-1 text-nq-warning-text">{{ fillFocusStatus(t.dndUntil, { time: `⁦${props.until}⁩` }) }}</span>
      </p>
    </div>
    <NqSwitch :id="id" :model-value="props.modelValue" :disabled="props.disabled" @update:model-value="(v: boolean) => emit('update:modelValue', v)" />
  </div>
</template>
