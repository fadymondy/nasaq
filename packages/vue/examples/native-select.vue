<script setup lang="ts">
import { NqNativeSelect } from "@fadymondy/nasaq/vue";

const countries = [
  { value: "eg", label: "Egypt" },
  { value: "sa", label: "Saudi Arabia" },
];
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label for="country" class="text-label text-foreground">Country</label>
    <NqNativeSelect id="country" name="country" default-value="" required placeholder="Choose a country" :options="countries" />
  </div>
</template>
