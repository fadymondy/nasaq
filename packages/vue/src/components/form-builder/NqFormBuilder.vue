<script setup lang="ts">
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-vue-next";
import { computed, nextTick, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCodeBlock } from "../code-block";
import type { ContextMenuAction } from "../context-menu";
import { NqContextMenuActions } from "../context-menu";
import { NqCopyButton } from "../copy-button";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput, NqTextarea } from "../field";
import {
  FORM_FIELD_KINDS,
  formatFormOptions,
  formEmbedSnippet,
  formOriginAllowed,
  moveFormField,
  newFormField,
  newFormRule,
  normalizeFormOrigin,
  parseFormOptions,
  uniqueFormFieldId,
  type FormDefinition,
  type FormFieldDef,
  type FormFieldKind,
} from "../public-form/form-model";
import { NqPublicForm } from "../public-form";
import type { RuleActionType, RuleDefinition, RuleField } from "../rule-builder";
import { NqRuleBuilder } from "../rule-builder";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqStatus } from "../status";
import { NqSwitch } from "../switch";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTagInput } from "../tag-input";
import { FORM_BUILDER_BLANK, FORM_BUILDER_STRINGS, useFormBuilderStrings, type FormBuilderLabels } from "./labels";

// Builds a public form: add and order fields in English and Arabic, add rules that show, hide or require fields,
// choose the sites allowed to embed it (closed until you add one), write the thank-you, and copy the embed snippet.
// The model is a plain `FormDefinition` you store; `NqPublicForm` renders it.
interface Props {
  /** The form being edited (`v-model`). */
  modelValue?: FormDefinition;
  defaultValue?: FormDefinition;
  /** The public key of the form, used in the embed snippet and public link. */
  formKey?: string;
  /** Where public forms are served. Default `https://forms.example.com`. */
  embedBaseUrl?: string;
  /** Adds a Save button. Resolve when saved. */
  onSave?: (form: FormDefinition) => void | Promise<void>;
  saving?: boolean;
  locale?: string;
  labels?: FormBuilderLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: () => ({ ...FORM_BUILDER_BLANK }),
  formKey: "pk_live_demo",
  embedBaseUrl: "https://forms.example.com",
  onSave: undefined,
  saving: false,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [form: FormDefinition] }>();
defineOptions({ inheritAttrs: false });

const { locale, ar, t } = useFormBuilderStrings(
  () => props.locale,
  () => props.labels,
);
const inner = ref<FormDefinition>(props.defaultValue);
const form = computed(() => props.modelValue ?? inner.value);
const selected = ref<string | null>(form.value.fields[0]?.id ?? null);
const tab = ref("fields");
const style = ref<"iframe" | "script">("iframe");
const probe = ref("");
const originError = ref<string | null>(null);
const addKey = ref<string>("");

