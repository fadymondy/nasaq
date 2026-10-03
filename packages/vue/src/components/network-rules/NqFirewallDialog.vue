<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import NqSelectField from "./NqSelectField.vue";
import { validateFirewallRule, type FirewallAction, type FirewallProtocol, type FirewallRule } from "./format";
import type { NetworkStrings } from "./strings";

// The add / edit form of a firewall rule, in a dialog. Saves to the staged list only. Internal.
const props = defineProps<{ open: boolean; rule: FirewallRule | null; t: NetworkStrings }>();
const emit = defineEmits<{ "update:open": [open: boolean]; save: [rule: FirewallRule] }>();

const blank = (): FirewallRule => ({ id: "", action: "allow", protocol: "tcp", port: "", source: "any" });
const draft = ref<FirewallRule>(props.rule ? { ...props.rule } : blank());
const tried = ref(false);
let seq = 0;

watch(
  () => [props.open, props.rule] as const,
  ([open]) => {
    if (!open) return;
    draft.value = props.rule ? { ...props.rule } : blank();
    tried.value = false;
  },
);

const errors = computed(() => validateFirewallRule(draft.value));
const hasPort = computed(() => draft.value.protocol === "tcp" || draft.value.protocol === "udp");
const actionItems = computed(() => [
  { value: "allow", label: props.t.allow },
  { value: "deny", label: props.t.deny },
]);
const protocolItems = computed(() => (["tcp", "udp", "icmp", "any"] as const).map((p) => ({ value: p, label: props.t.protocols[p] })));

function setProtocol(v: string) {
  const p = v as FirewallProtocol;
  draft.value = { ...draft.value, protocol: p, port: p === "tcp" || p === "udp" ? draft.value.port : "" };
}

function submit() {
  tried.value = true;
  if (errors.value.length) return;
  const d = draft.value;
  emit("save", { ...d, id: props.rule?.id ?? `new-${Date.now().toString(36)}${++seq}`, port: hasPort.value ? d.port.trim() : "", source: d.source.trim().toLowerCase() === "any" ? "any" : d.source.trim() });
  emit("update:open", false);
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqDialogContent data-slot="network-rule-dialog">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.rule ? props.t.ruleTitleEdit : props.t.ruleTitleNew }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.ruleBody }}</NqDialogDescription>
        </NqDialogHeader>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqSelectField :label="props.t.fields.action" :model-value="draft.action" :items="actionItems" @update:model-value="(v: string) => (draft = { ...draft, action: v as FirewallAction })" />
          <NqSelectField :label="props.t.fields.protocol" :model-value="draft.protocol" :items="protocolItems" @update:model-value="setProtocol" />
        </div>
        <NqField :invalid="tried && (errors.includes('port') || errors.includes('portForProtocol'))">
          <NqFieldLabel>{{ props.t.fields.port }}</NqFieldLabel>
          <NqInput v-model="draft.port" ltr :disabled="!hasPort" :placeholder="hasPort ? '443' : ''" />
          <NqFieldError v-if="tried && errors.includes('port')" :match="true">{{ props.t.fwErrors.port }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.fields.portHint }}</NqFieldDescription>
        </NqField>
        <NqField :invalid="tried && errors.includes('source')">
          <NqFieldLabel>{{ props.t.fields.source }}</NqFieldLabel>
          <NqInput v-model="draft.source" ltr placeholder="any" />
          <NqFieldError v-if="tried && errors.includes('source')" :match="true">{{ props.t.fwErrors.source }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.fields.sourceHint }}</NqFieldDescription>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ props.t.fields.note }}</NqFieldLabel>
          <NqInput :model-value="draft.note ?? ''" dir="auto" maxlength="80" @update:model-value="(v) => (draft = { ...draft, note: String(v ?? '') })" />
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
