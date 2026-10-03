<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next";
import { computed, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqConfirmButton } from "../alert-dialog";
import { NqButton } from "../button";
import type { IntegrationResult, IntegrationService } from "../integration-connector";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime } from "../numeric";
import { NqErrorState } from "../states";
import { NqStatus } from "../status";
import NqAnalyticsConnect from "./NqAnalyticsConnect.vue";
import { FRAME_STRINGS, type AnalyticsPageFrameLabels } from "./strings";

// The shell shared by the analytics pages: a heading with the connected source, period controls, refresh and
// disconnect, then the report. Without a connected source it shows the connect empty state instead.
interface Props {
  /** Page heading. Use the product's name as text. (Or the `title` slot.) */
  title?: string;
  /** One line under the heading, for example the property, site or channel being shown. (Or the `description` slot.) */
  description?: string;
  /** The data source. While its status is not "connected" the frame shows NqAnalyticsConnect instead of the default slot. */
  service: IntegrationService;
  /** Bullets for the connect screen. */
  benefits?: readonly string[];
  /** Replaces the report with an error state. (Or the `error` slot.) */
  error?: string;
  onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
  onDisconnect: (id: string) => Promise<IntegrationResult>;
  onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  updatedAt?: number | Date | string;
  labels?: Partial<AnalyticsPageFrameLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  benefits: undefined,
  error: undefined,
  onSelectAccount: undefined,
  onRetry: undefined,
  onRefresh: undefined,
  refreshing: false,
  updatedAt: undefined,
  labels: undefined,
});
const slots = useSlots();
const t = useAnalyticsLabels(FRAME_STRINGS, () => props.labels);
const connected = computed(() => props.service.status === "connected");
const hasError = computed(() => !!props.error || !!slots.error);
const showMeta = computed(() => props.updatedAt !== undefined || !!props.service.connectedAs);
</script>

<template>
  <div data-slot="analytics-page" :data-connected="connected" :class="cn('flex w-full flex-col gap-6', props.class)">
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-h1 text-foreground"><slot name="title">{{ props.title }}</slot></h1>
        <p v-if="props.description || $slots.description" class="text-pretty text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
      </div>
      <div v-if="connected" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
        <NqButton v-if="props.onRefresh" size="sm" variant="secondary" :loading="props.refreshing" @click="props.onRefresh?.()">
          <RefreshCw aria-hidden="true" />
          {{ t.refresh }}
        </NqButton>
        <NqConfirmButton
          size="sm"
          variant="secondary"
          :title="t.disconnectTitle(props.service.name)"
          :description="t.disconnectBody"
          :confirm-label="t.disconnect"
          :on-confirm="async () => { await props.onDisconnect(props.service.id); }"
        >
          {{ t.disconnect }}
        </NqConfirmButton>
      </div>
    </header>
    <template v-if="connected">
      <p v-if="showMeta" class="-mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <NqStatus tone="success">{{ t.connected }}</NqStatus>
        <span v-if="props.service.connectedAs">
          {{ t.connectedTo }} <bdi dir="ltr">{{ props.service.connectedAs }}</bdi>
        </span>
        <span v-if="props.updatedAt !== undefined">
          {{ t.updated }} <NqDateTime :value="props.updatedAt" relative />
        </span>
      </p>
      <NqErrorState v-if="hasError" :title="t.errorTitle" :description="props.error">
        <template v-if="$slots.error" #description><slot name="error" /></template>
        <template v-if="props.onRetry" #actions>
          <NqButton size="sm" @click="props.onRetry?.()">{{ t.retry }}</NqButton>
        </template>
      </NqErrorState>
      <slot v-else />
    </template>
    <NqAnalyticsConnect
      v-else
      :service="props.service"
      :benefits="props.benefits"
      :on-connect="props.onConnect"
      :on-disconnect="props.onDisconnect"
      :on-select-account="props.onSelectAccount"
    />
  </div>
</template>
