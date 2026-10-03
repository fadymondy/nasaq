<script setup lang="ts">
import { NqCopyButton, NqCopyField } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqCopyButton value="sk_live_51Nasaq" label="Copy API key" />
    <NqCopyButton value="https://nasaq.app/invite/9">Copy link</NqCopyButton>
    <NqCopyField value="https://nasaq.app/invite/9" label="Invite link" />
  </div>
</template>
