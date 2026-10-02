<script setup lang="ts">
import { NqPlanCatalogEditor, type PlanCatalog } from "@fadymondy/nasaq/vue";

const catalog: PlanCatalog = {
  apps: [
    { id: "crm", name: "CRM", enabled: true },
    { id: "helpdesk", name: "Helpdesk", enabled: true },
  ],
  features: [
    { id: "sso", name: "Single sign-on" },
    { id: "pipelines", name: "Pipelines", appId: "crm" },
  ],
  plans: [
    { id: "free", name: "Free", description: "For trying things out", priceMonthly: 0, seats: 3, storageGb: 1, features: ["Community support"], visible: true, subscribers: 14 },
    { id: "team", name: "Team", description: "For growing teams", priceMonthly: 29, seats: 15, storageGb: 50, features: ["Priority support"], visible: true, subscribers: 6, featured: true },
  ],
  payg: [{ id: "api-calls", name: "API calls", unit: "1K calls", unitPrice: 0.5, freeUnits: 100 }],
  bundles: [{ id: "suite", name: "Suite", price: 49, appIds: ["crm", "helpdesk"] }],
};

// The dry run and the publish live on your server; these stand in for it.
const onPreview = async () => ({ warnings: ["6 workspaces change price"] });
const onApply = async () => undefined;
</script>

<template>
  <NqPlanCatalogEditor :catalog="catalog" currency="USD" :on-preview="onPreview" :on-apply="onApply" />
</template>
