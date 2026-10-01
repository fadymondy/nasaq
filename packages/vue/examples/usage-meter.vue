<script setup lang="ts">
import { NqUsageMeter } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqUsageMeter label="Seats" :used="46" :limit="50" unit="seats" />
    <NqUsageMeter label="Storage" :used="12" :limit="null" unit="GB" />
    <NqUsageMeter label="AI spend" kind="money" currency="USD" :used="182" :limit="200" />
  </div>
</template>
