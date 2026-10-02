<script setup lang="ts">
import { Ban, Send, UserPlus } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqActivityCell } from "../entity-list";
import { NqTextarea } from "../field";
import { NqCannedPicker, type CannedSnippet } from "../inbox";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetHeader, NqSheetTitle } from "../sheet";
import { canConvertLead, canMoveLead, LEAD_PIPELINE, type LeadStatus } from "./leads-inbox-logic";
import NqLeadAttributionList from "./NqLeadAttributionList.vue";
import NqLeadPipelineStepper from "./NqLeadPipelineStepper.vue";
import NqLeadSourceBadge from "./NqLeadSourceBadge.vue";
import NqLeadStatusBadge from "./NqLeadStatusBadge.vue";
import type { LeadsInboxLabels } from "./strings";
import type { Lead, LeadActionResult } from "./types";

// The side panel of one lead: stage, actions, message, attribution and the reply composer. Internal.
const props = defineProps<{
  lead: Lead;
  t: LeadsInboxLabels;
  canned?: readonly CannedSnippet[];
  onStatusChange?: (lead: Lead, status: LeadStatus) => Promise<LeadActionResult>;
  onConvert?: unknown;
  onReply?: (lead: Lead, message: string) => Promise<LeadActionResult>;
}>();
const emit = defineEmits<{ close: []; startConvert: [] }>();

const id = useId();
const text = ref("");
const busy = ref(false);
const note = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const moveError = ref<string | null>(null);

async function move(status: LeadStatus) {
  if (!props.onStatusChange) return;
  moveError.value = null;
  try {
    const r = await props.onStatusChange(props.lead, status);
    if (r && r.error) moveError.value = r.error;
  } catch {
    moveError.value = props.t.failed;
  }
}

async function send() {
  if (!props.onReply || !text.value.trim()) return;
  busy.value = true;
  note.value = null;
  try {
    const r = await props.onReply(props.lead, text.value.trim());
    if (r && r.error) note.value = { tone: "danger", text: r.error };
    else {
      note.value = { tone: "success", text: props.t.sent };
      text.value = "";
    }
  } catch {
    note.value = { tone: "danger", text: props.t.failed };
  } finally {
    busy.value = false;
  }
}

const nextStages = computed(() => LEAD_PIPELINE.filter((s) => s !== "converted" && canMoveLead(props.lead.status, s)));
const firstName = computed(() => props.lead.name.split(" ")[0] ?? "");
const pick = (body: string) => (text.value = text.value ? `${text.value}\n${body}` : body);
</script>

