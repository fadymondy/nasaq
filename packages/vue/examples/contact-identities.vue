<script setup lang="ts">
import { NqContactIdentities, type ContactChannel, type ContactIdentity } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const identities = ref<ContactIdentity[]>([{ id: "1", channel: "email", value: "sara@example.com", primary: true }]);
const consent = ref({ email: { status: "granted" as const, at: new Date() } });

async function save(channel: ContactChannel, value: string) {
  identities.value = [...identities.value, { id: String(identities.value.length + 1), channel, value }];
}
async function remove(identity: ContactIdentity) {
  identities.value = identities.value.filter((i) => i.id !== identity.id);
}
async function makePrimary(id: string) {
  const target = identities.value.find((i) => i.id === id);
  identities.value = identities.value.map((i) => (i.channel === target?.channel ? { ...i, primary: i.id === id } : i));
}
async function setConsent(channel: ContactChannel, status: "granted" | "denied") {
  consent.value = { ...consent.value, [channel]: { status, at: new Date() } };
}
</script>

<template>
  <NqContactIdentities
    :identities="identities"
    :consent="consent"
    :on-add="async ({ channel, value }) => save(channel, value)"
    :on-remove="async (identity) => remove(identity)"
    :on-set-primary="async (identity) => makePrimary(identity.id)"
    :on-consent-change="async (channel, status) => setConsent(channel, status)"
  />
</template>
