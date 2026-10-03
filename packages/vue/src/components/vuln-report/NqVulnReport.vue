<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight, Minus, ScanSearch } from "lucide-vue-next";
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCopyButton } from "../copy-button";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import NqSeverityTiles from "./NqSeverityTiles.vue";
import { useVulnLabels, type VulnReportLabels } from "./strings";
import { countBySeverity, isCveId, riskTone, topFindings, totalCount, trend, VULN_SEVERITIES, type RankableFinding, type Severity, type SeverityCounts } from "./vuln-format";

// Latest scan at a glance: counts per severity, the worst findings with the fixed version, and the last scans as stacked bars with the trend.
export interface VulnFinding extends RankableFinding {
  /** CVE id like CVE-2024-12345. */
  id: string;
  title?: string;
  package: string;
  installedVersion?: string;
  fixedVersion?: string;
}

export interface VulnScan {
  id: string;
  at: Date | number | string;
  counts: Partial<SeverityCounts>;
}

interface Props {
  /** Every finding from the latest scan. Counts come from these unless `counts` is given. */
  findings: readonly VulnFinding[];
  /** Override the counts, for example when `findings` holds only the top items. */
  counts?: Partial<SeverityCounts>;
  /** Oldest first. The last entry is the latest scan. */
  history?: readonly VulnScan[];
  lastScanAt?: Date | number | string;
  /** How many findings to list. Default 5. */
  topLimit?: number;
  /** Spins the Scan now button. Scan now shows when a `scan` listener is attached. */
  scanning?: boolean;
  labels?: VulnReportLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { counts: undefined, history: () => [], lastScanAt: undefined, topLimit: 5, scanning: false, labels: undefined });
const emit = defineEmits<{ scan: []; openFinding: [finding: VulnFinding] }>();
const { ar, t } = useVulnLabels(() => props.labels);

const sevVariant: Record<Severity, "danger" | "warning" | "info" | "neutral"> = { critical: "danger", high: "danger", medium: "warning", low: "neutral" };
const sevBar: Record<Severity, string> = { critical: "bg-nq-danger", high: "bg-nq-danger/60", medium: "bg-nq-warning", low: "bg-muted-foreground/40" };

const c = computed(() => props.counts ?? countBySeverity(props.findings));
const total = computed(() => totalCount(c.value));
const top = computed(() => topFindings(props.findings, props.topLimit));
const delta = computed(() => trend(props.history));
const peak = computed(() => Math.max(1, ...props.history.map((h) => totalCount(h.counts))));
const hasScan = computed(() => props.lastScanAt !== undefined || props.history.length > 0 || props.findings.length > 0);
const tone = computed(() => riskTone(c.value));
const scanLabel = (h: VulnScan) => t.value.historyLabel(new Date(h.at).toLocaleDateString(ar.value ? "ar" : "en"), totalCount(h.counts));
const onScanClick = () => emit("scan");
// Scan now and the clickable ids show only when the parent listens, like the optional callbacks of the React props.
const listeners = getCurrentInstance()?.vnode.props ?? {};
const canScan = "onScan" in listeners;
const canOpen = "onOpenFinding" in listeners;
</script>

