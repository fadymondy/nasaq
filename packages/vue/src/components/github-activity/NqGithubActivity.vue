<script setup lang="ts">
import {
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  ExternalLink,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  MessageSquare,
  RefreshCw,
  Rocket,
  Search,
  type LucideIcon,
} from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqInput } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqGitHubLogo } from "../oauth-buttons";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus } from "../status";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTimeline, NqTimelineItem } from "../timeline";
import {
  commitTitle,
  deploymentTone,
  matches,
  mergeActivity,
  pullTone,
  runTone,
  type ActivityTone,
  type PullState,
  type RunStatus,
} from "./github-activity-format";
import NqGithubBranch from "./NqGithubBranch.vue";
import NqGithubRef from "./NqGithubRef.vue";
import NqGithubRunRow from "./NqGithubRunRow.vue";
import NqGithubSha from "./NqGithubSha.vue";
import { useGithubActivityLabels, type GithubActivityLabels } from "./strings";
import type { GithubActionResult, GithubCommit, GithubDeployment, GithubFeedId, GithubPull, GithubRepo, GithubRun } from "./types";

// A repository's recent life in one card: commits, pull requests, workflow runs and deployments, each as a
// list with status, author, time and a link to GitHub, plus a merged timeline. Presentational: you fetch the
// feeds and pass them in; Refresh, Deploy and Re-run are async callbacks.
// <NqGithubActivity :repo="{ owner: 'acme', name: 'storefront' }" :commits="commits" :runs="runs" :on-rerun="rerun" />
const props = withDefaults(
  defineProps<{
    repo: GithubRepo;
    commits?: readonly GithubCommit[];
    pulls?: readonly GithubPull[];
    runs?: readonly GithubRun[];
    deployments?: readonly GithubDeployment[];
    /** The tab shown first. Default: `activity` (the merged timeline) when more than one feed is given, else the only feed. */
    defaultTab?: "activity" | GithubFeedId;
    loading?: boolean;
    /** Reload the feeds. Shows a Refresh button. Resolve with `{ error }` to show a message. */
    onRefresh?: () => Promise<GithubActionResult> | GithubActionResult;
    /** Start a deploy. Shows a Deploy button. */
    onDeploy?: () => Promise<GithubActionResult> | GithubActionResult;
    /** Run a workflow again. Shows Re-run on finished runs. */
    onRerun?: (runId: string) => Promise<GithubActionResult> | GithubActionResult;
    /** Hide the filter box. Default false. */
    hideSearch?: boolean;
    /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
    labels?: Partial<GithubActivityLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    commits: undefined,
    pulls: undefined,
    runs: undefined,
    deployments: undefined,
    defaultTab: undefined,
    loading: false,
    onRefresh: undefined,
    onDeploy: undefined,
    onRerun: undefined,
    hideSearch: false,
    labels: undefined,
  },
);

const nq = useNasaq();
const dark = computed(() => nq.resolvedTheme.value === "dark");
const t = useGithubActivityLabels(() => props.labels);
const query = ref("");
const error = ref<string | null>(null);
const busy = ref<"refresh" | "deploy" | null>(null);

const feeds = computed(() => (["commits", "pulls", "runs", "deployments"] as GithubFeedId[]).filter((id) => props[id]));
const tabs = computed<("activity" | GithubFeedId)[]>(() => (feeds.value.length > 1 ? ["activity", ...feeds.value] : feeds.value));
const first = computed(() => (props.defaultTab && tabs.value.includes(props.defaultTab) ? props.defaultTab : (tabs.value[0] ?? "activity")));

const fc = computed(() => (props.commits ?? []).filter((c) => matches(query.value, c.message, c.author.login, c.id, c.branch)));
const fp = computed(() =>
  (props.pulls ?? []).filter((p) => matches(query.value, p.title, p.author.login, `#${p.number}`, p.head, p.base, ...(p.labels?.map((l) => l.name) ?? []))),
);
const fr = computed(() => (props.runs ?? []).filter((r) => matches(query.value, r.name, r.branch, r.actor?.login, r.event, r.sha)));
const fd = computed(() => (props.deployments ?? []).filter((d) => matches(query.value, d.environment, d.ref, d.creator?.login, d.sha)));
const merged = computed(() =>
  [
    ...mergeActivity([{ kind: "commit", items: fc.value, time: (c) => c.date }]),
    ...mergeActivity([{ kind: "pull", items: fp.value, time: (p) => p.createdAt }]),
    ...mergeActivity([{ kind: "run", items: fr.value, time: (r) => r.startedAt }]),
    ...mergeActivity([{ kind: "deployment", items: fd.value, time: (d) => d.createdAt }]),
  ].sort((a, b) => b.time - a.time),
);
const filtered = computed(() => query.value.trim() !== "");
const repoName = computed(() => `${props.repo.owner}/${props.repo.name}`);
const counts = computed<Record<GithubFeedId, number | undefined>>(() => ({
  commits: props.commits?.length,
  pulls: props.pulls?.length,
  runs: props.runs?.length,
  deployments: props.deployments?.length,
}));

