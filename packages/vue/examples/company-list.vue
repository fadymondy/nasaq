<script setup lang="ts">
import { NqCompanyList, type Company } from "@fadymondy/nasaq/vue";

const companies: Company[] = [
  { id: "1", name: "Acme", domain: "acme.com", industry: "Manufacturing", location: "Riyadh", contactsCount: 12, owner: { name: "Omar Nasser" }, lastActivity: "2026-09-28T09:00:00Z" },
];
</script>

<template>
  <NqCompanyList :companies="companies" />
</template>
