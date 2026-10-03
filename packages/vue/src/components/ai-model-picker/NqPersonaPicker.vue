<script setup lang="ts">
import { Bot } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { useLabels, type AiModelPickerLabels } from "./strings";
import type { AiPersona } from "./types";

// Choose who the assistant should be, then start from one of that persona's prompts. Each persona is a radio card;
// the starters of the selected one are buttons that emit `starter`.
interface Props {
  personas: readonly AiPersona[];
  /** Selected persona id (`v-model`). */
  modelValue?: string;
  defaultValue?: string;
  disabled?: boolean;
  labels?: AiModelPickerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, disabled: false, labels: undefined });
const emit = defineEmits<{
  "update:modelValue": [id: string];
  /** A starter was chosen. Send it as the first prompt. */
  starter: [prompt: string, persona: AiPersona];
}>();
const { t } = useLabels(() => props.labels);
const inner = ref(props.defaultValue ?? props.personas[0]?.id ?? "");
const id = computed(() => props.modelValue ?? inner.value);
const persona = computed(() => props.personas.find((p) => p.id === id.value));
function choose(v: string) {
  if (props.modelValue === undefined) inner.value = v;
  emit("update:modelValue", v);
}
</script>

<template>
  <div data-slot="persona-picker" :class="cn('flex flex-col gap-4', props.class)">
    <NqRadioGroup :aria-label="t.personas" :model-value="id" :disabled="props.disabled" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" @update:model-value="choose">
      <NqRadioCard v-for="p in props.personas" :key="p.id" :value="p.id" :description="p.description">
        <span class="flex items-center gap-2">
          <span aria-hidden="true" class="text-muted-foreground [&_svg]:size-4"><component :is="p.icon ?? Bot" /></span>
          {{ p.name }}
        </span>
      </NqRadioCard>
    </NqRadioGroup>
    <div v-if="persona?.starters?.length" data-slot="persona-starters" class="flex flex-col gap-2">
      <span class="text-label text-foreground">{{ t.starters }}</span>
      <ul :aria-label="t.starters" class="flex flex-wrap gap-2">
        <li v-for="s in persona.starters" :key="s">
          <NqButton variant="secondary" size="sm" :disabled="props.disabled" class="h-auto min-h-control-sm whitespace-normal py-1.5 text-start" @click="emit('starter', s, persona!)">{{ s }}</NqButton>
        </li>
      </ul>
    </div>
  </div>
</template>
