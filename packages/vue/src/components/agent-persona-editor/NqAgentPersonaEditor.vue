<script setup lang="ts">
import { Plus, RotateCcw } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAiModelSelect } from "../ai-model-picker";
import { NqButton } from "../button";
import { NqColorPicker } from "../color-picker";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqIconPicker } from "../icon-picker";
import { NqMarkdown } from "../markdown";
import { formatNumber } from "../numeric";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTagInput } from "../tag-input";
import NqAgentPersonaPreview from "./NqAgentPersonaPreview.vue";
import { appendSection, countWords, isPersonaDirty, personaProblems, type PersonaProblem } from "./persona-math";
import { usePersonaStrings, type AgentPersona, type AgentPersonaEditorLabels, type AgentPersonaModel, type AgentPersonaSaveResult } from "./strings";

// Edit an AI agent profile: name, tagline, colour, icon, model, traits, greeting and the persona itself as Markdown with a
// write and preview switch and section shortcuts. A live card shows how it will look. It keeps a draft, tells you what is
// unsaved, and calls `onSave` with the whole persona.
interface Props {
  /** The saved persona. The editor keeps its own draft and compares it to this. */
  value: AgentPersona;
  /** Save the draft. Return `{ error }` (or throw) to keep it unsaved and show the message. */
  onSave: (draft: AgentPersona) => Promise<AgentPersonaSaveResult> | AgentPersonaSaveResult;
  /** Models to choose from. Leave out to hide the model field. */
  models?: readonly AgentPersonaModel[];
  /** Words offered while typing a trait. */
  traitSuggestions?: readonly string[];
  /** Longest persona text. Default 4000. 0 for no limit. */
  maxLength?: number;
  /** Hide the live preview card. */
  hidePreview?: boolean;
  disabled?: boolean;
  labels?: Partial<AgentPersonaEditorLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { maxLength: 4000, models: undefined, traitSuggestions: undefined });
/** Called on every edit with the draft. */
const emit = defineEmits<{ change: [draft: AgentPersona] }>();

const { locale, t } = usePersonaStrings(() => props.labels);
const uid = useId();
const draft = ref<AgentPersona>({ ...props.value });
const saved = ref<AgentPersona>({ ...props.value });
const saving = ref(false);
const message = ref<{ tone: "ok" | "error"; text: string } | null>(null);
const tried = ref(false);
const tab = ref<string>("write");
const area = ref<{ $el: HTMLTextAreaElement } | null>(null);

// A new saved value from outside replaces both the draft and the baseline.
watch(
  () => props.value,
  (next, prev) => {
    if (prev && !isPersonaDirty(next, prev)) return;
    draft.value = { ...next };
    saved.value = { ...next };
  },
);

const dirty = computed(() => isPersonaDirty(draft.value, saved.value));
const problems = computed(() => personaProblems(draft.value, props.maxLength));
const has = (p: PersonaProblem) => problems.value.includes(p);
const over = computed(() => props.maxLength > 0 && draft.value.persona.length > props.maxLength);

function edit(patch: Partial<AgentPersona>) {
  draft.value = { ...draft.value, ...patch };
  message.value = null;
  emit("change", draft.value);
}

async function submit() {
  tried.value = true;
  if (saving.value || problems.value.length > 0) return;
  saving.value = true;
  message.value = null;
  try {
    const result = await props.onSave(draft.value);
    if (result && result.error) message.value = { tone: "error", text: result.error };
    else {
      saved.value = draft.value;
      message.value = { tone: "ok", text: t.value.saved };
    }
  } catch (e) {
    message.value = { tone: "error", text: e instanceof Error && e.message ? e.message : t.value.saveFailed };
  } finally {
    saving.value = false;
  }
}

function revert() {
  draft.value = saved.value;
  tried.value = false;
  message.value = null;
  emit("change", saved.value);
}

function addSection(s: string) {
  edit({ persona: appendSection(draft.value.persona, s) });
  area.value?.$el?.focus();
}
</script>

