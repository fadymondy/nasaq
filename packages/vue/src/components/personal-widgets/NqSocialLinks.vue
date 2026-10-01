<script setup lang="ts">
import { Globe, Mail } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { NqGitHubLogo } from "../oauth-buttons";
import type { SocialLink } from "./types";

// Links to the owner's other places. External links open in a new tab; `mailto:` links do not.
interface Props {
  links: SocialLink[];
  /** `chips` a wrapping row of small buttons, `list` one link per line with the handle. Default chips. */
  layout?: "chips" | "list";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { layout: "chips" });
const isExternal = (href: string) => /^https?:\/\//i.test(href);
</script>

<template>
  <ul data-slot="social-links" :class="cn('flex list-none gap-2 p-0', props.layout === 'chips' ? 'flex-wrap' : 'flex-col', props.class)">
    <li v-for="l in props.links" :key="`${l.kind}-${l.href}`">
      <a
        :href="l.href"
        :target="isExternal(l.href) ? '_blank' : undefined"
        :rel="isExternal(l.href) ? 'noopener noreferrer' : undefined"
        :class="cn(
          'inline-flex items-center gap-2 rounded-control text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
          props.layout === 'chips' ? 'h-control-sm border border-border bg-card px-2.5 hover:bg-nq-hover' : 'py-1 hover:underline hover:decoration-nq-line-strong hover:underline-offset-4',
        )"
      >
        <NqGitHubLogo v-if="l.kind === 'github'" class="size-4" />
        <NqIcon v-if="l.kind === 'email'" :icon="Mail" class="size-4 text-muted-foreground" />
        <NqIcon v-if="l.kind === 'website'" :icon="Globe" class="size-4 text-muted-foreground" />
        <span>{{ l.label }}</span>
        <span v-if="props.layout === 'list' && l.handle" dir="ltr" class="text-muted-foreground">{{ l.handle }}</span>
      </a>
    </li>
  </ul>
</template>
