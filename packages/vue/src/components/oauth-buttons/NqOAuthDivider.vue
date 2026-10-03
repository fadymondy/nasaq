<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";

/** A rule with a word in the middle ("or", "or continue with email") between the OAuth buttons and a form. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const t = useT();
</script>

<template>
  <div data-slot="oauth-divider" role="separator" :class="cn('flex items-center gap-3 text-caption text-muted-foreground', props.class)">
    <span aria-hidden="true" class="h-px flex-1 bg-border" />
    <span><slot>{{ t("or", "أو") }}</slot></span>
    <span aria-hidden="true" class="h-px flex-1 bg-border" />
  </div>
</template>
