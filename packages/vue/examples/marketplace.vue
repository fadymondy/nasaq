<script setup lang="ts">
import { NqMarketplace, type CatalogCategory, type MarketplaceListing, type MarketplacePermission, type MarketplaceTemplate } from "@fadymondy/nasaq/vue";
import { LayoutTemplate, Wrench } from "lucide-vue-next";

const categories: CatalogCategory[] = [
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "data", label: "Data" },
];
const permissionOptions: MarketplacePermission[] = [
  { id: "read", label: "Read your projects", description: "See project names and tasks.", risk: "low" },
  { id: "write", label: "Change your projects", description: "Create and edit tasks.", risk: "medium" },
  { id: "billing", label: "See billing", risk: "high" },
];
const listings: MarketplaceListing[] = [
  {
    id: "runner",
    name: "Task runner",
    summary: "Run scripts on a schedule.",
    description: "Run scripts on a schedule.\n\nRetries failed runs and tells you when one breaks.",
    category: "tools",
    publisher: "Nasaq",
    installs: 12000,
    rating: 4.7,
    ratingCount: 210,
    version: "1.4.0",
    featured: true,
    license: "MIT",
    permissions: [permissionOptions[0]!, permissionOptions[1]!],
    changelog: [{ version: "1.4.0", date: "2026-09-01", notes: ["Retries with backoff", "Faster start"] }],
    reviews: [{ id: "r1", author: "Sara", rating: 5, date: "2026-09-20", body: "Does exactly what it says." }],
    links: [{ label: "Documentation", href: "https://example.com/docs" }],
    tags: ["cron", "scripts"],
  },
  { id: "charts", name: "Charts Pro", summary: "Dashboards from your data.", category: "data", installs: 9000, price: { amount: 9, period: "month" }, badge: "Official" },
  { id: "csv", name: "CSV import", summary: "Bring spreadsheets in.", category: "data", installed: true, installs: 450 },
];
const templates: MarketplaceTemplate[] = [{ id: "t1", name: "Weekly report", summary: "A report that sends itself.", category: "tools", icon: LayoutTemplate, uses: 3400 }];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function done() {
  await wait(600);
  return {};
}
</script>

<template>
  <NqMarketplace
    :listings="listings"
    :categories="categories"
    :templates="templates"
    :template-categories="categories"
    :permission-options="permissionOptions"
    :on-install="done"
    :on-uninstall="done"
    :on-publish="done"
    :on-use-template="done"
  />
</template>
