<script setup lang="ts">
import { Link2, Link2Off } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq, useT } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle, NqAlertDialogTrigger } from "../alert-dialog";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqAppleLogo, NqGitHubLogo, NqGoogleLogo, NqMicrosoftLogo } from "../oauth-buttons";
import { NqStatus } from "../status";
import { NqTooltip } from "../tooltip";
import { CONNECTED_STRINGS, PROVIDER_NAMES, type ConnectedAccountsLabels, type ConnectedProvider, type ConnectedProviderId } from "./labels";

// The OAuth accounts linked to a sign-in: each provider with the connected email or username and a Connect or Disconnect
// button. The last remaining sign-in method cannot be disconnected: the button is disabled and a tooltip and a visible
// line say why. Logos are the providers' official marks.
interface Props {
  providers: readonly ConnectedProvider[];
  /** Start the OAuth redirect or popup. Resolve when done; the host then passes the updated `providers`. */
  onConnect: (id: string) => Promise<void>;
  /** Remove the link. Resolve, or resolve `{ error }` to show it. */
  onDisconnect: (id: string) => Promise<void | { error?: string }>;
  /** Sign-in methods outside this list that still work: a password counts 1, each passkey 1. Default 0. The last method cannot be disconnected. */
  otherSignInMethods?: number;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ConnectedAccountsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { otherSignInMethods: 0, labels: undefined });

const nasaq = useNasaq();
const tr = useT();
const dark = computed(() => nasaq.resolvedTheme.value === "dark");
const t = computed<ConnectedAccountsLabels>(() => ({ ...CONNECTED_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const hintId = `nq-connected-${useId()}`;
const busy = ref<string | null>(null);
const error = ref<string | null>(null);
const confirming = ref<string | null>(null);
const disconnecting = ref(false);
const total = computed(() => props.providers.filter((p) => p.connected).length + props.otherSignInMethods);

const nameOf = (p: ConnectedProvider) => p.name ?? PROVIDER_NAMES[p.id as ConnectedProviderId] ?? p.id;

async function connect(id: string) {
  if (busy.value) return;
  busy.value = id;
  error.value = null;
  try {
    await props.onConnect(id);
  } catch {
    error.value = t.value.connectFailed;
  } finally {
    busy.value = null;
  }
}

function setConfirming(id: string, open: boolean) {
  if (disconnecting.value) return;
  confirming.value = open ? id : confirming.value === id ? null : confirming.value;
}

async function disconnect(id: string) {
  disconnecting.value = true;
  error.value = null;
  try {
    const result = await props.onDisconnect(id);
    if (result && result.error) error.value = result.error;
  } catch {
    error.value = t.value.disconnectFailed;
  } finally {
    disconnecting.value = false;
    confirming.value = null;
  }
}
</script>

<template>
  <NqCard data-slot="connected-accounts" :class="cn('w-full max-w-2xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <ul :aria-label="t.list" class="overflow-hidden rounded-card border border-border">
        <li
          v-for="p in props.providers"
          :key="p.id"
          data-slot="connected-account"
          :data-provider="p.id"
          :data-connected="p.connected ? '' : undefined"
          class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0"
        >
          <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5">
            <NqGoogleLogo v-if="p.id === 'google'" />
            <NqGitHubLogo v-else-if="p.id === 'github'" :on-dark="dark" />
            <NqAppleLogo v-else-if="p.id === 'apple'" :on-dark="dark" />
            <NqMicrosoftLogo v-else-if="p.id === 'microsoft'" />
            <component :is="p.icon" v-else-if="p.icon" />
          </span>
          <div class="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
            <p class="text-label text-foreground">
              <bdi>{{ nameOf(p) }}</bdi>
            </p>
            <p v-if="p.connected && p.account" class="truncate text-caption text-muted-foreground">
              <bdi dir="ltr">{{ p.account }}</bdi>
            </p>
            <NqStatus v-else :tone="p.connected ? 'success' : 'neutral'" class="text-caption text-muted-foreground">
              {{ p.connected ? t.connected : t.notConnected }}
            </NqStatus>
            <p v-if="p.connected && total <= 1" :id="`${hintId}-${p.id}`" class="text-caption text-muted-foreground">{{ t.lastMethod }}</p>
          </div>
          <template v-if="p.connected">
            <NqTooltip v-if="total <= 1" :content="t.lastMethod" side="top">
              <NqButton
                type="button"
                size="sm"
                :aria-describedby="`${hintId}-${p.id}`"
                aria-disabled="true"
                data-disabled=""
                @click.prevent
              >
                <Link2Off aria-hidden="true" />
                {{ t.disconnect }}
                <span class="sr-only">
                  {{ " " }}
                  <bdi>{{ nameOf(p) }}</bdi>
                </span>
              </NqButton>
            </NqTooltip>
            <NqAlertDialog v-else :open="confirming === p.id" @update:open="(o: boolean) => setConfirming(p.id, o)">
              <NqAlertDialogTrigger as-child>
                <NqButton size="sm" variant="secondary">
                  <Link2Off aria-hidden="true" />
                  {{ t.disconnect }}
                  <span class="sr-only">
                    {{ " " }}
                    <bdi>{{ nameOf(p) }}</bdi>
                  </span>
                </NqButton>
              </NqAlertDialogTrigger>
              <NqAlertDialogContent>
                <NqAlertDialogHeader>
                  <NqAlertDialogTitle>{{ t.disconnectTitle(nameOf(p)) }}</NqAlertDialogTitle>
                  <NqAlertDialogDescription>{{ t.disconnectBody }}</NqAlertDialogDescription>
                </NqAlertDialogHeader>
                <NqAlertDialogFooter>
                  <NqAlertDialogCancel :disabled="disconnecting">{{ tr("Cancel", "إلغاء") }}</NqAlertDialogCancel>
                  <NqButton data-slot="confirm-button-action" variant="danger" :loading="disconnecting" @click="disconnect(p.id)">{{ t.disconnectConfirm }}</NqButton>
                </NqAlertDialogFooter>
              </NqAlertDialogContent>
            </NqAlertDialog>
          </template>
          <NqButton v-else type="button" size="sm" variant="secondary" :loading="busy === p.id" :disabled="busy !== null && busy !== p.id" @click="connect(p.id)">
            <Link2 aria-hidden="true" />
            {{ t.connect }}
            <span class="sr-only">
              {{ " " }}
              <bdi>{{ nameOf(p) }}</bdi>
            </span>
          </NqButton>
        </li>
      </ul>
    </NqCardContent>
  </NqCard>
</template>