<template>
  <NqSheet open @update:open="(o: boolean) => !o && emit('close')">
    <NqSheetContent side="end" class="w-[min(34rem,100vw)]">
      <NqSheetHeader>
        <NqSheetTitle dir="auto">{{ props.lead.name }}</NqSheetTitle>
        <NqSheetDescription>
          <span class="inline-flex flex-wrap items-center gap-2">
            <NqLeadStatusBadge :status="props.lead.status" :labels="props.t" />
            <NqActivityCell :value="props.lead.receivedAt" />
          </span>
        </NqSheetDescription>
      </NqSheetHeader>
      <NqSheetBody class="flex flex-col gap-5">
        <NqLeadPipelineStepper :status="props.lead.status" :t="props.t" />
        <NqAlert v-if="moveError" tone="danger">{{ moveError }}</NqAlert>

        <div class="flex flex-wrap gap-2">
          <NqButton v-if="props.onConvert && canConvertLead(props.lead.status)" variant="primary" size="sm" @click="emit('startConvert')">
            <UserPlus aria-hidden="true" />
            {{ props.t.convert }}
          </NqButton>
          <template v-if="props.onStatusChange">
            <NqButton v-for="s in nextStages" :key="s" variant="secondary" size="sm" @click="move(s)">{{ props.t.moveTo(props.t.statuses[s]) }}</NqButton>
          </template>
          <NqButton v-if="props.onStatusChange && props.lead.status !== 'converted'" variant="ghost" size="sm" @click="move(props.lead.status === 'spam' ? 'new' : 'spam')">
            <Ban aria-hidden="true" />
            {{ props.lead.status === "spam" ? props.t.notSpam : props.t.markSpam }}
          </NqButton>
        </div>

        <section
          v-if="props.lead.status === 'converted' && (props.lead.contact || props.lead.companyRef || props.lead.deal)"
          :aria-label="props.t.converted"
          class="flex flex-col gap-2 rounded-card border border-nq-success/40 bg-nq-success-soft p-3 text-body-sm"
        >
          <span class="text-label text-nq-success-text">{{ props.t.converted }}</span>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <template v-if="props.lead.contact"><dt class="text-muted-foreground">{{ props.t.contactRef }}</dt><dd dir="auto">{{ props.lead.contact.name }}</dd></template>
            <template v-if="props.lead.companyRef"><dt class="text-muted-foreground">{{ props.t.companyRef }}</dt><dd dir="auto">{{ props.lead.companyRef.name }}</dd></template>
            <template v-if="props.lead.deal"><dt class="text-muted-foreground">{{ props.t.dealRef }}</dt><dd dir="auto">{{ props.lead.deal.name }}</dd></template>
          </dl>
        </section>

        <section :aria-label="props.t.message" class="flex flex-col gap-2">
          <h3 class="text-label text-foreground">{{ props.t.message }}</h3>
          <p v-if="props.lead.message" dir="auto" class="whitespace-pre-wrap rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm">{{ props.lead.message }}</p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
            <template v-if="props.lead.email"><dt class="text-muted-foreground">Email</dt><dd><bdi dir="ltr">{{ props.lead.email }}</bdi></dd></template>
            <template v-if="props.lead.phone"><dt class="text-muted-foreground">Phone</dt><dd><bdi dir="ltr">{{ props.lead.phone }}</bdi></dd></template>
            <template v-if="props.lead.company"><dt class="text-muted-foreground">{{ props.t.companyRef }}</dt><dd dir="auto">{{ props.lead.company }}</dd></template>
            <template v-if="props.lead.budget"><dt class="text-muted-foreground">{{ props.t.budget }}</dt><dd dir="auto">{{ props.lead.budget }}</dd></template>
            <template v-if="props.lead.form"><dt class="text-muted-foreground">{{ props.t.form }}</dt><dd dir="auto">{{ props.lead.form }}</dd></template>
          </dl>
        </section>

        <section :aria-label="props.t.attribution" class="flex flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <h3 class="text-label text-foreground">{{ props.t.attribution }}</h3>
            <p class="text-caption text-muted-foreground">{{ props.t.attributionHint }}</p>
          </div>
          <NqLeadSourceBadge :attribution="props.lead.attribution" :labels="props.t" />
          <NqLeadAttributionList :attribution="props.lead.attribution" :labels="props.t" />
        </section>

        <section v-if="props.onReply" :aria-label="props.t.reply" class="flex flex-col gap-2">
          <label :for="`${id}-reply`" class="text-label text-foreground">{{ props.t.replyLabel }}</label>
          <NqAlert v-if="note" :tone="note.tone">{{ note.text }}</NqAlert>
          <NqTextarea :id="`${id}-reply`" v-model="text" :rows="4" :placeholder="props.t.replyPlaceholder" />
          <div class="flex items-center justify-between gap-2">
            <NqCannedPicker v-if="props.canned?.length" :snippets="props.canned" :variables="{ name: firstName }" side="bottom" :on-pick="pick" />
            <span v-else />
            <NqButton variant="primary" size="sm" :loading="busy" :disabled="!text.trim()" @click="send">
              <Send aria-hidden="true" class="rtl:-scale-x-100" />
              {{ props.t.send }}
            </NqButton>
          </div>
        </section>
      </NqSheetBody>
    </NqSheetContent>
  </NqSheet>
</template>
