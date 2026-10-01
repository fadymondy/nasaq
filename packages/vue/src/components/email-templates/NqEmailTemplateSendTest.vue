<script setup lang="ts">
import { Send } from "lucide-vue-next";
import { ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import type { EmailTemplatesLabels } from "./strings";
import type { EmailTemplateResult } from "./types";

interface Props {
  open: boolean;
  onSend: (email: string) => Promise<EmailTemplateResult>;
  defaultEmail?: string;
  t: EmailTemplatesLabels;
}
const props = withDefaults(defineProps<Props>(), { defaultEmail: undefined });
const emit = defineEmits<{ "update:open": [open: boolean] }>();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const email = ref(props.defaultEmail ?? "");
const pending = ref(false);
const message = ref<{ tone: "danger" | "success"; text: string } | null>(null);
watch(
  () => props.open,
  (open) => {
    if (!open) message.value = null;
  },
);

async function submit() {
  if (!EMAIL_RE.test(email.value.trim())) {
    message.value = { tone: "danger", text: props.t.invalidEmail };
    return;
  }
  pending.value = true;
  message.value = null;
  try {
    const result = await props.onSend(email.value.trim());
    message.value = result && result.error ? { tone: "danger", text: result.error } : { tone: "success", text: props.t.sent };
  } catch {
    message.value = { tone: "danger", text: props.t.failed };
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => emit('update:open', next)">
    <NqDialogContent>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.sendTestTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.sendTestBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ props.t.email }}</NqFieldLabel>
          <NqInput v-model="email" type="email" ltr autocomplete="email" />
        </NqField>
        <NqAlert v-if="message" :tone="message.tone">{{ message.text }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">
            <Send aria-hidden="true" />
            {{ props.t.send }}
          </NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
