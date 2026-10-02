<script setup lang="ts">
import { Minus, Plus } from "lucide-vue-next";
import { NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqDateTime, formatNumber } from "../numeric";
import { changeKind, formatChangeValue, type AuditEntry } from "./audit-rules";
import type { AuditLogStrings } from "./audit-log-strings";

// The body of the details dialog: the entry's facts and the field-level before and after table.
// Every change row says added, removed or changed in words, and the signs mirror colour.
const props = defineProps<{
  entry: AuditEntry;
  t: AuditLogStrings;
  actionName: (id: string) => string;
  entityName: (id: string) => string;
}>();
const locale = computed(() => useNasaq().locale.value);
const kindLabel = computed(() => ({ added: props.t.added, removed: props.t.removed, changed: props.t.changed }));
const changes = computed(() =>
  (props.entry.changes ?? []).map((c) => ({ field: c.field, kind: changeKind(c), before: formatChangeValue(c.before), after: formatChangeValue(c.after) })),
);
</script>

<template>
  <NqDialogHeader>
    <NqDialogTitle>{{ props.actionName(props.entry.action) }}</NqDialogTitle>
    <NqDialogDescription>
      {{ props.entry.actor?.name ?? props.t.system }} · <NqDateTime :value="props.entry.at" :format="{ dateStyle: 'long', timeStyle: 'medium' }" />
    </NqDialogDescription>
  </NqDialogHeader>
  <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-body-sm">
    <dt class="text-muted-foreground">{{ props.t.action }}</dt>
    <dd>
      <bdi dir="ltr" class="font-mono">{{ props.entry.action }}</bdi>
    </dd>
    <dt class="text-muted-foreground">{{ props.t.entity }}</dt>
    <dd>
      {{ props.entry.entity.label ?? props.entityName(props.entry.entity.type) }}
      <span class="text-muted-foreground"> · {{ props.entityName(props.entry.entity.type) }}</span>
    </dd>
    <dt class="text-muted-foreground">{{ props.t.channel }}</dt>
    <dd>{{ props.t.channels[props.entry.channel] }}</dd>
    <template v-if="props.entry.ip">
      <dt class="text-muted-foreground">{{ props.t.ip }}</dt>
      <dd>
        <bdi dir="ltr" class="font-mono">{{ props.entry.ip }}</bdi>
      </dd>
    </template>
  </dl>
  <section :aria-label="props.t.changes" class="flex flex-col gap-2">
    <h3 class="text-label text-foreground">
      {{ props.t.changes }}
      <span v-if="changes.length" class="font-normal text-muted-foreground"> · {{ props.t.fieldCount(formatNumber(changes.length, locale)) }}</span>
    </h3>
    <div v-if="changes.length" class="overflow-x-auto rounded-card border border-border">
      <table class="w-full text-body-sm" data-slot="audit-changes">
        <thead class="bg-secondary text-start text-caption text-muted-foreground">
          <tr>
            <th scope="col" class="px-3 py-2 text-start font-medium">{{ props.t.field }}</th>
            <th scope="col" class="px-3 py-2 text-start font-medium">{{ props.t.before }}</th>
            <th scope="col" class="px-3 py-2 text-start font-medium">{{ props.t.after }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="c in changes" :key="c.field" :data-kind="c.kind" class="align-top">
            <th scope="row" class="px-3 py-2 text-start font-normal">
              <bdi dir="ltr" class="font-mono text-caption text-foreground">{{ c.field }}</bdi>
              <span class="mt-0.5 block text-caption text-muted-foreground">{{ kindLabel[c.kind] }}</span>
            </th>
            <td class="px-3 py-2">
              <span v-if="c.kind === 'added'" class="text-muted-foreground">{{ props.t.empty_value }}</span>
              <span v-else class="inline-flex items-start gap-1 rounded-[4px] bg-nq-danger-soft px-1.5 py-0.5 text-nq-danger-text">
                <Minus aria-hidden="true" class="mt-0.5 size-3 shrink-0" />
                <bdi dir="auto" class="break-all">{{ c.before || props.t.empty_value }}</bdi>
              </span>
            </td>
            <td class="px-3 py-2">
              <span v-if="c.kind === 'removed'" class="text-muted-foreground">{{ props.t.empty_value }}</span>
              <span v-else class="inline-flex items-start gap-1 rounded-[4px] bg-nq-success-soft px-1.5 py-0.5 text-nq-success-text">
                <Plus aria-hidden="true" class="mt-0.5 size-3 shrink-0" />
                <bdi dir="auto" class="break-all">{{ c.after || props.t.empty_value }}</bdi>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="text-body-sm text-muted-foreground">{{ props.t.noChanges }}</p>
  </section>
</template>
