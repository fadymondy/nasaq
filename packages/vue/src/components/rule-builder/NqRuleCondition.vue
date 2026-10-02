<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";
import { computed } from "vue";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import type { RuleCtx } from "./context";
import { OPERATORS, retarget, UNARY, type RuleCondition, type RuleOperator } from "./rule-model";

// One condition row: field, operator, value and a remove button.
const props = defineProps<{ cond: RuleCondition; ctx: RuleCtx }>();
const emit = defineEmits<{ change: [cond: RuleCondition]; remove: [] }>();

const field = computed(() => props.ctx.fields.find((f) => f.id === props.cond.field));
const kind = computed(() => field.value?.kind ?? "text");
const ops = computed(() => OPERATORS[kind.value]);
const bad = computed(() => props.ctx.issues.filter((i) => i.id === props.cond.id).map((i) => i.code));
const unary = computed(() => UNARY.includes(props.cond.op));
const boolItems = computed(() => [
  { value: "true", label: props.ctx.t.yes },
  { value: "false", label: props.ctx.t.no },
]);
const valueItems = computed(() => (kind.value === "boolean" ? boolItems.value : (field.value?.options ?? [])));
const onInput = (v: string | number | undefined) => emit("change", { ...props.cond, value: String(v ?? "") });
</script>

<template>
  <li :data-condition="cond.id" class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,1fr)_auto]">
    <NqSelect :model-value="cond.field || undefined" :disabled="ctx.disabled" @update:model-value="(v) => emit('change', retarget(cond, ctx.fields.find((f) => f.id === v)))">
      <NqSelectTrigger :aria-label="ctx.t.field" :invalid="bad.includes('no-field')">
        <NqSelectValue :placeholder="ctx.t.chooseField" />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="f in ctx.fields" :key="f.id" :value="f.id">{{ f.label }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
    <NqButton variant="ghost" size="icon-sm" class="sm:order-last" :aria-label="ctx.t.removeCondition" :title="ctx.t.removeCondition" :disabled="ctx.disabled" @click="emit('remove')">
      <Trash2 aria-hidden="true" />
    </NqButton>
    <NqSelect :model-value="cond.op" :disabled="ctx.disabled || !field" @update:model-value="(v) => emit('change', { ...cond, op: v as RuleOperator })">
      <NqSelectTrigger :aria-label="ctx.t.operator" class="col-span-2 sm:col-span-1">
        <NqSelectValue />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="o in ops" :key="o" :value="o">{{ ctx.t.ops[o] }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
    <div class="col-span-2 min-w-0 sm:col-span-1">
      <template v-if="unary" />
      <NqSelect v-else-if="kind === 'select' || kind === 'boolean'" :model-value="cond.value || undefined" :disabled="ctx.disabled" @update:model-value="(v) => emit('change', { ...cond, value: String(v ?? '') })">
        <NqSelectTrigger :aria-label="ctx.t.value" :invalid="bad.includes('no-value')">
          <NqSelectValue />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="o in valueItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <NqInput
        v-else
        :aria-label="ctx.t.value"
        :aria-invalid="bad.includes('no-value') || undefined"
        :type="kind === 'number' ? 'number' : 'text'"
        :inputmode="kind === 'number' ? 'decimal' : undefined"
        :ltr="kind === 'number'"
        :model-value="cond.value"
        :disabled="ctx.disabled"
        @update:model-value="onInput"
      />
    </div>
  </li>
</template>
