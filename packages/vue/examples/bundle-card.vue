<script setup lang="ts">
import { NqBundleCard, NqButton, NqProductArtwork } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqBundleCard title="Agency kit" description="Run client projects and remember every decision." includes="Mahaam · Zekra" :price="18" :compare-at="21">
    <template #items>
      <NqProductArtwork brand="mahaam" :mark-size="24" />
      <NqProductArtwork brand="zekra" :mark-size="24" />
    </template>
    <template #action><NqButton size="sm">Get the kit</NqButton></template>
  </NqBundleCard>
</template>
