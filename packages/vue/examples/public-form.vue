<script setup lang="ts">
import { NqContactForm, type FormValues } from "@fadymondy/nasaq/vue";

// Your API call. Throw, or return { error: "..." }, to keep the form and show a message.
async function send(data: FormValues) {
  await fetch("/api/contact", { method: "POST", body: JSON.stringify(data) });
}
</script>

<template>
  <div class="w-96">
    <NqContactForm :on-submit="send" />
  </div>
</template>
