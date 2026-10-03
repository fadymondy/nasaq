<script setup lang="ts">
import { NqAspectRatio } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqAspectRatio :ratio="16 / 9" class="rounded-card border border-border">
    <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="Product tour" allowfullscreen />
  </NqAspectRatio>
</template>
