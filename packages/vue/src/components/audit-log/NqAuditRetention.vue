<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqField, NqFieldDescription, NqFieldLabel } from "../field";
import { formatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { useNasaq } from "../../provider";
import { expiringCount, type AuditEntry } from "./audit-rules";
import type { AuditRetention } from "./audit-log-types";
import type { AuditLogStrings } from "./audit-log-strings";

// Optimistic: the select moves at once and goes back if the save fails.
const props = defineProps<{
  retention: AuditRetention;
  entries: readonly AuditEntry[];
  onChange?: (days: number | null) => Promise<void | { error?: string }>;
  t: AuditLogStrings;
}>();
const locale = computed(() => useNasaq().locale.value);
const days = ref<number | null>(props.retention.days);
const busy = ref(false);
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
watch(
  () => props.retention.days,
  (d) => (days.value = d),
);

const options = computed(() => props.retention.options ?? [30, 90, 180, 365, 730, null]);
const key = (d: number | null) => (d === null ? "forever" : String(d));
const label = (d: number | null) =>
  d === null ? props.t.forever : d === 365 ? props.t.year : d % 365 === 0 ? props.t.years(formatNumber(d / 365, locale.value)) : props.t.days(formatNumber(d, locale.value));
const expiring = computed(() => expiringCount(props.entries, days.value));

async function change(v: string | number | null) {
  if (v === null || v === undefined) return;
  const next = v === "forever" ? null : Number(v);
  const previous = days.value;
  days.value = next;
  notice.value = null;
  busy.value = true;
  try {
    const result = await props.onChange?.(next);
    if (result && typeof result === "object" && result.error) throw new Error(result.error);
    notice.value = { tone: "success", text: props.t.retentionSaved };
  } catch (e) {
    days.value = previous;
    notice.value = { tone: "danger", text: e instanceof Error && e.message ? e.message : props.t.retentionFailed };
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section data-slot="audit-retention" :aria-label="props.t.retention" class="flex flex-col gap-3 rounded-card border border-border p-4">
    <NqField>
      <NqFieldLabel>{{ props.t.retention }}</NqFieldLabel>
      <NqSelect :model-value="key(days)" :disabled="!props.onChange || busy" @update:model-value="change">
        <NqSelectTrigger :aria-label="props.t.retentionAria" class="w-full sm:w-64">
          <NqSelectValue />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="d in options" :key="key(d)" :value="key(d)">{{ label(d) }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <NqFieldDescription>{{ props.t.retentionHint }}</NqFieldDescription>
    </NqField>
    <NqAlert v-if="expiring > 0" tone="warning">{{ props.t.retentionExpiring(formatNumber(expiring, locale)) }}</NqAlert>
    <NqAlert v-if="notice" :tone="notice.tone" dismissible @dismiss="notice = null">{{ notice.text }}</NqAlert>
  </section>
</template>
