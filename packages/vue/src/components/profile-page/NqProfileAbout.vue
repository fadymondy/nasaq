<script setup lang="ts">
import { NqMarkdown } from "../markdown";
import NqProfileSection from "./NqProfileSection.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";

// The "About" section: Markdown in readable measure.
const props = defineProps<{ about: string; labels?: Partial<ProfilePageLabels> }>();
const { t } = useProfileStrings(() => props.labels);
</script>

<template>
  <NqProfileSection :title="t.about">
    <NqMarkdown class="max-w-prose" :source="props.about" />
  </NqProfileSection>
</template>
