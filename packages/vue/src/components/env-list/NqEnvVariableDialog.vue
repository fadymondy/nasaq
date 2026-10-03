<script setup lang="ts">
import { Eye, EyeOff } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqSwitch } from "../switch";
import { checkEnvKey, type EnvVariable } from "./env-list-format";
import { keyMessage, type EnvListStrings } from "./strings";
import type { EnvResult } from "./types";

// Add or edit one variable. Mounted only while open (the list gives it a fresh key per target), so the form
// state never leaks from one variable to the next.
interface Props {
  initial?: EnvVariable;
  /** The other keys already in the list. */
  existing: string[];
  t: EnvListStrings;
  onSave: (variable: EnvVariable) => Promise<EnvResult>;
}
const props = withDefaults(defineProps<Props>(), { initial: undefined });
const emit = defineEmits<{ close: [] }>();

const key = ref(props.initial?.key ?? "");
const value = ref(props.initial?.value ?? "");
const note = ref(props.initial?.description ?? "");
const secret = ref(props.initial ? props.initial.secret !== false : true);
const showValue = ref(false);
const touched = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);
const id = useId();
const problem = computed(() => checkEnvKey(key.value, props.existing));
const showProblem = computed(() => problem.value !== null && (touched.value || problem.value === "duplicate" || problem.value === "invalid"));

function setKey(raw: string | number | undefined) {
  key.value = String(raw ?? "").trim();
}

async function submit() {
  touched.value = true;
  if (problem.value || pending.value) return;
  pending.value = true;
  error.value = null;
  try {
    const variable: EnvVariable = { key: key.value, value: value.value, secret: secret.value, ...(note.value.trim() ? { description: note.value.trim() } : {}) };
    const result = await props.onSave(variable);
    if (result?.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog open @update:open="(open) => !open && !pending && emit('close')">
    <NqDialogContent>
      <form class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.initial ? props.t.editTitle(props.initial.key) : props.t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.keyHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="showProblem">
          <NqFieldLabel>{{ props.t.keyLabel }}</NqFieldLabel>
          <NqInput
            ltr
            name="key"
            :model-value="key"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            :spellcheck="false"
            placeholder="DATABASE_URL"
            class="font-mono text-code"
            :aria-invalid="showProblem || undefined"
            :aria-describedby="showProblem ? `${id}-key-error` : undefined"
            @update:model-value="setKey"
            @blur="touched = true"
          />
          <p v-if="showProblem && problem" :id="`${id}-key-error`" role="alert" class="text-caption text-nq-danger-text">{{ keyMessage(props.t, problem) }}</p>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ props.t.valueLabel }}</NqFieldLabel>
          <NqTextarea
            v-model="value"
            dir="ltr"
            name="value"
            :rows="3"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            :spellcheck="false"
            :class="cn('min-h-20 font-mono text-code text-start', secret && !showValue && '[-webkit-text-security:disc]')"
          />
          <button
            v-if="secret"
            type="button"
            :aria-pressed="showValue"
            class="inline-flex w-fit items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="showValue = !showValue"
          >
            <EyeOff v-if="showValue" aria-hidden="true" class="size-3.5" />
            <Eye v-else aria-hidden="true" class="size-3.5" />
            {{ props.t.showValue }}
          </button>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ props.t.descriptionLabel }}</NqFieldLabel>
          <NqInput v-model="note" name="description" autocomplete="off" />
        </NqField>
        <div class="flex items-start justify-between gap-4 rounded-control border border-border p-3">
          <div class="flex flex-col gap-0.5">
            <label :for="`${id}-secret`" class="text-label text-foreground">{{ props.t.secretLabel }}</label>
            <span class="text-caption text-muted-foreground">{{ props.t.secretHint }}</span>
          </div>
          <NqSwitch :id="`${id}-secret`" v-model="secret" />
        </div>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending" :disabled="problem !== null && touched">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
