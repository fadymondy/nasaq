<script setup lang="ts">
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label for="website" class="text-label text-foreground">Website</label>
    <NqInputGroup>
      <NqInputGroupAddon>
        <NqInputGroupText dir="ltr">https://</NqInputGroupText>
      </NqInputGroupAddon>
      <NqInputGroupInput id="website" ltr placeholder="nasaq.app" />
    </NqInputGroup>
  </div>
</template>
