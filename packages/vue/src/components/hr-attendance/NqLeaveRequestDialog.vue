<script setup lang="ts">
import { CircleCheck, CircleX } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { checkLeaveRequest, parseDay, todayKey, type LeaveCalendar, type LeaveProblem, type LeaveRequestLike } from "./hr-math";
import { hrFail, useHrStrings, type HrAttendanceLabels } from "./strings";
import type { HrResult, LeaveRequestInput, LeaveType } from "./types";

// A leave request form. It shows the working days the request costs and what is left, and refuses overlaps and
// overdrafts before sending.
const props = withDefaults(
  defineProps<{
    /** Whether the dialog is open (v-model:open). */
    open: boolean;
    types: readonly LeaveType[];
    /** The person's existing requests, for the balance and the overlap check. */
    requests: readonly LeaveRequestLike[];
    defaultTypeId?: string;
    year?: number;
    asOf?: string;
    carriedOver?: Readonly<Record<string, number>>;
    calendar?: LeaveCalendar;
    /** Sends the request. Resolve `{ error }` or reject to keep the dialog open with the message. */
    onSubmit: (input: LeaveRequestInput) => Promise<HrResult> | HrResult;
    labels?: HrAttendanceLabels;
  }>(),
  { defaultTypeId: undefined, year: undefined, asOf: undefined, carriedOver: undefined, calendar: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const { t, n } = useHrStrings(() => props.labels);
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (key: string | null) => {
  if (!key) return null;
  const d = parseDay(key);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const typeId = ref(props.defaultTypeId ?? props.types[0]?.id ?? "");
const start = ref<string | null>(null);
const end = ref<string | null>(null);
const halfStart = ref(false);
const halfEnd = ref(false);
const reason = ref("");
const busy = ref(false);
const error = ref<string | null>(null);

// Each time the dialog opens it starts blank, not from the last request.
watch(
  () => [props.open, props.defaultTypeId] as const,
  ([open]) => {
    if (!open) return;
    typeId.value = props.defaultTypeId ?? props.types[0]?.id ?? "";
    start.value = null;
    end.value = null;
    halfStart.value = false;
    halfEnd.value = false;
    reason.value = "";
    error.value = null;
  },
);

const today = computed(() => props.asOf ?? todayKey());
const type = computed(() => props.types.find((x) => x.id === typeId.value));
const checked = computed(() =>
  type.value && start.value && end.value
    ? checkLeaveRequest(type.value, { start: start.value, end: end.value, halfStart: halfStart.value, halfEnd: halfEnd.value }, props.requests, {
        year: props.year ?? Number(today.value.slice(0, 4)),
        asOf: today.value,
        carriedOver: props.carriedOver?.[type.value.id],
        calendar: props.calendar,
      })
    : null,
);
const problem = computed<LeaveProblem | "missing">(() => (!start.value || !end.value ? null : (checked.value?.problem ?? null)));
const left = computed(() => (checked.value && type.value?.limited !== false ? checked.value.balance.available - checked.value.days : null));
const shown = computed(() => error.value ?? (problem.value ? t.value.problems[problem.value] : null));

async function submit() {
  if (busy.value) return;
  const c = checked.value;
  if (!type.value || !start.value || !end.value || !c) {
    error.value = t.value.problems.missing;
    return;
  }
  if (c.problem) {
    error.value = t.value.problems[c.problem];
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const result = await props.onSubmit({ typeId: typeId.value, start: start.value, end: end.value, halfStart: halfStart.value, halfEnd: halfEnd.value, reason: reason.value.trim(), days: c.days });
    if (result && result.error) error.value = result.error;
    else emit("update:open", false);
  } catch (e) {
    error.value = hrFail(e, t.value.failed);
  } finally {
    busy.value = false;
  }
}

function pickStart(d: Date | null | undefined) {
  const k = d ? keyOf(d) : null;
  start.value = k;
  if (k && (!end.value || end.value < k)) end.value = k;
  error.value = null;
}
function pickEnd(d: Date | null | undefined) {
  end.value = d ? keyOf(d) : null;
  error.value = null;
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !busy && emit('update:open', next)">
    <NqDialogContent>
      <form novalidate class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.requestTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.requestDescription }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ t.leaveType }}</NqFieldLabel>
          <NqSelect :model-value="typeId" :disabled="busy" @update:model-value="(v) => v && (typeId = String(v))">
            <NqSelectTrigger>
              <NqSelectValue />
            </NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="x in props.types" :key="x.id" :value="x.id">{{ x.name }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="problem === 'range' || problem === 'overlap'">
            <NqFieldLabel>{{ t.from }}</NqFieldLabel>
            <NqDatePicker :aria-label="t.from" :model-value="dateOf(start)" :disabled="busy" @update:model-value="pickStart" />
          </NqField>
          <NqField :invalid="problem === 'range' || problem === 'overlap'">
            <NqFieldLabel>{{ t.to }}</NqFieldLabel>
            <NqDatePicker :aria-label="t.to" :model-value="dateOf(end)" :disabled="busy" :min="dateOf(start) ?? undefined" @update:model-value="pickEnd" />
          </NqField>
        </div>
        <div class="grid gap-2">
          <label class="flex items-center justify-between gap-3 text-body-sm text-foreground">
            {{ t.halfFirst }}
            <NqSwitch v-model="halfStart" :disabled="busy" />
          </label>
          <label v-if="start && end && start !== end" class="flex items-center justify-between gap-3 text-body-sm text-foreground">
            {{ t.halfLast }}
            <NqSwitch v-model="halfEnd" :disabled="busy" />
          </label>
        </div>
        <NqField>
          <NqFieldLabel>{{ t.reason }}</NqFieldLabel>
          <NqTextarea v-model="reason" :disabled="busy" />
          <NqFieldDescription>{{ t.reasonHint }}</NqFieldDescription>
        </NqField>
        <p v-if="checked && !problem" class="flex flex-wrap items-center gap-x-2 text-body-sm text-foreground" aria-live="polite">
          <CircleCheck aria-hidden="true" class="size-4 text-nq-success-text" />
          {{ t.workingDays(n(checked.days)) }}
          <span v-if="left !== null" class="text-muted-foreground">{{ t.afterRequest(n(left)) }}</span>
        </p>
        <NqFieldError v-if="shown" match class="flex items-center gap-2">
          <CircleX aria-hidden="true" class="size-4" />
          {{ shown }}
        </NqFieldError>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy" :disabled="!type">{{ t.submit }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
