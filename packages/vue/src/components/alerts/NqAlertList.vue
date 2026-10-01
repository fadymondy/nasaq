<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { AlertSort, AlertStatus } from "./alerts-format";
import NqAlertsCore from "./NqAlertsCore.vue";
import type { AlertsLabels } from "./strings";
import type { AlertItem, AlertResult } from "./types";

// A list of alerts to triage: filter by status tab, severity and source, search, sort, then acknowledge, resolve or
// reopen. Each row expands to its description and a timeline. It is presentational: you own the data and the async
// callbacks, and a callback can return `{ error }` to show a message on that alert.
interface Props {
  alerts: AlertItem[];
  loading?: boolean;
  /** Which status tab opens first. Default `open`. */
  defaultStatus?: AlertStatus | "all";
  /** Initial sort. Default `severity`. */
  defaultSort?: AlertSort;
  /** Shows Acknowledge on open alerts. */
  onAcknowledge?: (id: string) => Promise<AlertResult>;
  /** Shows Resolve until resolved. */
  onResolve?: (id: string) => Promise<AlertResult>;
  /** Shows Reopen on resolved alerts. */
  onReopen?: (id: string) => Promise<AlertResult>;
  /** Hide the search and the filters. */
  hideFilters?: boolean;
  /** Replace the heading (also the `title` slot). */
  title?: string;
  labels?: Partial<AlertsLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <NqAlertsCore v-bind="props">
    <template v-if="$slots.title" #title><slot name="title" /></template>
  </NqAlertsCore>
</template>
