<script setup lang="ts">
import { ArrowDown, ArrowUp, OctagonX, Plus, RotateCcw, Trash2 } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { clampRollout, flagState, isValidFlagKey, normalizeWeights, type FeatureFlag, type FlagEnvironmentDef, type FlagState, type FlagVariant } from "../feature-flags";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { emptyRule, NqRuleBuilder, validateRule, type RuleActionType, type RuleDefinition, type RuleEvent, type RuleField } from "../rule-builder";
import { NqSlider } from "../slider";
import { NqStatus } from "../status";
import { NqSwitch } from "../switch";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import type { FlagAuditEntry } from "./flag-audit";
import NqFlagAuditHistory from "./NqFlagAuditHistory.vue";
import { STRINGS, type FeatureFlagDetailLabels } from "./strings";

type Result = void | { error?: string };

// One flag in full: the kill switch, an on/off switch and rollout slider per environment, targeting rules built with the
// rule builder (each serves a variant, first match wins), the variants and their weights, and the audit history.
const props = defineProps<{
  flag: FeatureFlag;
  environments: readonly FlagEnvironmentDef[];
  /** What targeting rules can test: the user's plan, country, email domain and so on. */
  fields: readonly RuleField[];
  audit?: readonly FlagAuditEntry[];
  /** Turns the flag on or off in one environment. Without it the switches are read only. */
  onToggle?: (environmentId: string, enabled: boolean) => Promise<Result> | Result;
  /** Saves a rollout percentage (0 to 100) once the slider is released. */
  onRolloutChange?: (environmentId: string, percent: number) => Promise<Result> | Result;
  onRulesChange?: (rules: RuleDefinition[]) => Promise<Result> | Result;
  onVariantsChange?: (variants: FlagVariant[]) => Promise<Result> | Result;
  /** Kills the flag everywhere. Without it the kill switch is hidden. */
  onKill?: (reason: string) => Promise<Result> | Result;
  onRestore?: () => Promise<Result> | Result;
  class?: HTMLAttributes["class"];
  labels?: Partial<FeatureFlagDetailLabels>;
}>();

const EVENT_ID = "evaluate";
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const tab = ref("environments");
const note = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const killing = ref(false);
const reason = ref("");
const drafts = ref<Record<string, number>>({});
const rules = ref<RuleDefinition[]>(props.flag.rules);
const variants = ref<FlagVariant[]>(props.flag.variants);
const busy = ref<string | null>(null);

watch(() => props.flag.rules, (v) => (rules.value = v));
watch(() => props.flag.variants, (v) => (variants.value = v));
watch(() => props.flag.environments, () => (drafts.value = {}));

const state = computed<FlagState>(() => flagState(props.flag, props.environments[props.environments.length - 1]?.id ?? ""));
const stateLabel = computed(() => ({ killed: t.value.stateKilled, on: t.value.stateOn, partial: t.value.statePartial, off: t.value.stateOff })[state.value]);
const stateTone = computed(() => (state.value === "killed" ? "danger" : state.value === "on" ? "success" : state.value === "partial" ? "warning" : "neutral"));

async function run(id: string, fn: () => Promise<Result> | Result, success = false) {
  busy.value = id;
  note.value = null;
  try {
    const out = await fn();
    if (out && out.error) note.value = { tone: "danger", text: out.error };
    else if (success) note.value = { tone: "success", text: t.value.saved };
  } catch {
    note.value = { tone: "danger", text: t.value.failed };
  } finally {
    busy.value = null;
  }
}

// Targeting rules: one event, one action that serves a variant.
const events = computed<RuleEvent[]>(() => [{ id: EVENT_ID, label: t.value.evaluated }]);
const actionTypes = computed<RuleActionType[]>(() => [
  variants.value.length > 0
    ? { id: "serve", label: t.value.serve, fields: [{ name: "variant", label: t.value.variantField, kind: "select", required: true, options: variants.value.map((v) => ({ value: v.key, label: v.label ?? v.key })) }], defaults: { variant: variants.value[0]!.key } }
    : { id: "serve", label: t.value.serveOn },
]);
const ruleFields = computed(() => [...props.fields]);
const rulesValid = computed(() => rules.value.every((r) => validateRule(r, props.fields, actionTypes.value).length === 0));
const rulesDirty = computed(() => JSON.stringify(rules.value) !== JSON.stringify(props.flag.rules));

function newRule(): RuleDefinition {
  const base = emptyRule();
  return { ...base, event: EVENT_ID, actions: [{ id: `a-${Date.now().toString(36)}`, type: "serve", config: variants.value[0] ? { variant: variants.value[0].key } : {} }] };
}
function moveRule(i: number, to: number) {
  if (to < 0 || to >= rules.value.length) return;
  const next = [...rules.value];
  const [r] = next.splice(i, 1);
  next.splice(to, 0, r!);
  rules.value = next;
}

