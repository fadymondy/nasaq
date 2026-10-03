<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { fillVariables } from "../email-templates";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { normalizeCannedShortcut, validateCannedReply, type CannedReplyIssue } from "./canned-replies-logic";
import type { CannedRepliesLabels, CannedReply, CannedReplyResult, CannedReplyVariable } from "./strings";

// The add / edit form of a reply, in a dialog, with variable buttons and a live preview. Internal.
const props = defineProps<{
  /** `null` closes the dialog. */
  target: { reply: CannedReply; isNew: boolean } | null;
  others: readonly CannedReply[];
  variables: readonly CannedReplyVariable[];
  t: CannedRepliesLabels;
  onSave: (reply: CannedReply) => Promise<CannedReplyResult>;
}>();
const emit = defineEmits<{ close: [] }>();

const draft = ref<CannedReply>({ id: "", shortcut: "", title: "", body: "" });
const touched = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const bodyEl = ref<{ $el: HTMLTextAreaElement } | null>(null);

watch(
  () => props.target,
  (target) => {
    if (!target) return;
    draft.value = { ...target.reply };
    touched.value = false;
    error.value = null;
  },
  { immediate: true },
);

const issues = computed<CannedReplyIssue[]>(() => validateCannedReply(draft.value, props.others, props.variables.map((v) => v.key)));
const show = (issue: CannedReplyIssue) => touched.value && issues.value.includes(issue);
const preview = computed(() => fillVariables(draft.value.body, props.variables));

function insert(key: string) {
  const el = bodyEl.value?.$el;
  const token = `{{${key}}}`;
  const body = draft.value.body;
  const start = el?.selectionStart ?? body.length;
  const end = el?.selectionEnd ?? body.length;
  draft.value = { ...draft.value, body: body.slice(0, start) + token + body.slice(end) };
  void nextTick(() => {
    el?.focus();
    el?.setSelectionRange(start + token.length, start + token.length);
  });
}

async function submit() {
  touched.value = true;
  if (issues.value.length) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await props.onSave({ ...draft.value, shortcut: normalizeCannedShortcut(draft.value.shortcut), title: draft.value.title.trim(), updatedAt: new Date() });
    if (result && result.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.failed;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.target !== null" @update:open="(o: boolean) => !o && !saving && emit('close')">
    <NqDialogContent data-slot="canned-reply-editor" class="max-w-2xl">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.target?.isNew ? props.t.dialogNew : props.t.dialogEdit }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.dialogHint }}</NqDialogDescription>
      </NqDialogHeader>
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <div class="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <NqField :invalid="show('title-empty')">
            <NqFieldLabel>{{ props.t.title }}</NqFieldLabel>
            <NqInput v-model="draft.title" />
            <NqFieldError v-if="show('title-empty')" :match="true">{{ props.t.issues["title-empty"] }}</NqFieldError>
            <NqFieldDescription v-else>{{ props.t.titleHint }}</NqFieldDescription>
          </NqField>
          <NqField :invalid="show('shortcut-empty') || show('shortcut-duplicate')">
            <NqFieldLabel>{{ props.t.shortcut }}</NqFieldLabel>
            <div class="flex items-center gap-1">
              <span aria-hidden="true" class="text-muted-foreground">/</span>
              <NqInput :model-value="draft.shortcut" ltr @update:model-value="(v: string | number | undefined) => (draft.shortcut = normalizeCannedShortcut(String(v ?? '')))" />
            </div>
            <NqFieldError v-if="show('shortcut-empty')" :match="true">{{ props.t.issues["shortcut-empty"] }}</NqFieldError>
            <NqFieldError v-else-if="show('shortcut-duplicate')" :match="true">{{ props.t.issues["shortcut-duplicate"] }}</NqFieldError>
            <NqFieldDescription v-else>{{ props.t.shortcutHint }}</NqFieldDescription>
          </NqField>
        </div>
        <NqField :invalid="show('body-empty') || show('variable-unknown')">
          <NqFieldLabel>{{ props.t.body }}</NqFieldLabel>
          <div class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="props.t.variables">
            <span class="text-caption text-muted-foreground">{{ props.t.variables }}</span>
            <NqButton v-for="v in props.variables" :key="v.key" type="button" size="sm" variant="secondary" :aria-label="props.t.insertVariable(v.label)" @click="insert(v.key)">{{ v.label }}</NqButton>
          </div>
          <NqTextarea ref="bodyEl" v-model="draft.body" rows="5" />
          <NqFieldError v-if="show('body-empty')" :match="true">{{ props.t.issues["body-empty"] }}</NqFieldError>
          <NqFieldError v-else-if="show('variable-unknown')" :match="true">{{ props.t.issues["variable-unknown"] }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.bodyHint }}</NqFieldDescription>
        </NqField>
        <div class="flex flex-col gap-1.5" aria-live="polite">
          <span class="text-label text-foreground">
            {{ props.t.preview }} <span class="text-caption font-normal text-muted-foreground">{{ props.t.previewHint }}</span>
          </span>
          <p data-slot="canned-reply-preview" dir="auto" class="min-h-12 whitespace-pre-wrap rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm text-foreground">{{ preview || "—" }}</p>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="saving" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="saving">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
