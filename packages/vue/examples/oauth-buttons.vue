<script setup lang="ts">
import { NqOAuthButtons } from "@fadymondy/nasaq/vue";

function startOAuth(id: string) {
  return new Promise<void>((resolve) => setTimeout(resolve, 1500));
}
</script>

<template>
  <div class="w-72">
    <NqOAuthButtons :providers="['google', 'github', 'apple']" :on-select="startOAuth" />
  </div>
</template>
