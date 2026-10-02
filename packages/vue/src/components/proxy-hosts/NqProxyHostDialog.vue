<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { parseHosts, tlsModeAllowsWebsockets, validateProxyHost, type TlsMode } from "./proxy-format";
import type { ProxyHost, ProxyHostInput, ProxyHostsResult, ProxyHostsStrings } from "./strings";

// The add / edit form of a proxy host, in a dialog. Internal.
const props = defineProps<{
  /** `"new"` to add, a host to edit, `null` closed. */
  target: ProxyHost | "new" | null;
  t: ProxyHostsStrings;
  onSave: (input: ProxyHostInput, id?: string) => Promise<ProxyHostsResult>;
}>();
const emit = defineEmits<{ close: [] }>();

const hostsText = ref("");
const upstream = ref("");
const tlsMode = ref<TlsMode>("auto");
const websockets = ref(false);
const enabled = ref(true);
const tried = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const editing = computed(() => (props.target && props.target !== "new" ? props.target : null));

watch(
  () => props.target,
  (target) => {
    if (!target) return;
    const host = target === "new" ? null : target;
    hostsText.value = host ? host.hosts.join("\n") : "";
    upstream.value = host?.upstream ?? "";
    tlsMode.value = host?.tlsMode ?? "auto";
    websockets.value = host?.websockets ?? false;
    enabled.value = host?.enabled ?? true;
    tried.value = false;
    error.value = null;
  },
  { immediate: true },
);

const hosts = computed(() => parseHosts(hostsText.value));
const errors = computed(() => validateProxyHost({ hosts: hosts.value, upstream: upstream.value }));
const wsAllowed = computed(() => tlsModeAllowsWebsockets(tlsMode.value));
const tlsModes = computed(() => Object.keys(props.t.tlsModes) as TlsMode[]);

async function submit() {
  tried.value = true;
  if (errors.value.length) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await props.onSave(
      { hosts: hosts.value, upstream: upstream.value.trim(), tlsMode: tlsMode.value, websockets: wsAllowed.value && websockets.value, enabled: enabled.value },
      editing.value?.id,
    );
    if (result && result.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.genericError;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.target !== null" @update:open="(o: boolean) => !o && !saving && emit('close')">
    <NqDialogContent data-slot="proxy-host-dialog">
      <form class="grid gap-4" novalidate @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ editing ? props.t.dialogEdit : props.t.dialogNew }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.dialogBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField :invalid="tried && errors.includes('hosts')">
          <NqFieldLabel>{{ props.t.hosts }}</NqFieldLabel>
          <NqTextarea v-model="hostsText" dir="ltr" rows="3" placeholder="app.example.com" class="font-mono text-body-sm" />
          <NqFieldError v-if="tried && errors.includes('hosts')" :match="true">{{ props.t.errors.hosts }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.hostsHint }}</NqFieldDescription>
        </NqField>
        <NqField :invalid="tried && errors.includes('upstream')">
          <NqFieldLabel>{{ props.t.upstream }}</NqFieldLabel>
          <NqInput v-model="upstream" ltr placeholder="http://10.0.0.5:3000" />
          <NqFieldError v-if="tried && errors.includes('upstream')" :match="true">{{ props.t.errors.upstream }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.upstreamHint }}</NqFieldDescription>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ props.t.tls }}</NqFieldLabel>
          <NqSelect :model-value="tlsMode" @update:model-value="(v: string | number | null) => v && (tlsMode = v as TlsMode)">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="m in tlsModes" :key="m" :value="m">{{ props.t.tlsModes[m] }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
          <NqFieldDescription>{{ props.t.tlsHint[tlsMode] }}</NqFieldDescription>
        </NqField>
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p id="proxy-ws" class="text-label text-foreground">{{ props.t.websockets }}</p>
            <p class="text-body-sm text-muted-foreground">{{ props.t.websocketsHint }}</p>
          </div>
          <NqSwitch aria-labelledby="proxy-ws" :model-value="wsAllowed && websockets" :disabled="!wsAllowed" @update:model-value="(v: boolean) => (websockets = v)" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <p id="proxy-enabled" class="text-label text-foreground">{{ props.t.enabled }}</p>
          <NqSwitch v-model="enabled" aria-labelledby="proxy-enabled" />
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="saving" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="saving">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
