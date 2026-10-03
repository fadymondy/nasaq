<script setup lang="ts">
import { ref } from "vue";
import { NqDesktopNotification, NqNotificationPermissionPrompt } from "@fadymondy/nasaq/vue";

const open = ref(true);
const permission = ref<"default" | "granted">("default");
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqDesktopNotification
      v-if="open"
      platform="windows"
      app-name="Nasaq"
      title="Deploy finished"
      body="Production is on v1.4.2."
      :actions="[{ id: 'open', label: 'Open' }]"
      :on-close="() => (open = false)"
    />
    <NqNotificationPermissionPrompt :permission="permission" :on-request="() => (permission = 'granted')" :on-dismiss="() => {}" />
  </div>
</template>
