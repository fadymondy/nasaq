<script setup lang="ts">
import { NqButton, NqPlanCard, NqPlanGrid, formatMoney } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqPlanGrid>
    <NqPlanCard name="Solo" description="For one person." :features="['1 project', 'Community support']">
      <template #price><span class="text-h2 font-semibold tracking-tight text-foreground">{{ formatMoney(0, { compact: true }) }}</span></template>
      <template #action><NqButton variant="secondary">Start free</NqButton></template>
    </NqPlanCard>
    <NqPlanCard
      highlighted
      name="Team"
      description="For small teams."
      price-note="Billed yearly"
      features-title="Everything in Solo, plus"
      :features="['Unlimited projects', { label: 'SSO', included: false }]"
      footnote="No card required"
      badge="Most popular"
    >
      <template #price>
        <span class="text-h2 font-semibold tracking-tight text-foreground">{{ formatMoney(12, { compact: true }) }}</span>
      </template>
      <template #action><NqButton variant="primary">Start trial</NqButton></template>
    </NqPlanCard>
  </NqPlanGrid>
</template>
