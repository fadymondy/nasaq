<script setup lang="ts">
import { NqCountrySelect } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const country = ref("SA");
</script>

<template>
  <div class="w-72">
    <NqCountrySelect v-model="country" aria-label="Country" />
  </div>
</template>
