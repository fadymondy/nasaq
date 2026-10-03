<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** A block of user text whose direction follows its own first strong character. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <p data-slot="bidi-text" dir="auto" :class="cn('[unicode-bidi:plaintext] text-start', props.class)"><slot /></p>
</template>
