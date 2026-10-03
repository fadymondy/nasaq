<script setup lang="ts">
import { ref } from "vue";
import { NqInstallPrompt, NqPushOptIn, useInstallPrompt, useNotificationPermission } from "@fadymondy/nasaq/vue";

const open = ref(true);
const { platform, install } = useInstallPrompt();
const { permission, request } = useNotificationPermission();
const subscribed = ref(false);
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqInstallPrompt v-model:open="open" :platform="platform" app-name="Nasaq" :on-install="install" />
    <NqPushOptIn
      :permission="permission"
      :on-request-permission="request"
      :subscribed="subscribed"
      :on-subscribed-change="async (on: boolean) => { subscribed = on; }"
    />
  </div>
</template>
