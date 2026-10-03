<script setup lang="ts">
import { NqField, NqFieldDescription, NqFieldLabel, NqRadio, NqRadioGroup } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqField name="contact">
    <NqFieldLabel>Contact by</NqFieldLabel>
    <NqFieldDescription>We only use this for account notices.</NqFieldDescription>
    <NqRadioGroup default-value="email" aria-label="Contact by">
      <label class="flex items-center gap-2 text-body-sm">
        <NqRadio value="email" /> Email
      </label>
      <label class="flex items-center gap-2 text-body-sm">
        <NqRadio value="sms" /> SMS
      </label>
    </NqRadioGroup>
  </NqField>
</template>
