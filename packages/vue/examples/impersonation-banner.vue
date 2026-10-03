<script setup lang="ts">
import { NqImpersonationBanner } from "@fadymondy/nasaq/vue";

const exit = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
</script>

<template>
  <NqImpersonationBanner :as="{ name: 'Sara Ali', email: 'sara@example.com' }" :started-at="Date.now() - 5 * 60_000" :sticky="false" :on-exit="exit" />
</template>
