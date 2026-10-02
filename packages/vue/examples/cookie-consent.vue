<script setup lang="ts">
import { NqCookieConsent, type ConsentCategory, type ConsentState } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const categories: ConsentCategory[] = [
  { id: "necessary", required: true, cookies: [{ name: "session", purpose: "Keeps you signed in", duration: "Session" }] },
  { id: "preferences" },
  { id: "analytics", cookies: [{ name: "_ga", purpose: "Tells visits apart, in aggregate", duration: "13 months", provider: "Google" }] },
  { id: "marketing" },
];
const choice = ref<ConsentState | null>(null);
const save = async (state: ConsentState) => {
  choice.value = state;
};
</script>

<template>
  <NqCookieConsent inline policy-href="/cookies" :categories="categories" :on-save="save" />
</template>
