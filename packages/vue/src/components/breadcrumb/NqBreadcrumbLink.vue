<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A link to an ancestor. Native <a> attributes (href, ...) fall through.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <a
    data-slot="breadcrumb-link"
    :class="cn('truncate rounded-[3px] transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus', props.class)"
  ><slot /></a>
</template>
