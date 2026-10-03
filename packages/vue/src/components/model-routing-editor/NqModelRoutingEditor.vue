<script setup lang="ts">
import { CircleAlert, Cloud, Plus, Save, Server, Trash2, Undo2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldError, NqFieldLabel } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqRoutingRegisterDialog from "./NqRoutingRegisterDialog.vue";
import { modelsFor, routingEquals, routingIssues, type RoutingRoute, type RoutingValue } from "./routing-math";
import { useLabels, type ModelRoutingEditorLabels } from "./strings";
import type { RegisterProviderInput, RoutingModel, RoutingProvider, RoutingResult, RoutingTaskClass } from "./types";

// Chooses which model handles each task class, with a fallback, and manages the providers and nodes that run them:
// automatic routing on or off, a route table, modality chips per provider, an active backend switch and a register
// dialog. It edits a value (`v-model`); `onSave`, `onRegisterProvider` and `onRemoveProvider` do the persisting.
interface Props {
  taskClasses: readonly RoutingTaskClass[];
  models: readonly RoutingModel[];
  providers: readonly RoutingProvider[];
  modelValue?: RoutingValue;
  defaultValue?: RoutingValue;
  /** Persist the routing. Return `{ error }` (or throw) to show a failure. Adds the footer. */
  onSave?: (value: RoutingValue) => Promise<RoutingResult> | RoutingResult;
  /** Register a provider. Add it to `providers` when this resolves; return `{ error }` to keep the dialog open. Without it the button is hidden. */
  onRegisterProvider?: (input: RegisterProviderInput) => Promise<RoutingResult> | RoutingResult;
  /** Remove a provider. Without it the remove buttons are hidden. */
  onRemoveProvider?: (id: string) => Promise<RoutingResult> | RoutingResult;
  disabled?: boolean;
  labels?: ModelRoutingEditorLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  onSave: undefined,
  onRegisterProvider: undefined,
  onRemoveProvider: undefined,
  disabled: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: RoutingValue] }>();

const NONE = "__none__";
const t = useLabels(() => props.labels);
const id = useId();
const initial: RoutingValue = props.defaultValue ?? { auto: true, routes: {}, backend: props.providers[0]?.id };
const inner = ref<RoutingValue>(initial);
const baseline = ref<RoutingValue>(props.modelValue ?? initial);
const current = computed(() => props.modelValue ?? inner.value);
const submitted = ref(false);
const busy = ref(false);
const failure = ref<string | null>(null);
const justSaved = ref(false);
const open = ref(false);

const issues = computed(() => routingIssues(current.value, props.taskClasses, props.models));
const issueOf = (taskId: string) => issues.value.find((i) => i.taskId === taskId)?.kind;
const dirty = computed(() => !routingEquals(current.value, baseline.value));

function commit(next: RoutingValue) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
  justSaved.value = false;
}
function setRoute(taskId: string, patch: RoutingRoute) {
  commit({ ...current.value, routes: { ...current.value.routes, [taskId]: { ...current.value.routes[taskId], ...patch } } });
}
function visibleIssue(taskId: string) {
  const k = issueOf(taskId);
  return submitted.value || k === "same" || k === "unknown" ? k : undefined;
}

async function submit() {
  submitted.value = true;
  if (issues.value.length > 0 || !props.onSave) return;
  busy.value = true;
  failure.value = null;
  let error: string | undefined;
  try {
    const r = await props.onSave(current.value);
    if (r && typeof r === "object" && r.error) error = r.error;
  } catch (e) {
    error = e instanceof Error && e.message ? e.message : t.value.failed;
  }
  busy.value = false;
  if (error) {
    failure.value = error;
    return;
  }
  baseline.value = current.value;
  submitted.value = false;
  justSaved.value = true;
}
function discard() {
  if (props.modelValue === undefined) inner.value = baseline.value;
  emit("update:modelValue", baseline.value);
  submitted.value = false;
  failure.value = null;
}
</script>

