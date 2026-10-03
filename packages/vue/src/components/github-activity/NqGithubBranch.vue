<script setup lang="ts">
import { GitBranch } from "lucide-vue-next";

// A branch or tag name, always left to right. Internal to NqGithubActivity.
const props = defineProps<{ name: string }>();
</script>

<template>
  <span dir="ltr" class="inline-flex max-w-48 items-center gap-1 truncate font-mono text-code text-muted-foreground">
    <GitBranch aria-hidden="true" class="size-3 shrink-0" />
    <bdi class="truncate">{{ props.name }}</bdi>
  </span>
</template>
