<script setup lang="ts">
import { NqProductCard, NqProductGrid, NqProductMark } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqProductGrid>
    <NqProductCard name="Zekra" category="AI memory" badge="New" description="A memory organ for AI agents: what one session learns, the next one already knows.">
      <template #artwork>
        <div class="grid place-items-center rounded-card bg-secondary"><NqProductMark brand="zekra" :size="48" /></div>
      </template>
      <template #meta><span class="text-caption text-muted-foreground">4.9 (860)</span></template>
      <template #price><span class="text-label text-foreground">$9 / month</span></template>
    </NqProductCard>
  </NqProductGrid>
</template>
