<script setup lang="ts">
import { ArrowLeft, Send } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqRichTextEditor, type RichTextTiptap } from "../rich-text-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqTabs, NqTabsList, NqTabsTab } from "../tabs";
import NqEmailTemplatePreview from "./NqEmailTemplatePreview.vue";
import NqEmailTemplateSendTest from "./NqEmailTemplateSendTest.vue";
import { unknownVariables, type EmailDirection, type EmailVariable } from "./email-render";
import { emailStrings, type EmailTemplatesLabelOverrides } from "./strings";
import { CATEGORY_ORDER, type EmailTemplate, type EmailTemplateCategory, type EmailTemplateResult } from "./types";

/**
 * Edit name, category, subject, preview text and body on one side, with a live preview on the other. Below `lg` the two are tabs.
 * The body uses the rich text editor when `load` (the Tiptap loader) is given, and a plain HTML textarea otherwise.
 */
interface Props {
  template: EmailTemplate;
  variables?: readonly EmailVariable[];
  sender?: { name: string; email: string };
  recipient?: string;
  onSave?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onSendTest?: (template: EmailTemplate, email: string) => Promise<EmailTemplateResult>;
  /** Shows a back button that returns to the gallery. */
  onBack?: () => void;
  /** Loads Tiptap for the body: `() => import("./tiptap")`. Without it the body is an HTML textarea. */
  load?: () => Promise<RichTextTiptap>;
  labels?: EmailTemplatesLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variables: () => [], sender: undefined, recipient: undefined, onSave: undefined, onSendTest: undefined, onBack: undefined, load: undefined, labels: undefined });
const nq = useNasaq();
const t = computed(() => emailStrings(nq.locale.value, props.labels));
const id = useId();

const draft = ref<EmailTemplate>({ ...props.template });
const savedAs = ref<EmailTemplate>({ ...props.template });
const pane = ref<"edit" | "preview">("edit");
const saving = ref(false);
const message = ref<{ tone: "danger" | "success"; text: string } | null>(null);
const testing = ref(false);
// The rich text editor rewrites the body into its own schema on mount. Treat that as the baseline, not as an edit.
let touched = false;
const markTouched = () => {
  touched = true;
};

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(savedAs.value));
const unknown = computed(() => unknownVariables(`${draft.value.subject} ${draft.value.preheader ?? ""} ${draft.value.body}`, props.variables));
const categoryItems = computed(() => CATEGORY_ORDER.map((c) => ({ value: c, label: t.value.categories[c] })));
const dirItems = computed(() => [
  { value: "ltr", label: t.value.ltr },
  { value: "rtl", label: t.value.rtl },
]);

