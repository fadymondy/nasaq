<script setup lang="ts">
import { NqBadge } from "../badge";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqRepeater } from "../repeater";
import { NqSwitch } from "../switch";
import { NqWorkflowFieldEditor, NqWorkflowNodePicker } from "../workflow-canvas";
import type { StepContext } from "./step-context";
import { newStep, stepSummary, stepUid, type StepNode } from "./step-model";
import NqStepList from "./NqStepList.vue";

// One ordered, sortable list of steps; a nestable step holds another one (this component again).
const props = defineProps<{ ctx: StepContext; parentName?: string }>();
const steps = defineModel<StepNode[]>({ required: true });

const nameOf = (s: StepNode) => s.label || props.ctx.types.get(s.type)?.label || props.ctx.t.newStep;
const cloneStep = (s: StepNode): StepNode => ({ ...structuredClone({ ...s, children: undefined }), id: stepUid(), children: s.children?.map(cloneStep) });
const issueCount = (s: StepNode) => props.ctx.issues.filter((i) => i.id === s.id).length;
const missing = (s: StepNode) => new Set(props.ctx.issues.filter((i) => i.id === s.id && i.code === "missing-field").map((i) => i.field as string));
</script>

<template>
  <NqRepeater
    v-model="steps"
    :create-item="() => newStep()"
    :clone-item="cloneStep"
    duplicable
    :disabled="props.ctx.disabled"
    :label="props.parentName ? props.ctx.t.innerList(props.parentName) : props.ctx.t.stepList"
    :add-label="props.parentName ? props.ctx.t.addChild : props.ctx.t.addStep"
    :labels="{ empty: props.parentName ? props.ctx.t.innerEmpty : props.ctx.t.empty, list: props.parentName ? props.ctx.t.innerList(props.parentName) : props.ctx.t.stepList, add: props.parentName ? props.ctx.t.addChild : props.ctx.t.addStep, row: () => props.ctx.t.newStep }"
    :row-title="nameOf"
    :row-label="nameOf"
    :row-summary="(s) => stepSummary(s, props.ctx.types.get(s.type))"
  >
    <template #empty>
      <p class="text-body-sm text-muted-foreground">{{ props.parentName ? props.ctx.t.innerEmpty : props.ctx.t.empty }}</p>
    </template>
    <template #meta="{ item }">
      <NqBadge v-if="item.continueOnFailure" variant="outline">{{ props.ctx.t.continueOn }}</NqBadge>
      <NqBadge v-if="issueCount(item) > 0" variant="danger">{{ issueCount(item) }}</NqBadge>
    </template>
    <template #default="{ item, update }">
      <div v-if="!item.type" class="overflow-hidden rounded-control border border-border">
        <NqWorkflowNodePicker
          :types="props.ctx.pickable"
          :categories="props.ctx.categories"
          :after-name="props.parentName"
          :labels="props.ctx.canvasLabels"
          class="max-h-96"
          @pick="(picked) => update((cur) => ({ ...cur, type: picked.id, config: { ...(picked.defaults ?? {}) } }))"
          @close="steps = steps.filter((x) => x.id !== item.id)"
        />
      </div>
      <div v-else class="flex flex-col gap-4" :data-step-id="item.id">
        <template v-if="props.ctx.types.get(item.type)">
          <NqField>
            <NqFieldLabel>{{ props.ctx.t.name }}</NqFieldLabel>
            <NqInput :model-value="item.label ?? ''" :placeholder="props.ctx.types.get(item.type)?.label" @update:model-value="(v) => update((cur) => ({ ...cur, label: String(v ?? '') }))" />
            <NqFieldDescription>{{ props.ctx.t.nameHelp }}</NqFieldDescription>
          </NqField>
          <p v-if="(props.ctx.types.get(item.type)?.fields?.length ?? 0) === 0" class="text-body-sm text-muted-foreground">{{ props.ctx.t.noFields }}</p>
          <NqWorkflowFieldEditor
            v-for="f in props.ctx.types.get(item.type)?.fields ?? []"
            :key="f.name"
            :def="f"
            :value="item.config[f.name]"
            :disabled="props.ctx.disabled"
            :invalid="missing(item).has(f.name)"
            :required-label="props.ctx.t.required"
            @change="(v) => update((cur) => ({ ...cur, config: { ...cur.config, [f.name]: v } }))"
          />
        </template>
        <p v-else class="text-body-sm text-nq-danger-text">{{ props.ctx.t.unknownType }}</p>
        <NqField class="flex-row items-center justify-between gap-3">
          <div class="min-w-0">
            <NqFieldLabel>{{ props.ctx.t.continueOn }}</NqFieldLabel>
            <NqFieldDescription>{{ props.ctx.t.continueHelp }}</NqFieldDescription>
          </div>
          <NqSwitch :model-value="Boolean(item.continueOnFailure)" :disabled="props.ctx.disabled" :aria-label="props.ctx.t.continueOn" @update:model-value="(v: boolean) => update((cur) => ({ ...cur, continueOnFailure: v }))" />
        </NqField>
        <div v-if="props.ctx.nestable.has(item.type)" class="rounded-control border border-dashed border-border p-3">
          <NqStepList :model-value="item.children ?? []" :ctx="props.ctx" :parent-name="nameOf(item)" @update:model-value="(children: StepNode[]) => update((cur) => ({ ...cur, children }))" />
        </div>
      </div>
    </template>
  </NqRepeater>
</template>
