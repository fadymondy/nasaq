<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import type { RichTextTiptap } from "../rich-text-editor";
import NqEmailTemplateEditor from "./NqEmailTemplateEditor.vue";
import NqEmailTemplateGallery from "./NqEmailTemplateGallery.vue";
import type { EmailVariable } from "./email-render";
import type { EmailTemplatesLabelOverrides } from "./strings";
import { blankEmailTemplate, type EmailTemplate, type EmailTemplateResult } from "./types";

/** Gallery, editor and preview in one: pick a template card to edit it, with a live preview beside the form. */
interface Props {
  templates: EmailTemplate[];
  variables?: readonly EmailVariable[];
  /** Start in the editor for this template. */
  defaultSelectedId?: string;
  sender?: { name: string; email: string };
  recipient?: string;
  /** Called with the edited template. For a new template the `id` is the temporary one from `blankEmailTemplate`. Add it to `templates` when this resolves. */
  onSave?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onDuplicate?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onDelete?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onSendTest?: (template: EmailTemplate, email: string) => Promise<EmailTemplateResult>;
  /** Loads Tiptap for the body editor. Without it the body is an HTML textarea. */
  load?: () => Promise<RichTextTiptap>;
  labels?: EmailTemplatesLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  variables: () => [], defaultSelectedId: undefined, sender: undefined, recipient: undefined, onSave: undefined, onDuplicate: undefined, onDelete: undefined, onSendTest: undefined, load: undefined, labels: undefined,
});
const nq = useNasaq();
const selected = ref<EmailTemplate | null>(props.templates.find((tpl) => tpl.id === props.defaultSelectedId) ?? null);
const live = computed(() => (selected.value ? (props.templates.find((tpl) => tpl.id === selected.value!.id) ?? selected.value) : null));
function create() {
  selected.value = blankEmailTemplate(`new-${Date.now()}`, nq.locale.value.startsWith("ar") ? "rtl" : "ltr");
}
</script>

<template>
  <div data-slot="email-templates" :class="props.class">
    <NqEmailTemplateEditor
      v-if="live"
      :key="live.id"
      :template="live"
      :variables="props.variables"
      :sender="props.sender"
      :recipient="props.recipient"
      :on-save="props.onSave"
      :on-send-test="props.onSendTest"
      :on-back="() => (selected = null)"
      :load="props.load"
      :labels="props.labels"
    />
    <NqEmailTemplateGallery
      v-else
      :templates="props.templates"
      :variables="props.variables"
      :on-open="(tpl) => (selected = tpl)"
      :on-create="props.onSave ? create : undefined"
      :on-duplicate="props.onDuplicate"
      :on-delete="props.onDelete"
      :labels="props.labels"
    />
  </div>
</template>
