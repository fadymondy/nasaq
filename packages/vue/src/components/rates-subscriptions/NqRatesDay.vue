<script setup lang="ts">
import { NqDateTime } from "../numeric";
import { dayOf } from "./strings";

// Internal: a day key as a medium date.
const props = defineProps<{ day: string }>();
</script>

<template>
  <NqDateTime :value="dayOf(props.day)" :format="{ dateStyle: 'medium' }" />
</template>
