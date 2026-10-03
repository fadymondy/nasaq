<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Small print row for `NqAuthLayout`'s footer slot: legal links at the inline start, a slot (locale switch) at the end.
interface FooterLink {
  label: string;
  href: string;
  /** Open in a new tab (adds `rel="noreferrer"`). */
  external?: boolean;
}
const props = defineProps<{ links?: FooterLink[]; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="auth-footer" :class="cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2', props.class)">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <a
        v-for="link in props.links"
        :key="link.href"
        :href="link.href"
        :target="link.external ? '_blank' : undefined"
        :rel="link.external ? 'noreferrer' : undefined"
        class="underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
      >
        {{ link.label }}
      </a>
      <slot />
    </div>
    <div v-if="$slots.end" class="flex items-center"><slot name="end" /></div>
  </div>
</template>
