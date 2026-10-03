<script setup lang="ts">
import { ArrowLeft, ArrowRight, CheckCheck, EyeOff, RotateCcw, TrendingDown, TrendingUp } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqSparkline } from "../chart";
import { formatNumber, NqDateTime } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqDiagnosticsViewer from "./NqDiagnosticsViewer.vue";
import NqErrorStackFrame from "./NqErrorStackFrame.vue";
import { ERROR_TRACKING_STRINGS, etSeriesTrend, etTotalEvents, type ErrorActionResult, type ErrorIssue, type ErrorStatus, type ErrorTrackingLabels, type ErrorLevel, type ErrorTrend } from "./error-tracking-model";

// One error: summary, resolve/ignore, then stack trace, breadcrumbs, tags and the captured diagnostics.
interface Props {
  issue: ErrorIssue;
  /** Shows a back button (the list view). Listen to `back`. */
  showBack?: boolean;
  /** Resolve, ignore or reopen. Return `{ error }` to show why it failed. Without it the actions are hidden. */
  onStatusChange?: (issue: ErrorIssue, status: ErrorStatus) => Promise<ErrorActionResult>;
  labels?: Partial<ErrorTrackingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { showBack: false, onStatusChange: undefined, labels: undefined, class: undefined });
const emit = defineEmits<{ back: [] }>();

const levelBadge: Record<ErrorLevel, "danger" | "warning" | "info"> = { fatal: "danger", error: "danger", warning: "warning", info: "info" };
const statusTone: Record<ErrorStatus, StatusTone> = { unresolved: "warning", resolved: "success", ignored: "neutral" };
const trendColor: Record<ErrorTrend, string> = { up: "var(--nq-danger)", down: "var(--nq-success)", flat: "var(--primary)" };

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...ERROR_TRACKING_STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as ErrorTrackingLabels);
const num = (n: number) => formatNumber(n, locale.value);

const busy = ref<ErrorStatus | null>(null);
const error = ref<string | null>(null);
const local = ref<{ id: string; status: ErrorStatus } | null>(null);
const status = computed(() => (local.value?.id === props.issue.id ? local.value.status : props.issue.status));
const trend = computed(() => etSeriesTrend(props.issue.series));
const tags = computed(() => Object.entries(props.issue.tags ?? {}));
const diag = computed(() => props.issue.diagnostics);
const hasDiag = computed(() => !!diag.value && (!!diag.value.screenshot || !!diag.value.console?.length || !!diag.value.network?.length));

