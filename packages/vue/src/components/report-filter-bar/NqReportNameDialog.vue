<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { isValidViewName, uniqueViewName } from "./report-filter-math";
import type { ReportFilterBarLabels } from "./strings";

// The save and rename dialog of NqSavedReportViews: one name field, made unique among the other views on submit.
const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
  initial: string;
  taken: readonly string[];
  t: ReportFilterBarLabels;
  onSubmit: (name: string) => void | Promise<void>;
}>();
const emit = defineEmits<{ close: [] }>();

const name = ref(props.initial);
const busy = ref(false);
const error = ref("");
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    name.value = props.initial;
    error.value = "";
    busy.value = false;
  },
);
const valid = computed(() => isValidViewName(name.value));
async function submit() {
  if (!valid.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await props.onSubmit(uniqueViewName(name.value, props.taken));
    emit("close");
  } catch {
    error.value = props.t.failed;
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !next && !busy && emit('close')">
    <NqDialogContent>
      <NqDialogHeader>
        <NqDialogTitle>{{ props.title }}</NqDialogTitle>
        <NqDialogDescription v-if="props.description">{{ props.description }}</NqDialogDescription>
      </NqDialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <NqField :invalid="name !== '' && !valid">
          <NqFieldLabel>{{ props.t.nameLabel }}</NqFieldLabel>
          <NqInput v-model="name" :maxlength="80" autofocus :placeholder="props.t.namePlaceholder" />
          <NqFieldError v-if="name !== '' && !valid" match>{{ props.t.nameInvalid }}</NqFieldError>
        </NqField>
        <p v-if="error" role="alert" class="text-body-sm text-destructive">{{ error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" :loading="busy" :disabled="!valid">{{ busy ? props.t.saving : props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
