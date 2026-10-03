<script setup lang="ts">
import { FileUp } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqTextarea } from "../field";
import { conflictingKeys, looksPublic, parseEnv, type EnvVariable } from "./env-list-format";
import type { EnvListStrings } from "./strings";
import type { EnvImportOptions, EnvResult } from "./types";

// Import by pasting a .env or choosing a file: a preview of what was found, conflicts, unreadable lines, overwrite.
interface Props {
  current: readonly EnvVariable[];
  t: EnvListStrings;
  onImport: (variables: EnvVariable[], options: EnvImportOptions) => Promise<EnvResult>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const text = ref("");
const overwrite = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);
const file = ref<HTMLInputElement | null>(null);
const id = useId();
const parsed = computed(() => parseEnv(text.value));
const conflicts = computed(() => conflictingKeys(props.current, parsed.value.variables));
const importable = computed(() => (overwrite.value ? parsed.value.variables : parsed.value.variables.filter((v) => !conflicts.value.includes(v.key))));

async function readFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const picked = input.files?.[0];
  const content = picked ? await picked.text() : null;
  input.value = "";
  if (content !== null) text.value = content;
}

async function submit() {
  if (importable.value.length === 0 || pending.value) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onImport(
      importable.value.map((v) => ({ key: v.key, value: v.value, secret: !looksPublic(v.key) })),
      { overwrite: overwrite.value },
    );
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
    <NqDialogContent class="max-w-xl">
      <form class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.importTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.importBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ props.t.importLabel }}</NqFieldLabel>
          <NqTextarea
            v-model="text"
            dir="ltr"
            :rows="8"
            :placeholder="props.t.importPlaceholder"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            :spellcheck="false"
            class="min-h-40 font-mono text-code text-start"
          />
        </NqField>
        <div>
          <input ref="file" type="file" accept=".env,text/plain" class="sr-only" tabindex="-1" aria-hidden="true" @change="readFile" />
          <NqButton type="button" size="sm" @click="file?.click()">
            <FileUp aria-hidden="true" />
            {{ props.t.chooseFile }}
          </NqButton>
        </div>
        <div v-if="text.trim()" class="grid gap-2 text-body-sm" aria-live="polite">
          <p class="text-foreground">
            {{ props.t.found(parsed.variables.length) }}
            <span v-if="conflicts.length" class="text-nq-warning-text"> · {{ props.t.conflicts(conflicts.length) }}</span>
          </p>
          <div v-if="conflicts.length" class="flex items-center gap-2">
            <NqCheckbox :id="`${id}-overwrite`" v-model="overwrite" />
            <label :for="`${id}-overwrite`" class="text-foreground">{{ props.t.overwrite }}</label>
          </div>
          <p v-if="conflicts.length && !overwrite" class="text-caption text-muted-foreground">{{ props.t.skipNote }}</p>
          <p v-if="parsed.duplicates.length" class="text-caption text-nq-warning-text">{{ props.t.pasteDuplicates(parsed.duplicates.join(", ")) }}</p>
          <NqAlert v-if="parsed.issues.length" tone="warning" :title="props.t.issuesTitle">
            <ul class="m-0 list-disc ps-4">
              <li v-for="issue in parsed.issues.slice(0, 5)" :key="`${issue.line}-${issue.problem}`">{{ props.t.issue(issue) }}</li>
            </ul>
          </NqAlert>
        </div>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending" :disabled="importable.length === 0">{{ props.t.importButton(importable.length) }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
