<script setup lang="ts">
import { NqOtpInput } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex w-fit flex-col gap-1.5">
    <span class="text-label text-foreground">Verification code</span>
    <NqOtpInput name="code" @complete="(code) => console.log(code)" />
  </div>
</template>
