<script setup lang="ts">
import { Zap } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqField, NqFieldDescription, NqFieldLabel } from "../field";
import { NqRepeater } from "../repeater";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqWorkflowFieldEditor } from "../workflow-canvas";
import type { RuleCtx } from "./context";
import NqRuleGroup from "./NqRuleGroup.vue";
import { countConditions, describeRule, emptyRule, ruleUid, validateRule, type RuleAction, type RuleActionType, type RuleDefinition, type RuleEvent, type RuleField, type RuleIssue } from "./rule-model";
import { ruleStrings, type RuleBuilderLabels } from "./rule-strings";

/**
 * "When this happens, if these are true, then do these": pick the event, build conditions as nested all-of and
 * any-of groups, and stack the actions. A live sentence reads the rule back in plain language, and what is still
 * missing is listed. It has no backend: it edits a `RuleDefinition` you store and evaluate.
 */
interface Props {
  /** Events that can start a rule. */
  events: RuleEvent[];
  /** Fields conditions can test. */
  fields: RuleField[];
  /** Actions a rule can take. */
  actionTypes: RuleActionType[];
  /** The rule (`v-model`). */
  modelValue?: RuleDefinition;
  /** Uncontrolled initial rule. */
  defaultValue?: RuleDefinition;
  /** Deepest nesting of condition groups. Default 3. */
  maxDepth?: number;
  disabled?: boolean;
  /** Override any English or Arabic string, including operator names. */
  labels?: RuleBuilderLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, maxDepth: 3, disabled: false, labels: undefined });
const emit = defineEmits<{
  "update:modelValue": [rule: RuleDefinition];
  /** Every change, with what is still wrong, so a Save button can stay off until `issues` is empty. */
  change: [rule: RuleDefinition, issues: RuleIssue[]];
}>();
defineSlots<{
  /** Extra content under the summary sentence, such as a name field or a Save button. */
  header?(): unknown;
}>();

const nq = useNasaq();
const t = computed(() => ({ ...ruleStrings(nq.locale.value), ...props.labels }) as ReturnType<typeof ruleStrings>);
const uid = useId();
const local = ref<RuleDefinition>(props.defaultValue ?? emptyRule());
const rule = computed(() => props.modelValue ?? local.value);
const issues = computed(() => validateRule(rule.value, props.fields, props.actionTypes));

function commit(next: RuleDefinition) {
  if (props.modelValue === undefined) local.value = next;
  emit("update:modelValue", next);
  emit("change", next, validateRule(next, props.fields, props.actionTypes));
}

