<script setup lang="ts">
import { CalendarClock, Lock, MoonStar } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqSettingsSection } from "../account-settings";
import { NqAlert } from "../alert";
import { NqCheckbox } from "../checkbox";
import { NqTimePicker } from "../date-picker";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { formatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import NqNotificationDestinations from "./NqNotificationDestinations.vue";
import {
  type Batching,
  capProblem,
  channelState,
  DEFAULT_PREFS,
  effectiveOn,
  isLocked,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationDestination,
  type NotificationKind,
  type NotificationPrefs,
  nextDigest,
  quietMinutes,
  setCell,
  setChannel,
} from "./notification-rules";
import { notificationStrings, type NotificationPreferencesLabels } from "./strings";
import type { NotificationAddValues, NotificationDestinationResult, NotificationPushPermission, NotificationSaveResult, NotificationSection, NotificationTestResult } from "./types";

// Notification preferences: a matrix of kinds by channel (email, push, WhatsApp, desktop), quiet hours, a daily cap with
// batching, a digest schedule and extra destinations (email or webhook) with a test send. Every change saves at once and is
// rolled back if saving fails. Turning push on asks the browser first.
const props = withDefaults(
  defineProps<{
    kinds: readonly NotificationKind[];
    /** Channels to show, in order. Default email, push, WhatsApp and desktop. */
    channels?: readonly NotificationChannel[];
    /** A channel that cannot be used yet, with the reason, for example `{ whatsapp: "Add a WhatsApp number first" }`. Its column is locked. */
    unavailable?: Partial<Record<NotificationChannel, string>>;
    value: NotificationPrefs;
    /** Save the new preferences. The screen updates at once and goes back to the last saved state if this rejects or resolves `{ error }`. Saves run one after another. */
    onChange: (next: NotificationPrefs) => Promise<NotificationSaveResult>;
    /** The browser permission for push. When it is not "granted", turning push on asks for it first. */
    pushPermission?: NotificationPushPermission;
    /** Ask the browser for permission (call `Notification.requestPermission()`), resolving the answer. */
    onRequestPush?: () => Promise<NotificationPushPermission>;
    /** Extra delivery destinations. Omit to hide the section. */
    destinations?: readonly NotificationDestination[];
    onAddDestination?: (values: NotificationAddValues) => Promise<NotificationDestinationResult>;
    onRemoveDestination?: (destination: NotificationDestination) => Promise<NotificationDestinationResult>;
    /** Send a test to one destination. Resolve `{ ok: false, message }` when it fails. */
    onTestDestination?: (destination: NotificationDestination) => Promise<NotificationTestResult>;
    /** Show the sections. Default all of them. */
    sections?: readonly NotificationSection[];
    /** Clock used for the "Next digest" line. Default the current time. */
    now?: Date;
    labels?: NotificationPreferencesLabels;
    class?: HTMLAttributes["class"];
  }>(),
  {
    channels: () => NOTIFICATION_CHANNELS,
    unavailable: undefined,
    pushPermission: undefined,
    onRequestPush: undefined,
    destinations: undefined,
    onAddDestination: undefined,
    onRemoveDestination: undefined,
    onTestDestination: undefined,
    sections: () => ["matrix", "quiet", "limits", "digest", "destinations"],
    now: undefined,
    labels: undefined,
    class: undefined,
  },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...notificationStrings(locale.value), ...props.labels }));

const draft = ref<NotificationPrefs>({ ...DEFAULT_PREFS, ...props.value });
let saved = draft.value;
let chain: Promise<void> = Promise.resolve();
let generation = 0;
let pending = 0;
let mounted = true;
const state = ref<"idle" | "saving" | "saved">("idle");
const notice = ref<{ tone: "danger" | "warning" | "info"; text: string } | null>(null);
const asking = ref(false);
// Bumped when a checkbox must show the draft again (a refused push permission, a rollback).
const rev = ref(0);

onBeforeUnmount(() => {
  mounted = false;
});

watch(
  () => props.value,
  (value) => {
    if (pending === 0) {
      const next = { ...DEFAULT_PREFS, ...value };
      saved = next;
      draft.value = next;
    }
  },
);

