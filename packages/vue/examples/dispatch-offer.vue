<script setup lang="ts">
import { NqDispatchOffer } from "@fadymondy/nasaq/vue";

const expiresAt = Date.now() + 30_000;
const accept = () => {};
const decline = () => {};
</script>

<template>
  <NqDispatchOffer :pickup="{ name: 'Al-Quds Bakery' }" :dropoff="{ name: 'Sara Odeh' }" :fee-minor="1500" :expires-at="expiresAt" @accept="accept" @decline="decline" />
</template>