async function act(kind: "refresh" | "deploy", fn?: () => Promise<GithubActionResult> | GithubActionResult) {
  if (!fn) return;
  error.value = null;
  busy.value = kind;
  try {
    const result = await fn();
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  } finally {
    busy.value = null;
  }
}

async function rerun(id: string) {
  error.value = null;
  try {
    const result = await props.onRerun?.(id);
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  }
}

const pullIcon: Record<PullState, LucideIcon> = { open: GitPullRequest, draft: GitPullRequestDraft, merged: GitMerge, closed: GitPullRequestClosed };
const runIcon: Record<RunStatus, LucideIcon> = {
  queued: CircleDashed,
  in_progress: RefreshCw,
  success: CircleCheck,
  failure: CircleX,
  cancelled: CircleSlash,
  skipped: CircleSlash,
};
const toneText: Record<ActivityTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};
const pullBadge: Record<PullState, "success" | "neutral" | "info" | "danger"> = { open: "success", draft: "neutral", merged: "info", closed: "danger" };
const checksTone = (v: "success" | "failure" | "pending") => (v === "success" ? "success" : v === "failure" ? "danger" : "info");

// The merged timeline keeps each item's kind; these narrow it for the template.
const asCommit = (i: unknown) => i as GithubCommit;
const asPull = (i: unknown) => i as GithubPull;
const asRun = (i: unknown) => i as GithubRun;
const asDeployment = (i: unknown) => i as GithubDeployment;
</script>

