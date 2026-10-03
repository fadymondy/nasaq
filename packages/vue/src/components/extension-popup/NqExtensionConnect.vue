<script setup lang="ts">
import { CircleAlert, Link2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { isServerAddress, useExtensionStrings, type ExtensionPopupLabels } from "./strings";

// The first-run form. The address (or code) is left-to-right in Arabic. A failure announces itself as an alert.
interface Props {
  /** `server`: type the server address then sign in. `pair`: type the short code the app shows. */
  mode?: "server" | "pair";
  defaultServer?: string;
  /** Resolve with `{ error }` to show a message under the form. */
  onConnect: (values: { server: string; code: string }) => Promise<void | { error?: string }>;
  labels?: ExtensionPopupLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { mode: "server", defaultServer: "", labels: undefined });
const { t } = useExtensionStrings(() => props.labels);
const server = ref(props.defaultServer);
const code = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const pair = computed(() => props.mode === "pair");

async function submit() {
  if (pair.value ? code.value.trim().length !== 6 : !isServerAddress(server.value)) {
    error.value = pair.value ? t.value.invalidCode : t.value.invalidServer;
    return;
  }
  error.value = null;
  busy.value = true;
  try {
    const result = await props.onConnect({ server: server.value.trim(), code: code.value.trim() });
    if (result?.error) error.value = result.error;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form data-slot="extension-connect" :class="cn('flex flex-col gap-3', props.class)" novalidate @submit.prevent="submit">
    <div class="flex flex-col gap-1">
      <h2 class="flex items-center gap-2 text-h3 text-foreground">
        <Link2 aria-hidden="true" class="size-4 text-muted-foreground" />
        {{ pair ? t.pairTitle : t.connectTitle }}
      </h2>
      <p class="text-caption text-muted-foreground">{{ pair ? t.pairHint : t.connectHint }}</p>
    </div>
    <NqField v-if="pair">
      <NqFieldLabel>{{ t.codeLabel }}</NqFieldLabel>
      <NqInput
        ltr
        :model-value="code"
        maxlength="6"
        autocomplete="one-time-code"
        inputmode="text"
        class="font-mono tracking-[0.3em] uppercase"
        @update:model-value="code = String($event ?? '').toUpperCase()"
      />
    </NqField>
    <NqField v-else>
      <NqFieldLabel>{{ t.serverLabel }}</NqFieldLabel>
      <NqInput v-model="server" ltr type="url" :placeholder="t.serverPlaceholder" />
    </NqField>
    <NqButton type="submit" variant="primary" :loading="busy">{{ pair ? t.pair : t.connect }}</NqButton>
    <p v-if="error" role="alert" class="flex items-start gap-1.5 text-caption text-nq-danger-text">
      <CircleAlert aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
      {{ error }}
    </p>
  </form>
</template>
