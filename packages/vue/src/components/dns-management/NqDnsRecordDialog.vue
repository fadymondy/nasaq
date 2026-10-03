<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { fqdn, formatTtl, isProxiable, needsPriority, relativeName, TTL_AUTO, validateRecord, type DnsErrorCode, type DnsErrors } from "./format";
import type { DnsManagementLabels } from "./strings";
import type { DnsRecord, DnsRecordInput, DnsResult } from "./types";

// The add / edit form of DnsManagement, in a dialog. Internal.
const props = defineProps<{
  open: boolean;
  editing: DnsRecord | null;
  zone: string;
  records: readonly DnsRecord[];
  types: readonly string[];
  ttlOptions: readonly number[];
  proxy: boolean;
  onSave: (input: DnsRecordInput) => Promise<DnsResult>;
  t: DnsManagementLabels;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const type = ref("A");
const name = ref("");
const content = ref("");
const ttl = ref(String(TTL_AUTO));
const priority = ref("10");
const proxied = ref(false);
const comment = ref("");
const errors = ref<DnsErrors & { form?: string }>({});
const pending = ref(false);

watch(
  () => [props.open, props.editing] as const,
  ([open]) => {
    if (!open) return;
    const e = props.editing;
    type.value = e?.type ?? props.types[0] ?? "A";
    name.value = e?.name ?? "";
    content.value = e?.content ?? "";
    ttl.value = String(e?.ttl ?? TTL_AUTO);
    priority.value = String(e?.priority ?? 10);
    proxied.value = e?.proxied ?? false;
    comment.value = e?.comment ?? "";
    errors.value = {};
  },
  { immediate: true },
);

const ttlItems = computed(() => {
  const items = props.ttlOptions.map((v) => ({ value: String(v), label: formatTtl(v, props.t.ttlUnits) }));
  if (!items.some((i) => i.value === ttl.value)) items.push({ value: ttl.value, label: formatTtl(Number(ttl.value), props.t.ttlUnits) });
  return items;
});
const canProxy = computed(() => props.proxy && isProxiable(type.value));

function pickType(v: string | number | null) {
  if (!v) return;
  type.value = String(v);
  if (!isProxiable(type.value)) proxied.value = false;
}

async function submit() {
  if (pending.value) return;
  const draft = {
    type: type.value,
    name: name.value,
    content: content.value,
    ttl: Number(ttl.value),
    priority: needsPriority(type.value) ? Number(priority.value) : undefined,
    proxied: canProxy.value ? proxied.value : false,
  };
  const found = validateRecord(draft, props.zone, props.records, props.editing?.id);
  errors.value = found;
  if (Object.keys(found).length > 0) return;
  pending.value = true;
  try {
    const result = await props.onSave({
      ...(props.editing ? { id: props.editing.id } : {}),
      type: type.value,
      name: relativeName(name.value, props.zone),
      content: content.value.trim(),
      ttl: draft.ttl,
      proxied: draft.proxied,
      ...(draft.priority !== undefined ? { priority: draft.priority } : {}),
      ...(comment.value.trim() ? { comment: comment.value.trim() } : {}),
    });
    if (result && result.error) errors.value = { form: result.error };
    else emit("update:open", false);
  } catch {
    errors.value = { form: props.t.genericError };
  } finally {
    pending.value = false;
  }
}

const err = (code?: DnsErrorCode) => (code ? props.t.errors[code] : undefined);
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !pending && emit('update:open', next)">
    <NqDialogContent data-slot="dns-record-form">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.editing ? props.t.editTitle : props.t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.formBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="errors.form" tone="danger">{{ errors.form }}</NqAlert>
        <div class="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <NqField>
            <NqFieldLabel>{{ props.t.type }}</NqFieldLabel>
            <NqSelect :model-value="type" @update:model-value="pickType">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="v in props.types" :key="v" :value="v">{{ v }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField :invalid="Boolean(errors.name)">
            <NqFieldLabel>{{ props.t.nameLabel }}</NqFieldLabel>
            <NqInput v-model="name" ltr :placeholder="props.t.namePlaceholder" autocomplete="off" :spellcheck="false" />
            <NqFieldError v-if="errors.name" :match="true">{{ err(errors.name) }}</NqFieldError>
            <NqFieldDescription v-else>{{ props.t.nameHint(fqdn(name, props.zone)) }}</NqFieldDescription>
          </NqField>
        </div>
        <NqField :invalid="Boolean(errors.content)">
          <NqFieldLabel>{{ props.t.contentLabel }}</NqFieldLabel>
          <NqInput v-model="content" ltr :placeholder="props.t.contentPlaceholder[type] ?? ''" autocomplete="off" :spellcheck="false" />
          <NqFieldError v-if="errors.content" :match="true">{{ err(errors.content) }}</NqFieldError>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField v-if="needsPriority(type)" :invalid="Boolean(errors.priority)">
            <NqFieldLabel>{{ props.t.priority }}</NqFieldLabel>
            <NqInput v-model="priority" ltr inputmode="numeric" />
            <NqFieldError v-if="errors.priority" :match="true">{{ err(errors.priority) }}</NqFieldError>
          </NqField>
          <NqField :invalid="Boolean(errors.ttl)">
            <NqFieldLabel>{{ props.t.ttlLabel }}</NqFieldLabel>
            <NqSelect :model-value="ttl" @update:model-value="(v: string | number | null) => v && (ttl = String(v))">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in ttlItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
            <NqFieldError v-if="errors.ttl" :match="true">{{ err(errors.ttl) }}</NqFieldError>
          </NqField>
        </div>
        <div v-if="props.proxy" class="flex items-start justify-between gap-4 rounded-card border border-border p-3">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span id="dns-proxy-label" class="text-label text-foreground">{{ props.t.proxyLabel }}</span>
            <span class="text-caption text-muted-foreground">{{ props.t.proxyHint }}</span>
          </div>
          <NqSwitch aria-labelledby="dns-proxy-label" :model-value="canProxy && proxied" :disabled="!isProxiable(type)" @update:model-value="(v: boolean) => (proxied = v)" />
        </div>
        <NqField>
          <NqFieldLabel>{{ props.t.commentLabel }}</NqFieldLabel>
          <NqInput v-model="comment" :placeholder="props.t.commentPlaceholder" maxlength="100" autocomplete="off" />
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.editing ? props.t.save : props.t.saveAdd }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
