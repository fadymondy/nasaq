<script setup lang="ts">
import { Copy, Palmtree, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDateRangePicker, NqTimePicker } from "../date-picker";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { formatDate } from "../numeric";
import { NqSwitch } from "../switch";
import {
  copyDay,
  dayKey,
  nextRange,
  validateAvailability,
  vacationDays,
  weeklyMinutes,
  workedMinutes,
  type Availability,
  type AvailabilityDay,
  type AvailabilityIssue,
  type AvailabilityRange,
  type AvailabilityVacation,
} from "./availability-math";
import { useAvailabilityEditorLabels, type AvailabilityEditorLabels } from "./strings";

// A provider's availability: weekly hours with breaks per day, copy one day to the others, and vacations picked as date ranges.
// Problems (overlaps, an end before a start, a break outside the hours) show beside the row and block saving. Times are 24 hour under the hood.
const props = withDefaults(
  defineProps<{
    /** The availability being edited (v-model). */
    modelValue?: Availability;
    defaultValue?: Availability;
    /** Save it. Return `{ error }` (or throw) to keep the editor open with a message. */
    onSave?: (value: Availability) => Promise<void | { error?: string }>;
    /** First day of the week, 0 = Sunday. Default 6 (Saturday), as in Egypt. */
    weekStartsOn?: number;
    /** Minutes between choices in the time pickers. Default 15. */
    minuteStep?: number;
    labels?: Partial<AvailabilityEditorLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { modelValue: undefined, defaultValue: undefined, onSave: undefined, weekStartsOn: 6, minuteStep: 15, labels: undefined },
);
const emit = defineEmits<{ "update:modelValue": [value: Availability] }>();

let counter = 0;
const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

const nq = useNasaq();
const t = useAvailabilityEditorLabels(() => props.labels);
const blank = (): Availability => ({ weekly: Array.from({ length: 7 }, () => ({ enabled: false, ranges: [], breaks: [] })), vacations: [] });
const initial = props.modelValue ?? props.defaultValue ?? blank();
const inner = ref<Availability>(initial);
const saved = ref<Availability>(initial);
const av = computed(() => props.modelValue ?? inner.value);
const range = ref<{ from: Date | null; to: Date | null }>({ from: null, to: null });
const reason = ref("");
const busy = ref(false);
const message = ref<{ tone: "success" | "danger"; text: string } | null>(null);

const issues = computed(() => validateAvailability(av.value));
const dirty = computed(() => JSON.stringify(av.value) !== JSON.stringify(saved.value));

function commit(next: Availability) {
  inner.value = next;
  message.value = null;
  emit("update:modelValue", next);
}
const setDay = (d: number, patch: Partial<AvailabilityDay>) => commit({ ...av.value, weekly: av.value.weekly.map((x, i) => (i === d ? { ...x, ...patch } : x)) });
const setList = (d: number, list: "ranges" | "breaks", next: AvailabilityRange[]) => setDay(d, { [list]: next });
const patchRange = (d: number, list: "ranges" | "breaks", i: number, p: Partial<AvailabilityRange>) =>
  setList(d, list, av.value.weekly[d]![list].map((r, k) => (k === i ? { ...r, ...p } : r)));
const issueAt = (d: number, list: "ranges" | "breaks", index: number) => issues.value.find((i) => i.day === d && i.list === list && i.index === index);

const dayName = (d: number) => formatDate(new Date(2023, 0, 1 + d), nq.locale.value, { weekday: "long" });
const order = computed(() => Array.from({ length: 7 }, (_, i) => (i + props.weekStartsOn) % 7));
const dateText = (key: string) => formatDate(parseKey(key), nq.locale.value, { dateStyle: "medium" });

function toggleDay(d: number, on: boolean) {
  const day = av.value.weekly[d]!;
  setDay(d, on && day.ranges.length === 0 ? { enabled: true, ranges: [nextRange([], 480)] } : { enabled: on });
}
function copyToOthers(d: number) {
  commit({ ...av.value, weekly: copyDay(av.value.weekly, d, av.value.weekly.flatMap((x, i) => (i !== d && x.enabled ? [i] : []))) });
}
function addVacation() {
  if (!range.value.from || !range.value.to) return;
  const v: AvailabilityVacation = { id: `vac-new-${++counter}`, from: dayKey(range.value.from), to: dayKey(range.value.to), reason: reason.value.trim() || undefined };
  commit({ ...av.value, vacations: [...av.value.vacations, v].sort((a, b) => a.from.localeCompare(b.from)) });
  range.value = { from: null, to: null };
  reason.value = "";
}
function discard() {
  inner.value = saved.value;
  emit("update:modelValue", saved.value);
  message.value = null;
}
async function save() {
  if (issues.value.length > 0 || !props.onSave) return;
  busy.value = true;
  message.value = null;
  try {
    const r = await props.onSave(av.value);
    if (r && r.error) message.value = { tone: "danger", text: r.error };
    else {
      saved.value = av.value;
      message.value = { tone: "success", text: t.value.saved };
    }
  } catch {
    message.value = { tone: "danger", text: t.value.failed };
  } finally {
    busy.value = false;
  }
}
function issueText(i: AvailabilityIssue) {
  const what = i.vacationId
    ? t.value.vacationWord
    : i.day !== undefined
      ? `${dayName(i.day)}: ${i.list === "breaks" ? t.value.breakWord : t.value.hoursWord}${i.index !== undefined ? ` ${i.index + 1}` : ""}`
      : "";
  return `${what} ${t.value.issue[i.code] ?? i.code}`;
}
</script>

<template>
  <div data-slot="availability-editor" :class="cn('flex flex-col gap-4', props.class)">
    <NqCard>
      <NqCardHeader class="flex-row items-start justify-between gap-3">
        <div>
          <NqCardTitle as="h2">{{ t.weekly }}</NqCardTitle>
          <NqCardDescription>{{ t.weeklyHint }}</NqCardDescription>
        </div>
        <p class="text-label tabular-nums">{{ t.total(weeklyMinutes(av)) }}</p>
      </NqCardHeader>
      <NqCardContent class="flex flex-col divide-y divide-border">
        <section
          v-for="d in order"
          :key="d"
          :aria-label="dayName(d)"
          data-slot="availability-day"
          :data-open="av.weekly[d]!.enabled ? '' : undefined"
          class="grid gap-3 py-3 sm:grid-cols-[10rem_1fr]"
        >
          <div class="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-start">
            <label class="flex items-center gap-2 text-label">
              <NqSwitch :model-value="av.weekly[d]!.enabled" :aria-label="t.dayOn(dayName(d))" @update:model-value="toggleDay(d, $event)" />
              {{ dayName(d) }}
            </label>
            <span class="text-caption text-muted-foreground">{{ av.weekly[d]!.enabled ? t.hours(workedMinutes(av.weekly[d]!)) : t.closed }}</span>
          </div>
          <div v-if="av.weekly[d]!.enabled" class="flex flex-col gap-3">
            <template v-for="list in (['ranges', 'breaks'] as const)" :key="list">
              <div v-if="list === 'ranges' || av.weekly[d]!.breaks.length > 0" class="flex flex-col gap-2">
                <p v-if="list === 'breaks'" class="text-caption text-muted-foreground">{{ t.breaks }}</p>
                <ul class="m-0 flex list-none flex-col gap-2 p-0">
                  <li
                    v-for="(r, i) in av.weekly[d]![list]"
                    :key="`${list}-${i}`"
                    :data-invalid="issueAt(d, list, i) ? '' : undefined"
                    :class="cn('flex flex-wrap items-center gap-2 rounded-control', issueAt(d, list, i) && 'outline outline-1 outline-nq-danger')"
                  >
                    <NqTimePicker :model-value="r.start || null" :minute-step="minuteStep" :aria-label="`${dayName(d)} ${t.startLabel(i + 1)}`" @update:model-value="patchRange(d, list, i, { start: $event ?? '' })" />
                    <span aria-hidden="true" class="text-muted-foreground">{{ t.to }}</span>
                    <NqTimePicker :model-value="r.end || null" :minute-step="minuteStep" :aria-label="`${dayName(d)} ${t.endLabel(i + 1)}`" @update:model-value="patchRange(d, list, i, { end: $event ?? '' })" />
                    <NqButton size="icon" variant="ghost" :aria-label="`${t.remove} ${dayName(d)} ${i + 1}`" @click="setList(d, list, av.weekly[d]![list].filter((_, k) => k !== i))">
                      <Trash2 aria-hidden="true" />
                    </NqButton>
                    <span v-if="issueAt(d, list, i)" class="text-caption text-nq-danger-text">{{ t.issue[issueAt(d, list, i)!.code] }}</span>
                  </li>
                </ul>
                <p v-if="list === 'ranges' && issues.some((x) => x.code === 'no-hours' && x.day === d)" class="text-caption text-nq-danger-text">{{ t.issue["no-hours"] }}</p>
              </div>
            </template>
            <div class="flex flex-wrap gap-2">
              <NqButton size="sm" variant="secondary" @click="setList(d, 'ranges', [...av.weekly[d]!.ranges, nextRange(av.weekly[d]!.ranges, 60)])">
                <Plus aria-hidden="true" />
                {{ t.addHours }}
              </NqButton>
              <NqButton size="sm" variant="ghost" @click="setList(d, 'breaks', [...av.weekly[d]!.breaks, { start: '13:00', end: '13:30' }])">
                <Plus aria-hidden="true" />
                {{ t.addBreak }}
              </NqButton>
              <NqButton size="sm" variant="ghost" @click="copyToOthers(d)">
                <Copy aria-hidden="true" />
                {{ t.copyAll }}
              </NqButton>
            </div>
          </div>
        </section>
      </NqCardContent>
    </NqCard>

    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h2">{{ t.vacations }}</NqCardTitle>
        <NqCardDescription>{{ t.vacationsHint }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <div class="flex flex-wrap items-end gap-2">
          <NqField class="w-full sm:w-auto">
            <NqFieldLabel>{{ t.pickDates }}</NqFieldLabel>
            <NqDateRangePicker v-model="range" :placeholder="t.pickDates" :aria-label="t.pickDates" class="sm:w-72" />
          </NqField>
          <NqField class="min-w-40 flex-1">
            <NqFieldLabel>{{ t.reason }}</NqFieldLabel>
            <NqInput v-model="reason" />
          </NqField>
          <NqButton variant="secondary" :disabled="!range.from || !range.to" @click="addVacation">
            <Plus aria-hidden="true" />
            {{ t.addVacation }}
          </NqButton>
        </div>
        <p v-if="av.vacations.length === 0" class="text-body-sm text-muted-foreground">{{ t.noVacations }}</p>
        <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
          <li
            v-for="v in av.vacations"
            :key="v.id"
            data-slot="availability-vacation"
            :class="cn('flex items-center gap-3 rounded-control border border-border p-2', issues.some((i) => i.vacationId === v.id) && 'border-nq-danger')"
          >
            <Palmtree aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            <div class="min-w-0 flex-1">
              <p class="text-label">
                <bdi>{{ dateText(v.from) }}</bdi>
                <template v-if="v.to !== v.from">
                  {{ " - " }}
                  <bdi>{{ dateText(v.to) }}</bdi>
                </template>
                <span class="ms-2 text-caption text-muted-foreground">{{ t.daysCount(vacationDays(v)) }}</span>
              </p>
              <p v-if="v.reason" class="truncate text-caption text-muted-foreground">{{ v.reason }}</p>
              <p v-if="issues.find((i) => i.vacationId === v.id)" class="text-caption text-nq-danger-text">{{ t.issue[issues.find((i) => i.vacationId === v.id)!.code] }}</p>
            </div>
            <NqButton size="icon" variant="ghost" :aria-label="`${t.remove} ${t.vacationWord}`" @click="commit({ ...av, vacations: av.vacations.filter((x) => x.id !== v.id) })">
              <Trash2 aria-hidden="true" />
            </NqButton>
          </li>
        </ul>
      </NqCardContent>
    </NqCard>

    <NqAlert v-if="issues.length > 0" tone="danger" :title="t.fix">
      <ul class="m-0 ps-4">
        <li v-for="(i, k) in issues" :key="k">{{ issueText(i) }}</li>
      </ul>
    </NqAlert>
    <NqAlert v-if="message" :tone="message.tone">{{ message.text }}</NqAlert>

    <div class="flex flex-wrap justify-end gap-2">
      <NqButton variant="ghost" :disabled="!dirty || busy" @click="discard">{{ t.reset }}</NqButton>
      <NqButton :disabled="!dirty || busy || issues.length > 0 || !onSave" @click="save">{{ busy ? t.saving : t.save }}</NqButton>
    </div>
  </div>
</template>
