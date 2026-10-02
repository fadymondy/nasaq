<script setup lang="ts">
import { NqFormBuilder, contactFormDefinition, type FormDefinition } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const form = ref<FormDefinition>(contactFormDefinition());

// Your API call.
async function save(f: FormDefinition) {
  await fetch("/api/forms/1", { method: "PUT", body: JSON.stringify(f) });
}
</script>

<template>
  <NqFormBuilder v-model="form" form-key="pk_live_123" embed-base-url="https://forms.example.com" :on-save="save" />
</template>
