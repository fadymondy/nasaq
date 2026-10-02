<script setup lang="ts">
import { Send } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import type { CampaignComposerLabels } from "./strings";
import type { CampaignDraft, CampaignResult } from "./types";

// Internal: the "Send a test" dialog of the campaign composer.
interface Props {
  draft: CampaignDraft;
  t: CampaignComposerLabels;
  defaultTo?: string;
  onSendTest: (to: string) => Promise<CampaignResult>;
}
const props = withDefaults(defineProps<Props>(), { defaultTo: undefined });
const emit = defineEmits<{ close: [] }>();

const to = ref(props.defaultTo ?? "");
const busy = ref(false);
const note = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const isEmail = computed(() => props.draft.channel === "email");
const valid = computed(() => (isEmail.value ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.value.trim()) : /^\+?[\d\s-]{7,}$/.test(to.value.trim())));

async function submit() {
  if (!valid.value) {
    note.value = { tone: "danger", text: props.t.testInvalid };
    return;
  }
  busy.value = true;
  note.value = null;
  try {
    const r = await props.onSendTest(to.value.trim());
    note.value = r && r.error ? { tone: "danger", text: r.error } : { tone: "success", text: props.t.testSent };
  } catch {
    note.value = { tone: "danger", text: props.t.failed };
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog open @update:open="(o: boolean) => !o && !busy && emit('close')">
    <NqDialogContent>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.testTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ isEmail ? props.t.testEmail : props.t.testWhatsapp }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ props.t.testTo(props.draft.channel) }}</NqFieldLabel>
          <NqInput v-model="to" ltr :type="isEmail ? 'email' : 'tel'" autofocus />
        </NqField>
        <NqAlert v-if="note" :tone="note.tone">{{ note.text }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy">
            <Send aria-hidden="true" class="rtl:-scale-x-100" />
            {{ props.t.sendTest }}
          </NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
