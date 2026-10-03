<script setup lang="ts">
import { NqAccountSettings, NqDangerZone, NqSettingsSection } from "@fadymondy/nasaq/vue";

// Your API call; reject to keep the dialog open and show the error.
const deleteAccount = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
</script>

<template>
  <NqAccountSettings v-slot="{ id }">
    <NqDangerZone v-if="id === 'danger'" :on-delete="deleteAccount" />
    <NqSettingsSection v-else :title="id === 'profile' ? 'Profile' : 'Coming soon'" description="Your sections go here." />
  </NqAccountSettings>
</template>