<template>
  <form data-slot="model-routing-editor" novalidate :class="cn('flex min-w-0 flex-col gap-4', props.class)" @submit.prevent="submit">
    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3" class="text-h3">{{ t.auto }}</NqCardTitle>
        <NqCardDescription :id="`${id}-auto-hint`">{{ t.autoHint }}</NqCardDescription>
        <NqCardAction>
          <NqSwitch :aria-label="t.auto" :aria-describedby="`${id}-auto-hint`" :model-value="current.auto" :disabled="props.disabled" @update:model-value="(auto: boolean) => commit({ ...current, auto })" />
        </NqCardAction>
      </NqCardHeader>
    </NqCard>

    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3" class="text-h3">{{ t.routes }}</NqCardTitle>
        <NqCardDescription>{{ t.routesHint }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <ul data-slot="routing-routes" class="flex flex-col divide-y divide-border">
          <li
            v-for="task in props.taskClasses"
            :key="task.id"
            data-slot="routing-route"
            :data-task="task.id"
            :data-invalid="visibleIssue(task.id) ? '' : undefined"
            class="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start"
          >
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="text-label text-foreground">{{ task.label }}</span>
              <span v-if="task.description" class="text-caption text-muted-foreground">{{ task.description }}</span>
              <NqBadge v-if="task.modality && task.modality !== 'text'" variant="neutral" class="mt-1 w-fit">{{ t[task.modality] }}</NqBadge>
            </div>
            <NqField :invalid="!!visibleIssue(task.id) && visibleIssue(task.id) !== 'same'" :disabled="props.disabled" class="min-w-0">
              <NqFieldLabel>{{ t.model }}</NqFieldLabel>
              <NqSelect :model-value="current.routes[task.id]?.model" :disabled="props.disabled" @update:model-value="(v) => setRoute(task.id, { model: v ? String(v) : undefined })">
                <NqSelectTrigger :aria-label="`${task.label}: ${t.model}`"><NqSelectValue :placeholder="t.choose" /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="m in modelsFor(task, props.models)" :key="m.id" :value="m.id"><bdi dir="ltr">{{ m.label }}</bdi></NqSelectItem>
                </NqSelectContent>
              </NqSelect>
              <NqFieldError v-if="visibleIssue(task.id) && visibleIssue(task.id) !== 'same'" match>{{ t[visibleIssue(task.id)!] }}</NqFieldError>
            </NqField>
            <NqField :invalid="visibleIssue(task.id) === 'same'" :disabled="props.disabled" class="min-w-0">
              <NqFieldLabel>{{ t.fallback }}</NqFieldLabel>
              <NqSelect :model-value="current.routes[task.id]?.fallback ?? NONE" :disabled="props.disabled" @update:model-value="(v) => setRoute(task.id, { fallback: v && v !== NONE ? String(v) : undefined })">
                <NqSelectTrigger :aria-label="`${task.label}: ${t.fallback}`"><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem :value="NONE">{{ t.none }}</NqSelectItem>
                  <NqSelectItem v-for="m in modelsFor(task, props.models)" :key="m.id" :value="m.id"><bdi dir="ltr">{{ m.label }}</bdi></NqSelectItem>
                </NqSelectContent>
              </NqSelect>
              <NqFieldError v-if="visibleIssue(task.id) === 'same'" match>{{ t.same }}</NqFieldError>
            </NqField>
          </li>
        </ul>
      </NqCardContent>
    </NqCard>

    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3" class="text-h3">{{ t.providers }}</NqCardTitle>
        <NqCardDescription>{{ t.providersHint }}</NqCardDescription>
        <NqCardAction v-if="props.onRegisterProvider">
          <NqButton size="sm" variant="secondary" :disabled="props.disabled" @click="open = true"><Plus />{{ t.add }}</NqButton>
        </NqCardAction>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <p v-if="props.providers.length === 0" class="text-body-sm text-muted-foreground">{{ t.noProviders }}</p>
        <template v-else>
          <div class="flex flex-col gap-1.5">
            <span :id="`${id}-backend`" class="text-label text-foreground">{{ t.backend }}</span>
            <NqToggleGroup :aria-labelledby="`${id}-backend`" :model-value="current.backend ? [current.backend] : []" :disabled="props.disabled" class="w-fit max-w-full flex-wrap" @update:model-value="(v) => v[0] && commit({ ...current, backend: v[0] })">
              <NqToggle v-for="p in props.providers" :key="p.id" :value="p.id"><bdi dir="ltr">{{ p.name }}</bdi></NqToggle>
            </NqToggleGroup>
          </div>
          <ul data-slot="routing-providers" class="flex flex-col divide-y divide-border">
            <li v-for="p in props.providers" :key="p.id" data-slot="routing-provider" :data-active="current.backend === p.id ? '' : undefined" class="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
              <component :is="p.kind === 'node' ? Server : Cloud" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <div class="flex min-w-0 flex-1 basis-48 flex-col">
                <span class="truncate text-label text-foreground"><bdi dir="ltr">{{ p.name }}</bdi></span>
                <span class="truncate text-caption text-muted-foreground">
                  {{ t[p.kind ?? "cloud"] }}<template v-if="p.endpoint">{{ " · " }}<bdi dir="ltr">{{ p.endpoint }}</bdi></template>
                </span>
              </div>
              <ul :aria-label="t.modalitiesOf(p.name)" class="flex flex-wrap gap-1">
                <li v-for="m in p.modalities" :key="m"><NqBadge variant="neutral">{{ t[m] }}</NqBadge></li>
              </ul>
              <NqBadge v-if="p.status" :variant="p.status === 'online' ? 'success' : 'danger'">{{ t[p.status] }}</NqBadge>
              <NqButton v-if="props.onRemoveProvider" size="icon-sm" variant="ghost" :aria-label="t.remove(p.name)" :disabled="props.disabled" @click="props.onRemoveProvider!(p.id)"><Trash2 /></NqButton>
            </li>
          </ul>
        </template>
      </NqCardContent>
    </NqCard>

    <NqAlert v-if="failure" tone="danger">{{ failure || t.failed }}</NqAlert>
    <NqAlert v-else-if="submitted && issues.length > 0" tone="warning" :icon="CircleAlert">{{ t.fixIssues }}</NqAlert>
    <div v-if="props.onSave" data-slot="routing-footer" class="flex flex-wrap items-center justify-end gap-2">
      <span role="status" class="me-auto text-body-sm text-muted-foreground">{{ dirty ? t.dirty : justSaved ? t.saved : "" }}</span>
      <NqButton variant="ghost" :disabled="!dirty || busy || props.disabled" @click="discard"><Undo2 />{{ t.discard }}</NqButton>
      <NqButton type="submit" variant="primary" :loading="busy" :disabled="!dirty || props.disabled"><Save />{{ t.save }}</NqButton>
    </div>

    <NqRoutingRegisterDialog v-if="props.onRegisterProvider" v-model:open="open" :providers="props.providers" :on-register="props.onRegisterProvider" :t="t" />
  </form>
</template>
