<script setup lang="ts">
import { Bug, Check, ThumbsUp } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { countByStatus, type FeedbackHubIssue, type FeedbackIssueStatus } from "./feedback-reporter-utils";
import { feedbackStrings, fill, type FeedbackReporterLabels } from "./strings";

// What people already reported on this page, with a status filter and a "Me too" vote, so a visitor adds a vote instead of a duplicate.
// Report writing and screenshots live in your report dialog: this is the list around it.
interface Props {
  /** The address the reports are about, shown under the title. */
  page?: string;
  issues: readonly FeedbackHubIssue[];
  /** "Me too" on a report. Resolves `void` or `{ error }`. Omit to hide the vote buttons. */
  onVote?: (id: string) => Promise<void | { error?: string }>;
  /** Opens the report dialog. Omit to hide the button. */
  onReportNew?: () => void;
  onOpenIssue?: (id: string) => void;
  labels?: FeedbackReporterLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { page: undefined, onVote: undefined, onReportNew: undefined, onOpenIssue: undefined, labels: undefined });

const nq = useNasaq();
const t = computed(() => feedbackStrings(nq.locale.value, props.labels));
const titleId = useId();
const filter = ref<FeedbackIssueStatus | "all">("all");
const voting = ref<string | null>(null);
const counts = computed(() => countByStatus(props.issues));
const shown = computed(() => (filter.value === "all" ? props.issues : props.issues.filter((i) => i.status === filter.value)));
const tabs = computed<[FeedbackIssueStatus | "all", string][]>(() => [
  ["all", t.value.all],
  ["open", t.value.open],
  ["in-progress", t.value.inProgress],
  ["resolved", t.value.resolved],
]);
const badge = (s: FeedbackIssueStatus) =>
  s === "resolved" ? { variant: "success" as const, text: t.value.resolved } : s === "in-progress" ? { variant: "info" as const, text: t.value.inProgress } : { variant: "neutral" as const, text: t.value.open };

function setFilter(v: string[]) {
  filter.value = (v[0] as FeedbackIssueStatus | "all" | undefined) ?? "all";
}
async function vote(id: string) {
  if (!props.onVote) return;
  voting.value = id;
  try {
    await props.onVote(id);
  } finally {
    voting.value = null;
  }
}
</script>

<template>
  <section data-slot="feedback-hub" :aria-labelledby="titleId" :class="cn('flex w-full max-w-2xl flex-col gap-4 rounded-card border border-border bg-card p-4', props.class)">
    <header class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h2 :id="titleId" class="text-h3">{{ t.hubTitle }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ t.hubDescription }}</p>
        <p v-if="props.page" class="text-caption text-muted-foreground">
          {{ t.page }} <bdi dir="ltr" class="font-mono text-foreground">{{ props.page }}</bdi>
        </p>
      </div>
      <NqButton v-if="props.onReportNew" variant="primary" size="sm" class="shrink-0" @click="props.onReportNew()">
        <Bug aria-hidden="true" />
        {{ t.reportNew }}
      </NqButton>
    </header>
    <NqToggleGroup :aria-label="t.filterLabel" :model-value="[filter]" @update:model-value="setFilter">
      <NqToggle v-for="[value, text] in tabs" :key="value" :value="value">
        {{ text }}
        <span class="text-caption tabular-nums opacity-70">{{ counts[value] }}</span>
      </NqToggle>
    </NqToggleGroup>
    <NqEmptyState v-if="shown.length === 0" :icon="Bug" :title="t.emptyTitle" :description="filter === 'all' ? t.emptyBody : t.emptyFiltered" class="py-8" />
    <ul v-else :aria-label="t.listLabel" class="flex flex-col divide-y divide-border rounded-control border border-border">
      <li v-for="issue in shown" :key="issue.id" class="flex items-start gap-3 p-3">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <button
            v-if="props.onOpenIssue"
            type="button"
            dir="auto"
            class="w-fit max-w-full truncate rounded-control text-start text-label underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="props.onOpenIssue(issue.id)"
          >
            {{ issue.title }}
          </button>
          <span v-else dir="auto" class="truncate text-label">{{ issue.title }}</span>
          <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
            <NqBadge :variant="badge(issue.status).variant">{{ badge(issue.status).text }}</NqBadge>
            <span v-if="issue.author" dir="auto">{{ fill(t.by, { name: issue.author }) }}</span>
            <NqDateTime v-if="issue.createdAt !== undefined" :value="issue.createdAt" relative />
          </span>
        </div>
        <NqButton
          v-if="props.onVote"
          :variant="issue.voted ? 'secondary' : 'ghost'"
          size="sm"
          :aria-pressed="issue.voted ? true : false"
          :disabled="issue.voted || issue.status === 'resolved'"
          :loading="voting === issue.id"
          :title="issue.votes !== undefined ? fill(t.votes, { count: issue.votes }) : undefined"
          @click="vote(issue.id)"
        >
          <Check v-if="issue.voted" aria-hidden="true" />
          <ThumbsUp v-else aria-hidden="true" />
          <span>{{ issue.voted ? t.voted : t.meToo }}</span>
          <span v-if="issue.votes !== undefined" class="tabular-nums text-muted-foreground">{{ issue.votes }}</span>
        </NqButton>
      </li>
    </ul>
  </section>
</template>