function update(patch: Partial<FormDefinition>) {
  const next = { ...form.value, ...patch };
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
}
const updateField = (id: string, patch: Partial<FormFieldDef>) => update({ fields: form.value.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
const current = computed(() => form.value.fields.find((f) => f.id === selected.value) ?? null);
const labelOf = (f: FormFieldDef) => (ar.value ? f.labelAr || f.label : f.label || f.labelAr) || "";

function addField(kind: FormFieldKind) {
  const field = newFormField(kind, form.value.fields, FORM_BUILDER_STRINGS.en.kinds[kind], FORM_BUILDER_STRINGS.ar.kinds[kind]);
  update({ fields: [...form.value.fields, field] });
  selected.value = field.id;
}
function onAdd(value: unknown) {
  if (typeof value === "string" && value) addField(value as FormFieldKind);
  // The picker is an "add" menu: it goes back to its placeholder.
  void nextTick(() => (addKey.value = ""));
}
function removeField(id: string) {
  const index = form.value.fields.findIndex((f) => f.id === id);
  const fields = form.value.fields.filter((f) => f.id !== id);
  update({
    fields,
    rules: form.value.rules.map((r) => ({ ...r, actions: r.actions.filter((a) => a.config?.target !== id) })).filter((r) => r.actions.length > 0),
  });
  selected.value = fields[Math.min(index, fields.length - 1)]?.id ?? null;
}
function duplicateField(id: string) {
  const source = form.value.fields.find((f) => f.id === id);
  if (!source) return;
  const copy = { ...source, id: uniqueFormFieldId(source.id, form.value.fields) };
  const at = form.value.fields.findIndex((f) => f.id === id);
  const fields = [...form.value.fields];
  fields.splice(at + 1, 0, copy);
  update({ fields });
  selected.value = copy.id;
}
const move = (id: string, by: -1 | 1) => update({ fields: moveFormField(form.value.fields, id, by) });
const rowActions = (f: FormFieldDef, index: number): ContextMenuAction[] => [
  { id: "up", label: t.value.moveUp, icon: ArrowUp, disabled: index === 0, onSelect: () => move(f.id, -1) },
  { id: "down", label: t.value.moveDown, icon: ArrowDown, disabled: index === form.value.fields.length - 1, onSelect: () => move(f.id, 1) },
  { id: "dup", label: t.value.duplicate, icon: Copy, onSelect: () => duplicateField(f.id) },
  { id: "remove", label: t.value.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => removeField(f.id) },
];
function changeKind(k: unknown) {
  const c = current.value;
  if (!c || typeof k !== "string") return;
  const kind = k as FormFieldKind;
  const options = kind === "select" || kind === "radio" ? (c.options?.length ? c.options : newFormField(kind, []).options) : c.options;
  updateField(c.id, { kind, options });
}

const ruleFields = computed<RuleField[]>(() =>
  form.value.fields.map((f) => ({
    id: f.id,
    label: labelOf(f) || f.id,
    kind: f.kind === "number" ? "number" : f.kind === "checkbox" ? "boolean" : f.kind === "select" || f.kind === "radio" ? "select" : "text",
    options: f.options?.map((o) => ({ value: o.value, label: (ar.value ? o.labelAr || o.label : o.label) || o.value })),
  })),
);
const actionTypes = computed<RuleActionType[]>(() =>
  (["show", "hide", "require"] as const).map((id) => ({
    id,
    label: id === "require" ? t.value.requireField : t.value[id],
    fields: [{ name: "target", label: t.value.target, kind: "select", required: true, options: ruleFields.value.map((f) => ({ value: f.id, label: f.label })) }],
    defaults: { target: "" },
  })),
);
const events = computed(() => [{ id: "change", label: t.value.event }]);
const setRule = (i: number, next: RuleDefinition) => update({ rules: form.value.rules.map((r, j) => (j === i ? next : r)) });

const closed = computed(() => form.value.allowedOrigins.length === 0);
const probeResult = computed(() => (probe.value.trim() ? formOriginAllowed(form.value.allowedOrigins, probe.value) : null));
const publicLink = computed(() => `${props.embedBaseUrl.replace(/\/+$/, "")}/f/${props.formKey}`);
const snippet = computed(() => formEmbedSnippet({ baseUrl: props.embedBaseUrl, formKey: props.formKey, style: style.value, title: form.value.name || "Form" }));
const previewForm = computed(() => ({ ...form.value, enabled: true }));
const validateOrigin = (tag: string) => (normalizeFormOrigin(tag) ? true : t.value.originsInvalid);
const onReject = (_tag: string, reason: string) => (originError.value = reason === "invalid" ? t.value.originsInvalid : null);
function setOrigins(tags: string[]) {
  originError.value = null;
  const next: string[] = [];
  for (const tag of tags) {
    const origin = normalizeFormOrigin(tag);
    if (origin && !next.includes(origin)) next.push(origin);
  }
  update({ allowedOrigins: next });
}

// Options are typed as lines; the text is kept while typing and parsed on every change.
const optionsText = ref("");
const optionsFor = ref<string | null>(null);
const optionsValue = computed({
  get: () => {
    const c = current.value;
    if (c && optionsFor.value !== c.id) {
      optionsFor.value = c.id;
      optionsText.value = formatFormOptions(c.options);
    }
    return optionsText.value;
  },
  set: (text: string) => {
    optionsText.value = text;
    if (current.value) updateField(current.value.id, { options: parseFormOptions(text) });
  },
});
</script>

<template>
  <div data-slot="form-builder" v-bind="$attrs" :class="cn('flex w-full min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-end gap-3">
      <NqField class="min-w-48 flex-1">
        <NqFieldLabel>{{ t.name }}</NqFieldLabel>
        <NqInput :model-value="form.name" @update:model-value="update({ name: String($event) })" />
      </NqField>
      <label class="flex items-center gap-2 pb-2 text-body">
        <NqSwitch :model-value="form.enabled" @update:model-value="update({ enabled: $event })" />
        {{ t.enabled }}
      </label>
      <NqButton v-if="props.onSave" type="button" :loading="props.saving" @click="props.onSave(form)">{{ t.save }}</NqButton>
    </div>

    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab v-for="k in (['fields', 'logic', 'settings', 'embed'] as const)" :key="k" :value="k">{{ t.tabs[k] }}</NqTabsTab>
      </NqTabsList>

      <NqTabsPanel value="fields" class="pt-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div class="flex min-w-0 flex-col gap-4">
            <NqSelect :model-value="addKey" @update:model-value="onAdd">
              <NqSelectTrigger :aria-label="t.addField" class="w-full sm:w-64">
                <Plus aria-hidden="true" class="size-4 text-muted-foreground" />
                <NqSelectValue :placeholder="t.addField" />
              </NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="k in FORM_FIELD_KINDS" :key="k" :value="k">{{ t.kinds[k] }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>

            <p v-if="form.fields.length === 0" class="text-body-sm text-muted-foreground">{{ t.noFields }}</p>
            <ul v-else :aria-label="t.fieldList" class="flex flex-col gap-2">
              <NqContextMenuActions
                v-for="(f, i) in form.fields"
                :key="f.id"
                as="li"
                :actions="rowActions(f, i)"
                data-slot="form-builder-field"
                :data-id="f.id"
                :class="cn('flex items-center gap-2 rounded-card border border-border bg-card p-2', f.id === selected && 'border-primary bg-nq-selected')"
              >
                <button
                  type="button"
                  data-field-select
                  :aria-current="f.id === selected ? 'true' : undefined"
                  class="flex min-w-0 flex-1 items-center gap-2 rounded-control px-1 py-1 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                  @click="selected = f.id"
                >
                  <span class="truncate font-medium">{{ labelOf(f) || t.untitled }}</span>
                  <NqBadge variant="outline">{{ t.kinds[f.kind] }}</NqBadge>
                  <span v-if="f.required" class="text-caption text-nq-danger-text">{{ t.required }}</span>
                </button>
                <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.moveUp" :disabled="i === 0" @click="move(f.id, -1)"><ArrowUp aria-hidden="true" /></NqButton>
                <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.moveDown" :disabled="i === form.fields.length - 1" @click="move(f.id, 1)"><ArrowDown aria-hidden="true" /></NqButton>
                <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.remove" @click="removeField(f.id)"><Trash2 aria-hidden="true" /></NqButton>
              </NqContextMenuActions>
            </ul>

            <NqCard v-if="current">
              <NqCardHeader>
                <NqCardTitle as="h3" class="text-body font-medium">{{ t.editing }}</NqCardTitle>
              </NqCardHeader>
              <NqCardContent class="grid gap-4 sm:grid-cols-2">
                <NqField>
                  <NqFieldLabel>{{ t.labelEn }}</NqFieldLabel>
                  <NqInput :model-value="current.label" @update:model-value="updateField(current.id, { label: String($event) })" />
                </NqField>
                <NqField>
                  <NqFieldLabel>{{ t.labelAr }}</NqFieldLabel>
                  <NqInput dir="rtl" :model-value="current.labelAr ?? ''" @update:model-value="updateField(current.id, { labelAr: String($event) })" />
                </NqField>
                <NqField>
                  <NqFieldLabel>{{ t.kind }}</NqFieldLabel>
                  <NqSelect :model-value="current.kind" @update:model-value="changeKind">
                    <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                    <NqSelectContent>
                      <NqSelectItem v-for="k in FORM_FIELD_KINDS" :key="k" :value="k">{{ t.kinds[k] }}</NqSelectItem>
                    </NqSelectContent>
                  </NqSelect>
                </NqField>
                <label class="flex items-center gap-2 self-end pb-2 text-body">
                  <NqSwitch :model-value="Boolean(current.required)" @update:model-value="updateField(current.id, { required: $event })" />
                  {{ t.isRequired }}
                </label>
                <NqField v-if="current.kind !== 'checkbox' && current.kind !== 'radio' && current.kind !== 'select'">
                  <NqFieldLabel>{{ t.placeholder }}</NqFieldLabel>
                  <NqInput :model-value="current.placeholder ?? ''" @update:model-value="updateField(current.id, { placeholder: String($event) })" />
                </NqField>
                <NqField>
                  <NqFieldLabel>{{ t.help }}</NqFieldLabel>
                  <NqInput :model-value="current.help ?? ''" @update:model-value="updateField(current.id, { help: String($event) })" />
                </NqField>
                <NqField v-if="current.kind === 'select' || current.kind === 'radio'" class="sm:col-span-2">
                  <NqFieldLabel>{{ t.options }}</NqFieldLabel>
                  <NqTextarea v-model="optionsValue" :rows="4" />
                  <NqFieldDescription>{{ t.optionsHint }}</NqFieldDescription>
                </NqField>
              </NqCardContent>
            </NqCard>
          </div>

          <aside :aria-label="t.preview" class="min-w-0">
            <NqCard>
              <NqCardHeader>
                <NqCardTitle as="h3" class="text-body font-medium">{{ t.preview }}</NqCardTitle>
              </NqCardHeader>
              <NqCardContent>
                <NqPublicForm :form="previewForm" preview :locale="locale" />
              </NqCardContent>
            </NqCard>
          </aside>
        </div>
      </NqTabsPanel>

      <NqTabsPanel value="logic" class="flex flex-col gap-4 pt-4">
        <p class="text-body-sm text-muted-foreground">{{ t.logicIntro }}</p>
        <p v-if="form.fields.length === 0" class="text-body-sm text-muted-foreground">{{ t.ruleFieldsMissing }}</p>
        <p v-if="form.rules.length === 0 && form.fields.length > 0" class="text-body-sm text-muted-foreground">{{ t.noRules }}</p>
        <NqCard v-for="(rule, i) in form.rules" :key="i">
          <NqCardHeader class="flex-row items-center justify-between gap-2">
            <NqCardTitle as="h3" class="text-body font-medium">{{ t.rule(String(i + 1)) }}</NqCardTitle>
            <NqButton type="button" variant="ghost" size="sm" @click="update({ rules: form.rules.filter((_, j) => j !== i) })">
              <Trash2 aria-hidden="true" />
              {{ t.removeRule }}
            </NqButton>
          </NqCardHeader>
          <NqCardContent>
            <NqRuleBuilder :events="events" :fields="ruleFields" :action-types="actionTypes" :model-value="rule" @update:model-value="setRule(i, $event)" />
          </NqCardContent>
        </NqCard>
        <div v-if="form.fields.length > 0">
          <NqButton type="button" variant="secondary" @click="update({ rules: [...form.rules, newFormRule('show')] })">
            <Plus aria-hidden="true" />
            {{ t.addRule }}
          </NqButton>
        </div>
      </NqTabsPanel>

      <NqTabsPanel value="settings" class="flex max-w-2xl flex-col gap-5 pt-4">
        <NqField :invalid="originError !== null">
          <NqFieldLabel>{{ t.origins }}</NqFieldLabel>
          <NqTagInput
            :model-value="form.allowedOrigins"
            :placeholder="t.originsAdd"
            :input-props="{ dir: 'ltr', 'aria-label': t.origins }"
            :validate="validateOrigin"
            @reject="onReject"
            @update:model-value="setOrigins"
          />
          <NqFieldDescription>{{ t.originsHint }}</NqFieldDescription>
          <NqStatus :tone="closed ? 'warning' : 'success'">{{ closed ? t.originsClosed : t.originsOpen(String(form.allowedOrigins.length)) }}</NqStatus>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.originTest }}</NqFieldLabel>
          <div class="flex flex-wrap items-center gap-3">
            <NqInput v-model="probe" ltr class="max-w-72" placeholder="https://www.example.com" />
            <NqStatus v-if="probeResult !== null" :tone="probeResult ? 'success' : 'danger'">{{ probeResult ? t.originTestAllowed : t.originTestBlocked }}</NqStatus>
          </div>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.thanksEn }}</NqFieldLabel>
          <NqTextarea :rows="2" :model-value="form.thanksEn" @update:model-value="update({ thanksEn: String($event) })" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.thanksAr }}</NqFieldLabel>
          <NqTextarea :rows="2" dir="rtl" :model-value="form.thanksAr" @update:model-value="update({ thanksAr: String($event) })" />
        </NqField>
        <NqField>
          <label class="flex items-center gap-2 text-body">
            <NqSwitch :model-value="form.honeypot" @update:model-value="update({ honeypot: $event })" />
            {{ t.honeypot }}
          </label>
          <NqFieldDescription>{{ t.honeypotHint }}</NqFieldDescription>
        </NqField>
      </NqTabsPanel>

      <NqTabsPanel value="embed" class="flex max-w-2xl flex-col gap-4 pt-4">
        <p class="text-body-sm text-muted-foreground">{{ t.embedIntro }}</p>
        <NqStatus v-if="closed" tone="warning">{{ t.embedClosed }}</NqStatus>
        <div class="flex gap-2">
          <NqButton
            v-for="k in (['iframe', 'script'] as const)"
            :key="k"
            type="button"
            size="sm"
            variant="secondary"
            :aria-pressed="style === k"
            :data-selected="style === k ? '' : undefined"
            class="data-selected:border-primary data-selected:bg-nq-selected"
            @click="style = k"
          >
            {{ t[k] }}
          </NqButton>
        </div>
        <NqCodeBlock :code="snippet" language="html" />
        <div class="flex items-center gap-2">
          <NqCopyButton variant="secondary" :value="publicLink" :label="t.copyLink" />
          <bdi dir="ltr" class="truncate text-body-sm text-muted-foreground">{{ publicLink }}</bdi>
        </div>
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>
