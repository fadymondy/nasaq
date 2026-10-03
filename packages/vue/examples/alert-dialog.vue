<script setup lang="ts">
import { NqConfirmButton } from "@fadymondy/nasaq/vue";

function onDelete() {}
</script>

<template>
  <NqConfirmButton
    title="Delete this project?"
    description="Issues and files are removed. This cannot be undone."
    confirm-label="Delete"
    :on-confirm="onDelete"
  >
    Delete project
  </NqConfirmButton>
</template>
