<script setup lang="ts">
import { NqAccordion, NqAccordionItem, NqAccordionPanel, NqAccordionTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqAccordion :default-value="['plan']">
    <NqAccordionItem value="plan">
      <NqAccordionTrigger>Can I change my plan later?</NqAccordionTrigger>
      <NqAccordionPanel>Yes, any time from the billing page.</NqAccordionPanel>
    </NqAccordionItem>
    <NqAccordionItem value="pay">
      <NqAccordionTrigger>Which payment methods do you accept?</NqAccordionTrigger>
      <NqAccordionPanel>Mada, Visa and Mastercard.</NqAccordionPanel>
    </NqAccordionItem>
  </NqAccordion>
</template>