function commit(next: NotificationPrefs) {
  draft.value = next;
  notice.value = null;
  state.value = "saving";
  const gen = generation;
  pending += 1;
  chain = chain.then(async () => {
    let ok = true;
    try {
      if (gen !== generation) return; // an earlier save failed and this one was rolled back with it
      const result = await props.onChange(next);
      if (result && typeof result === "object" && result.error) throw new Error(result.error);
      saved = next;
    } catch (e) {
      ok = false;
      generation += 1;
      draft.value = saved;
      rev.value += 1;
      notice.value = { tone: "danger", text: e instanceof Error && e.message ? e.message : t.value.failed };
    } finally {
      pending -= 1;
      if (pending === 0 && mounted) state.value = ok && gen === generation ? "saved" : "idle";
    }
  });
}

const pushBlocked = computed(() => props.pushPermission === "denied" || props.pushPermission === "unsupported");
const needsAsk = computed(() => props.pushPermission !== undefined && props.pushPermission !== "granted" && !pushBlocked.value && !!props.onRequestPush);
function reasonFor(channel: NotificationChannel): string | undefined {
  if (props.unavailable?.[channel]) return props.unavailable[channel];
  if (channel === "push" && props.pushPermission === "denied") return t.value.pushBlocked;
  if (channel === "push" && props.pushPermission === "unsupported") return t.value.pushUnsupported;
  return undefined;
}

/** Turning any push cell on asks the browser first; if it says no, nothing changes. */
async function change(channel: NotificationChannel, on: boolean, apply: (p: NotificationPrefs) => NotificationPrefs) {
  if (channel === "push" && on && needsAsk.value) {
    asking.value = true;
    notice.value = { tone: "info", text: t.value.pushAsking };
    try {
      const answer = await props.onRequestPush!();
      if (answer !== "granted") {
        notice.value = { tone: "warning", text: answer === "denied" ? t.value.pushBlocked : t.value.pushDenied };
        rev.value += 1;
        return;
      }
    } catch {
      notice.value = { tone: "warning", text: t.value.pushDenied };
      rev.value += 1;
      return;
    } finally {
      asking.value = false;
    }
  }
  commit(apply(draft.value));
}

const has = (s: NotificationSection) => props.sections.includes(s);
const status = computed(() => (state.value === "saving" ? t.value.saving : state.value === "saved" ? t.value.saved : ""));

// Quiet hours
const q = computed(() => draft.value.quietHours);
const minutes = computed(() => quietMinutes(q.value));
const quietSummary = computed(() => {
  if (minutes.value === 0) return t.value.quietNone;
  const hours = formatNumber(Math.round((minutes.value / 60) * 10) / 10, locale.value);
  return `${t.value.quietLength(hours)}${q.value.from > q.value.to ? `. ${t.value.quietOvernight}` : ""}. ${t.value.quietUrgent}`;
});
const setQuiet = (patch: Partial<NotificationPrefs["quietHours"]>) => commit({ ...draft.value, quietHours: { ...q.value, ...patch } });

// Limits
const capText = ref(draft.value.dailyCap === null ? "" : String(draft.value.dailyCap));
const capTouched = ref(false);
watch(
  () => draft.value.dailyCap,
  (cap) => {
    capText.value = cap === null ? "" : String(cap);
  },
);
const capOn = computed(() => draft.value.dailyCap !== null);
const capBad = computed(() => capProblem(capText.value) !== null || (capOn.value && capText.value.trim() === ""));
function saveCap() {
  capTouched.value = true;
  if (capBad.value) return;
  const n = Number(capText.value);
  if (n !== draft.value.dailyCap) commit({ ...draft.value, dailyCap: n });
}
function toggleCap(next: boolean) {
  capTouched.value = false;
  commit({ ...draft.value, dailyCap: next ? 20 : null });
}
const batchingOptions: Batching[] = ["instant", "hourly", "daily"];

