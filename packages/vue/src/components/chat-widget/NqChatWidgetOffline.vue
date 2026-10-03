<script setup lang="ts">
import { CircleCheck } from "lucide-vue-next";
import { computed, reactive, ref } from "vue";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import type { ChatWidgetLabels } from "./labels";
import type { WidgetOfflineForm, WidgetResult } from "./types";

// The leave-a-message form shown outside business hours (data-slot="chat-widget-offline"), then a thank-you (data-slot="chat-widget-sent").
const props = defineProps<{
  t: ChatWidgetLabels;
  onSubmit: (form: WidgetOfflineForm) => Promise<WidgetResult>;
}>();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const form = reactive<WidgetOfflineForm>({ name: "", email: "", message: "" });
const touched = ref(false);
const busy = ref(false);
const error = ref("");
const sent = ref(false);

const errors = computed(() => ({
  name: form.name.trim() ? "" : props.t.formRequired,
  email: !form.email.trim() ? props.t.formRequired : EMAIL.test(form.email.trim()) ? "" : props.t.formInvalidEmail,
  message: form.message.trim() ? "" : props.t.formRequired,
}));
const invalid = computed(() => Object.values(errors.value).some(Boolean));
const shown = (k: keyof typeof errors.value) => (touched.value ? errors.value[k] : "");

async function submit() {
  touched.value = true;
  if (invalid.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const r = await props.onSubmit({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() });
    if (r && "error" in r && r.error) error.value = r.error;
    else sent.value = true;
  } catch {
    error.value = props.t.sendFailed;
  } finally {
    busy.value = false;
  }
}

function again() {
  form.name = "";
  form.email = "";
  form.message = "";
  touched.value = false;
  sent.value = false;
}
</script>

<template>
  <div v-if="sent" data-slot="chat-widget-sent" role="status" class="flex flex-col items-center gap-2 border-t border-border p-6 text-center">
    <CircleCheck aria-hidden="true" class="size-8 text-nq-success-text" />
    <p class="text-label text-foreground">{{ t.formSent }}</p>
    <p class="text-body-sm text-muted-foreground">{{ t.formSentHint }}</p>
    <NqButton type="button" variant="link" size="sm" @click="again">{{ t.formAgain }}</NqButton>
  </div>
  <form v-else data-slot="chat-widget-offline" novalidate class="flex flex-col gap-3 border-t border-border p-4" @submit.prevent="submit">
    <NqField :invalid="!!shown('name')">
      <NqFieldLabel>{{ t.formName }}</NqFieldLabel>
      <NqInput v-model="form.name" dir="auto" autocomplete="name" />
      <p v-if="shown('name')" class="text-caption text-nq-danger-text">{{ shown("name") }}</p>
    </NqField>
    <NqField :invalid="!!shown('email')">
      <NqFieldLabel>{{ t.formEmail }}</NqFieldLabel>
      <NqInput v-model="form.email" ltr type="email" autocomplete="email" />
      <p v-if="shown('email')" class="text-caption text-nq-danger-text">{{ shown("email") }}</p>
    </NqField>
    <NqField :invalid="!!shown('message')">
      <NqFieldLabel>{{ t.formMessage }}</NqFieldLabel>
      <NqTextarea v-model="form.message" dir="auto" :rows="3" />
      <p v-if="shown('message')" class="text-caption text-nq-danger-text">{{ shown("message") }}</p>
    </NqField>
    <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
    <NqButton type="submit" variant="primary" :loading="busy">{{ t.formSend }}</NqButton>
  </form>
</template>
