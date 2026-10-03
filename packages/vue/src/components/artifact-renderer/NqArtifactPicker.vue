<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqRadio, NqRadioGroup } from "../radio-group";
import type { PickerArtifact } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// The `picker` kind: one option (radio) or several (checkbox), then a Send button. The callback may return `{ error }` or reject.
const props = defineProps<{
  artifact: PickerArtifact;
  onPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
  labels?: Partial<ArtifactRendererLabels>;
}>();
const { t, tx } = useArtifactI18n(() => props.labels);
const uid = useId();
const multiple = computed(() => props.artifact.mode === "multiple");
const value = ref<string[]>([...(props.artifact.defaultValue ?? [])]);
const busy = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);
const disabled = computed(() => busy.value || sent.value);
const name = computed(() => tx(props.artifact.title) || t.value.choose);
const row = "flex cursor-pointer items-start gap-3 rounded-control border border-border bg-background p-3 text-start";

const toggle = (v: string) => (value.value = value.value.includes(v) ? value.value.filter((x) => x !== v) : [...value.value, v]);
async function submit() {
  busy.value = true;
  error.value = null;
  try {
    const r = await props.onPick?.(value.value, props.artifact);
    if (r && r.error) error.value = r.error;
    else sent.value = true;
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : t.value.failed;
  }
  busy.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <ul v-if="multiple" :aria-label="name" class="flex flex-col gap-2">
      <li v-for="(o, i) in props.artifact.options" :key="o.value">
        <label :class="cn(row, value.includes(o.value) && 'border-primary bg-nq-selected', disabled && 'cursor-not-allowed opacity-70')">
          <NqCheckbox :model-value="value.includes(o.value)" :disabled="disabled" class="mt-0.5" :id="`${uid}-${i}`" @update:model-value="toggle(o.value)" />
          <span class="flex min-w-0 flex-col">
            <span dir="auto" class="text-body-sm text-foreground">{{ tx(o.label) }}</span>
            <span v-if="o.description" dir="auto" class="text-caption text-muted-foreground">{{ tx(o.description) }}</span>
          </span>
        </label>
      </li>
    </ul>
    <NqRadioGroup v-else :aria-label="name" :model-value="value[0]" :disabled="disabled" @update:model-value="(v) => (value = [String(v)])">
      <label v-for="o in props.artifact.options" :key="o.value" :class="cn(row, value[0] === o.value && 'border-primary bg-nq-selected', disabled && 'cursor-not-allowed opacity-70')">
        <NqRadio :value="o.value" class="mt-0.5" />
        <span class="flex min-w-0 flex-col">
          <span dir="auto" class="text-body-sm text-foreground">{{ tx(o.label) }}</span>
          <span v-if="o.description" dir="auto" class="text-caption text-muted-foreground">{{ tx(o.description) }}</span>
        </span>
      </label>
    </NqRadioGroup>
    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <div class="flex items-center gap-2">
      <NqButton variant="primary" :loading="busy" :disabled="sent || value.length === 0" @click="submit">
        <template v-if="sent"><Check aria-hidden="true" />{{ t.sent }}</template>
        <template v-else>{{ props.artifact.submitLabel ? tx(props.artifact.submitLabel) : t.send }}</template>
      </NqButton>
    </div>
  </div>
</template>
