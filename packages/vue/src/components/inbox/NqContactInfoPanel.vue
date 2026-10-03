<script setup lang="ts">
import { ExternalLink, FileText, Image as ImageIcon, Link2, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqDialog, NqDialogContent, NqDialogTitle } from "../dialog";
import { NqDateTime } from "../numeric";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { collectMedia, formatBytes, hostOf, type InboxAgent, type InboxContact, type InboxMessage, type MediaItem } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// Who the conversation is with: details with copy buttons, tags, notes and a Media, Files, Links gallery with a lightbox.
const props = withDefaults(
  defineProps<{
    contact: InboxContact;
    /** The thread, used for the media gallery (images, files and links people shared). */
    messages?: readonly InboxMessage[];
    assignee?: InboxAgent | null;
    /** Shown as a badge under the name, e.g. the channel. */
    channelLabel?: string;
    onClose?: () => void;
    labels?: Partial<InboxLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { messages: () => [] },
);
const t = useInboxLabels(() => props.labels);
const media = computed(() => collectMedia(props.messages));
const images = computed(() => media.value.filter((m) => m.kind === "image"));
const files = computed(() => media.value.filter((m) => m.kind === "file"));
const links = computed(() => media.value.filter((m) => m.kind === "link"));
const lightbox = ref<MediaItem | null>(null);
const lightboxOpen = computed({ get: () => lightbox.value !== null, set: (open) => !open && (lightbox.value = null) });
</script>

<template>
  <aside data-slot="contact-info" :aria-label="t.contact" :class="cn('flex min-h-0 flex-col overflow-y-auto bg-card', props.class)">
    <div class="flex items-start justify-between gap-2 p-4 pb-0">
      <span class="text-label text-foreground">{{ t.contact }}</span>
      <NqButton v-if="props.onClose" type="button" variant="ghost" size="icon-sm" :aria-label="t.hideContact" @click="props.onClose()"><X aria-hidden="true" /></NqButton>
    </div>
    <div class="flex flex-col items-center gap-2 p-4 text-center">
      <NqAvatar :name="props.contact.name" :src="props.contact.avatar" size="lg" class="size-16 text-h3" />
      <h2 dir="auto" class="text-h3 text-foreground">{{ props.contact.name }}</h2>
      <NqBadge v-if="props.channelLabel" variant="outline">{{ props.channelLabel }}</NqBadge>
      <span v-if="props.assignee" class="text-caption text-muted-foreground">{{ t.assignedTo(props.assignee.name) }}</span>
    </div>
    <dl class="flex flex-col gap-3 border-t border-border p-4">
      <div v-if="props.contact.email" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactEmail }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground">
          <bdi dir="ltr" class="min-w-0 flex-1 truncate">{{ props.contact.email }}</bdi>
          <NqCopyButton :value="props.contact.email" :label="`${t.copy}: ${t.contactEmail}`" />
        </dd>
      </div>
      <div v-if="props.contact.phone" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactPhone }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground">
          <bdi dir="ltr" class="min-w-0 flex-1 truncate tabular-nums">{{ props.contact.phone }}</bdi>
          <NqCopyButton :value="props.contact.phone" :label="`${t.copy}: ${t.contactPhone}`" />
        </dd>
      </div>
      <div v-if="props.contact.company" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactCompany }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><span dir="auto">{{ props.contact.company }}</span></dd>
      </div>
      <div v-if="props.contact.location" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactLocation }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><span dir="auto">{{ props.contact.location }}</span></dd>
      </div>
      <div v-if="props.contact.timezone" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactTimezone }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><bdi dir="ltr">{{ props.contact.timezone }}</bdi></dd>
      </div>
      <div v-if="props.contact.firstSeen" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactSince }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><NqDateTime :value="props.contact.firstSeen" :format="{ dateStyle: 'medium' }" /></dd>
      </div>
      <div v-if="props.contact.tags?.length" class="flex flex-col gap-1.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactTags }}</dt>
        <dd class="flex flex-wrap gap-1">
          <NqBadge v-for="tag in props.contact.tags" :key="tag" variant="neutral">{{ tag }}</NqBadge>
        </dd>
      </div>
      <div v-if="props.contact.notes" class="flex flex-col gap-0.5">
        <dt class="text-caption text-muted-foreground">{{ t.contactNotes }}</dt>
        <dd class="flex items-center gap-1 text-body-sm text-foreground"><span dir="auto" class="whitespace-pre-wrap text-nq-fg-body">{{ props.contact.notes }}</span></dd>
      </div>
    </dl>
    <NqTabs default-value="media" class="gap-3 border-t border-border p-4">
      <NqTabsList :aria-label="t.mediaTabs" variant="underline">
        <NqTabsTab value="media"><ImageIcon aria-hidden="true" />{{ t.media }}</NqTabsTab>
        <NqTabsTab value="files"><FileText aria-hidden="true" />{{ t.files }}</NqTabsTab>
        <NqTabsTab value="links"><Link2 aria-hidden="true" />{{ t.links }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>
      <NqTabsPanel value="media">
        <p v-if="images.length === 0" class="py-4 text-center text-caption text-muted-foreground">{{ t.mediaEmpty }}</p>
        <ul v-else class="grid grid-cols-3 gap-1.5">
          <li v-for="m in images" :key="m.id">
            <button
              type="button"
              :aria-label="`${t.mediaOpen}: ${m.name}`"
              class="block aspect-square w-full overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
              @click="lightbox = m"
            >
              <img v-if="m.url" :src="m.url" alt="" loading="lazy" class="size-full object-cover" />
              <ImageIcon v-else aria-hidden="true" class="m-auto size-5 text-muted-foreground" />
            </button>
          </li>
        </ul>
      </NqTabsPanel>
      <NqTabsPanel value="files">
        <p v-if="files.length === 0" class="py-4 text-center text-caption text-muted-foreground">{{ t.mediaEmpty }}</p>
        <ul v-else class="flex flex-col gap-1">
          <li v-for="m in files" :key="m.id">
            <a :href="m.url" :download="m.name" class="flex items-center gap-2 rounded-control p-1.5 no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
              <FileText aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <span dir="auto" class="min-w-0 flex-1 truncate text-body-sm text-foreground">{{ m.name }}</span>
              <bdi v-if="m.size" dir="ltr" class="text-caption text-muted-foreground">{{ formatBytes(m.size) }}</bdi>
            </a>
          </li>
        </ul>
      </NqTabsPanel>
      <NqTabsPanel value="links">
        <p v-if="links.length === 0" class="py-4 text-center text-caption text-muted-foreground">{{ t.mediaEmpty }}</p>
        <ul v-else class="flex flex-col gap-1">
          <li v-for="m in links" :key="m.id">
            <a :href="m.url" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 rounded-control p-1.5 no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
              <ExternalLink aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span dir="auto" class="truncate text-body-sm text-foreground">{{ m.name }}</span>
                <bdi dir="ltr" class="truncate text-caption text-muted-foreground">{{ hostOf(m.url ?? "") }}</bdi>
              </span>
            </a>
          </li>
        </ul>
      </NqTabsPanel>
    </NqTabs>
    <NqDialog v-model:open="lightboxOpen">
      <NqDialogContent class="max-w-3xl">
        <NqDialogTitle class="truncate text-body-sm">{{ lightbox?.name }}</NqDialogTitle>
        <img v-if="lightbox?.url" :src="lightbox.url" :alt="lightbox.name" class="max-h-[70dvh] w-full rounded-control object-contain" />
        <a v-if="lightbox?.url" :href="lightbox.url" :download="lightbox.name" class="self-start text-body-sm text-foreground underline decoration-nq-line underline-offset-4">{{ t.download }}</a>
      </NqDialogContent>
    </NqDialog>
  </aside>
</template>
