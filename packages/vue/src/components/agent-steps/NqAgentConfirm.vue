<script setup lang="ts">
import { ShieldAlert } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqTextarea } from "../field";
import { agentHighestRisk, selectedChangeIds, toggleId, type AgentChange, type AgentRisk } from "./agent-steps-logic";
import { agentStepsStrings, type AgentStepsLabels } from "./agent-steps-strings";
import NqAgentChangeRow from "./NqAgentChangeRow.vue";

// Human in the loop before the agent acts: each proposed change with its diff, a tick to leave one out, its risk, and
// Apply or Reject. Rejecting can ask for a reason. High risk changes need an extra tick before Apply. It never applies
// anything itself: your `onApply` does, and until it resolves the buttons show a busy state.
type Result = void | { error?: string };
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    changes: readonly AgentChange[];
    /** Apply the ticked changes. Return `{ error }` or reject to show a failure and keep the choice open. */
    onApply: (ids: string[]) => Promise<Result>;
    /** Reject everything, with the reason if one was given. Return `{ error }` or reject to show a failure. */
    onReject: (reason: string | undefined) => Promise<Result>;
    title?: string;
    /** One line above the changes, in the agent's words (or use the `summary` slot). */
    summary?: string;
    /** Make the reason mandatory when rejecting. Default false. */
    requireReason?: boolean;
    /** Ids of changes that start unticked. Default: all ticked. */
    defaultUnchecked?: readonly string[];
    /** Ids of changes whose diff starts open. Default: the first one. */
    defaultOpenIds?: readonly string[];
    labels?: Partial<AgentStepsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { title: undefined, summary: undefined, requireReason: false, defaultUnchecked: () => [], defaultOpenIds: undefined, labels: undefined, class: undefined },
);
const emit = defineEmits<{ decided: [decision: "applied" | "rejected"] }>();

const nq = useNasaq();
const uid = useId();
const t = computed(() => agentStepsStrings(nq.locale.value, props.labels));

const selected = ref<Set<string>>(new Set(props.changes.filter((c) => !props.defaultUnchecked.includes(c.id)).map((c) => c.id)));
const reviewed = ref(false);
const busy = ref<"apply" | "reject" | null>(null);
const error = ref<string | null>(null);
const decision = ref<"applied" | "rejected" | null>(null);
const appliedCount = ref(0);
const rejecting = ref(false);
const reason = ref("");
const touched = ref(false);

const ids = computed(() => selectedChangeIds(props.changes, selected.value));
const chosen = computed(() => props.changes.filter((c) => selected.value.has(c.id)));
const needsReview = computed(() => agentHighestRisk(chosen.value) === "high");
const canApply = computed(() => ids.value.length > 0 && (!needsReview.value || reviewed.value) && busy.value === null);
const riskText = computed<Record<AgentRisk, string>>(() => ({ low: t.value.riskLow, medium: t.value.riskMedium, high: t.value.riskHigh }));
const overall = computed(() => agentHighestRisk(props.changes));
const RISK: Record<AgentRisk, "neutral" | "warning" | "danger"> = { low: "neutral", medium: "warning", high: "danger" };
const reasonMissing = computed(() => props.requireReason && touched.value && reason.value.trim() === "");

async function run(kind: "apply" | "reject", fn: () => Promise<Result>) {
  busy.value = kind;
  error.value = null;
  try {
    const r = await fn();
    if (r && r.error) {
      error.value = r.error;
      busy.value = null;
      return false;
    }
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : t.value.failedApply;
    busy.value = null;
    return false;
  }
  busy.value = null;
  return true;
}
async function apply() {
  if (!canApply.value) return;
  const count = ids.value.length;
  const picked = ids.value;
  if (await run("apply", () => props.onApply(picked))) {
    appliedCount.value = count;
    decision.value = "applied";
    emit("decided", "applied");
  }
}
async function reject() {
  touched.value = true;
  if (props.requireReason && reason.value.trim() === "") return;
  const text = reason.value.trim() === "" ? undefined : reason.value.trim();
  if (await run("reject", () => props.onReject(text))) {
    rejecting.value = false;
    decision.value = "rejected";
    emit("decided", "rejected");
  }
}
function toggle(id: string) {
  selected.value = toggleId(selected.value, id);
  reviewed.value = false;
}
function startReject() {
  rejecting.value = true;
  touched.value = false;
  error.value = null;
}
</script>

