<script setup lang="ts">
import { NqCarousel, NqCarouselContent, NqCarouselDots, NqCarouselItem, NqCarouselNext, NqCarouselPrevious } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqCarousel label="Gallery" class="max-w-xl">
    <NqCarouselContent>
      <NqCarouselItem>One</NqCarouselItem>
      <NqCarouselItem>Two</NqCarouselItem>
      <NqCarouselItem>Three</NqCarouselItem>
    </NqCarouselContent>
    <NqCarouselPrevious />
    <NqCarouselNext />
    <NqCarouselDots />
  </NqCarousel>
</template>
