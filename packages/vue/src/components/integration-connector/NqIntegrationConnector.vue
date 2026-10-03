<script setup lang="ts">
import { Link2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqEmptyState } from "../states";
import NqIntegrationConnectDialog from "./NqIntegrationConnectDialog.vue";
import NqIntegrationServiceCard from "./NqIntegrationServiceCard.vue";
import { integrationStrings, type IntegrationConnectorLabels } from "./strings";
import type { IntegrationResult, IntegrationService } from "./types";

// Cards for the outside services a workspace connects to. Each shows its status, who authorised it, when it last
// synced, an account picker, and Connect, Reconnect or Disconnect. Connect first shows exactly which permissions
// are asked for, then hands over to your OAuth redirect. Presentational: callbacks start OAuth and the host
// passes the updated `services` back.
interface Props {
  services: readonly IntegrationService[];
  /** Start OAuth for the ticked scopes: redirect or open a popup, then resolve. Resolve `{ error }` to show it. */
  onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
  onDisconnect: (id: string) => Promise<IntegrationResult>;
  /** Show an account picker on connected services that have `accounts`. */
  onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
  /** Hide the card title and description when the host has its own page header. */
  bare?: boolean;
  /** Override any string. */
  labels?: IntegrationConnectorLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onSelectAccount: undefined, bare: false, labels: undefined });

const nq = useNasaq();
const t = computed(() => integrationStrings(nq.locale.value, props.labels));
const dialogId = ref<string | null>(null);
const error = ref<string | null>(null);
const groups = computed(() => [...new Set(props.services.map((s) => s.group ?? ""))]);
// Looked up by id, so a refreshed `services` list reaches the open dialog.
const dialogService = computed(() => (dialogId.value ? props.services.find((s) => s.id === dialogId.value) : undefined));
</script>

<template>
  <NqCard data-slot="integration-connector" :class="cn('w-full', props.class)">
    <NqCardHeader v-if="!props.bare">
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent :class="cn(props.bare && 'pt-6')">
      <NqEmptyState v-if="props.services.length === 0" :icon="Link2" :title="t.emptyTitle" :description="t.emptyBody" />
      <div v-else class="flex flex-col gap-5">
        <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>
        <section v-for="group in groups" :key="group || 'all'" class="flex flex-col gap-3" :aria-label="group || t.list">
          <h3 v-if="group" class="text-label text-muted-foreground">{{ group }}</h3>
          <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <NqIntegrationServiceCard
              v-for="s in props.services.filter((x) => (x.group ?? '') === group)"
              :key="s.id"
              :service="s"
              :t="t"
              :on-disconnect="props.onDisconnect"
              :on-select-account="props.onSelectAccount"
              @open="dialogId = s.id"
              @error="error = $event"
            />
          </ul>
        </section>
      </div>
    </NqCardContent>
    <NqIntegrationConnectDialog v-if="dialogService" :key="dialogService.id" :service="dialogService" :t="t" :on-connect="props.onConnect" @close="dialogId = null" />
  </NqCard>
</template>
