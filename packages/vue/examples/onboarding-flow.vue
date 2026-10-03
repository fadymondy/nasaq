<script setup lang="ts">
import { NqOnboardingFlow, type OnboardingValues } from "@fadymondy/nasaq/vue";

// Your own API calls. Resolve { error: "..." } to keep the person on the step.
const ok = async (..._args: unknown[]) => undefined;
const upload = async (_file: File) => "https://example.com/avatar.webp";
const finish = async (_values: OnboardingValues) => undefined;
</script>

<template>
  <NqOnboardingFlow
    user-name="Sara"
    storage-key="onboarding:u1"
    :on-save-profile="ok"
    :on-upload-avatar="upload"
    :on-workspace="ok"
    :on-invite="ok"
    :on-preferences="ok"
    :on-connect="ok"
    :on-finish="finish"
  >
    <template #done-action><a href="/">Open the dashboard</a></template>
  </NqOnboardingFlow>
</template>
