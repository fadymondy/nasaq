<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import type { LeadsInboxLabels } from "./strings";
import type { Lead, LeadActionResult, LeadConversion } from "./types";

// Turns a lead into a contact, and optionally a company and a deal. Internal.
const props = defineProps<{
  /** `null` closes the dialog. */
  lead: Lead | null;
  t: LeadsInboxLabels;
  onConvert: (conversion: LeadConversion) => Promise<LeadActionResult>;
}>();
const emit = defineEmits<{ close: [] }>();

const id = useId();
const name = ref("");
const withCompany = ref(false);
const company = ref("");
const withDeal = ref(false);
const deal = ref("");
const busy = ref(false);
const error = ref<string | null>(null);

watch(
  () => props.lead,
  (lead) => {
    if (!lead) return;
    name.value = lead.name;
    withCompany.value = !!lead.company;
    company.value = lead.company ?? "";
    withDeal.value = false;
    deal.value = lead.company ? `${lead.company} — ${lead.form ?? ""}`.replace(/ — $/, "") : lead.name;
    error.value = null;
  },
  { immediate: true },
);

const valid = computed(() => name.value.trim().length > 0 && (!withCompany.value || company.value.trim().length > 0) && (!withDeal.value || deal.value.trim().length > 0));

async function submit() {
  if (!valid.value) return;
  busy.value = true;
  error.value = null;
  try {
    const r = await props.onConvert({ contactName: name.value.trim(), company: withCompany.value ? company.value.trim() : undefined, deal: withDeal.value ? deal.value.trim() : undefined });
    if (r && r.error) error.value = r.error;
    else emit("close");
  } catch {
    error.value = props.t.failed;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.lead !== null" @update:open="(o: boolean) => !o && !busy && emit('close')">
    <NqDialogContent data-slot="lead-convert-dialog">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.t.convert }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.convertHint }}</NqDialogDescription>
      </NqDialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField>
          <NqFieldLabel>{{ props.t.contactName }}</NqFieldLabel>
          <NqInput v-model="name" />
        </NqField>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 text-body-sm" :for="`${id}-co`">
            <NqCheckbox :id="`${id}-co`" v-model="withCompany" />
            {{ props.t.createCompany }}
          </label>
          <NqField v-if="withCompany">
            <NqFieldLabel class="sr-only">{{ props.t.companyName }}</NqFieldLabel>
            <NqInput v-model="company" :aria-label="props.t.companyName" />
          </NqField>
        </div>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 text-body-sm" :for="`${id}-deal`">
            <NqCheckbox :id="`${id}-deal`" v-model="withDeal" />
            {{ props.t.createDeal }}
          </label>
          <NqField v-if="withDeal">
            <NqFieldLabel class="sr-only">{{ props.t.dealTitle }}</NqFieldLabel>
            <NqInput v-model="deal" :aria-label="props.t.dealTitle" />
          </NqField>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy" :disabled="!valid">{{ props.t.convertAction }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
