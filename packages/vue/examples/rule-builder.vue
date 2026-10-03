<script setup lang="ts">
import { NqRuleBuilder, type RuleDefinition } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const events = [{ id: "order.created", label: "an order is placed" }];
const fields = [{ id: "amount", label: "Amount", kind: "number" as const }];
const actionTypes = [{ id: "email", label: "Send an email", fields: [{ name: "to", label: "To", kind: "text" as const, required: true }] }];

const rule = ref<RuleDefinition | undefined>();
</script>

<template>
  <NqRuleBuilder v-model="rule" :events="events" :fields="fields" :action-types="actionTypes" />
</template>
