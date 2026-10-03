<script setup lang="ts">
import { ChevronsUpDown, GitBranch, Lock, Settings2, ShieldCheck, Star } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime, formatNumber } from "../numeric";
import { NqGitHubLogo } from "../oauth-buttons";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { filterBranches, pickDefaultBranch, sortBranches, splitFullName } from "./format";
import NqRepositoryPickerList from "./NqRepositoryPickerList.vue";
import { REPOSITORY_PICKER_STRINGS, type PickerAccount, type PickerBranch, type PickerRepo, type RepositoryPickerLabels, type RepositoryPickerValue } from "./strings";

// Pick a GitHub repository and a branch through the app installation. The repository list is searched on the server as you
// type (pass `searchRepositories`); choosing one loads its branches and selects the default. It calls no API itself.
interface Props {
  /** Controlled value (v-model). */
  modelValue?: RepositoryPickerValue;
  defaultValue?: RepositoryPickerValue;
  /** Search the repositories the installation can see. Called with an empty query when the list opens. */
  searchRepositories: (query: string) => Promise<PickerRepo[]>;
  /** The branches of a repository. */
  loadBranches: (repo: PickerRepo) => Promise<PickerBranch[]>;
  /** Who the app is installed on; shown in the footer with `onConfigure`. */
  account?: PickerAccount;
  /** Opens GitHub's settings for the installation ("Configure access"). */
  onConfigure?: () => void;
  disabled?: boolean;
  /** Hide the branch field (repository only). */
  hideBranch?: boolean;
  labels?: Partial<RepositoryPickerLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  account: undefined,
  onConfigure: undefined,
  disabled: false,
  hideBranch: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: RepositoryPickerValue] }>();

