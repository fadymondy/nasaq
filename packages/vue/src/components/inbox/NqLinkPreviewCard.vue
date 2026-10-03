<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { hostOf, type LinkPreviewData } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// A link card for a URL in a message: image, site, title and a two-line description. Opens in a new tab.
const props = defineProps<{ data: LinkPreviewData; labels?: Partial<InboxLabels>; class?: HTMLAttributes["class"] }>();
const t = useInboxLabels(() => props.labels);
</script>

<template>
  <a
    data-slot="link-preview"
    :href="props.data.url"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`${t.linkOpen}: ${props.data.title ?? hostOf(props.data.url)}`"
    :class="
      cn(
        'flex w-64 max-w-full flex-col overflow-hidden rounded-control border border-border bg-card text-start no-underline outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus',
        props.class,
      )
    "
  >
    <img v-if="props.data.image" :src="props.data.image" alt="" loading="lazy" class="aspect-video w-full object-cover" />
    <span class="flex flex-col gap-0.5 p-2.5">
      <span dir="ltr" class="truncate text-caption text-muted-foreground">{{ props.data.siteName ?? hostOf(props.data.url) }}</span>
      <span v-if="props.data.title" dir="auto" class="line-clamp-2 text-label text-foreground">{{ props.data.title }}</span>
      <span v-if="props.data.description" dir="auto" class="line-clamp-2 text-caption text-muted-foreground">{{ props.data.description }}</span>
    </span>
  </a>
</template>
