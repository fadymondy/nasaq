<script setup lang="ts">
import { computed } from "vue";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqCopyField } from "../copy-button";
import { NqSpinner } from "../spinner";
import { NqStatus, type StatusTone } from "../status";
import { analyzeDmarc, analyzeSpf, type DnsKind, type DnsStatus } from "./mail-format";
import type { MailSettingsLabels } from "./strings";
import type { DnsCheck } from "./types";

// One record of the DNS checklist: what it is for, the status, the expected value with a copy button and, when it
// isn't passing, what DNS returned. Warnings come from reading the record that was found.
interface Props {
  kind: DnsKind;
  check?: DnsCheck;
  t: MailSettingsLabels;
}
const props = defineProps<Props>();

const dnsTone: Record<DnsStatus, StatusTone> = { pass: "success", fail: "danger", missing: "danger", pending: "info" };
const status = computed<DnsStatus>(() => props.check?.status ?? "missing");
const warnings = computed(() => {
  const out: string[] = [];
  const found = props.check?.found;
  if (found) {
    if (props.kind === "spf") {
      const spf = analyzeSpf(found);
      if (spf.valid && spf.policy === "open") out.push(props.t.spfOpen);
      if (spf.valid && spf.lookups > 10) out.push(props.t.spfLookups(spf.lookups));
    }
    if (props.kind === "dmarc") {
      const dmarc = analyzeDmarc(found);
      if (dmarc.valid && dmarc.policy === "none") out.push(props.t.dmarcNone);
    }
  }
  return out;
});
</script>

<template>
  <section data-slot="mail-dns-row" :data-kind="props.kind" :data-status="status" :aria-label="props.t.kinds[props.kind]" class="flex flex-col gap-2 rounded-control border border-border p-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="flex min-w-0 flex-col">
        <span class="text-label text-foreground">{{ props.t.kinds[props.kind] }}</span>
        <span class="text-caption text-muted-foreground">{{ props.t.kindHelp[props.kind] }}</span>
      </div>
      <span v-if="status === 'pending'" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <NqSpinner /> {{ props.t.dnsStatus.pending }}
      </span>
      <NqStatus v-else :tone="dnsTone[status]">{{ props.t.dnsStatus[status] }}</NqStatus>
    </div>
    <template v-if="props.check">
      <div class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        <span>{{ props.t.recordType }}</span>
        <NqBadge variant="outline">{{ props.check.type ?? "TXT" }}</NqBadge>
        <span>{{ props.t.recordName }}</span>
        <bdi dir="ltr" class="font-mono text-code text-foreground">{{ props.check.name }}</bdi>
      </div>
      <NqCopyField :value="props.check.expected" :label="`${props.t.kinds[props.kind]}: ${props.t.expected}`" :copy-label="props.t.copyRecord" />
      <p v-if="status !== 'pass'" class="text-caption text-muted-foreground">
        {{ props.t.found }}:
        <bdi v-if="props.check.found" dir="ltr" class="font-mono text-code text-foreground break-all">{{ props.check.found }}</bdi>
        <template v-else>{{ props.t.nothingFound }}</template>
      </p>
    </template>
    <NqAlert v-for="w in warnings" :key="w" tone="warning">{{ w }}</NqAlert>
  </section>
</template>
