<script setup lang="ts">
import { NqField, NqFieldLabel, NqMentionTextarea, type Mention } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const people = [
  { id: "u1", name: "Sara Ali", description: "Design lead" },
  { id: "u2", name: "Omar Nasser", description: "Engineer" },
];
const mentions = ref<Mention[]>([]);
</script>

<template>
  <NqField>
    <NqFieldLabel>Comment</NqFieldLabel>
    <NqMentionTextarea :rows="4" :suggestions="people" placeholder="Type @ to mention someone" @update:mentions="(next) => (mentions = next)" />
    <output>{{ mentions.length }} mentioned</output>
  </NqField>
</template>