const tag = (key: string) => "{{" + key + "}}";
function patch(next: Partial<EmailTemplate>) {
  draft.value = { ...draft.value, ...next };
}
function onBody(body: string) {
  if (!touched && savedAs.value.body !== body) savedAs.value = { ...savedAs.value, body };
  patch({ body });
}
async function save() {
  if (!props.onSave) return;
  saving.value = true;
  message.value = null;
  try {
    const result = await props.onSave(draft.value);
    if (result && result.error) message.value = { tone: "danger", text: result.error };
    else {
      savedAs.value = draft.value;
      message.value = { tone: "success", text: t.value.saved };
    }
  } catch {
    message.value = { tone: "danger", text: t.value.failed };
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div data-slot="email-template-editor" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <NqButton v-if="props.onBack" variant="ghost" @click="props.onBack?.()">
        <ArrowLeft aria-hidden="true" class="rtl:rotate-180" />
        {{ t.back }}
      </NqButton>
      <span class="ms-auto flex flex-wrap items-center gap-2">
        <span v-if="dirty" class="text-caption text-muted-foreground">{{ t.unsaved }}</span>
        <NqButton v-if="props.onSendTest" @click="testing = true">
          <Send aria-hidden="true" />
          {{ t.sendTest }}
        </NqButton>
        <NqButton v-if="props.onSave" variant="primary" :loading="saving" :disabled="!dirty" @click="save">{{ t.save }}</NqButton>
      </span>
    </div>
    <NqAlert v-if="message" :tone="message.tone">{{ message.text }}</NqAlert>
    <NqTabs :model-value="pane" class="lg:hidden" @update:model-value="(v) => (pane = v as 'edit' | 'preview')">
      <NqTabsList :aria-label="t.gallery">
        <NqTabsTab value="edit">{{ t.edit }}</NqTabsTab>
        <NqTabsTab value="preview">{{ t.preview }}</NqTabsTab>
      </NqTabsList>
    </NqTabs>
    <div class="grid min-w-0 gap-6 lg:grid-cols-2">
      <div :class="cn('flex min-w-0 flex-col gap-4', pane !== 'edit' && 'hidden lg:flex')">
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ t.name }}</NqFieldLabel>
            <NqInput :model-value="draft.name" @update:model-value="(v: string | number | undefined) => patch({ name: String(v ?? '') })" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.category }}</NqFieldLabel>
            <NqSelect :model-value="draft.category" @update:model-value="(v: string | number | null) => v && patch({ category: v as EmailTemplateCategory })">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in categoryItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
        <NqField>
          <NqFieldLabel>{{ t.subject }}</NqFieldLabel>
          <NqInput :model-value="draft.subject" dir="auto" @update:model-value="(v: string | number | undefined) => patch({ subject: String(v ?? '') })" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.preheader }}</NqFieldLabel>
          <NqInput :model-value="draft.preheader ?? ''" dir="auto" @update:model-value="(v: string | number | undefined) => patch({ preheader: String(v ?? '') })" />
          <NqFieldDescription>{{ t.preheaderHint }}</NqFieldDescription>
        </NqField>
        <div class="flex flex-col gap-1.5" @focusin.capture="markTouched">
          <span :id="`${id}-body`" class="text-label text-foreground">{{ t.body }}</span>
          <NqRichTextEditor
            v-if="props.load"
            :aria-labelledby="`${id}-body`"
            :load="props.load"
            :model-value="draft.body"
            min-height="14rem"
            :toolbar="['bold', 'italic', 'underline', 'h2', 'h3', 'bulletList', 'orderedList', 'blockquote', 'link', 'undo', 'redo']"
            @update:model-value="(v) => onBody(String(v ?? ''))"
          />
          <NqTextarea v-else :aria-labelledby="`${id}-body`" dir="ltr" rows="10" class="font-mono text-code" :model-value="draft.body" @update:model-value="(v: string | number | undefined) => onBody(String(v ?? ''))" />
        </div>
        <NqField>
          <NqFieldLabel>{{ t.direction }}</NqFieldLabel>
          <NqSelect :model-value="draft.dir ?? 'ltr'" @update:model-value="(v: string | number | null) => v && patch({ dir: v as EmailDirection })">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="o in dirItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <section v-if="props.variables.length" :aria-labelledby="`${id}-vars`" class="flex flex-col gap-2">
          <div>
            <h3 :id="`${id}-vars`" class="text-label text-foreground">{{ t.variables }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.variablesHint }}</p>
          </div>
          <ul class="flex flex-wrap gap-2">
            <li v-for="v in props.variables" :key="v.key" class="flex items-center gap-1 rounded-control border border-border bg-card ps-2 text-body-sm">
              <span class="text-muted-foreground">{{ v.label }}</span>
              <bdi dir="ltr" class="font-mono text-code text-foreground">{{ tag(v.key) }}</bdi>
              <NqCopyButton :value="tag(v.key)" size="icon-sm" variant="ghost" :label="t.copyVariable(v.key)" />
            </li>
          </ul>
          <NqAlert v-if="unknown.length" tone="warning">{{ t.unknown(unknown.join(", ")) }}</NqAlert>
        </section>
      </div>
      <div :class="cn('min-w-0', pane !== 'preview' && 'hidden lg:block')">
        <NqEmailTemplatePreview :template="draft" :variables="props.variables" :sender="props.sender" :recipient="props.recipient" :labels="props.labels" />
      </div>
    </div>
    <NqEmailTemplateSendTest v-if="props.onSendTest" v-model:open="testing" :on-send="(email) => props.onSendTest!(draft, email)" :default-email="props.recipient" :t="t" />
  </div>
</template>
