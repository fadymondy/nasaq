<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import type { AlertSort, AlertStatus } from "./alerts-format";
import NqAlertsCore from "./NqAlertsCore.vue";
import { alertsStrings, DEFAULT_SECURITY_ACTIONS, type AlertAction, type AlertsLabels } from "./strings";
import type { AlertResult, SecurityAlertItem } from "./types";

// The alert list for security events. Adds the category, the source IP, location and account, a recommended action,
// and buttons for follow-up actions (block the IP, mark as a false positive) through `onAction`.
interface Props {
  alerts: SecurityAlertItem[];
  loading?: boolean;
  defaultStatus?: AlertStatus | "all";
  defaultSort?: AlertSort;
  onAcknowledge?: (id: string) => Promise<AlertResult>;
  onResolve?: (id: string) => Promise<AlertResult>;
  onReopen?: (id: string) => Promise<AlertResult>;
  hideFilters?: boolean;
  title?: string;
  labels?: Partial<AlertsLabels>;
  /** Extra actions on each alert that is not resolved. Default: block the IP and mark as a false positive. */
  actions?: AlertAction[];
  /** Runs an action. The buttons show only when set. */
  onAction?: (actionId: string, alertId: string) => Promise<AlertResult>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => alertsStrings(nq.locale.value, props.labels));
const actions = computed(() => props.actions ?? DEFAULT_SECURITY_ACTIONS[ar.value ? "ar" : "en"]);
const asSecurity = (a: unknown) => a as SecurityAlertItem;
const extraSearch = (a: unknown) => [asSecurity(a).ip, asSecurity(a).location, asSecurity(a).account, asSecurity(a).category];
</script>

<template>
  <NqAlertsCore v-bind="{ ...props, actions }" is-security :extra-search="extraSearch">
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template #extra="{ alert }">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
        <template v-if="asSecurity(alert).category">
          <dt class="text-muted-foreground">{{ t.category }}</dt>
          <dd class="m-0 text-foreground">{{ t.categories[asSecurity(alert).category!] }}</dd>
        </template>
        <template v-if="asSecurity(alert).ip">
          <dt class="text-muted-foreground">{{ t.ip }}</dt>
          <dd class="m-0 text-foreground"><bdi dir="ltr" class="tabular-nums">{{ asSecurity(alert).ip }}</bdi></dd>
        </template>
        <template v-if="asSecurity(alert).location">
          <dt class="text-muted-foreground">{{ t.location }}</dt>
          <dd class="m-0 text-foreground">{{ asSecurity(alert).location }}</dd>
        </template>
        <template v-if="asSecurity(alert).account">
          <dt class="text-muted-foreground">{{ t.account }}</dt>
          <dd class="m-0 text-foreground"><bdi dir="ltr" class="tabular-nums">{{ asSecurity(alert).account }}</bdi></dd>
        </template>
      </dl>
      <NqAlert v-if="asSecurity(alert).recommendation" tone="info" :title="t.recommendation">{{ asSecurity(alert).recommendation }}</NqAlert>
    </template>
  </NqAlertsCore>
</template>
