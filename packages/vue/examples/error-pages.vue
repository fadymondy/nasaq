<script setup lang="ts">
import { NqNotFoundPage, NqServerErrorPage } from "@fadymondy/nasaq/vue";

const go = (path: string) => () => console.log("navigate", path);
</script>

<template>
  <div class="flex flex-col gap-8">
    <NqNotFoundPage :full-screen="false" :on-home="go('/')" :on-back="go('back')" />
    <NqServerErrorPage :full-screen="false" error-id="err_9f2a41" :on-retry="go('refresh')" :on-contact-support="go('chat')" />
  </div>
</template>
