<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqNum } from "../numeric";
import { useVulnLabels, type VulnReportLabels } from "./strings";
import { VULN_SEVERITIES, type Severity, type SeverityCounts } from "./vuln-format";

// Four tiles with the number of findings per severity. Severity is always spelled out, never colour alone.
interface Props {
  counts: Partial<SeverityCounts>;
  labels?: VulnReportLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const { t } = useVulnLabels(() => props.labels);
const sevBox: Record<Severity, string> = { critical: "text-nq-danger", high: "text-nq-danger", medium: "text-nq-warning", low: "text-muted-foreground" };
</script>

<template>
  <dl data-slot="severity-tiles" :class="cn('grid grid-cols-2 gap-2 sm:grid-cols-4', props.class)">
    <div v-for="s in VULN_SEVERITIES" :key="s" :data-severity="s" class="rounded-control border border-border bg-card p-3">
      <dt class="text-body-sm text-muted-foreground">{{ t.severity[s] }}</dt>
      <dd :class="cn('text-h2 font-semibold tabular-nums', (counts[s] ?? 0) > 0 ? sevBox[s] : 'text-foreground')">
        <NqNum :value="counts[s] ?? 0" />
      </dd>
    </div>
  </dl>
</template>