// Variants
const shares = computed(() => normalizeWeights(variants.value.map((v) => v.weight)));
function keyError(v: FlagVariant, i: number): string | null {
  const keys = variants.value.map((x) => x.key);
  return !isValidFlagKey(v.key) ? t.value.keyInvalid : keys.indexOf(v.key) !== i ? t.value.keyDuplicate : null;
}
const variantsValid = computed(() => variants.value.every((v, i) => keyError(v, i) === null));
const variantsDirty = computed(() => JSON.stringify(variants.value) !== JSON.stringify(props.flag.variants));

function envState(id: string) {
  return props.flag.environments[id] ?? { enabled: false, rollout: 0 };
}
const first = (v: number | number[]) => (Array.isArray(v) ? (v[0] ?? 0) : v);
function onDraft(id: string, v: number | number[]) {
  drafts.value = { ...drafts.value, [id]: clampRollout(first(v)) };
}
function onCommit(id: string, v: number[]) {
  const pct = clampRollout(first(v));
  if (props.onRolloutChange && pct !== envState(id).rollout) void run(`rollout-${id}`, () => props.onRolloutChange!(id, pct));
}
function setKey(i: number, key: string) {
  variants.value = variants.value.map((x, j) => (j === i ? { ...x, key } : x));
}
function setWeight(i: number, raw: string | number | undefined) {
  variants.value = variants.value.map((x, j) => (j === i ? { ...x, weight: Math.max(0, Number(raw) || 0) } : x));
}
function confirmKill() {
  const r = reason.value.trim();
  killing.value = false;
  reason.value = "";
  if (props.onKill) void run("kill", () => props.onKill!(r));
}
</script>

