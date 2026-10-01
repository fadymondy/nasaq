<script setup lang="ts">
import { NqButton, NqSpotlight } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqSpotlight brand="mahaam" title="Mahaam" class="max-w-3xl">
    <template #eyebrow><span class="text-label text-muted-foreground">Editor's pick</span></template>
    <template #description>Projects, time and invoices for small studios, in one calm place.</template>
    <template #actions><NqButton>Start free</NqButton><NqButton variant="secondary">See pricing</NqButton></template>
    <template #meta><span>From $9 per month</span><span>14-day trial</span></template>
  </NqSpotlight>
</template>
