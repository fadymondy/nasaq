<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIntegrationConnector, type IntegrationConnectorLabels, type IntegrationResult, type IntegrationService } from "../integration-connector";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { CONNECT_STRINGS, type AnalyticsConnectLabels } from "./strings";

// The empty state of an analytics page that has no data source yet: what connecting gives you, then the
// NqIntegrationConnector card for that one service (consent dialog with scopes, account picker, reconnect when the
// sign-in expired). The host runs OAuth in the callbacks.
interface Props {
  /** The service to connect, its consent scopes and its state. The name is shown as text; pass `icon` only with the brand's official logo. */
  service: IntegrationService;
  /** Short bullets on what the page will show once connected. */
  benefits?: readonly string[];
  /** Replaces the default "Connect {service}" heading. (Or the `title` slot.) */
  title?: string;
  /** Replaces the default description. (Or the `description` slot.) */
  description?: string;
  /** Start OAuth for the ticked scopes, then resolve. Resolve `{ error }` to show it. */
  onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
  onDisconnect: (id: string) => Promise<IntegrationResult>;
  onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
  /** Override any string. */
  labels?: Partial<AnalyticsConnectLabels>;
  connectorLabels?: IntegrationConnectorLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { benefits: undefined, title: undefined, description: undefined, onSelectAccount: undefined, labels: undefined, connectorLabels: undefined });
const t = useAnalyticsLabels(CONNECT_STRINGS, () => props.labels);
const reauth = computed(() => props.service.status === "needs-reauth");
const services = computed(() => [props.service]);
</script>

<template>
  <section
    data-slot="analytics-connect"
    :data-status="props.service.status"
    :aria-label="t.title(props.service.name)"
    :class="cn('mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-card border border-dashed border-border px-4 py-10 text-center sm:px-8', props.class)"
  >
    <div class="flex max-w-lg flex-col gap-2">
      <h2 class="text-h2 text-foreground"><slot name="title">{{ props.title ?? (reauth ? t.reauth(props.service.name) : t.title(props.service.name)) }}</slot></h2>
      <p class="text-pretty text-body-sm text-muted-foreground">
        <slot name="description">{{ props.description ?? (reauth ? t.reauthDescription : t.description(props.service.name)) }}</slot>
      </p>
    </div>
    <div v-if="props.benefits?.length" class="flex flex-col gap-2 text-start">
      <h3 class="text-label text-muted-foreground">{{ t.benefits }}</h3>
      <ul class="flex flex-col gap-1.5">
        <li v-for="b in props.benefits" :key="b" class="flex items-start gap-2 text-body-sm text-foreground">
          <Check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-success-text" />
          {{ b }}
        </li>
      </ul>
    </div>
    <NqIntegrationConnector
      bare
      :services="services"
      :on-connect="props.onConnect"
      :on-disconnect="props.onDisconnect"
      :on-select-account="props.onSelectAccount"
      :labels="props.connectorLabels"
      class="max-w-sm border-0 bg-transparent p-0 text-start [&_[data-slot=card-content]]:p-0 [&_ul]:sm:grid-cols-1 [&_ul]:xl:grid-cols-1"
    />
    <p class="text-caption text-muted-foreground">{{ t.readOnly }}</p>
  </section>
</template>
