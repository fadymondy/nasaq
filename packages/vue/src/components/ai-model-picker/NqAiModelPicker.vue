<script setup lang="ts">
import { TriangleAlert } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqField, NqFieldLabel } from "../field";
import { formatNumber } from "../numeric";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqAiModelSelect from "./NqAiModelSelect.vue";
import { resolveEffort } from "./model-picker-math";
import { STRINGS, useLabels, type AiModelPickerLabels } from "./strings";
import type { AiAgentOption, AiModel, AiModelSelection, AiModelTier } from "./types";

// Picks what runs an AI task: the model (with its tier, context window and price), the reasoning effort that model
// supports, and, when required, the agent or skill that runs it. Changing the model keeps the effort if the new model
// supports it. Model names are not translated; everything around them is.
interface Props {
  models: readonly AiModel[];
  /** Controlled selection (`v-model`). */
  modelValue?: AiModelSelection;
  defaultValue?: AiModelSelection;
  /** Agents or skills the run can be handed to. Omit to hide the field. */
  agents?: readonly AiAgentOption[];
  /** The run cannot start without an agent: the field is marked required and turns invalid until one is chosen. */
  agentRequired?: boolean;
  /** Names for effort ids that are not low, medium, high or max. */
  effortLabels?: Record<string, string>;
  /** `cards` (default) lists every model with its details; `compact` is one row of controls for a toolbar. */
  variant?: "cards" | "compact";
  /** ISO 4217 code for prices. Default USD, or SAR in Arabic. */
  currency?: string;
  disabled?: boolean;
  labels?: AiModelPickerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  agents: undefined,
  agentRequired: false,
  effortLabels: undefined,
  variant: "cards",
  currency: undefined,
  disabled: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: AiModelSelection] }>();

const currency = useCurrency(() => props.currency);
const { locale, t } = useLabels(() => props.labels);

const first = props.defaultValue?.model ?? props.models[0]?.id;
const inner = ref<AiModelSelection>({
  model: first,
  effort: resolveEffort(
    props.models.find((m) => m.id === first),
    props.defaultValue?.effort,
  ),
  agent: props.defaultValue?.agent,
});
const touched = ref(false);
const sel = computed(() => props.modelValue ?? inner.value);
const current = computed(() => props.models.find((m) => m.id === sel.value.model));

function commit(next: AiModelSelection) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
}
function chooseModel(id: string) {
  const model = props.models.find((m) => m.id === id);
  commit({ ...sel.value, model: id, effort: resolveEffort(model, sel.value.effort) });
}
// The toggle group lets the pressed effort be pressed off; the picker always keeps one, so a new key resets it.
const effortKey = ref(0);
function chooseEffort(v: string[]) {
  if (v[0]) commit({ ...sel.value, effort: v[0] });
  else effortKey.value++;
}
function chooseAgent(id: string | number | null) {
  if (id != null) commit({ ...sel.value, agent: String(id) });
}
function onAgentOpen(open: boolean) {
  if (!open) touched.value = true;
}

const effortName = (id: string): string => props.effortLabels?.[id] ?? (id in STRINGS.en ? String((t.value as unknown as Record<string, unknown>)[id]) : id);
const money = (n: number) => formatNumber(n, locale.value, { style: "currency", currency: currency.value, minimumFractionDigits: 0, maximumFractionDigits: 2 });
const tierLabel = (tier: AiModelTier) => ({ flagship: t.value.flagship, balanced: t.value.balanced, fast: t.value.fast })[tier];
const compactNumber = (n: number) => formatNumber(n, locale.value, { notation: "compact" });

const agentMissing = computed(() => props.agentRequired && !sel.value.agent);
const efforts = computed(() => current.value?.efforts ?? []);
const showAgent = computed(() => !!props.agents && props.agents.length > 0);
const agentDescription = computed(() => props.agents?.find((a) => a.id === sel.value.agent)?.description);
</script>