const nq = useNasaq();
const t = computed(() => ({ ...REPOSITORY_PICKER_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as RepositoryPickerLabels);
const num = (n: number) => formatNumber(n, nq.locale.value);

const inner = ref<RepositoryPickerValue>(props.defaultValue ?? { repo: null, branch: null });
const current = computed(() => props.modelValue ?? inner.value);
function commit(next: RepositoryPickerValue) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
}

/* repositories */
const repoOpen = ref(false);
const query = ref("");
const repos = ref<PickerRepo[]>([]);
const repoStatus = ref<"loading" | "ready" | "error">("loading");
const retry = ref(0);
let repoTimer: ReturnType<typeof setTimeout> | null = null;
let repoRun = 0;
watch(
  () => [repoOpen.value, query.value, retry.value] as const,
  ([open, q]) => {
    if (repoTimer) clearTimeout(repoTimer);
    const run = ++repoRun;
    if (!open) return;
    repoStatus.value = "loading";
    repoTimer = setTimeout(
      () => {
        props.searchRepositories(q).then(
          (list) => {
            if (run !== repoRun) return;
            repos.value = list;
            repoStatus.value = "ready";
          },
          () => run === repoRun && (repoStatus.value = "error"),
        );
      },
      q ? 250 : 0,
    );
  },
);

/* branches */
const branchOpen = ref(false);
const branchQuery = ref("");
const branches = ref<PickerBranch[]>([]);
const branchStatus = ref<"loading" | "ready" | "error">("loading");
const branchRetry = ref(0);
let branchRun = 0;
watch(
  () => [current.value.repo?.id, props.hideBranch, branchRetry.value] as const,
  () => {
    const repo = current.value.repo;
    const run = ++branchRun;
    if (!repo || props.hideBranch) {
      branches.value = [];
      return;
    }
    branchStatus.value = "loading";
    props.loadBranches(repo).then(
      (list) => {
        if (run !== branchRun) return;
        branches.value = sortBranches(list);
        branchStatus.value = "ready";
        if (!current.value.branch) commit({ repo, branch: pickDefaultBranch(list, repo.defaultBranch) });
      },
      () => run === branchRun && (branchStatus.value = "error"),
    );
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (repoTimer) clearTimeout(repoTimer);
  repoRun++;
  branchRun++;
});

function pickRepo(repo: PickerRepo) {
  repoOpen.value = false;
  query.value = "";
  if (repo.id === current.value.repo?.id) return;
  commit({ repo, branch: null });
}
function pickBranch(b: PickerBranch) {
  branchOpen.value = false;
  branchQuery.value = "";
  if (current.value.repo) commit({ repo: current.value.repo, branch: b.name });
}
watch(branchOpen, (o) => {
  if (!o) branchQuery.value = "";
});

const shownBranches = computed(() => filterBranches(branches.value, branchQuery.value));
const owner = computed(() => (current.value.repo ? splitFullName(current.value.repo.fullName) : null));
const repoItems = computed(() => repos.value.map((r) => ({ key: r.id, selected: r.id === current.value.repo?.id })));
const branchItems = computed(() => shownBranches.value.map((b) => ({ key: b.name, selected: b.name === current.value.branch })));

const triggerClass =
  "flex h-control w-full min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-start text-body outline-none transition-colors hover:bg-nq-hover focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50";
</script>

<template>
  <div data-slot="repository-picker" :class="cn('grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]', props.hideBranch && 'sm:grid-cols-1', props.class)">
    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-label text-foreground">{{ t.repository }}</span>
      <NqPopover v-model:open="repoOpen">
        <NqPopoverTrigger :disabled="props.disabled" :aria-label="`${t.repository}: ${current.repo?.fullName ?? t.pickRepository}`" :class="triggerClass">
          <NqGitHubLogo :on-dark="nq.resolvedTheme.value === 'dark'" width="16" height="16" class="shrink-0" />
          <bdi v-if="current.repo" dir="ltr" class="min-w-0 flex-1 truncate">
            <span class="text-muted-foreground">{{ owner?.owner ? `${owner.owner}/` : "" }}</span>
            <span class="font-semibold text-foreground">{{ owner?.name }}</span>
          </bdi>
          <span v-else class="min-w-0 flex-1 truncate text-muted-foreground">{{ t.pickRepository }}</span>
          <Lock v-if="current.repo?.private" :aria-label="t.private" class="size-3.5 shrink-0 text-muted-foreground" />
          <ChevronsUpDown aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
        </NqPopoverTrigger>
        <NqPopoverContent align="start" class="w-[min(28rem,var(--available-width))] p-0">
          <NqRepositoryPickerList
            v-model:search="query"
            :items="repoItems"
            :placeholder="t.searchRepositories"
            :status="repoStatus"
            :empty-title="t.noRepositories"
            :empty-hint="t.noRepositoriesHint"
            :t="t"
            :num="num"
            @pick="(i) => pickRepo(repos[i]!)"
            @retry="retry++"
          >
            <template #option="{ index }">
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="flex items-center gap-2">
                  <bdi dir="ltr" class="min-w-0 truncate text-label text-foreground">{{ repos[index]!.fullName }}</bdi>
                  <NqBadge v-if="repos[index]!.private" variant="neutral">
                    <Lock aria-hidden="true" class="size-3" />
                    {{ t.private }}
                  </NqBadge>
                </span>
                <span v-if="repos[index]!.description" dir="auto" class="line-clamp-1 text-caption text-muted-foreground">{{ repos[index]!.description }}</span>
                <span class="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                  <bdi v-if="repos[index]!.language" dir="ltr">{{ repos[index]!.language }}</bdi>
                  <span v-if="repos[index]!.stars !== undefined" class="inline-flex items-center gap-1">
                    <Star aria-hidden="true" class="size-3" />
                    <bdi>{{ num(repos[index]!.stars!) }}</bdi>
                  </span>
                  <span v-if="repos[index]!.updatedAt">{{ t.updated }} <NqDateTime :value="repos[index]!.updatedAt!" relative /></span>
                </span>
              </span>
            </template>
            <template #footer>
              <div class="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-caption text-muted-foreground">
                <span class="flex min-w-0 items-center gap-1.5">
                  <NqAvatar v-if="props.account?.avatar" :name="props.account.login" :src="props.account.avatar" size="xs" />
                  <ShieldCheck v-else aria-hidden="true" class="size-3.5 shrink-0" />
                  <span class="truncate">{{ props.account ? t.connectedAs(props.account.login) : t.connectedAs("GitHub") }}</span>
                </span>
                <NqButton v-if="props.onConfigure" size="sm" variant="ghost" class="shrink-0" @click="props.onConfigure()">
                  <Settings2 aria-hidden="true" />
                  {{ t.configure }}
                </NqButton>
              </div>
            </template>
          </NqRepositoryPickerList>
        </NqPopoverContent>
      </NqPopover>
    </div>

    <div v-if="!props.hideBranch" class="flex min-w-0 flex-col gap-1.5">
      <span class="text-label text-foreground">{{ t.branch }}</span>
      <NqPopover v-model:open="branchOpen">
        <NqPopoverTrigger :disabled="props.disabled || !current.repo" :aria-label="`${t.branch}: ${current.branch ?? (current.repo ? t.pickBranch : t.chooseRepoFirst)}`" :class="triggerClass">
          <GitBranch aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
          <bdi v-if="current.branch" dir="ltr" class="min-w-0 flex-1 truncate">{{ current.branch }}</bdi>
          <span v-else class="min-w-0 flex-1 truncate text-muted-foreground">{{ current.repo ? (branchStatus === "loading" ? t.branchesLoading : t.pickBranch) : t.chooseRepoFirst }}</span>
          <ChevronsUpDown aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
        </NqPopoverTrigger>
        <NqPopoverContent align="start" class="w-[min(22rem,var(--available-width))] p-0">
          <NqRepositoryPickerList
            v-model:search="branchQuery"
            :items="branchItems"
            :placeholder="t.searchBranches"
            :status="branchStatus"
            :empty-title="t.noBranches"
            :t="t"
            :num="num"
            @pick="(i) => pickBranch(shownBranches[i]!)"
            @retry="branchRetry++"
          >
            <template #option="{ index }">
              <span class="flex items-center gap-2">
                <bdi dir="ltr" class="min-w-0 truncate text-body-sm text-foreground">{{ shownBranches[index]!.name }}</bdi>
                <NqBadge v-if="shownBranches[index]!.default" variant="info">{{ t.default }}</NqBadge>
                <NqBadge v-if="shownBranches[index]!.protected" variant="neutral">
                  <Lock aria-hidden="true" class="size-3" />
                  {{ t.protected }}
                </NqBadge>
              </span>
            </template>
          </NqRepositoryPickerList>
        </NqPopoverContent>
      </NqPopover>
    </div>
  </div>
</template>
