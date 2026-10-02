<script setup lang="ts">
import { CircleAlert, Info, ListChecks, TriangleAlert } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCheckbox } from "../checkbox";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqMeter } from "../progress";
import { useNasaq } from "../../provider";
import { NqEmptyState } from "../states";
import { SEO_ISSUE_CATALOG, type SeoIssueKind } from "./seo-issue-catalog";
import { SEO_PAGES_STRINGS, type SeoPagesLabels } from "./seo-labels";
import { issueCounts, scoreBand, seoScore, sortIssues, type ScoreBand, type SeoIssue, type SeoSeverity } from "./seo-pages-math";

// The issues of one page as a checklist, most severe first. Each has what is wrong, why it matters and how to fix it (expandable),
// and a checkbox to mark it fixed. The score and counts update with the checkboxes.

type Result = void | { error?: string };

const BAND_TEXT: Record<ScoreBand, string> = { good: "text-nq-success-text", fair: "text-nq-warning-text", poor: "text-nq-danger-text" };
const BAND_TONE: Record<ScoreBand, "success" | "warning" | "danger"> = { good: "success", fair: "warning", poor: "danger" };
const SEVERITY_ICON = { error: CircleAlert, warning: TriangleAlert, info: Info } as const;
const SEVERITY_VARIANT: Record<SeoSeverity, "danger" | "warning" | "info"> = { error: "danger", warning: "warning", info: "info" };

const props = withDefaults(
  defineProps<{
    issues: readonly SeoIssue[];
    /** The page these issues belong to, shown under the title. */
    url?: string;
    /** Mark an issue fixed or open again. The checkbox shows the new state while this is pending. */
    onToggleFixed?: (issue: SeoIssue, fixed: boolean) => Promise<Result>;
    catalog?: Record<string, SeoIssueKind>;
    title?: string;
    labels?: Partial<SeoPagesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { url: undefined, onToggleFixed: undefined, catalog: undefined, title: undefined, labels: undefined },
);

const t = useAnalyticsLabels(SEO_PAGES_STRINGS, () => props.labels);
const nq = useNasaq();
const pending = ref<Record<string, boolean>>({});
const failed = ref<string | null>(null);

const shown = computed(() => props.issues.map((i) => (i.id in pending.value ? { ...i, fixed: pending.value[i.id] } : i)));
const score = computed(() => seoScore(shown.value));
const band = computed(() => scoreBand(score.value));
const open = computed(() => issueCounts(shown.value).total);
const sorted = computed(() => sortIssues(shown.value));

function text(code: string) {
  const all = props.catalog ? { ...SEO_ISSUE_CATALOG, ...props.catalog } : SEO_ISSUE_CATALOG;
  const kind = all[code];
  return kind ? kind[nq.locale.value.startsWith("ar") ? "ar" : "en"] : { title: code, why: "", fix: "" };
}

async function toggle(issue: SeoIssue, fixed: boolean) {
  if (!props.onToggleFixed) return;
  pending.value = { ...pending.value, [issue.id]: fixed };
  failed.value = null;
  let out: Result = undefined;
  try {
    out = await props.onToggleFixed(issue, fixed);
  } catch {
    out = { error: t.value.actionsFailed };
  }
  const { [issue.id]: _drop, ...rest } = pending.value;
  pending.value = rest;
  if (out && out.error) failed.value = out.error;
}
</script>

<template>
  <NqCard data-slot="seo-issue-checklist" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3"><slot name="title">{{ props.title ?? t.checklistTitle }}</slot></NqCardTitle>
      <NqCardDescription>
        <bdi v-if="props.url" dir="ltr" class="block truncate">{{ props.url }}</bdi>
        {{ t.checklistDescription(open) }}
      </NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <div class="flex items-center gap-3" :data-band="band">
        <span :class="cn('text-h3 font-semibold tabular-nums', BAND_TEXT[band])"><NqNum :value="score" /></span>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="text-caption text-muted-foreground">{{ t.scoreOf(score) }}</span>
          <NqMeter :value="score" :max="100" :tone="BAND_TONE[band]" size="sm" :aria-label="t.scoreOf(score)" :show-value="false" />
        </div>
      </div>
      <NqAlert v-if="failed" tone="danger">{{ failed }}</NqAlert>
      <NqEmptyState v-if="shown.length === 0" :icon="ListChecks" :title="t.allFixed" :description="t.allFixedBody" />
      <ul v-else class="flex flex-col divide-y divide-border rounded-card border border-border">
        <li v-for="issue in sorted" :key="issue.id" :data-severity="issue.severity" :data-fixed="issue.fixed ? '' : undefined" class="flex flex-col gap-2 p-3">
          <NqCollapsible>
            <div class="flex items-start gap-3">
              <NqCheckbox
                class="mt-0.5"
                :model-value="!!issue.fixed"
                :disabled="!props.onToggleFixed"
                :aria-label="t.markFixed(text(issue.code).title)"
                @update:model-value="(v: boolean) => void toggle(issue, !!v)"
              />
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span dir="auto" :class="cn('text-label text-foreground', issue.fixed && 'text-muted-foreground line-through')">{{ text(issue.code).title }}</span>
                  <NqBadge :variant="issue.fixed ? 'success' : SEVERITY_VARIANT[issue.severity]">
                    <component :is="SEVERITY_ICON[issue.severity]" aria-hidden="true" />
                    {{ issue.fixed ? t.fixed : t.severity[issue.severity] }}
                  </NqBadge>
                </div>
                <p v-if="issue.detail" dir="auto" class="text-body-sm text-muted-foreground">{{ issue.detail }}</p>
                <NqCollapsibleTrigger class="w-fit text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground">{{ t.howToFix }}</NqCollapsibleTrigger>
              </div>
            </div>
            <NqCollapsiblePanel>
              <dl class="mt-2 flex flex-col gap-2 ps-7 text-body-sm">
                <div>
                  <dt class="text-caption font-medium text-muted-foreground">{{ t.why }}</dt>
                  <dd dir="auto" class="text-foreground">{{ text(issue.code).why }}</dd>
                </div>
                <div>
                  <dt class="text-caption font-medium text-muted-foreground">{{ t.howToFix }}</dt>
                  <dd dir="auto" class="text-foreground">{{ text(issue.code).fix }}</dd>
                </div>
              </dl>
            </NqCollapsiblePanel>
          </NqCollapsible>
        </li>
      </ul>
    </NqCardContent>
  </NqCard>
</template>
