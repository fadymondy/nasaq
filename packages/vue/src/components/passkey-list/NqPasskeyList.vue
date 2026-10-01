<script setup lang="ts">
import { FingerprintPattern, Plus } from "lucide-vue-next";
import { computed, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqEmptyState } from "../states";
import { isPasskeySupported, PASSKEY_STRINGS, type Passkey, type PasskeyLabels } from "./labels";
import NqPasskeyRow from "./NqPasskeyRow.vue";

// Manage the passkeys on an account: list, add, rename in place and remove with confirmation. It draws the list only.
// Your `onAdd` runs the WebAuthn ceremony and saves the credential. Shows a notice when the browser has no passkey
// support and an empty state when there are none.
interface Props {
  passkeys: readonly Passkey[];
  /** Start the WebAuthn ceremony (`navigator.credentials.create`) and save the result. Reject or throw when it fails. */
  onAdd: () => Promise<void>;
  /** Save a new name. Resolve, or resolve `{ error }` to keep the field open with a message. */
  onRename?: (id: string, name: string) => Promise<void | { error?: string }>;
  /** Delete the passkey. The confirm dialog closes when this resolves. */
  onRemove?: (id: string) => Promise<void | { error?: string }>;
  /** Override the browser check. Default: `isPasskeySupported()`, read after mount. */
  supported?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<PasskeyLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onRename: undefined, onRemove: undefined, supported: undefined, labels: undefined });

const nasaq = useNasaq();
const t = computed<PasskeyLabels>(() => ({ ...PASSKEY_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const detected = ref(true);
onMounted(() => (detected.value = isPasskeySupported()));
const ok = computed(() => props.supported ?? detected.value);
const adding = ref(false);
const error = ref<string | null>(null);

async function add() {
  if (adding.value) return;
  adding.value = true;
  error.value = null;
  try {
    await props.onAdd();
  } catch (e) {
    error.value = (e as { name?: string } | null)?.name === "NotAllowedError" ? t.value.addCancelled : t.value.addFailed;
  } finally {
    adding.value = false;
  }
}
</script>

<template>
  <NqCard data-slot="passkey-list" :class="cn('w-full max-w-2xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
      <NqCardAction v-if="props.passkeys.length">
        <NqButton type="button" variant="secondary" size="sm" :loading="adding" :disabled="!ok" @click="add"><Plus aria-hidden="true" />{{ t.add }}</NqButton>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="!ok" tone="warning" :title="t.unsupportedTitle">{{ t.unsupported }}</NqAlert>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <ul v-if="props.passkeys.length" :aria-label="t.list" class="overflow-hidden rounded-card border border-border">
        <NqPasskeyRow
          v-for="p in props.passkeys"
          :key="p.id"
          :passkey="p"
          :t="t"
          :busy="adding"
          :on-rename="props.onRename"
          :on-remove="props.onRemove"
          :on-error="(m: string) => (error = m)"
        />
      </ul>
      <NqEmptyState v-else :icon="FingerprintPattern" :title="t.emptyTitle" :description="t.emptyBody">
        <template #actions>
          <NqButton type="button" variant="primary" size="sm" :loading="adding" :disabled="!ok" @click="add"><Plus aria-hidden="true" />{{ t.add }}</NqButton>
        </template>
      </NqEmptyState>
    </NqCardContent>
  </NqCard>
</template>
