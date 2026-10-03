<script setup lang="ts">
import { NqWebVitalGauge, NqWebVitalGaugeGrid } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqWebVitalGaugeGrid>
    <NqWebVitalGauge metric="LCP" :value="2900" :previous="3100" :distribution="{ good: 0.58, needsImprovement: 0.28, poor: 0.14 }" />
    <NqWebVitalGauge metric="INP" :value="182" />
    <NqWebVitalGauge metric="CLS" :value="0.08" />
  </NqWebVitalGaugeGrid>
</template>
