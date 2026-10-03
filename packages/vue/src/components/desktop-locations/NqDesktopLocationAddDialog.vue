<script setup lang="ts">
import { FolderSearch } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqSwitch } from "../switch";
import { checkLocationPath, normalizePath } from "./location-path";
import type { DesktopLocationsLabels } from "./strings";
import type { DesktopLocationPermissions, LocationResult } from "./types";

// The "Add a folder" dialog. Internal to NqDesktopLocations; mounted only while open.
interface Props {
  existing: readonly string[];
  onAdd: (path: string, permissions: DesktopLocationPermissions) => Promise<LocationResult> | LocationResult;
  onBrowse?: () => Promise<string | null>;
  t: DesktopLocationsLabels;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const id = useId();
const path = ref("");
const permissions = ref<DesktopLocationPermissions>({ read: true, write: false, index: true });
const touched = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);
const browsing = ref(false);
const check = computed(() => checkLocationPath(path.value, props.existing));
const problemText = computed(() => {
  const p = check.value.problem;
  return p === "empty" ? props.t.problemEmpty : p === "relative" ? props.t.problemRelative : p === "duplicate" ? props.t.problemDuplicate : null;
});
const showProblem = computed(() => problemText.value !== null && (touched.value || check.value.problem === "duplicate"));
const toggles = computed(() => [
  { key: "read" as const, label: props.t.read, hint: props.t.readHint },
  { key: "write" as const, label: props.t.write, hint: props.t.writeHint },
  { key: "index" as const, label: props.t.index, hint: props.t.indexHint },
]);

async function browse() {
  if (!props.onBrowse) return;
  browsing.value = true;
  try {
    const picked = await props.onBrowse();
    if (picked) {
      path.value = picked;
      touched.value = true;
    }
  } catch {
    error.value = props.t.genericError;
  } finally {
    browsing.value = false;
  }
}

async function submit() {
  touched.value = true;
  if (check.value.problem || pending.value) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onAdd(normalizePath(path.value), permissions.value);
    if (result?.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
function setPermission(key: keyof DesktopLocationPermissions, checked: boolean) {
  permissions.value = { ...permissions.value, [key]: checked, ...(key === "read" && !checked ? { write: false, index: false } : {}) };
}
</script>

<template>
  <NqDialog :open="true" @update:open="(open: boolean) => !open && !pending && emit('close')">
    <NqDialogContent>
      <form class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.addBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="showProblem">
          <NqFieldLabel>{{ props.t.pathLabel }}</NqFieldLabel>
          <div class="flex gap-2">
            <NqInput
              v-model="path"
              ltr
              autocapitalize="off"
              autocomplete="off"
              autocorrect="off"
              :spellcheck="false"
              :placeholder="props.t.pathPlaceholder"
              class="min-w-0 flex-1 font-mono text-code"
              :aria-describedby="showProblem ? `${id}-path` : undefined"
              @blur="touched = true"
            />
            <NqButton v-if="props.onBrowse" :loading="browsing" @click="browse"><FolderSearch aria-hidden="true" />{{ props.t.browse }}</NqButton>
          </div>
          <p v-if="showProblem" :id="`${id}-path`" role="alert" class="text-caption text-nq-danger-text">{{ problemText }}</p>
        </NqField>
        <NqAlert v-if="check.warning && check.other" tone="warning">
          <bdi dir="ltr" class="font-mono">{{ check.warning === "inside" ? props.t.warnInside(check.other) : props.t.warnContains(check.other) }}</bdi>
        </NqAlert>
        <div role="group" :aria-label="props.t.permissions" class="grid gap-2">
          <div v-for="x in toggles" :key="x.key" class="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2">
            <label :for="`${id}-${x.key}`" class="flex min-w-0 flex-col">
              <span class="text-body-sm text-foreground">{{ x.label }}</span>
              <span class="text-caption text-muted-foreground">{{ x.hint }}</span>
            </label>
            <NqSwitch :id="`${id}-${x.key}`" :model-value="permissions[x.key]" :disabled="x.key !== 'read' && !permissions.read" @update:model-value="(c: boolean) => setPermission(x.key, c)" />
          </div>
        </div>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending" :disabled="touched && check.problem !== null">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
