<script setup lang="ts">
import { NqShareButton } from "@fadymondy/nasaq/vue";

const onInvite = async (emails: string[], role: string) => {
  console.log("invite", emails, role);
};
</script>

<template>
  <NqShareButton url="https://app.example.com/docs/q3-plan" title="Q3 plan" :on-invite="onInvite" />
</template>
