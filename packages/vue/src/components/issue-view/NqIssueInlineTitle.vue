<script setup lang="ts">
import { Pencil } from "lucide-vue-next";
import { nextTick, ref, watch } from "vue";
import { NqInput } from "../field";
import type { IssueResult } from "./issue-logic";
import type { IssueViewStrings } from "./strings";

// The title as a heading that turns into an input on click. Enter saves, Escape cancels.
const props = defineProps<{ value: string; readOnly: boolean; onSave?: (title: string) => Promise<IssueResult>; t: IssueViewStrings }>();
const editing = ref(false);
const draft = ref(props.value);
const error = ref<string | null>(null);
const busy = ref(false);
const box = ref<{ $el: HTMLInputElement } | null>(null);
watch(() => props.value, (v) => (draft.value = v));
watch(editing, async (on) => {
  if (!on) return;
  await nextTick();
  box.value?.$el?.select();
});

async function commit() {
  if (busy.value) return;
  const next = draft.value.trim();
  if (next === props.value) {
    editing.value = false;
    return;
  }
  if (!next) {
    error.value = props.t.titleEmpty;
    return;
  }
  if (!props.onSave) {
    editing.value = false;
    return;
  }
  busy.value = true;
  const result = await props.onSave(next);
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  error.value = null;
  editing.value = false;
}
function cancel() {
  draft.value = props.value;
  error.value = null;
  editing.value = false;
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    void commit();
  } else if (e.key === "Escape") {
    e.preventDefault();
    cancel();
  }
}
</script>

<template>
  <div v-if="editing" class="flex min-w-0 flex-col gap-1">
    <NqInput
      ref="box"
      v-model="draft"
      :aria-label="props.t.editTitle"
      :aria-invalid="error ? true : undefined"
      :disabled="busy"
      class="h-control-lg text-title-sm font-semibold"
      @blur="commit"
      @keydown="onKeydown"
    />
    <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
  </div>
  <h1 v-else class="m-0 min-w-0 text-title-sm font-semibold text-foreground">
    <span v-if="props.readOnly" class="break-words">{{ props.value }}</span>
    <button
      v-else
      type="button"
      :title="props.t.editTitle"
      class="group -mx-2 inline-flex max-w-full items-start gap-2 rounded-control px-2 py-0.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
      @click="editing = true"
    >
      <span class="break-words">{{ props.value }}</span>
      <Pencil aria-hidden="true" class="mt-1.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  </h1>
</template>
