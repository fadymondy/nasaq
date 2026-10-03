<script setup lang="ts">
import { ExternalLink, Link2 } from "lucide-vue-next";
import { computed } from "vue";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqButton } from "../button";
import { NqField, NqFieldLabel } from "../field";
import { NqDateTime } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqStatus, type StatusTone } from "../status";
import type { IntegrationConnectorStrings } from "./strings";
import type { IntegrationResult, IntegrationService, IntegrationStatus } from "./types";

// One service: status, who authorised it, last sync, the account picker, and Connect / Reconnect / Disconnect.
interface Props {
  service: IntegrationService;
  t: IntegrationConnectorStrings;
  onDisconnect: (id: string) => Promise<IntegrationResult>;
  onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
}
const props = withDefaults(defineProps<Props>(), { onSelectAccount: undefined });
const emit = defineEmits<{ open: []; error: [message: string] }>();

const tone: Record<IntegrationStatus, StatusTone> = { disconnected: "neutral", connected: "success", "needs-reauth": "warning", error: "danger", pending: "info" };
const connected = computed(() => ["connected", "needs-reauth", "error"].includes(props.service.status));
const pending = computed(() => props.service.status === "pending");
const granted = computed(() => props.service.grantedScopes ?? props.service.scopes.map((s) => s.id));
const hasAccounts = computed(() => (props.service.accounts ?? []).length > 0);

async function pickAccount(v: string | number | null) {
  if (v === null || v === "" || !props.onSelectAccount) return;
  try {
    const result = await props.onSelectAccount(props.service.id, String(v));
    if (result?.error) emit("error", result.error);
  } catch {
    emit("error", props.t.genericError);
  }
}
async function disconnect() {
  try {
    const result = await props.onDisconnect(props.service.id);
    if (result?.error) emit("error", result.error);
  } catch {
    emit("error", props.t.genericError);
  }
}
</script>

<template>
  <li
    data-slot="integration-service"
    :data-service="props.service.id"
    :data-status="props.service.status"
    class="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <span v-if="props.service.icon" class="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-6" aria-hidden="true">
          <component :is="props.service.icon" />
        </span>
        <div class="flex min-w-0 flex-col">
          <h3 class="truncate text-label text-foreground" dir="auto">{{ props.service.name }}</h3>
          <NqStatus :tone="tone[props.service.status]" class="text-caption">{{ props.t.status[props.service.status] }}</NqStatus>
        </div>
      </div>
    </div>
    <p v-if="props.service.description" class="text-body-sm text-muted-foreground">{{ props.service.description }}</p>
    <NqAlert v-if="props.service.message && (props.service.status === 'error' || props.service.status === 'needs-reauth')" :tone="props.service.status === 'error' ? 'danger' : 'warning'">{{ props.service.message }}</NqAlert>
    <dl v-if="connected" class="grid gap-1 text-caption text-muted-foreground">
      <div v-if="props.service.connectedAs" class="flex flex-wrap gap-1">
        <dt>{{ props.t.connectedAs }}</dt>
        <dd dir="ltr" class="text-foreground"><bdi>{{ props.service.connectedAs }}</bdi></dd>
      </div>
      <div class="flex flex-wrap gap-1">
        <dt>{{ props.t.lastSync }}</dt>
        <dd>
          <template v-if="props.service.lastSyncAt == null">{{ props.t.never }}</template>
          <NqDateTime v-else :value="props.service.lastSyncAt" relative />
        </dd>
      </div>
      <div class="flex flex-wrap gap-1">
        <dt>{{ props.t.permissions }}</dt>
        <dd>{{ props.t.permissionsCount(granted.length) }}</dd>
      </div>
    </dl>
    <NqField v-if="connected && hasAccounts && props.onSelectAccount">
      <NqFieldLabel>{{ props.t.account }}</NqFieldLabel>
      <NqSelect :model-value="props.service.accountId ?? null" @update:model-value="pickAccount">
        <NqSelectTrigger :aria-label="`${props.service.name}: ${props.t.account}`"><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="a in props.service.accounts" :key="a.id" :value="a.id">
            <span class="flex min-w-0 flex-col">
              <span class="truncate" dir="auto">{{ a.name }}</span>
              <span v-if="a.detail" class="truncate text-caption text-muted-foreground" dir="ltr">{{ a.detail }}</span>
            </span>
          </NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </NqField>
    <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
      <NqButton v-if="!connected" type="button" variant="primary" size="sm" :loading="pending" @click="emit('open')">
        <Link2 aria-hidden="true" />
        {{ props.t.connect }}
      </NqButton>
      <template v-else>
        <NqButton v-if="props.service.status !== 'connected'" type="button" variant="primary" size="sm" @click="emit('open')">{{ props.t.reconnect }}</NqButton>
        <NqButton v-else type="button" size="sm" @click="emit('open')">{{ props.t.manage }}</NqButton>
        <NqConfirmButton size="sm" variant="danger" :title="props.t.disconnectTitle(props.service.name)" :description="props.t.disconnectBody" :confirm-label="props.t.disconnectConfirm" :on-confirm="disconnect">
          {{ props.t.disconnect }}
        </NqConfirmButton>
      </template>
      <a
        v-if="props.service.learnMoreHref"
        :href="props.service.learnMoreHref"
        target="_blank"
        rel="noreferrer"
        class="ms-auto inline-flex items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {{ props.t.permissions }}
        <ExternalLink aria-hidden="true" class="size-3" />
      </a>
    </div>
  </li>
</template>
