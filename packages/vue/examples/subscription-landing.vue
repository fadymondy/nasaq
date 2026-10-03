<script setup lang="ts">
import { NqSubscriptionLanding } from "@fadymondy/nasaq/vue";

async function subscribe({ email }: { email: string }) {
  console.log("subscribe", email);
}
</script>

<template>
  <NqSubscriptionLanding mode="subscribe" brand="Nasaq" :on-subscribe="subscribe" />
</template>