<template>
  <NqCard data-slot="vuln-report" :data-risk="tone" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h3" class="flex items-center gap-2">
          <ScanSearch aria-hidden="true" class="size-4 text-muted-foreground" />
          {{ t.title }}
        </NqCardTitle>
        <NqButton v-if="canScan" size="sm" variant="secondary" :loading="scanning" @click="onScanClick">
          {{ scanning ? t.scanning : t.scanNow }}
        </NqButton>
      </div>
      <NqCardDescription>
        {{ t.description }}
        <template v-if="lastScanAt">
          {{ " " }}{{ t.scannedAt }} <NqDateTime :value="lastScanAt" relative />.
        </template>
      </NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-6">
      <NqEmptyState v-if="!hasScan" :title="t.noScan" :description="t.noScanBody" />
      <template v-else>
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-body-sm text-muted-foreground">
            {{ t.total }}: <span class="text-h3 font-semibold text-foreground tabular-nums"><NqNum :value="total" /></span>
          </p>
          <NqBadge v-if="delta !== null" :variant="delta < 0 ? 'success' : delta > 0 ? 'danger' : 'neutral'">
            <ArrowDownRight v-if="delta < 0" aria-hidden="true" />
            <ArrowUpRight v-else-if="delta > 0" aria-hidden="true" />
            <Minus v-else aria-hidden="true" />
            {{ delta < 0 ? t.better(-delta) : delta > 0 ? t.worse(delta) : t.same }}
          </NqBadge>
        </div>
        <NqSeverityTiles :counts="c" :labels="labels" />

        <section aria-labelledby="vuln-top" class="grid gap-2">
          <h4 id="vuln-top" class="text-label text-foreground">{{ t.top }}</h4>
          <p v-if="total === 0" class="rounded-control border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ t.clean }}. {{ t.cleanBody }}</p>
          <p v-else-if="top.length === 0" class="text-body-sm text-muted-foreground">{{ t.topEmpty }}</p>
          <ul v-else class="divide-y divide-border rounded-control border border-border">
            <li v-for="f in top" :key="f.id + f.package" data-slot="vuln-finding" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <NqBadge :variant="sevVariant[f.severity]">{{ t.severity[f.severity] }}</NqBadge>
              <div class="grid min-w-0 flex-1 gap-0.5">
                <button v-if="canOpen" type="button" class="w-fit text-start font-mono text-body-sm text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring" @click="emit('openFinding', f)">
                  <bdi dir="ltr">{{ f.id }}</bdi>
                </button>
                <bdi v-else dir="ltr" class="font-mono text-body-sm text-foreground">{{ f.id }}</bdi>
                <span v-if="f.title" class="truncate text-caption text-muted-foreground" dir="auto">{{ f.title }}</span>
              </div>
              <span class="text-body-sm text-muted-foreground">
                <bdi dir="ltr" class="font-mono">{{ f.package }}{{ f.installedVersion ? `@${f.installedVersion}` : "" }}</bdi>
                {{ " → " }}
                <bdi v-if="f.fixedVersion" dir="ltr" class="font-mono text-nq-success">{{ f.fixedVersion }}</bdi>
                <span v-else>{{ t.noFix }}</span>
              </span>
              <span v-if="f.cvss !== undefined" class="text-caption text-muted-foreground tabular-nums">
                {{ t.cvss }} <bdi dir="ltr">{{ f.cvss.toFixed(1) }}</bdi>
              </span>
              <NqCopyButton v-if="isCveId(f.id)" :value="f.id" :label="t.copyCve(f.id)" size="icon-sm" variant="ghost" />
            </li>
          </ul>
        </section>

        <section v-if="history.length > 0" aria-labelledby="vuln-history" class="grid gap-2">
          <h4 id="vuln-history" class="text-label text-foreground">{{ t.history }}</h4>
          <ol class="flex h-24 items-end gap-1.5">
            <li
              v-for="h in history"
              :key="h.id"
              class="flex h-full min-w-2 flex-1 flex-col-reverse overflow-hidden rounded-t-[2px]"
              :style="{ height: `${Math.max(4, (totalCount(h.counts) / peak) * 100)}%` }"
              role="img"
              :aria-label="scanLabel(h)"
              :title="scanLabel(h)"
            >
              <template v-for="s in [...VULN_SEVERITIES].reverse()" :key="s">
                <span v-if="(h.counts[s] ?? 0) > 0" :class="sevBar[s]" :style="{ flexGrow: h.counts[s] }" />
              </template>
            </li>
          </ol>
        </section>
      </template>
    </NqCardContent>
  </NqCard>
</template>