const ctx = computed<RuleCtx>(() => ({ fields: props.fields, t: t.value, maxDepth: props.maxDepth, disabled: props.disabled, issues: issues.value }));
const sentence = computed(() =>
  describeRule(rule.value, props.fields, props.events, props.actionTypes, {
    when: t.value.sentence.when,
    ifWord: t.value.sentence.ifWord,
    then: t.value.sentence.then,
    ops: t.value.ops,
    noConditions: t.value.sentence.noConditions,
    join: (j) => (j === "and" ? t.value.sentence.and : t.value.sentence.or),
  }),
);
const eventInfo = computed(() => props.events.find((e) => e.id === rule.value.event));
const messages = computed(() => {
  const list = issues.value.map((i) => {
    switch (i.code) {
      case "no-event":
        return t.value.issueEvent;
      case "no-actions":
        return t.value.issueActions;
      case "no-field":
        return t.value.issueField;
      case "no-value":
        return t.value.issueValue;
      default: {
        const action = rule.value.actions.find((a) => a.id === i.id);
        const def = props.actionTypes.find((x) => x.id === action?.type)?.fields?.find((f) => f.name === i.field);
        return t.value.issueActionField(def?.label ?? i.field ?? "");
      }
    }
  });
  return [...new Set(list)];
});
const typeOf = (a: RuleAction) => props.actionTypes.find((x) => x.id === a.type);
const missingFor = (a: RuleAction) => new Set(issues.value.filter((i) => i.id === a.id && i.code === "action-field").map((i) => i.field as string));
const rowName = (a: RuleAction, i: number) => typeOf(a)?.label ?? t.value.actionRow(String(i + 1));
const newAction = (): RuleAction => ({ id: ruleUid("a"), type: "", config: {} });
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div v-bind="$attrs" data-slot="rule-builder" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <section :aria-label="t.summary" data-slot="rule-summary" class="rounded-card border border-border bg-nq-surface-soft p-4">
      <p class="flex items-start gap-2 text-body text-foreground" aria-live="polite">
        <Zap aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-primary" />
        <span dir="auto">{{ sentence }}</span>
      </p>
      <slot name="header" />
    </section>

    <NqAlert v-if="messages.length > 0" tone="warning" :title="t.problems(String(messages.length))">
      <ul class="mt-1 list-disc ps-5 text-body-sm">
        <li v-for="m in messages" :key="m">{{ m }}</li>
      </ul>
    </NqAlert>

    <section :aria-labelledby="`${uid}-when`" class="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
      <div class="flex items-center gap-2">
        <NqBadge variant="brand">1</NqBadge>
        <h3 :id="`${uid}-when`" class="text-h4 text-foreground">{{ t.when }}</h3>
      </div>
      <NqField :invalid="issues.some((i) => i.code === 'no-event')">
        <NqFieldLabel class="sr-only">{{ t.when }}</NqFieldLabel>
        <NqSelect :model-value="rule.event || undefined" :disabled="props.disabled" @update:model-value="(v) => commit({ ...rule, event: String(v ?? '') })">
          <NqSelectTrigger :aria-label="t.when">
            <NqSelectValue :placeholder="t.chooseEvent" />
          </NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="e in props.events" :key="e.id" :value="e.id">{{ e.label }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
        <NqFieldDescription>{{ eventInfo?.description ?? t.whenHelp }}</NqFieldDescription>
      </NqField>
    </section>

    <section :aria-labelledby="`${uid}-if`" class="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
      <div class="flex items-center gap-2">
        <NqBadge variant="brand">2</NqBadge>
        <h3 :id="`${uid}-if`" class="text-h4 text-foreground">{{ t.ifTitle }}</h3>
        <span class="text-caption text-muted-foreground tabular-nums">{{ countConditions(rule.conditions) }}</span>
      </div>
      <p class="text-body-sm text-muted-foreground">{{ t.ifHelp }}</p>
      <NqRuleGroup :group="rule.conditions" :root="rule.conditions" :ctx="ctx" :depth="1" @change="(conditions) => commit({ ...rule, conditions })" />
    </section>

    <section :aria-labelledby="`${uid}-then`" class="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
      <div class="flex items-center gap-2">
        <NqBadge variant="brand">3</NqBadge>
        <h3 :id="`${uid}-then`" class="text-h4 text-foreground">{{ t.thenTitle }}</h3>
      </div>
      <p class="text-body-sm text-muted-foreground">{{ t.thenHelp }}</p>
      <NqRepeater
        :model-value="rule.actions"
        :create-item="newAction"
        :disabled="props.disabled"
        :label="t.actions"
        :add-label="t.addAction"
        :labels="{ list: t.actions, add: t.addAction, empty: t.actionsEmpty, row: (n: string) => t.actionRow(n) }"
        :row-title="rowName"
        :row-label="rowName"
        @update:model-value="(actions: RuleAction[]) => commit({ ...rule, actions })"
      >
        <template #empty>
          <p class="text-body-sm text-muted-foreground">{{ t.actionsEmpty }}</p>
        </template>
        <template #default="{ item: a, update }">
          <div class="flex flex-col gap-4">
            <NqField>
              <NqFieldLabel>{{ t.actionType }}</NqFieldLabel>
              <NqSelect
                :model-value="a.type || undefined"
                :disabled="props.disabled"
                @update:model-value="(v) => update({ ...a, type: String(v ?? ''), config: { ...(props.actionTypes.find((x) => x.id === v)?.defaults ?? {}) } })"
              >
                <NqSelectTrigger :aria-label="t.actionType">
                  <NqSelectValue :placeholder="t.chooseAction" />
                </NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="x in props.actionTypes" :key="x.id" :value="x.id">{{ x.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
              <NqFieldDescription v-if="typeOf(a)?.description">{{ typeOf(a)?.description }}</NqFieldDescription>
            </NqField>
            <NqWorkflowFieldEditor
              v-for="f in typeOf(a)?.fields ?? []"
              :key="f.name"
              :def="f"
              :value="a.config[f.name]"
              :disabled="props.disabled"
              :invalid="missingFor(a).has(f.name)"
              :required-label="t.required"
              @change="(v) => update({ ...a, config: { ...a.config, [f.name]: v } })"
            />
          </div>
        </template>
      </NqRepeater>
    </section>
  </div>
</template>