<template>
  <form
    data-slot="agent-persona-editor"
    :aria-label="t.label"
    novalidate
    :class="cn('grid min-w-0 gap-6', !props.hidePreview && 'lg:grid-cols-[minmax(0,1fr)_18rem]', props.class)"
    @submit.prevent="submit"
  >
    <div class="flex min-w-0 flex-col gap-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <NqField class="sm:col-span-2" :invalid="tried && has('nameRequired')">
          <NqFieldLabel>{{ t.name }}</NqFieldLabel>
          <NqInput dir="auto" :model-value="draft.name" :disabled="props.disabled" :placeholder="t.namePlaceholder" @update:model-value="edit({ name: String($event ?? '') })" />
          <NqFieldError v-if="tried && has('nameRequired')" match>{{ t.nameRequired }}</NqFieldError>
        </NqField>
        <NqField class="sm:col-span-2">
          <NqFieldLabel>{{ t.tagline }}</NqFieldLabel>
          <NqInput dir="auto" :model-value="draft.tagline ?? ''" :disabled="props.disabled" :placeholder="t.taglinePlaceholder" @update:model-value="edit({ tagline: String($event ?? '') })" />
        </NqField>
        <div class="flex flex-col gap-1.5">
          <span :id="`${uid}-color`" class="text-label text-foreground">{{ t.color }}</span>
          <NqColorPicker :model-value="draft.color" :disabled="props.disabled" :locale="locale" :aria-label="t.color" @update:model-value="(color) => edit({ color: color ?? '' })" />
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-label text-foreground">{{ t.icon }}</span>
          <div>
            <NqIconPicker :model-value="draft.icon" :disabled="props.disabled" :recent-key="null" @update:model-value="(icon) => edit({ icon })" />
          </div>
        </div>
        <div v-if="props.models && props.models.length > 0" class="flex flex-col gap-1.5 sm:col-span-2">
          <span class="text-label text-foreground">{{ t.model }}</span>
          <NqAiModelSelect :models="props.models" :model-value="draft.model" :disabled="props.disabled" :label="t.model" @update:model-value="(model) => edit({ model })" />
        </div>
      </div>

      <NqField>
        <NqFieldLabel>{{ t.traits }}</NqFieldLabel>
        <NqTagInput :model-value="draft.traits" :disabled="props.disabled" :suggestions="props.traitSuggestions" :max-tags="8" :placeholder="t.traitsPlaceholder" @update:model-value="(traits) => edit({ traits })" />
        <NqFieldDescription>{{ t.traitsHint }}</NqFieldDescription>
      </NqField>

      <NqField>
        <NqFieldLabel>{{ t.greeting }}</NqFieldLabel>
        <NqInput dir="auto" :model-value="draft.greeting ?? ''" :disabled="props.disabled" @update:model-value="edit({ greeting: String($event ?? '') })" />
        <NqFieldDescription>{{ t.greetingHint }}</NqFieldDescription>
      </NqField>

      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div class="min-w-0">
            <span class="text-label text-foreground">{{ t.persona }}</span>
            <p class="text-caption text-muted-foreground">{{ t.personaHint }}</p>
          </div>
        </div>
        <NqTabs :model-value="tab" @update:model-value="(v) => (tab = String(v))">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <NqTabsList>
              <NqTabsTab value="write">{{ t.write }}</NqTabsTab>
              <NqTabsTab value="preview">{{ t.preview }}</NqTabsTab>
            </NqTabsList>
            <div v-if="tab === 'write'" class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="t.insert">
              <NqButton v-for="s in t.sections" :key="s" type="button" size="sm" variant="ghost" class="h-7 px-2 text-caption" :disabled="props.disabled" @click="addSection(s)">
                <Plus aria-hidden="true" />
                {{ s }}
              </NqButton>
            </div>
          </div>
          <NqTabsPanel value="write" class="mt-2">
            <NqTextarea
              ref="area"
              dir="auto"
              rows="12"
              :model-value="draft.persona"
              :disabled="props.disabled"
              :aria-label="t.persona"
              :aria-invalid="over || undefined"
              spellcheck="true"
              class="min-h-56 font-mono text-body-sm"
              @update:model-value="edit({ persona: $event ?? '' })"
            />
          </NqTabsPanel>
          <NqTabsPanel value="preview" class="mt-2 min-h-56 rounded-control border border-border bg-card p-4">
            <NqMarkdown v-if="draft.persona.trim()" :source="draft.persona" />
            <p v-else class="text-body-sm text-muted-foreground">{{ t.previewEmpty }}</p>
          </NqTabsPanel>
        </NqTabs>
        <p :class="cn('flex flex-wrap justify-between gap-2 text-caption', over ? 'text-nq-danger-text' : 'text-muted-foreground')">
          <span>{{ over ? t.personaTooLong(formatNumber(props.maxLength, locale)) : t.words(formatNumber(countWords(draft.persona), locale)) }}</span>
          <span v-if="props.maxLength > 0" class="tabular-nums">{{ t.chars(formatNumber(draft.persona.length, locale), formatNumber(props.maxLength, locale)) }}</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <NqButton type="submit" variant="primary" :loading="saving" :disabled="props.disabled || !dirty || (tried && problems.length > 0)">
          {{ saving ? t.saving : t.save }}
        </NqButton>
        <NqButton type="button" variant="ghost" :disabled="props.disabled || saving || !dirty" @click="revert">
          <RotateCcw aria-hidden="true" />
          {{ t.revert }}
        </NqButton>
        <span role="status" aria-live="polite" :class="cn('text-body-sm', message?.tone === 'error' ? 'text-nq-danger-text' : 'text-muted-foreground')">
          {{ message?.text ?? (dirty ? t.unsaved : "") }}
        </span>
      </div>
    </div>

    <aside v-if="!props.hidePreview" :aria-label="t.previewTitle" class="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:self-start">
      <h3 class="text-caption text-muted-foreground">{{ t.previewTitle }}</h3>
      <NqAgentPersonaPreview :persona="draft" :labels="props.labels" />
    </aside>
  </form>
</template>
