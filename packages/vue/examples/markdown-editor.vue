<script setup lang="ts">
import { NqMarkdownEditor } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const value = ref("## Notes\n\nWrite **here**.");
</script>

<template>
  <NqMarkdownEditor v-model="value" default-view="split" aria-label="Description" />
</template>
