<script setup lang="ts">
import { Pencil } from "lucide-vue-next";
import { computed, ref, useId, watch } from "vue";
import { NqButton } from "../button";
import { NqTextarea } from "../field";
import { NqRichTextEditor, type RichTextTiptap } from "../rich-text-editor";
import { issueHtmlToText, type IssueResult } from "./issue-logic";
import type { IssueViewStrings } from "./strings";

// The description: read as rich text, edit with Save and Cancel. Without a Tiptap `load` it reads and edits as plain HTML text.
const props = defineProps<{ value: string | undefined; readOnly: boolean; onSave?: (html: string) => Promise<IssueResult>; load?: () => Promise<RichTextTiptap>; t: IssueViewStrings }>();
const id = useId();
const heading = `${id}-h`;
const editing = ref(false);
const draft = ref(props.value ?? "");
const busy = ref(false);
const error = ref<string | null>(null);
watch([() => props.value, editing], () => {
  if (!editing.value) draft.value = props.value ?? "";
});
const has = computed(() => Boolean(props.value && props.value.replace(/<[^>]*>/g, "").trim()));

async function save() {
  if (!props.onSave) {
    editing.value = false;
    return;
  }
  busy.value = true;
  const result = await props.onSave(draft.value);
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  error.value = null;
  editing.value = false;
}
function cancel() {
  editing.value = false;
  error.value = null;
}
</script>

<template>
  <section data-slot="issue-description" :aria-labelledby="heading" class="flex min-w-0 flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <h2 :id="heading" class="m-0 text-body font-semibold">{{ props.t.description }}</h2>
      <NqButton v-if="!props.readOnly && !editing" variant="ghost" size="sm" @click="editing = true">
        <Pencil aria-hidden="true" />
        {{ props.t.edit }}
      </NqButton>
    </div>
    <div v-if="editing" class="flex flex-col gap-2">
      <NqRichTextEditor v-if="props.load" :aria-labelledby="heading" :load="props.load" :model-value="draft" min-height="9rem" @update:model-value="(v) => (draft = String(v ?? ''))" />
      <NqTextarea v-else :aria-labelledby="heading" dir="ltr" :rows="6" class="font-mono text-code" :model-value="draft" @update:model-value="(v: string | number | undefined) => (draft = String(v ?? ''))" />
      <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <NqButton variant="ghost" size="sm" :disabled="busy" @click="cancel">{{ props.t.cancel }}</NqButton>
        <NqButton size="sm" :loading="busy" @click="save">{{ props.t.save }}</NqButton>
      </div>
    </div>
    <template v-else-if="has">
      <NqRichTextEditor v-if="props.load" :aria-labelledby="heading" :load="props.load" read-only :model-value="props.value ?? ''" :toolbar="[]" min-height="0" />
      <p v-else class="m-0 whitespace-pre-line text-body">{{ issueHtmlToText(props.value ?? "") }}</p>
    </template>
    <p v-else class="m-0 text-body-sm text-muted-foreground">{{ props.t.noDescription }}</p>
  </section>
</template>