async function change(next: ErrorStatus) {
  if (!props.onStatusChange) return;
  busy.value = next;
  error.value = null;
  try {
    const res = await props.onStatusChange({ ...props.issue, status: status.value }, next);
    if (res && res.error) error.value = res.error;
    else local.value = { id: props.issue.id, status: next };
  } catch {
    error.value = t.value.errorFailed;
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div data-slot="error-detail" :data-status="status" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div v-if="props.showBack">
      <NqButton variant="ghost" size="sm" @click="emit('back')">
        <component :is="ar ? ArrowRight : ArrowLeft" aria-hidden="true" />
        {{ t.back }}
      </NqButton>
    </div>
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <NqBadge :variant="levelBadge[props.issue.level]">{{ t.levels[props.issue.level] }}</NqBadge>
          <NqStatus :tone="statusTone[status]">{{ t.statuses[status] }}</NqStatus>
        </div>
        <h2 dir="auto" class="break-words text-h3 text-foreground">{{ props.issue.title }}</h2>
        <p v-if="props.issue.culprit" class="text-body-sm text-muted-foreground">
          {{ t.culprit }}: <bdi dir="ltr" class="font-mono text-code">{{ props.issue.culprit }}</bdi>
        </p>
      </div>
      <div v-if="props.onStatusChange" class="flex flex-wrap gap-2">
        <template v-if="status === 'unresolved'">
          <NqButton variant="primary" :loading="busy === 'resolved'" @click="change('resolved')"><CheckCheck aria-hidden="true" />{{ t.resolve }}</NqButton>
          <NqButton variant="secondary" :loading="busy === 'ignored'" @click="change('ignored')"><EyeOff aria-hidden="true" />{{ t.ignore }}</NqButton>
        </template>
        <NqButton v-else variant="secondary" :loading="busy === 'unresolved'" @click="change('unresolved')"><RotateCcw aria-hidden="true" />{{ t.reopen }}</NqButton>
      </div>
    </header>
    <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>

    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div class="min-w-0">
        <NqTabs default-value="stack">
          <NqTabsList variant="underline">
            <NqTabsTab value="stack">{{ t.stack }}</NqTabsTab>
            <NqTabsTab value="breadcrumbs">{{ t.breadcrumbs }}</NqTabsTab>
            <NqTabsTab value="tags">{{ t.tags }}</NqTabsTab>
            <NqTabsTab v-if="hasDiag" value="diagnostics">{{ t.diagnostics }}</NqTabsTab>
            <NqTabsIndicator />
          </NqTabsList>
          <NqTabsPanel value="stack">
            <ol v-if="props.issue.frames?.length" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
              <NqErrorStackFrame v-for="(f, i) in props.issue.frames" :key="i" :frame="f" :labels="t" />
            </ol>
            <p v-else class="text-body-sm text-muted-foreground">{{ t.noStack }}</p>
          </NqTabsPanel>
          <NqTabsPanel value="breadcrumbs">
            <ol v-if="props.issue.breadcrumbs?.length" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
              <li v-for="(b, i) in props.issue.breadcrumbs" :key="i" :data-type="b.type" class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
                <NqBadge :variant="b.type === 'error' ? 'danger' : 'neutral'" class="shrink-0">{{ t.crumbTypes[b.type] }}</NqBadge>
                <bdi dir="auto" class="min-w-0 flex-1 break-words text-body-sm text-foreground">{{ b.message }}</bdi>
                <span class="text-caption tabular-nums text-muted-foreground"><NqDateTime :value="b.at" :format="{ timeStyle: 'medium' }" /></span>
              </li>
            </ol>
            <p v-else class="text-body-sm text-muted-foreground">{{ t.noBreadcrumbs }}</p>
          </NqTabsPanel>
          <NqTabsPanel value="tags">
            <dl v-if="tags.length" class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border border-border bg-card p-3 text-body-sm">
              <div v-for="[k, v] in tags" :key="k" class="col-span-2 grid grid-cols-subgrid">
                <dt class="text-muted-foreground"><bdi dir="ltr">{{ k }}</bdi></dt>
                <dd class="text-foreground"><bdi dir="ltr">{{ v }}</bdi></dd>
              </div>
            </dl>
            <p v-else class="text-body-sm text-muted-foreground">{{ t.noTags }}</p>
          </NqTabsPanel>
          <NqTabsPanel v-if="hasDiag && diag" value="diagnostics">
            <NqDiagnosticsViewer :diagnostics="diag" :labels="props.labels" />
          </NqTabsPanel>
        </NqTabs>
      </div>

      <aside :aria-label="t.summary" class="flex flex-col gap-3 self-start rounded-card border border-border bg-card p-4">
        <dl class="grid grid-cols-2 gap-3">
          <div>
            <dt class="text-caption text-muted-foreground">{{ t.events }}</dt>
            <dd class="text-h3 tabular-nums"><bdi>{{ num(props.issue.count) }}</bdi></dd>
          </div>
          <div>
            <dt class="text-caption text-muted-foreground">{{ t.users }}</dt>
            <dd class="text-h3 tabular-nums"><bdi>{{ props.issue.users === undefined ? "—" : num(props.issue.users) }}</bdi></dd>
          </div>
        </dl>
        <div v-if="props.issue.series?.length" class="flex flex-col gap-1">
          <div class="flex items-center justify-between text-caption text-muted-foreground">
            <span>{{ t.frequency }}</span>
            <span class="inline-flex items-center gap-1">
              <component :is="trend === 'down' ? TrendingDown : TrendingUp" v-if="trend !== 'flat'" aria-hidden="true" class="size-3.5" />
              {{ trend === "up" ? t.trendUp : trend === "down" ? t.trendDown : t.trendFlat }}
            </span>
          </div>
          <NqSparkline :data="props.issue.series" :color="trendColor[trend]" :label="t.frequencyLabel(num(etTotalEvents(props.issue.series)))" class="h-12 w-full" />
        </div>
        <dl class="flex flex-col gap-1.5 text-body-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.firstSeen }}</dt>
            <dd class="min-w-0 truncate text-foreground"><NqDateTime :value="props.issue.firstSeen" relative /></dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.lastSeen }}</dt>
            <dd class="min-w-0 truncate text-foreground"><NqDateTime :value="props.issue.lastSeen" relative /></dd>
          </div>
          <div v-if="props.issue.release" class="flex items-center justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.release }}</dt>
            <dd class="min-w-0 truncate text-foreground"><bdi dir="ltr" class="font-mono text-code">{{ props.issue.release }}</bdi></dd>
          </div>
          <div v-if="props.issue.environment" class="flex items-center justify-between gap-3">
            <dt class="text-muted-foreground">{{ t.environment }}</dt>
            <dd class="min-w-0 truncate text-foreground"><NqBadge variant="outline">{{ props.issue.environment }}</NqBadge></dd>
          </div>
        </dl>
      </aside>
    </div>
  </div>
</template>
