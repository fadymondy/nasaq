<script setup lang="ts">
import { NqContactList, type Contact } from "@fadymondy/nasaq/vue";

const contacts: Contact[] = [
  {
    id: "1",
    name: "Sara Ali",
    email: "sara@example.com",
    company: "Nasaq",
    stage: "customer",
    tags: [{ label: "VIP", hue: "violet" }],
    owner: { name: "Omar Nasser" },
    lastActivity: "2026-09-28T09:00:00Z",
  },
];
</script>

<template>
  <NqContactList :contacts="contacts" :on-row-click="(c: Contact) => console.log(c.id)" />
</template>
