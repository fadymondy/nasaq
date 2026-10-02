<script setup lang="ts">
import { shortSha } from "./github-activity-format";
import NqGithubRef from "./NqGithubRef.vue";

// The short commit sha, linked when there is an href. Internal to NqGithubActivity.
const props = defineProps<{ sha: string; href?: string }>();
</script>

<template>
  <NqGithubRef :href="props.href">
    <code dir="ltr" class="rounded-sm bg-secondary px-1 py-0.5 font-mono text-code text-muted-foreground">{{ shortSha(props.sha) }}</code>
  </NqGithubRef>
</template>
