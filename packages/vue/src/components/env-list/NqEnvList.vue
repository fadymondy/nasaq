<script setup lang="ts">
import { Download, FileUp, Plus, Search, Upload } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsTab } from "../tabs";
import NqEnvDeleteDialog from "./NqEnvDeleteDialog.vue";
import NqEnvImportDialog from "./NqEnvImportDialog.vue";
import NqEnvRow from "./NqEnvRow.vue";
import NqEnvVariableDialog from "./NqEnvVariableDialog.vue";
import { serializeEnv, type EnvVariable } from "./env-list-format";
import { envListStrings, type EnvListLabels } from "./strings";
import type { EnvEnvironment, EnvImportOptions, EnvResult } from "./types";

// A .env manager: key and value rows with masked values, reveal and copy, add and edit with duplicate and
// invalid-name checks, delete with confirmation, import by pasting or choosing a file, export, and an optional
// environment switcher. Values are only in the DOM while revealed, and nothing is logged.
interface Props {
  /** The variables of the current environment. */
  variables: readonly EnvVariable[];
  /** Heading text. Default "Environment variables" / Arabic by the Nasaq locale; the `title` slot replaces it. */
  title?: string;
  description?: string;
  /** Tabs for Development, Preview, Production... Load the matching `variables` when it changes. */
  environments?: readonly EnvEnvironment[];
  /** The selected environment (`v-model:environment`). Default: the first. */
  environment?: string;
  /** Add (`previousKey` undefined) or edit a variable. Resolve with `{ error }` to keep the dialog open with a message. */
  onSave?: (variable: EnvVariable, previousKey?: string) => Promise<EnvResult>;
  onDelete?: (key: string) => Promise<EnvResult>;
  /** Import parsed variables. Imported values are marked secret unless the key is meant to be public (`NEXT_PUBLIC_*`, `VITE_*`). */
  onImport?: (variables: EnvVariable[], options: EnvImportOptions) => Promise<EnvResult>;
  /** Called by the download button with the current variables. Default: saves a `.env` file. */
  onExport?: (variables: readonly EnvVariable[]) => void;
  /** File name of the default download. Default ".env". */
  exportFilename?: string;
  /** Hide revealed values again after this many milliseconds. `0` keeps them shown. Default 30000. */
  revealTimeout?: number;
  /** No add, edit, delete or import; reveal and copy still work. */
  readOnly?: boolean;
  /** Override any string. */
  labels?: EnvListLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  environments: undefined,
  environment: undefined,
  onSave: undefined,
  onDelete: undefined,
  onImport: undefined,
  onExport: undefined,
  exportFilename: ".env",
  revealTimeout: 30_000,
  readOnly: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:environment": [id: string] }>();

const nq = useNasaq();
const t = computed(() => envListStrings(nq.locale.value, props.labels));
const revealed = ref<ReadonlySet<string>>(new Set());
const filter = ref("");
const editing = ref<{ previous?: string } | null>(null);
const importing = ref(false);
const deleting = ref<string | null>(null);
const canEdit = computed(() => !props.readOnly && Boolean(props.onSave));
const canDelete = computed(() => !props.readOnly && Boolean(props.onDelete));
const canImport = computed(() => !props.readOnly && Boolean(props.onImport));

// Values go back to hidden after a while, and when the environment changes.
watch(
  revealed,
  (set, _old, onCleanup) => {
    if (set.size === 0 || props.revealTimeout <= 0) return;
    const id = setTimeout(() => (revealed.value = new Set()), props.revealTimeout);
    onCleanup(() => clearTimeout(id));
  },
  { flush: "post" },
);
watch(
  () => props.environment,
  () => (revealed.value = new Set()),
);

const shown = computed(() => {
  const q = filter.value.trim().toLowerCase();
  return q ? props.variables.filter((v) => v.key.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)) : props.variables;
});
function toggle(key: string) {
  const next = new Set(revealed.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  revealed.value = next;
}

const envText = () => serializeEnv(props.variables);
function download() {
  if (props.onExport) return props.onExport(props.variables);
  const blob = new Blob([envText()], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = props.exportFilename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
const editingVariable = computed(() => (editing.value?.previous ? props.variables.find((v) => v.key === editing.value?.previous) : undefined));
const existingKeys = computed(() => props.variables.filter((v) => v.key !== editing.value?.previous).map((v) => v.key));

async function deleteConfirmed(key: string): Promise<EnvResult> {
  const result = await props.onDelete!(key);
  if (!result?.error) revealed.value = new Set([...revealed.value].filter((k) => k !== key));
  return result;
}
</script>

<template>
  <section data-slot="env-list" :aria-label="props.title ?? t.title" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h3 class="text-h3 text-foreground"><slot name="title">{{ props.title ?? t.title }}</slot></h3>
        <p class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description ?? t.description }}</slot></p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NqButton v-if="canImport" type="button" size="sm" @click="importing = true">
          <Upload aria-hidden="true" />
          {{ t.import }}
        </NqButton>
        <NqCopyButton :value="envText" variant="secondary" size="sm" :label="t.copyAll" :copied-label="t.copied" :disabled="props.variables.length === 0">{{ t.copyAll }}</NqCopyButton>
        <NqButton type="button" size="sm" :disabled="props.variables.length === 0" @click="download()">
          <Download aria-hidden="true" />
          {{ t.exportAll }}
        </NqButton>
        <NqButton v-if="canEdit" type="button" size="sm" variant="primary" @click="editing = {}">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
      </div>
    </header>

    <NqTabs v-if="props.environments && props.environments.length" :model-value="props.environment ?? props.environments[0]?.id" @update:model-value="emit('update:environment', String($event))">
      <NqTabsList :aria-label="t.environment">
        <NqTabsTab v-for="env in props.environments" :key="env.id" :value="env.id">{{ env.label }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>
    </NqTabs>

    <NqInputGroup v-if="props.variables.length > 5" class="max-w-sm">
      <NqInputGroupAddon align="start"><Search aria-hidden="true" class="size-4 text-muted-foreground" /></NqInputGroupAddon>
      <NqInputGroupInput v-model="filter" ltr type="search" :placeholder="t.search" :aria-label="t.search" />
    </NqInputGroup>

    <NqEmptyState v-if="props.variables.length === 0" :title="t.emptyTitle" :description="t.emptyBody">
      <template #actions>
        <NqButton v-if="canEdit" type="button" variant="primary" @click="editing = {}">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
        <NqButton v-if="canImport" type="button" @click="importing = true">
          <FileUp aria-hidden="true" />
          {{ t.import }}
        </NqButton>
      </template>
    </NqEmptyState>
    <template v-else>
      <ul :aria-label="t.list" class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
        <NqEnvRow
          v-for="v in shown"
          :key="v.key"
          :variable="v"
          :revealed="revealed.has(v.key)"
          :t="t"
          :can-edit="canEdit"
          :can-delete="canDelete"
          @toggle="toggle(v.key)"
          @edit="editing = { previous: v.key }"
          @delete="deleting = v.key"
        />
        <li v-if="shown.length === 0" class="px-4 py-6 text-center text-body-sm text-muted-foreground">{{ t.noMatch }}</li>
      </ul>
      <p class="text-caption text-muted-foreground">{{ t.count(props.variables.length) }}</p>
    </template>

    <!-- A fresh dialog per target, so form state never leaks between variables. -->
    <NqEnvVariableDialog
      v-if="editing && props.onSave"
      :key="editing.previous ?? 'new'"
      :initial="editingVariable"
      :existing="existingKeys"
      :t="t"
      :on-save="(variable) => props.onSave!(variable, editing?.previous)"
      @close="editing = null"
    />
    <NqEnvImportDialog v-if="importing && props.onImport" :current="props.variables" :on-import="props.onImport" :t="t" @close="importing = false" />
    <NqEnvDeleteDialog v-if="deleting && props.onDelete" :name="deleting" :t="t" :on-confirm="() => deleteConfirmed(deleting!)" @close="deleting = null" />
  </section>
</template>
