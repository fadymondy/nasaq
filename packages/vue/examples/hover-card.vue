<script setup lang="ts">
import { NqHoverCard, NqHoverCardContent, NqHoverCardTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqHoverCard>
    <NqHoverCardTrigger href="/people/sara">@sara</NqHoverCardTrigger>
    <NqHoverCardContent>
      <p class="text-body-sm font-semibold">Sara Al-Harbi</p>
      <p class="text-caption text-muted-foreground">Design lead</p>
    </NqHoverCardContent>
  </NqHoverCard>
</template>
