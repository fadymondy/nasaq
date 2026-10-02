<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsTab } from "../tabs";
import { ACTIVITY_ICONS, COMPOSABLE_KINDS, fromLocalInput, toLocalInput, validateActivity, type ActivityInput, type ComposableKind } from "./activity-logic";
import { useActivityLabels, type ActivityLabels, type ActivityResult } from "./strings";

// A small form to log a note, a call, a meeting or a task: the kind, a text, when (or due) and a duration for calls and meetings.
const props = withDefaults(
  defineProps<{
    /** Save the activity. Return `{ error }` to keep the form and show the message. */
    onSubmit: (input: ActivityInput) => Promise<ActivityResult>;
    /** Kinds offered, in order. Default note, call, meeting, task. */
    kinds?: readonly ComposableKind[];
    defaultKind?: ComposableKind;
    labels?: ActivityLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { kinds: () => COMPOSABLE_KINDS, defaultKind: undefined, labels: undefined },
);
const { t } = useActivityLabels(() => props.labels);
const kind = ref<ComposableKind>(props.defaultKind ?? props.kinds[0] ?? "note");
const body = ref("");
const when = ref(toLocalInput(new Date()));
const duration = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const timed = computed(() => kind.value === "call" || kind.value === "meeting");

async function submit() {
  const minutes = timed.value && duration.value.trim() !== "" ? Number(duration.value) : undefined;
  const at = fromLocalInput(when.value);
  const problem = validateActivity({ kind: kind.value, body: body.value, at, durationMinutes: minutes ?? null });
  if (problem) {
    error.value = t.value.errors[problem];
    return;
  }
  busy.value = true;
  error.value = null;
  const result = await props.onSubmit({ kind: kind.value, body: body.value.trim(), at: at as Date, ...(minutes !== undefined ? { durationMinutes: minutes } : {}) });
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  body.value = "";
  duration.value = "";
  when.value = toLocalInput(new Date());
}
</script>

<template>
  <form data-slot="activity-composer" novalidate :class="cn('flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3', props.class)" @submit.prevent="submit">
    <NqTabs :model-value="kind" @update:model-value="(v) => (kind = v as ComposableKind)">
      <NqTabsList :aria-label="t.kindPicker">
        <NqTabsTab v-for="k in props.kinds" :key="k" :value="k">
          <component :is="ACTIVITY_ICONS[k]" aria-hidden="true" />
          {{ t.kinds[k] }}
        </NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>
    </NqTabs>
    <NqField>
      <NqFieldLabel class="sr-only">{{ t.bodyLabel[kind] }}</NqFieldLabel>
      <NqTextarea v-model="body" :rows="3" :placeholder="t.bodyHint[kind]" :disabled="busy" dir="auto" />
    </NqField>
    <div class="flex flex-wrap items-end gap-3">
      <NqField class="min-w-44 flex-1">
        <NqFieldLabel>{{ t.whenLabel[kind] }}</NqFieldLabel>
        <NqInput v-model="when" type="datetime-local" ltr :disabled="busy" />
      </NqField>
      <NqField v-if="timed" class="w-40">
        <NqFieldLabel>{{ t.duration }}</NqFieldLabel>
        <NqInput v-model="duration" type="number" ltr min="0" max="1440" inputmode="numeric" :disabled="busy" />
      </NqField>
      <NqButton type="submit" variant="primary" :loading="busy">{{ t.submit[kind] }}</NqButton>
    </div>
    <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
  </form>
</template>
