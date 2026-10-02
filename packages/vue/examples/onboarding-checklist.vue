<script setup lang="ts">
import { NqOnboardingChecklist } from "@fadymondy/nasaq/vue";

const items = [
  { id: "profile", title: "Complete your profile", done: true },
  { id: "invite", title: "Invite a teammate", description: "Work is better together.", actionLabel: "Invite", onAction: () => {} },
  { id: "connect", title: "Connect GitHub", actionLabel: "Connect", onAction: () => {} },
];
</script>

<template>
  <NqOnboardingChecklist :items="items" :on-dismiss="() => {}" />
</template>