<template>
  <div v-if="props.variant === 'compact'" data-slot="ai-model-picker" data-variant="compact" :class="cn('flex flex-wrap items-center gap-2', props.class)">
    <NqAiModelSelect :models="props.models" :model-value="sel.model" :disabled="props.disabled" :labels="props.labels" class="h-control-sm w-auto min-w-40" @update:model-value="chooseModel" />
    <NqToggleGroup v-if="efforts.length" :key="effortKey" :aria-label="t.effort" :disabled="props.disabled" :model-value="sel.effort ? [sel.effort] : []" @update:model-value="chooseEffort">
      <NqToggle v-for="e in efforts" :key="e" :value="e">{{ effortName(e) }}</NqToggle>
    </NqToggleGroup>
    <NqField v-if="showAgent" :invalid="agentMissing && touched" :disabled="props.disabled" class="w-auto min-w-40">
      <NqSelect :model-value="sel.agent ?? null" :required="props.agentRequired" @update:model-value="chooseAgent" @update:open="onAgentOpen">
        <NqSelectTrigger data-slot="ai-agent-select" :aria-label="t.agent" class="h-control-sm">
          <NqSelectValue :placeholder="t.agentPlaceholder" />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="a in props.agents" :key="a.id" :value="a.id">{{ a.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <span v-if="agentMissing && touched" role="alert" class="inline-flex items-center gap-1 text-caption text-nq-danger-text">
        <TriangleAlert aria-hidden="true" class="size-3.5" />
        {{ t.agentMissing }}
      </span>
    </NqField>
  </div>

  <div v-else data-slot="ai-model-picker" data-variant="cards" :class="cn('flex flex-col gap-5', props.class)">
    <NqRadioGroup :aria-label="t.models" :model-value="sel.model ?? ''" :disabled="props.disabled" class="grid gap-2 sm:grid-cols-2" @update:model-value="chooseModel">
      <NqRadioCard v-for="m in props.models" :key="m.id" :value="m.id" :disabled="m.disabled">
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <bdi dir="ltr">{{ m.label }}</bdi>
          <NqBadge v-if="m.tier" :variant="m.tier === 'flagship' ? 'accent' : 'neutral'">{{ tierLabel(m.tier) }}</NqBadge>
        </span>
        <template #description>
          <span class="flex flex-col gap-1">
            <span v-if="m.description">{{ m.description }}</span>
            <span class="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
              <bdi v-if="m.provider" dir="ltr">{{ m.provider }}</bdi>
              <span v-if="m.contextWindow">{{ t.context(compactNumber(m.contextWindow)) }}</span>
              <span v-if="m.price">{{ t.price(money(m.price.input), money(m.price.output)) }}</span>
            </span>
          </span>
        </template>
      </NqRadioCard>
    </NqRadioGroup>
    <div v-if="efforts.length" class="flex flex-col gap-1.5">
      <span class="text-label text-foreground">{{ t.effort }}</span>
      <NqToggleGroup :key="effortKey" :aria-label="t.effort" :disabled="props.disabled" :model-value="sel.effort ? [sel.effort] : []" @update:model-value="chooseEffort">
        <NqToggle v-for="e in efforts" :key="e" :value="e">{{ effortName(e) }}</NqToggle>
      </NqToggleGroup>
      <span class="text-caption text-muted-foreground">{{ t.effortHint }}</span>
    </div>
    <NqField v-if="showAgent" :invalid="agentMissing && touched" :disabled="props.disabled">
      <NqFieldLabel>
        {{ t.agent }}
        <span v-if="props.agentRequired" class="ms-1.5 text-caption text-muted-foreground">({{ t.agentRequired }})</span>
      </NqFieldLabel>
      <NqSelect :model-value="sel.agent ?? null" :required="props.agentRequired" @update:model-value="chooseAgent" @update:open="onAgentOpen">
        <NqSelectTrigger data-slot="ai-agent-select" :aria-label="t.agent">
          <NqSelectValue :placeholder="t.agentPlaceholder" />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="a in props.agents" :key="a.id" :value="a.id">{{ a.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <span v-if="agentMissing && touched" role="alert" class="inline-flex items-center gap-1 text-caption text-nq-danger-text">
        <TriangleAlert aria-hidden="true" class="size-3.5" />
        {{ t.agentMissing }}
      </span>
      <span v-else class="text-caption text-muted-foreground">{{ agentDescription }}</span>
    </NqField>
  </div>
</template>
