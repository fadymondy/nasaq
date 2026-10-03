<script setup lang="ts">
import { NqLeadsInbox, type Lead, type LeadConversion, type LeadStatus } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const leads = ref<Lead[]>([
  {
    id: "l1",
    name: "Sara Haddad",
    email: "sara@acme.example",
    company: "Acme Logistics",
    message: "We are looking for a delivery dashboard for 40 couriers. Can we book a demo this week?",
    budget: "$12,000",
    status: "new",
    receivedAt: "2026-09-29T07:30:00Z",
    form: "Contact sales",
    attribution: { utmSource: "google", utmMedium: "cpc", utmCampaign: "dispatch-q3", gclid: "Cj0KCQjw-demo", landingPage: "https://example.com/dispatch" },
    score: { score: 82, dimensions: [{ id: "size", label: "Company size", points: 40, maxPoints: 50, reason: "51 to 200 employees" }] },
  },
  {
    id: "l2",
    name: "Omar Nasser",
    email: "omar@example.com",
    message: "Do you support Arabic invoices?",
    status: "contacted",
    receivedAt: "2026-09-28T12:00:00Z",
    form: "Newsletter",
    attribution: { utmSource: "newsletter", utmMedium: "email", utmCampaign: "sept-digest" },
  },
  {
    id: "l3",
    name: "Lina Farouk",
    email: "lina@example.com",
    status: "qualified",
    receivedAt: "2026-09-25T09:00:00Z",
    attribution: { referrer: "https://www.linkedin.com/feed" },
  },
]);

const canned = [{ id: "c1", shortcut: "demo", title: "Book a demo", body: "Hi {{name}}, thanks for reaching out. Pick a time for a demo that suits you." }];

async function onStatusChange(lead: Lead, status: LeadStatus) {
  leads.value = leads.value.map((l) => (l.id === lead.id ? { ...l, status } : l));
}
async function onConvert(lead: Lead, c: LeadConversion) {
  leads.value = leads.value.map((l) =>
    l.id === lead.id ? { ...l, status: "converted", contact: { id: `c-${l.id}`, name: c.contactName }, ...(c.company ? { companyRef: { id: `co-${l.id}`, name: c.company } } : {}), ...(c.deal ? { deal: { id: `d-${l.id}`, name: c.deal } } : {}) } : l,
  );
}
async function onReply() {}
</script>

<template>
  <NqLeadsInbox :leads="leads" :canned="canned" :on-status-change="onStatusChange" :on-convert="onConvert" :on-reply="onReply" />
</template>
