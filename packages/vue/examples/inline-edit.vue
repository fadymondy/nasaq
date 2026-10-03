<script setup lang="ts">
import { ref } from "vue";
import { NqInlineEdit } from "@fadymondy/nasaq/vue";

const title = ref("Launch plan");
const email = ref("sara@example.com");
const save = (target: typeof title) => (value: string) => new Promise<void>((resolve) => setTimeout(() => ((target.value = value), resolve()), 400));
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqInlineEdit :value="title" label="title" required :max-length="60" display-class="text-h3" :on-save="save(title)" />
    <NqInlineEdit :value="email" label="email" type="email" :on-save="save(email)" />
  </div>
</template>
