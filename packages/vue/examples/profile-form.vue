<script setup lang="ts">
import { NqProfileForm, type ProfileFormValues } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const values = ref<ProfileFormValues>({
  name: "Sara Haddad",
  username: "sara.haddad",
  email: "sara@sahab.studio",
  phone: "+966501234567",
  bio: "Product designer building bilingual interfaces.",
  locale: "en",
  timezone: "Asia/Riyadh",
  location: "Riyadh, Saudi Arabia",
  website: "https://sara.example.com",
});
const zones = [
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Africa/Cairo", label: "Cairo (GMT+2)" },
  { value: "Europe/London", label: "London (GMT+1)" },
];

async function onSubmit(next: ProfileFormValues) {
  values.value = next;
}
async function checkUsername(username: string) {
  return username !== "taken";
}
const noop = async () => undefined;
</script>

<template>
  <NqProfileForm
    :values="values"
    :timezones="zones"
    :email-verified="false"
    :on-submit="onSubmit"
    :check-username="checkUsername"
    :on-resend-verification="noop"
    :on-change-email="noop"
    :avatar="{ onChange: noop, onRemove: noop }"
    profile-href="/u/sara.haddad"
  />
</template>