<template>
  <div data-slot="feature-flag-detail" :class="cn('flex w-full flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <h2 dir="auto" class="text-heading-sm text-foreground">{{ props.flag.name }}</h2>
          <NqStatus :tone="stateTone">{{ stateLabel }}</NqStatus>
        </div>
        <bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{ props.flag.key }}</bdi>
        <p v-if="props.flag.description" dir="auto" class="max-w-prose text-body-sm text-muted-foreground">{{ props.flag.description }}</p>
      </div>
      <NqButton v-if="props.onKill && !props.flag.killed" variant="danger" @click="killing = true">
        <OctagonX aria-hidden="true" />
        {{ t.kill }}
      </NqButton>
    </div>

    <NqAlert v-if="props.flag.killed" tone="danger" :title="t.killedTitle">
      <template v-if="props.onRestore" #action>
        <NqButton size="sm" variant="secondary" :loading="busy === 'restore'" @click="run('restore', props.onRestore!)">
          <RotateCcw aria-hidden="true" />
          {{ t.restore }}
        </NqButton>
      </template>
      {{ t.killedBody }}
    </NqAlert>
    <NqAlert v-if="note" :tone="note.tone" dismissible @dismiss="note = null">{{ note.text }}</NqAlert>

    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="environments">{{ t.tabEnvironments }}</NqTabsTab>
        <NqTabsTab value="targeting">{{ t.tabTargeting }}</NqTabsTab>
        <NqTabsTab value="variants">{{ t.tabVariants }}</NqTabsTab>
        <NqTabsTab value="history">{{ t.tabHistory }}</NqTabsTab>
      </NqTabsList>

      <NqTabsPanel value="environments" class="pt-4">
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.envTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.envDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col divide-y divide-border">
            <div v-for="env in props.environments" :key="env.id" data-slot="flag-environment" class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div class="flex items-center justify-between gap-3">
                <span class="text-label text-foreground">{{ env.label }}</span>
                <label class="flex items-center gap-2 text-body-sm text-muted-foreground">
                  {{ t.enabled }}
                  <NqSwitch
                    :model-value="envState(env.id).enabled"
                    :disabled="!props.onToggle || props.flag.killed || busy === `toggle-${env.id}`"
                    :aria-label="`${env.label}: ${t.enabled}`"
                    @update:model-value="(on: boolean) => props.onToggle && run(`toggle-${env.id}`, () => props.onToggle!(env.id, on))"
                  />
                </label>
              </div>
              <NqSlider
                :label="t.rolloutOf(env.label)"
                :min="0"
                :max="100"
                :step="1"
                :model-value="drafts[env.id] ?? envState(env.id).rollout"
                :disabled="!props.onRolloutChange || props.flag.killed || !envState(env.id).enabled"
                :format="{ style: 'unit', unit: 'percent' }"
                @update:model-value="(v: number | number[]) => onDraft(env.id, v)"
                @value-commit="(v: number[]) => onCommit(env.id, v)"
              />
            </div>
            <p class="pt-4 text-caption text-muted-foreground">{{ t.rolloutHint }}</p>
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>

      <NqTabsPanel value="targeting" class="pt-4">
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.targetingTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.targetingDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-4">
            <p v-if="rules.length === 0" class="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ t.noRules }}</p>
            <section v-for="(rule, i) in rules" :key="i" :aria-label="t.rule(i + 1)" data-slot="flag-rule" class="flex flex-col gap-3 rounded-card border border-border p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-label text-foreground">{{ t.rule(i + 1) }}</span>
                <span v-if="props.onRulesChange" class="flex items-center">
                  <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveRuleUp(i + 1)" :disabled="i === 0" @click="moveRule(i, i - 1)">
                    <ArrowUp aria-hidden="true" />
                  </NqButton>
                  <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveRuleDown(i + 1)" :disabled="i === rules.length - 1" @click="moveRule(i, i + 1)">
                    <ArrowDown aria-hidden="true" />
                  </NqButton>
                  <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.removeRule(i + 1)" @click="rules = rules.filter((_, j) => j !== i)">
                    <Trash2 aria-hidden="true" />
                  </NqButton>
                </span>
              </div>
              <NqRuleBuilder :events="events" :fields="ruleFields" :action-types="actionTypes" :model-value="rule" :disabled="!props.onRulesChange" @update:model-value="(next: RuleDefinition) => (rules = rules.map((r, j) => (j === i ? next : r)))" />
            </section>
            <p v-if="!rulesValid" role="alert" class="text-body-sm text-danger">{{ t.fixRules }}</p>
          </NqCardContent>
          <NqCardFooter v-if="props.onRulesChange" class="justify-between gap-2">
            <NqButton type="button" variant="secondary" @click="rules = [...rules, newRule()]">
              <Plus aria-hidden="true" />
              {{ t.addRule }}
            </NqButton>
            <NqButton type="button" variant="primary" :disabled="!rulesDirty || !rulesValid" :loading="busy === 'rules'" @click="run('rules', () => props.onRulesChange!(rules), true)">{{ t.saveRules }}</NqButton>
          </NqCardFooter>
        </NqCard>
      </NqTabsPanel>

      <NqTabsPanel value="variants" class="pt-4">
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.variantsTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.variantsDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <p v-if="variants.length === 0" class="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ t.noVariants }}</p>
            <div v-for="(v, i) in variants" :key="i" data-slot="flag-variant" class="flex flex-wrap items-start gap-3">
              <NqField :invalid="keyError(v, i) !== null" class="min-w-40 flex-1">
                <NqFieldLabel>{{ t.variantKey }}</NqFieldLabel>
                <NqInput ltr :model-value="v.key" :disabled="!props.onVariantsChange" @update:model-value="(k) => setKey(i, String(k ?? ''))" />
                <span v-if="keyError(v, i)" role="alert" class="text-caption text-danger">{{ keyError(v, i) }}</span>
              </NqField>
              <NqField class="w-28">
                <NqFieldLabel>{{ t.variantWeight }}</NqFieldLabel>
                <NqInput ltr type="number" min="0" inputmode="numeric" :model-value="v.weight" :disabled="!props.onVariantsChange" @update:model-value="(w) => setWeight(i, w)" />
              </NqField>
              <div class="flex w-20 flex-col gap-1.5">
                <span class="text-label text-foreground">{{ t.variantShare }}</span>
                <span class="flex h-9 items-center text-body-sm text-muted-foreground">
                  <NqNum :value="(shares[i] ?? 0) / 100" :format="{ style: 'percent', maximumFractionDigits: 0 }" />
                </span>
              </div>
              <NqButton v-if="props.onVariantsChange" type="button" size="icon-sm" variant="ghost" class="mt-6" :aria-label="t.removeVariant(v.key)" @click="variants = variants.filter((_, j) => j !== i)">
                <Trash2 aria-hidden="true" />
              </NqButton>
            </div>
          </NqCardContent>
          <NqCardFooter v-if="props.onVariantsChange" class="justify-between gap-2">
            <NqButton type="button" variant="secondary" @click="variants = [...variants, { key: `variant-${variants.length + 1}`, weight: 1 }]">
              <Plus aria-hidden="true" />
              {{ t.addVariant }}
            </NqButton>
            <NqButton type="button" variant="primary" :disabled="!variantsDirty || !variantsValid" :loading="busy === 'variants'" @click="run('variants', () => props.onVariantsChange!(variants), true)">{{ t.saveVariants }}</NqButton>
          </NqCardFooter>
        </NqCard>
      </NqTabsPanel>

      <NqTabsPanel value="history" class="pt-4">
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.historyTitle }}</NqCardTitle>
          </NqCardHeader>
          <NqCardContent>
            <NqFlagAuditHistory :entries="props.audit ?? []" />
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>
    </NqTabs>

    <NqAlertDialog :open="killing" @update:open="(o: boolean) => !o && (killing = false)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.killTitle }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.killBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqField>
          <NqFieldLabel>{{ t.reasonLabel }}</NqFieldLabel>
          <NqInput v-model="reason" dir="auto" :placeholder="t.reasonPlaceholder" />
        </NqField>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="confirmKill">{{ t.killConfirm }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
