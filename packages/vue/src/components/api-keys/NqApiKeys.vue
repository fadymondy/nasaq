<script setup lang="ts">
import { KeyRound, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import NqApiKeyCreate from "./NqApiKeyCreate.vue";
import NqApiKeyReveal from "./NqApiKeyReveal.vue";
import { type ApiKeyStatus, daysLeft, keyStatus, maskKey } from "./format";
import { STRINGS, type ApiKeysLabels } from "./strings";
import type { ApiKeyCreateInput, ApiKeyRecord, ApiKeyScope, ApiKeySecretResult } from "./types";

// Create, list, rotate and revoke API keys. Creating asks for a name, scopes and an expiry, then shows the
// secret once in a dialog with a copy button. After that the list only ever shows the masked key (prefix
// and last four characters), the scopes, when it was last used, and when it expires. Revoke and rotate
// ask first. It is presentational: your callbacks talk to the server and return the secret.
interface Props {
  keys: readonly ApiKeyRecord[];
  /** Every scope a key can be given. */
  scopes: readonly ApiKeyScope[];
  /** Scopes ticked when the create form opens. Default: none. */
  defaultScopes?: readonly string[];
  /** Expiry choices in days; `null` is "never". Default 7, 30, 90, 365 days and never. */
  expiryOptions?: readonly (number | null)[];
  /** The expiry preselected in the form. Default 90. */
  defaultExpiryDays?: number | null;
  /** Make the key. Resolve `{ secret }` (shown once) or `{ error }`. The host then passes the updated `keys`. */
  onCreate: (input: ApiKeyCreateInput) => Promise<ApiKeySecretResult>;
  /** Replace the secret of a key. Resolve `{ secret }` or `{ error }`. */
  onRotate?: (id: string) => Promise<ApiKeySecretResult>;
  /** Revoke a key. Resolve, or resolve `{ error }` to show it. */
  onRevoke?: (id: string) => Promise<void | { error?: string }>;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ApiKeysLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  defaultScopes: () => [],
  expiryOptions: () => [7, 30, 90, 365, null],
  defaultExpiryDays: 90,
  onRotate: undefined,
  onRevoke: undefined,
  labels: undefined,
});

const nasaq = useNasaq();
const t = computed<ApiKeysLabels>(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const statusTone: Record<ApiKeyStatus, StatusTone> = { active: "success", expiring: "warning", expired: "danger", revoked: "neutral" };

const creating = ref(false);
const reveal = ref<{ title: string; secret: string } | null>(null);
const error = ref<string | null>(null);
const scopeLabel = (id: string) => props.scopes.find((s) => s.id === id)?.label ?? id;

async function rotate(key: ApiKeyRecord) {
  error.value = null;
  try {
    const result = await props.onRotate?.(key.id);
    if (!result) return;
    if (result.error !== undefined) error.value = result.error;
    else reveal.value = { title: t.value.revealRotated(key.name), secret: result.secret };
  } catch {
    error.value = t.value.genericError;
  }
}

async function revoke(key: ApiKeyRecord) {
  error.value = null;
  try {
    const result = await props.onRevoke?.(key.id);
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  }
}
</script>

<template>
  <NqCard data-slot="api-keys" :class="cn('w-full max-w-4xl', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex flex-col gap-1.5">
        <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
        <NqCardDescription>{{ t.description }}</NqCardDescription>
      </div>
      <NqButton type="button" variant="primary" class="mt-3 sm:mt-0" @click="creating = true">
        <Plus aria-hidden="true" />
        {{ t.create }}
      </NqButton>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>
      <NqEmptyState v-if="props.keys.length === 0" :icon="KeyRound" :title="t.emptyTitle" :description="t.emptyBody" />
      <ul v-else :aria-label="t.list" class="overflow-hidden rounded-card border border-border">
        <li
          v-for="key in props.keys"
          :key="key.id"
          data-slot="api-key"
          :data-status="keyStatus(key)"
          class="flex flex-col gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between"
        >
          <div class="flex min-w-0 flex-col gap-2">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                :class="cn('text-label text-foreground', (keyStatus(key) === 'revoked' || keyStatus(key) === 'expired') && 'text-muted-foreground line-through decoration-1')"
                dir="auto"
              >{{ key.name }}</span>
              <NqStatus :tone="statusTone[keyStatus(key)]">{{ t.status[keyStatus(key)] }}</NqStatus>
            </div>
            <code dir="ltr" data-slot="api-key-masked" class="w-fit max-w-full truncate text-start font-mono text-code text-muted-foreground">{{ maskKey(key.prefix, key.last4) }}</code>
            <ul :aria-label="t.scopes" class="flex flex-wrap gap-1">
              <li v-for="s in key.scopes" :key="s">
                <NqBadge variant="outline">{{ scopeLabel(s) }}</NqBadge>
              </li>
            </ul>
            <dl class="flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted-foreground">
              <div class="flex gap-1">
                <dt>{{ t.createdAt }}</dt>
                <dd><NqDateTime :value="key.createdAt" :format="{ dateStyle: 'medium' }" /></dd>
              </div>
              <div class="flex gap-1">
                <dt>{{ t.lastUsed }}</dt>
                <dd>
                  <template v-if="key.lastUsedAt == null">{{ t.neverUsed }}</template>
                  <NqDateTime v-else :value="key.lastUsedAt" relative />
                </dd>
              </div>
              <div class="flex gap-1">
                <dt>{{ keyStatus(key) === "expired" ? t.expiredOn : t.expires }}</dt>
                <dd>
                  <template v-if="key.expiresAt == null">{{ t.neverExpires }}</template>
                  <template v-else-if="keyStatus(key) === 'expiring' && daysLeft(key.expiresAt) != null">{{ t.expiresIn(daysLeft(key.expiresAt) as number) }}</template>
                  <NqDateTime v-else :value="key.expiresAt" :format="{ dateStyle: 'medium' }" />
                </dd>
              </div>
            </dl>
          </div>
          <div v-if="keyStatus(key) !== 'revoked'" role="group" :aria-label="t.actionsFor(key.name)" class="flex shrink-0 flex-wrap gap-2">
            <NqConfirmButton
              v-if="props.onRotate"
              size="sm"
              variant="secondary"
              :title="t.rotateTitle(key.name)"
              :description="t.rotateBody"
              :confirm-label="t.rotateConfirm"
              :on-confirm="() => rotate(key)"
            >
              <RefreshCw aria-hidden="true" />
              {{ t.rotate }}
            </NqConfirmButton>
            <NqConfirmButton
              v-if="props.onRevoke"
              size="sm"
              variant="danger"
              :title="t.revokeTitle(key.name)"
              :description="t.revokeBody"
              :confirm-label="t.revokeConfirm"
              :on-confirm="() => revoke(key)"
            >
              <Trash2 aria-hidden="true" />
              {{ t.revoke }}
            </NqConfirmButton>
          </div>
          <ShieldAlert v-else aria-hidden="true" class="hidden size-4 shrink-0 text-muted-foreground sm:block" />
        </li>
      </ul>
    </NqCardContent>
    <NqApiKeyCreate
      v-model:open="creating"
      :scopes="props.scopes"
      :default-scopes="props.defaultScopes"
      :expiry-options="props.expiryOptions"
      :default-expiry-days="props.defaultExpiryDays"
      :on-create="props.onCreate"
      :t="t"
      @created="(secret: string) => (reveal = { title: t.revealTitle, secret })"
    />
    <NqApiKeyReveal :reveal="reveal" :t="t" @close="reveal = null" />
  </NqCard>
</template>
