<script setup lang="ts">
import { NqAnalyticsConnect, type IntegrationService } from "@fadymondy/nasaq/vue";

const service: IntegrationService = {
  id: "ga",
  name: "Google Analytics",
  scopes: [{ id: "analytics.readonly", label: "See your Google Analytics reports", required: true }],
  status: "disconnected",
};
</script>

<template>
  <NqAnalyticsConnect
    :service="service"
    :benefits="['Users and sessions against the previous period', 'Sources and top pages']"
    :on-connect="async () => { /* start OAuth */ }"
    :on-disconnect="async () => {}"
  />
</template>
