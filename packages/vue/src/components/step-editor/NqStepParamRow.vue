<script setup lang="ts">
import { Eye, EyeOff } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqSwitch } from "../switch";
import type { StepParam } from "./step-model";
import type { StepEditorLabels } from "./step-strings";

// One parameter: name, value (masked when secret) and the secret switch.
const props = defineProps<{ param: StepParam; t: StepEditorLabels; disabled?: boolean; issue?: string; used: number }>();
const emit = defineEmits<{ change: [param: StepParam] }>();
const shown = ref(false);
const masked = computed(() => props.param.secret && !shown.value);
const token = computed(() => "{{" + (props.param.name || "name") + "}}");
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <NqField :invalid="Boolean(props.issue)">
      <NqFieldLabel>{{ props.t.paramName }}</NqFieldLabel>
      <NqInput ltr :model-value="props.param.name" placeholder="api_base" spellcheck="false" :disabled="props.disabled" @update:model-value="(v) => emit('change', { ...props.param, name: String(v ?? '') })" />
      <p v-if="props.issue" role="alert" class="text-caption text-nq-danger-text">{{ props.issue }}</p>
      <NqFieldDescription v-else>
        <bdi dir="ltr" class="font-mono">{{ token }}</bdi> · {{ props.used > 0 ? props.t.usedIn(String(props.used)) : props.t.unused }}
      </NqFieldDescription>
    </NqField>
    <NqField>
      <NqFieldLabel>{{ props.t.paramValue }}</NqFieldLabel>
      <div class="flex items-center gap-1">
        <NqInput ltr :type="masked ? 'password' : 'text'" autocomplete="off" :model-value="props.param.value" spellcheck="false" :disabled="props.disabled" class="flex-1" @update:model-value="(v) => emit('change', { ...props.param, value: String(v ?? '') })" />
        <NqButton v-if="props.param.secret" variant="ghost" size="icon-sm" type="button" :aria-pressed="shown" :aria-label="shown ? props.t.hide : props.t.show" :title="shown ? props.t.hide : props.t.show" @click="shown = !shown">
          <EyeOff v-if="shown" aria-hidden="true" />
          <Eye v-else aria-hidden="true" />
        </NqButton>
      </div>
    </NqField>
    <NqField class="flex-row items-center gap-3 sm:col-span-2">
      <NqSwitch :model-value="Boolean(props.param.secret)" :disabled="props.disabled" :aria-label="props.t.paramSecret" @update:model-value="(v: boolean) => emit('change', { ...props.param, secret: v })" />
      <NqFieldLabel>{{ props.t.paramSecret }}</NqFieldLabel>
    </NqField>
  </div>
</template>