<template>
  <NqCard data-slot="github-activity" :class="cn('w-full max-w-5xl', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex min-w-0 items-start gap-3">
        <span data-slot="github-mark" class="mt-0.5 shrink-0">
          <NqGitHubLogo :on-dark="dark" :width="28" :height="28" />
        </span>
        <div class="flex min-w-0 flex-col gap-1.5">
          <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
          <NqCardDescription>{{ t.description }}</NqCardDescription>
          <NqGithubRef :href="props.repo.href" class="w-fit text-label text-foreground" :aria-label="`${t.openOnGithub}: ${repoName}`">
            <bdi dir="ltr" class="font-mono text-code">{{ repoName }}</bdi>
          </NqGithubRef>
        </div>
      </div>
      <div class="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
        <NqButton v-if="props.onRefresh" type="button" variant="secondary" :loading="busy === 'refresh'" :disabled="busy !== null" @click="act('refresh', props.onRefresh)">
          <RefreshCw aria-hidden="true" />
          {{ t.refresh }}
        </NqButton>
        <NqButton v-if="props.onDeploy" type="button" variant="primary" :loading="busy === 'deploy'" :disabled="busy !== null" @click="act('deploy', props.onDeploy)">
          <Rocket aria-hidden="true" />
          {{ t.deploy }}
        </NqButton>
      </div>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>
      <div v-if="props.loading" role="status" :aria-label="t.loading" class="flex flex-col gap-3">
        <NqSkeleton v-for="i in 5" :key="i" class="h-14 w-full" />
      </div>
      <NqEmptyState v-else-if="tabs.length === 0" :icon="GitCommitHorizontal" :title="t.emptyTitle" :description="t.emptyBody" />
      <NqTabs v-else :default-value="first">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <NqTabsList variant="underline">
            <NqTabsTab v-for="id in tabs" :key="id" :value="id">
              {{ t.tabs[id] }}
              <NqBadge v-if="id !== 'activity' && counts[id] != null" variant="neutral"><NqNum :value="counts[id] as number" /></NqBadge>
            </NqTabsTab>
          </NqTabsList>
          <div v-if="!props.hideSearch" class="relative w-full sm:w-64">
            <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
            <NqInput v-model="query" type="search" :placeholder="t.search" :aria-label="t.search" class="ps-8" />
          </div>
        </div>

        <NqTabsPanel v-if="tabs.includes('activity')" value="activity">
          <NqEmptyState
            v-if="merged.length === 0"
            :icon="filtered ? Search : GitCommitHorizontal"
            :title="filtered ? t.noMatchTitle : t.emptyTitle"
            :description="filtered ? t.noMatchBody : t.emptyBody"
          />
          <NqTimeline v-else :aria-label="t.tabs.activity">
            <template v-for="e in merged" :key="`${e.kind}-${e.id}`">
              <NqTimelineItem
                v-if="e.kind === 'commit'"
                :actor="{ name: asCommit(e.item).author.login, ...(asCommit(e.item).author.avatar ? { avatar: asCommit(e.item).author.avatar } : {}) }"
                :time="asCommit(e.item).date"
              >
                <template #title>
                  <NqGithubRef :href="asCommit(e.item).href" dir="auto">{{ commitTitle(asCommit(e.item).message) }}</NqGithubRef>
                </template>
                <template #description>
                  <bdi>{{ t.committed(asCommit(e.item).author.login) }}</bdi>
                </template>
                <NqBadge variant="outline">{{ t.kind.commit }}</NqBadge>
                <NqGithubSha :sha="asCommit(e.item).id" :href="asCommit(e.item).href" />
              </NqTimelineItem>
              <NqTimelineItem v-else-if="e.kind === 'pull'" :time="asPull(e.item).createdAt">
                <template #icon>
                  <component :is="pullIcon[asPull(e.item).state]" aria-hidden="true" :class="toneText[pullTone[asPull(e.item).state]]" />
                </template>
                <template #title>
                  <NqGithubRef :href="asPull(e.item).href" dir="auto">{{ asPull(e.item).title }}</NqGithubRef>
                </template>
                <template #description>
                  <bdi>{{ t.openedBy(asPull(e.item).author.login) }}</bdi>
                </template>
                <NqBadge variant="outline">{{ t.kind.pull }}</NqBadge>
                <NqBadge :variant="pullBadge[asPull(e.item).state]">{{ t.pullState[asPull(e.item).state] }}</NqBadge>
                <span dir="ltr" class="text-caption text-muted-foreground">#{{ asPull(e.item).number }}</span>
              </NqTimelineItem>
              <NqTimelineItem v-else-if="e.kind === 'run'" :time="asRun(e.item).startedAt">
                <template #icon>
                  <component
                    :is="runIcon[asRun(e.item).status]"
                    aria-hidden="true"
                    :class="cn(toneText[runTone[asRun(e.item).status]], asRun(e.item).status === 'in_progress' && 'motion-safe:animate-spin')"
                  />
                </template>
                <template #title>
                  <NqGithubRef :href="asRun(e.item).href" dir="auto">{{ asRun(e.item).name }}</NqGithubRef>
                </template>
                <NqBadge variant="outline">{{ t.kind.run }}</NqBadge>
                <NqStatus :tone="runTone[asRun(e.item).status]">{{ t.runStatus[asRun(e.item).status] }}</NqStatus>
                <NqGithubBranch v-if="asRun(e.item).branch" :name="asRun(e.item).branch as string" />
              </NqTimelineItem>
              <NqTimelineItem v-else :time="asDeployment(e.item).createdAt">
                <template #icon>
                  <Rocket aria-hidden="true" :class="toneText[deploymentTone[asDeployment(e.item).status]]" />
                </template>
                <template #title>
                  <NqGithubRef :href="asDeployment(e.item).href" dir="auto">{{ asDeployment(e.item).environment }}</NqGithubRef>
                </template>
                <NqBadge variant="outline">{{ t.kind.deployment }}</NqBadge>
                <NqStatus :tone="deploymentTone[asDeployment(e.item).status]">{{ t.deploymentStatus[asDeployment(e.item).status] }}</NqStatus>
                <NqGithubBranch :name="asDeployment(e.item).ref" />
              </NqTimelineItem>
            </template>
          </NqTimeline>
        </NqTabsPanel>

        <NqTabsPanel v-if="props.commits" value="commits">
          <NqEmptyState
            v-if="fc.length === 0"
            :icon="filtered ? Search : GitCommitHorizontal"
            :title="filtered ? t.noMatchTitle : t.emptyTitle"
            :description="filtered ? t.noMatchBody : t.emptyBody"
          />
          <ul v-else :aria-label="t.tabs.commits" class="overflow-hidden rounded-card border border-border">
            <li v-for="c in fc" :key="c.id" data-slot="github-commit" class="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0">
              <NqAvatar :name="c.author.login" :src="c.author.avatar" size="sm" />
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <NqGithubRef :href="c.href" class="text-label text-foreground" dir="auto">{{ commitTitle(c.message) }}</NqGithubRef>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <bdi>{{ t.committed(c.author.login) }}</bdi>
                  <NqDateTime :value="c.date" relative />
                  <NqGithubBranch v-if="c.branch" :name="c.branch" />
                  <NqStatus v-if="c.checks" :tone="checksTone(c.checks)">{{ t.checks[c.checks] }}</NqStatus>
                </div>
              </div>
              <NqGithubSha :sha="c.id" :href="c.href" />
            </li>
          </ul>
        </NqTabsPanel>

        <NqTabsPanel v-if="props.pulls" value="pulls">
          <NqEmptyState
            v-if="fp.length === 0"
            :icon="filtered ? Search : GitCommitHorizontal"
            :title="filtered ? t.noMatchTitle : t.emptyTitle"
            :description="filtered ? t.noMatchBody : t.emptyBody"
          />
          <ul v-else :aria-label="t.tabs.pulls" class="overflow-hidden rounded-card border border-border">
            <li v-for="p in fp" :key="p.id" data-slot="github-pull" :data-state="p.state" class="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0">
              <component :is="pullIcon[p.state]" aria-hidden="true" :class="cn('mt-0.5 size-4 shrink-0', toneText[pullTone[p.state]])" />
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <NqGithubRef :href="p.href" class="text-label text-foreground" dir="auto">{{ p.title }}</NqGithubRef>
                  <NqBadge :variant="pullBadge[p.state]">{{ t.pullState[p.state] }}</NqBadge>
                  <NqBadge v-for="l in p.labels ?? []" :key="l.name" variant="tag" :hue="l.hue ?? 'gray'">{{ l.name }}</NqBadge>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <span dir="ltr">#{{ p.number }}</span>
                  <bdi>{{ p.state === "merged" && p.mergedBy ? t.mergedBy(p.mergedBy.login) : t.openedBy(p.author.login) }}</bdi>
                  <NqDateTime :value="p.state === 'merged' && p.mergedAt ? p.mergedAt : p.createdAt" relative />
                  <span v-if="p.head" dir="ltr" class="font-mono text-code">{{ p.head }}{{ p.base ? ` → ${p.base}` : "" }}</span>
                  <NqStatus v-if="p.checks" :tone="checksTone(p.checks)">{{ t.checks[p.checks] }}</NqStatus>
                  <span v-if="p.comments" class="inline-flex items-center gap-1">
                    <MessageSquare aria-hidden="true" class="size-3" />
                    {{ t.comments(p.comments) }}
                  </span>
                </div>
              </div>
              <NqAvatar :name="p.author.login" :src="p.author.avatar" size="sm" />
            </li>
          </ul>
        </NqTabsPanel>

        <NqTabsPanel v-if="props.runs" value="runs">
          <NqEmptyState
            v-if="fr.length === 0"
            :icon="filtered ? Search : GitCommitHorizontal"
            :title="filtered ? t.noMatchTitle : t.emptyTitle"
            :description="filtered ? t.noMatchBody : t.emptyBody"
          />
          <ul v-else :aria-label="t.tabs.runs" class="overflow-hidden rounded-card border border-border">
            <NqGithubRunRow v-for="r in fr" :key="r.id" :run="r" :t="t" :rerun="props.onRerun ? rerun : undefined" />
          </ul>
        </NqTabsPanel>

        <NqTabsPanel v-if="props.deployments" value="deployments">
          <NqEmptyState
            v-if="fd.length === 0"
            :icon="filtered ? Search : GitCommitHorizontal"
            :title="filtered ? t.noMatchTitle : t.emptyTitle"
            :description="filtered ? t.noMatchBody : t.emptyBody"
          />
          <ul v-else :aria-label="t.tabs.deployments" class="overflow-hidden rounded-card border border-border">
            <li v-for="d in fd" :key="d.id" data-slot="github-deployment" :data-status="d.status" class="flex items-start gap-3 border-t border-border px-4 py-3 first:border-t-0">
              <Rocket aria-hidden="true" :class="cn('mt-0.5 size-4 shrink-0', toneText[deploymentTone[d.status]])" />
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <NqGithubRef :href="d.href" class="text-label text-foreground" dir="auto">{{ d.environment }}</NqGithubRef>
                  <NqStatus :tone="deploymentTone[d.status]">{{ t.deploymentStatus[d.status] }}</NqStatus>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <NqGithubBranch :name="d.ref" />
                  <NqGithubSha v-if="d.sha" :sha="d.sha" />
                  <bdi v-if="d.creator">{{ t.deployedBy(d.creator.login) }}</bdi>
                  <NqDateTime :value="d.createdAt" relative />
                </div>
              </div>
              <a
                v-if="d.url"
                :href="d.url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 rounded-sm text-caption text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
              >
                {{ t.viewSite }}
                <ExternalLink aria-hidden="true" class="size-3 rtl:-scale-x-100" />
              </a>
            </li>
          </ul>
        </NqTabsPanel>
      </NqTabs>
    </NqCardContent>
  </NqCard>
</template>
