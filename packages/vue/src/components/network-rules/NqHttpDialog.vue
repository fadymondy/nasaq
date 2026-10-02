<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import NqSelectField from "./NqSelectField.vue";
import { validateHttpRule, type HttpError, type HttpRule, type HttpRuleType } from "./format";
import type { NetworkStrings } from "./strings";

// The add / edit form of an HTTP rule, in a dialog. Saves to the staged list only. Internal.
const props = defineProps<{ open: boolean; rule: HttpRule | null; t: NetworkStrings }>();
const emit = defineEmits<{ "update:open": [open: boolean]; save: [rule: HttpRule] }>();

const blank = (): HttpRule => ({ id: "", type: "redirect", path: "/", status: 301 });
const draft = ref<HttpRule>(props.rule ? { ...props.rule } : blank());
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

const errors = computed(() => validateHttpRule(draft.value, { requirePassword: draft.value.type === "basic-auth" && !props.rule }));
const bad = (k: HttpError) => tried.value && errors.value.includes(k);
const typeItems = computed(() => (Object.keys(props.t.httpTypes) as HttpRuleType[]).map((k) => ({ value: k, label: props.t.httpTypes[k] })));
const statusItems = computed(() => [301, 302, 307, 308].map((c) => ({ value: String(c), label: props.t.statusLabels[c] as string })));

function setType(v: string) {
  const type = v as HttpRuleType;
  draft.value = { id: draft.value.id, type, path: draft.value.path, status: type === "redirect" ? 301 : undefined };
}
const set = (patch: Partial<HttpRule>) => (draft.value = { ...draft.value, ...patch });

function submit() {
  tried.value = true;
  if (errors.value.length) return;
  emit("save", { ...draft.value, id: props.rule?.id ?? `new-${Date.now().toString(36)}${++seq}` });
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
        <NqSelectField :label="props.t.fields.type" :model-value="draft.type" :items="typeItems" @update:model-value="setType" />
        <NqField :invalid="bad('path')">
          <NqFieldLabel>{{ props.t.fields.path }}</NqFieldLabel>
          <NqInput :model-value="draft.path" ltr @update:model-value="(v) => set({ path: String(v ?? '') })" />
          <NqFieldError v-if="bad('path')" :match="true">{{ props.t.httpErrors.path }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.fields.pathHint }}</NqFieldDescription>
        </NqField>
        <template v-if="draft.type === 'redirect'">
          <NqField :invalid="bad('target')">
            <NqFieldLabel>{{ props.t.fields.target }}</NqFieldLabel>
            <NqInput :model-value="draft.target ?? ''" ltr placeholder="https://example.com/new" @update:model-value="(v) => set({ target: String(v ?? '') })" />
            <NqFieldError v-if="bad('target')" :match="true">{{ props.t.httpErrors.target }}</NqFieldError>
          </NqField>
          <NqSelectField :label="props.t.fields.status" :model-value="String(draft.status ?? 301)" :items="statusItems" @update:model-value="(v: string) => set({ status: Number(v) as 301 })" />
        </template>
        <div v-if="draft.type === 'header'" class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="bad('name')">
            <NqFieldLabel>{{ props.t.fields.name }}</NqFieldLabel>
            <NqInput :model-value="draft.name ?? ''" ltr placeholder="X-Frame-Options" @update:model-value="(v) => set({ name: String(v ?? '') })" />
            <NqFieldError v-if="bad('name')" :match="true">{{ props.t.httpErrors.name }}</NqFieldError>
          </NqField>
          <NqField :invalid="bad('value')">
            <NqFieldLabel>{{ props.t.fields.value }}</NqFieldLabel>
            <NqInput :model-value="draft.value ?? ''" ltr placeholder="DENY" @update:model-value="(v) => set({ value: String(v ?? '') })" />
            <NqFieldError v-if="bad('value')" :match="true">{{ props.t.httpErrors.value }}</NqFieldError>
          </NqField>
        </div>
        <div v-if="draft.type === 'basic-auth'" class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="bad('username')">
            <NqFieldLabel>{{ props.t.fields.username }}</NqFieldLabel>
            <NqInput :model-value="draft.username ?? ''" ltr autocomplete="off" @update:model-value="(v) => set({ username: String(v ?? '') })" />
            <NqFieldError v-if="bad('username')" :match="true">{{ props.t.httpErrors.username }}</NqFieldError>
          </NqField>
          <NqField :invalid="bad('password')">
            <NqFieldLabel>{{ props.t.fields.password }}</NqFieldLabel>
            <NqInput :model-value="draft.password ?? ''" ltr type="password" autocomplete="new-password" @update:model-value="(v) => set({ password: String(v ?? '') })" />
            <NqFieldError v-if="bad('password')" :match="true">{{ props.t.httpErrors.password }}</NqFieldError>
            <NqFieldDescription v-else>{{ props.rule ? props.t.fields.passwordKeep : props.t.fields.passwordHint }}</NqFieldDescription>
          </NqField>
        </div>
        <NqField v-if="draft.type === 'ip-allow' || draft.type === 'ip-deny'" :invalid="bad('cidr')">
          <NqFieldLabel>{{ props.t.fields.cidr }}</NqFieldLabel>
          <NqInput :model-value="draft.cidr ?? ''" ltr placeholder="203.0.113.0/24" @update:model-value="(v) => set({ cidr: String(v ?? '') })" />
          <NqFieldError v-if="bad('cidr')" :match="true">{{ props.t.httpErrors.cidr }}</NqFieldError>
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