<template>
  <section v-if="decision" v-bind="$attrs" data-slot="agent-confirm" :data-decision="decision" :class="cn('min-w-0', props.class)">
    <NqAlert :tone="decision === 'applied' ? 'success' : 'info'" :title="decision === 'applied' ? t.applied : t.rejected" role="status">
      {{ decision === "applied" ? t.appliedBody(appliedCount) : t.rejectedBody }}
    </NqAlert>
  </section>
  <section
    v-else
    v-bind="$attrs"
    data-slot="agent-confirm"
    :aria-labelledby="`${uid}-h`"
    :aria-busy="busy !== null"
    :class="cn('flex min-w-0 flex-col gap-3 rounded-floating border border-nq-warning/40 bg-card p-3 sm:p-4', props.class)"
  >
    <header class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <ShieldAlert aria-hidden="true" class="size-4 shrink-0 text-nq-warning-text" />
        <h4 :id="`${uid}-h`" class="text-body-sm font-semibold text-foreground">{{ props.title ?? t.confirmTitle }}</h4>
        <NqBadge :variant="RISK[overall]">{{ riskText[overall] }}</NqBadge>
      </div>
      <p dir="auto" class="text-body-sm text-muted-foreground"><slot name="summary">{{ props.summary ?? t.confirmBody }}</slot></p>
    </header>
    <ul class="flex flex-col gap-2">
      <NqAgentChangeRow
        v-for="(c, i) in props.changes"
        :key="c.id"
        :change="c"
        :checked="selected.has(c.id)"
        :default-open="props.defaultOpenIds ? props.defaultOpenIds.includes(c.id) : i === 0"
        :disabled="busy !== null"
        :selectable="props.changes.length > 1"
        :risk-text="riskText[c.risk ?? 'low']"
        :t="t"
        @toggle="toggle(c.id)"
      />
    </ul>
    <label v-if="needsReview" class="flex items-start gap-2 text-body-sm text-foreground">
      <NqCheckbox v-model="reviewed" :disabled="busy !== null" class="mt-0.5" />
      <span dir="auto">{{ t.reviewedRisk }}</span>
    </label>
    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <footer class="flex flex-wrap items-center justify-between gap-2">
      <span role="status" class="text-caption text-muted-foreground">{{ ids.length === 0 ? t.nothingSelected : props.changes.length > 1 ? t.selected(ids.length, props.changes.length) : "" }}</span>
      <div class="flex flex-wrap items-center gap-2">
        <NqButton variant="ghost" :disabled="busy !== null" @click="startReject">{{ t.reject }}</NqButton>
        <NqButton variant="primary" :loading="busy === 'apply'" :disabled="!canApply" :aria-describedby="needsReview && !reviewed ? `${uid}-risk` : undefined" @click="apply">
          {{ props.changes.length > 1 && ids.length !== props.changes.length ? t.apply(ids.length) : t.applyAll }}
        </NqButton>
      </div>
      <span v-if="needsReview && !reviewed" :id="`${uid}-risk`" class="sr-only">{{ t.riskRequired }}</span>
    </footer>
    <NqDialog :open="rejecting" @update:open="(o: boolean) => !o && busy === null && (rejecting = false)">
      <NqDialogContent data-slot="agent-confirm-reject">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.rejectTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.rejectBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="reasonMissing">
          <NqFieldLabel>{{ t.reasonLabel }}</NqFieldLabel>
          <NqTextarea v-model="reason" :placeholder="t.reasonPlaceholder" :rows="3" />
          <NqFieldError v-if="reasonMissing" match>{{ t.reasonRequired }}</NqFieldError>
        </NqField>
        <NqAlert v-if="error && rejecting" tone="danger">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="busy !== null" @click="rejecting = false">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy === 'reject'" @click="reject">{{ t.confirmReject }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
