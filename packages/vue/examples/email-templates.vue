<script setup lang="ts">
import { NqEmailTemplates, type EmailTemplate, type EmailVariable } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const variables: EmailVariable[] = [{ key: "first_name", label: "First name", sample: "Sara" }];

const templates = ref<EmailTemplate[]>([
  { id: "t1", name: "Welcome", category: "welcome", status: "active", subject: "Welcome, {{first_name}}", preheader: "Your account is ready.", body: "<h2>Hello {{first_name}}</h2><p>Thanks for joining us.</p>", updatedAt: "2026-09-20T10:00:00Z" },
  { id: "t2", name: "Order receipt", category: "transactional", status: "draft", subject: "Your receipt", body: "<p>Thanks for your order, {{first_name}}.</p>", updatedAt: "2026-09-22T10:00:00Z" },
]);

async function save(t: EmailTemplate) {
  const i = templates.value.findIndex((x) => x.id === t.id);
  templates.value = i < 0 ? [...templates.value, t] : templates.value.map((x) => (x.id === t.id ? t : x));
}
async function sendTest(_t: EmailTemplate, _email: string) {
  // Your request.
}
</script>

<template>
  <NqEmailTemplates :templates="templates" :variables="variables" :sender="{ name: 'The team', email: 'hello@example.com' }" :on-save="save" :on-send-test="sendTest" />
</template>
