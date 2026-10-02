<script setup lang="ts">
import { ref } from "vue";
import { NqBootSplash, NqBrailleLoader, NqDotMatrixFill, NqLogoLoader } from "@fadymondy/nasaq/vue";

const failed = ref(false);
</script>

<template>
  <div class="flex flex-col items-start gap-6">
    <div class="flex items-center gap-6">
      <NqBrailleLoader class="text-h3" />
      <NqLogoLoader :size="40" variant="pulse" />
      <NqLogoLoader :size="40" :value="60" />
    </div>
    <NqDotMatrixFill :value="62" />
    <NqBootSplash
      class="min-h-0 w-full rounded-card border border-border"
      name="Nasaq"
      :state="failed ? 'failed' : 'loading'"
      stage="Loading your workspace"
      :progress="40"
      :error="failed ? { message: 'We could not reach the server.', detail: 'req_8f2a91' } : undefined"
      @retry="failed = false"
    />
  </div>
</template>
