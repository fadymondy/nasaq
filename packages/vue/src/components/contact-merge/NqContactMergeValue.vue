<script setup lang="ts">
import { computed } from "vue";
import { isEmptyMergeValue, type ContactMergeValue } from "./contact-merge-logic";

// Internal: one field value as text. Emails and phone numbers read left to right, also in Arabic.
const props = defineProps<{ value: ContactMergeValue; ltr?: boolean; empty: string }>();
const text = computed(() => (typeof props.value === "string" ? props.value : (props.value ?? []).join(", ")));
</script>

<template>
  <span v-if="isEmptyMergeValue(props.value)" class="text-muted-foreground">{{ props.empty }}</span>
  <bdi v-else-if="props.ltr" dir="ltr" class="tabular-nums">{{ text }}</bdi>
  <span v-else dir="auto">{{ text }}</span>
</template>
