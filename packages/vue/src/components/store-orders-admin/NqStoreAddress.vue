<script setup lang="ts">
import type { CommerceAddress } from "./order-types";

// A postal address block, with an optional heading (used by the printable documents).
const props = defineProps<{ address?: CommerceAddress; fallback?: string; title?: string }>();
</script>

<template>
  <div v-if="props.title" class="flex min-w-0 flex-col gap-0.5 text-body-sm">
    <h3 class="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{{ props.title }}</h3>
    <address v-if="props.address" class="flex flex-col not-italic text-foreground">
      <span class="font-medium">{{ props.address.name }}</span>
      <span>{{ props.address.line1 }}</span>
      <span v-if="props.address.line2">{{ props.address.line2 }}</span>
      <span>{{ [props.address.region, props.address.city].filter(Boolean).join(", ") }}</span>
      <bdi v-if="props.address.postalCode" dir="ltr" class="text-start">{{ props.address.postalCode }}</bdi>
      <bdi v-if="props.address.phone" dir="ltr" class="text-start">{{ props.address.phone }}</bdi>
    </address>
    <span v-else class="text-muted-foreground">-</span>
  </div>
  <address v-else-if="props.address" class="flex flex-col text-body-sm not-italic text-foreground">
    <span class="font-medium">{{ props.address.name }}</span>
    <span>{{ props.address.line1 }}</span>
    <span v-if="props.address.line2">{{ props.address.line2 }}</span>
    <span>{{ [props.address.region, props.address.city].filter(Boolean).join(", ") }}</span>
    <bdi v-if="props.address.postalCode" dir="ltr" class="text-start">{{ props.address.postalCode }}</bdi>
    <bdi v-if="props.address.phone" dir="ltr" class="text-start text-muted-foreground">{{ props.address.phone }}</bdi>
  </address>
  <p v-else class="text-body-sm text-muted-foreground">{{ props.fallback }}</p>
</template>
