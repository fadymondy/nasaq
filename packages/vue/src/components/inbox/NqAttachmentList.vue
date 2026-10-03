<script setup lang="ts">
import { FileText, Image as ImageIcon } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatBytes, type InboxAttachment } from "./inbox-format";

// Attachments of a message: image thumbnails and file chips.
const props = defineProps<{ items: readonly InboxAttachment[]; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ul data-slot="attachment-list" :class="cn('flex flex-wrap gap-2', props.class)">
    <li v-for="a in props.items" :key="a.id">
      <a
        v-if="a.kind === 'image'"
        :href="a.url"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="a.name"
        class="block size-24 overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
      >
        <img v-if="a.url" :src="a.url" :alt="a.name" loading="lazy" class="size-full object-cover" />
        <span v-else class="grid size-full place-items-center text-muted-foreground"><ImageIcon aria-hidden="true" class="size-6" /></span>
      </a>
      <a
        v-else
        :href="a.url"
        :download="a.name"
        class="flex h-12 max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2.5 text-start no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
      >
        <FileText aria-hidden="true" class="size-5 shrink-0 text-muted-foreground" />
        <span class="flex min-w-0 flex-col">
          <span dir="auto" class="truncate text-body-sm text-foreground">{{ a.name }}</span>
          <bdi v-if="a.size" dir="ltr" class="text-caption text-muted-foreground">{{ formatBytes(a.size) }}</bdi>
        </span>
      </a>
    </li>
  </ul>
</template>