// Digest
const d = computed(() => draft.value.digest);
const setDigest = (patch: Partial<NotificationPrefs["digest"]>) => commit({ ...draft.value, digest: { ...d.value, ...patch } });
const next = computed(() => nextDigest(d.value, props.now ?? new Date()));
const nextText = computed(() =>
  next.value ? new Intl.DateTimeFormat(locale.value, { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(next.value) : "",
);
</script>

<template>
  <div data-slot="notification-preferences" :class="cn('flex flex-col gap-6', props.class)">
    <div role="status" aria-live="polite" class="-mb-3 h-4 text-end text-caption text-muted-foreground">{{ status }}</div>
    <NqAlert v-if="notice" :tone="notice.tone" :role="notice.tone === 'danger' ? 'alert' : 'status'" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>

    <NqSettingsSection v-if="has('matrix')" :title="t.matrixTitle" :description="t.matrixBody">
      <div class="overflow-x-auto">
        <table data-slot="notification-matrix" :aria-label="t.matrixLabel" class="w-full min-w-[30rem] border-collapse text-body-sm">
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="py-2 pe-3 text-start text-caption font-medium text-muted-foreground">{{ t.kind }}</th>
              <th v-for="c in channels" :key="c" scope="col" class="w-24 px-2 py-2 text-center align-bottom font-medium">
                <span class="flex flex-col items-center gap-1.5">
                  <span class="text-label text-foreground">{{ t.channels[c] }}</span>
                  <NqCheckbox
                    :key="`${c}-${rev}`"
                    :model-value="channelState(draft, kinds, c) === 'all'"
                    :indeterminate="channelState(draft, kinds, c) === 'some'"
                    :disabled="!!reasonFor(c) || asking"
                    :aria-label="t.all(t.channels[c])"
                    @update:model-value="(on: boolean) => change(c, on, (p) => setChannel(p, kinds, c, on))"
                  />
                  <span v-if="reasonFor(c)" class="text-caption font-normal text-muted-foreground">{{ reasonFor(c) }}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(k, i) in kinds" :key="k.id">
              <tr v-if="k.group && k.group !== kinds[i - 1]?.group">
                <th scope="colgroup" :colspan="channels.length + 1" class="pb-1 pt-4 text-start text-caption font-medium uppercase tracking-wide text-muted-foreground">{{ k.group }}</th>
              </tr>
              <tr class="border-b border-border last:border-b-0">
                <th scope="row" class="py-3 pe-3 text-start font-normal">
                  <span class="block text-label text-foreground">{{ k.label }}</span>
                  <span v-if="k.description" class="block text-caption text-muted-foreground">{{ k.description }}</span>
                </th>
                <td v-for="c in channels" :key="c" class="px-2 py-3 text-center">
                  <span class="inline-flex items-center justify-center" :title="isLocked(k, c) ? t.locked : reasonFor(c)">
                    <NqCheckbox
                      :key="`${k.id}-${c}-${rev}`"
                      :model-value="effectiveOn(draft, k, c)"
                      :disabled="isLocked(k, c) || !!reasonFor(c) || asking"
                      :aria-label="t.cell(k.label, t.channels[c])"
                      @update:model-value="(on: boolean) => change(c, on, (p) => setCell(p, k, c, on))"
                    />
                    <Lock v-if="isLocked(k, c)" aria-hidden="true" class="ms-1 size-3 text-muted-foreground" />
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p v-if="needsAsk && channels.includes('push')" class="mt-3 text-caption text-muted-foreground">{{ t.pushNeeded }}</p>
    </NqSettingsSection>

    <NqSettingsSection v-if="has('quiet')" :title="t.quietTitle" :description="t.quietBody">
      <div class="flex flex-col gap-4">
        <label class="flex items-center justify-between gap-4">
          <span class="flex items-center gap-2 text-label text-foreground">
            <MoonStar aria-hidden="true" class="size-4 text-muted-foreground" />
            {{ t.quietSwitch }}
          </span>
          <NqSwitch :model-value="q.enabled" @update:model-value="(on: boolean) => setQuiet({ enabled: on })" />
        </label>
        <template v-if="q.enabled">
          <div class="grid gap-4 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.from }}</NqFieldLabel>
              <NqTimePicker :model-value="q.from" :aria-label="t.from" @update:model-value="(v) => v && setQuiet({ from: v })" />
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.to }}</NqFieldLabel>
              <NqTimePicker :model-value="q.to" :aria-label="t.to" @update:model-value="(v) => v && setQuiet({ to: v })" />
            </NqField>
          </div>
          <p class="text-body-sm text-muted-foreground" data-slot="quiet-summary">{{ quietSummary }}</p>
        </template>
      </div>
    </NqSettingsSection>

    <NqSettingsSection v-if="has('limits')" :title="t.limitsTitle" :description="t.limitsBody">
      <div class="flex flex-col gap-4">
        <label class="flex items-center justify-between gap-4">
          <span class="text-label text-foreground">{{ t.capSwitch }}</span>
          <NqSwitch :model-value="capOn" @update:model-value="toggleCap" />
        </label>
        <NqField v-if="capOn" :invalid="capTouched && capBad">
          <NqFieldLabel>{{ t.capLabel }}</NqFieldLabel>
          <NqInput v-model="capText" ltr inputmode="numeric" class="w-32" @blur="saveCap" @keydown.enter="saveCap" />
          <NqFieldError v-if="capTouched && capBad" match>{{ t.capError }}</NqFieldError>
          <NqFieldDescription v-else>{{ t.capHelp }}</NqFieldDescription>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.batching }}</NqFieldLabel>
          <NqSelect :model-value="draft.batching" @update:model-value="(v) => v && commit({ ...draft, batching: v as Batching })">
            <NqSelectTrigger :aria-label="t.batching" class="w-full sm:w-72"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="b in batchingOptions" :key="b" :value="b">{{ t.batchingOptions[b] }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
      </div>
    </NqSettingsSection>

    <NqSettingsSection v-if="has('digest')" :title="t.digestTitle" :description="t.digestBody">
      <div class="flex flex-col gap-4">
        <label class="flex items-center justify-between gap-4">
          <span class="flex items-center gap-2 text-label text-foreground">
            <CalendarClock aria-hidden="true" class="size-4 text-muted-foreground" />
            {{ t.digestSwitch }}
          </span>
          <NqSwitch :model-value="d.enabled" @update:model-value="(on: boolean) => setDigest({ enabled: on })" />
        </label>
        <template v-if="d.enabled">
          <div class="grid gap-4 sm:grid-cols-3">
            <NqField>
              <NqFieldLabel>{{ t.frequency }}</NqFieldLabel>
              <NqSelect :model-value="d.frequency" @update:model-value="(v) => v && setDigest({ frequency: v as 'daily' | 'weekly' })">
                <NqSelectTrigger :aria-label="t.frequency"><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem value="daily">{{ t.daily }}</NqSelectItem>
                  <NqSelectItem value="weekly">{{ t.weekly }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField v-if="d.frequency === 'weekly'">
              <NqFieldLabel>{{ t.day }}</NqFieldLabel>
              <NqSelect :model-value="String(d.day)" @update:model-value="(v) => v !== null && setDigest({ day: Number(v) })">
                <NqSelectTrigger :aria-label="t.day"><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="(w, i) in t.weekdays" :key="w" :value="String(i)">{{ w }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.at }}</NqFieldLabel>
              <NqTimePicker :model-value="d.time" :aria-label="t.at" @update:model-value="(v) => v && setDigest({ time: v })" />
            </NqField>
          </div>
          <p v-if="next" class="text-body-sm text-muted-foreground">
            {{ t.nextDigest }}:
            <time :datetime="next.toISOString()" class="text-foreground">{{ nextText }}</time>
          </p>
        </template>
      </div>
    </NqSettingsSection>

    <NqSettingsSection v-if="has('destinations') && destinations" :title="t.destTitle" :description="t.destBody">
      <NqNotificationDestinations :t="t" :destinations="destinations" :on-add="onAddDestination" :on-remove="onRemoveDestination" :on-test="onTestDestination" />
    </NqSettingsSection>
  </div>
</template>
