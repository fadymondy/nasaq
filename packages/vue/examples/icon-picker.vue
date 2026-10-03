<script setup lang="ts">
import { ref } from "vue";
import { NqIconByName, NqIconPicker } from "@fadymondy/nasaq/vue";

const icon = ref("rocket");
</script>

<template>
  <div class="flex items-center gap-3">
    <NqIconPicker v-model="icon" />
    <NqIconByName :name="icon" class="size-6" />
  </div>
</template>
