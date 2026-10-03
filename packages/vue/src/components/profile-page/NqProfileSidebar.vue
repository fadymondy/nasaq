<script setup lang="ts">
import { CalendarDays, Download, Globe, Mail, MapPin } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatDate } from "../numeric";
import { NqGitHubLogo } from "../oauth-buttons";
import { NqAvailabilityBadge } from "../personal-widgets";
import { NqSeparator } from "../separator";
import { linkText } from "./profile-logic";
import { fill, useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileSidebarData } from "./types";

// The identity column: a large avatar, name and handle, location and links, one full-width action, then the bio and the join date.
// Slots: `action` replaces the buttons; the default slot goes under the bio.
interface Props {
  profile: ProfileSidebarData;
  /** The owner is looking: an "Edit profile" button replaces contact and CV. */
  owner?: boolean;
  /** Same as `owner`, as a link to the settings page. */
  editHref?: string;
  /** Show the contact button as a real button (the host handles the `contact` event) instead of a mailto link. */
  contactButton?: boolean;
  labels?: Partial<ProfilePageLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ contact: []; edit: [] }>();
const { t, locale } = useProfileStrings(() => props.labels);
const p = computed(() => props.profile);
const bio = computed(() => p.value.bio ?? p.value.headline);
const isOwner = computed(() => Boolean(props.owner || props.editHref));
const metaRow = "flex min-w-0 items-center gap-2 text-body-sm text-foreground";
const metaIcon = "size-4 shrink-0 text-muted-foreground";
const external = (href: string) => /^https?:\/\//i.test(href);
const named = (kind: string) => kind === "github" || kind === "website" || kind === "email";
</script>

<template>
  <header data-slot="profile-sidebar" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <div class="flex items-center gap-4 @4xl:flex-col @4xl:items-start">
      <NqAvatar :name="p.name" :src="p.avatar" class="size-20 shrink-0 text-h1 ring-1 ring-border @2xl:size-28 @4xl:size-56 @4xl:text-display" />
      <div class="flex min-w-0 flex-col gap-1">
        <h1 dir="auto" class="text-balance text-h1 text-foreground">{{ p.name }}</h1>
        <p v-if="p.handle" dir="ltr" class="truncate text-start font-mono text-body-sm text-muted-foreground">{{ p.handle }}</p>
      </div>
    </div>
    <ul v-if="p.availability || p.location || p.links?.length" :aria-label="t.profileDetails" class="flex list-none flex-col gap-2 p-0">
      <li v-if="p.availability">
        <NqAvailabilityBadge :status="p.availability" :note="p.availabilityNote" class="h-auto min-h-6 max-w-full flex-wrap py-0.5 text-start whitespace-normal" />
      </li>
      <li v-if="p.location" :class="metaRow">
        <NqIcon :icon="MapPin" :class="metaIcon" />
        <bdi class="truncate">{{ p.location }}</bdi>
      </li>
      <li v-for="l in p.links ?? []" :key="`${l.kind}-${l.href}`" :class="metaRow">
        <NqGitHubLogo v-if="l.kind === 'github'" class="size-4 shrink-0" />
        <NqIcon v-else-if="l.kind === 'website'" :icon="Globe" :class="metaIcon" />
        <NqIcon v-else-if="l.kind === 'email'" :icon="Mail" :class="metaIcon" />
        <span v-else class="shrink-0 text-muted-foreground">{{ l.label }}</span>
        <a
          :href="l.href"
          :target="external(l.href) ? '_blank' : undefined"
          :rel="external(l.href) ? 'noopener noreferrer' : undefined"
          :aria-label="named(l.kind) ? `${l.label}: ${linkText(l)}` : undefined"
          dir="ltr"
          class="truncate rounded-[2px] outline-none hover:underline hover:decoration-nq-line-strong hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        >{{ linkText(l) }}</a>
      </li>
    </ul>
    <div v-if="$slots.action || isOwner || props.contactButton || p.email || p.cvHref" class="flex flex-col gap-2">
      <slot name="action">
        <template v-if="isOwner">
          <NqButton v-if="props.editHref" as="a" :href="props.editHref" variant="secondary" class="w-full">{{ t.editProfile }}</NqButton>
          <NqButton v-else variant="secondary" class="w-full" @click="emit('edit')">{{ t.editProfile }}</NqButton>
        </template>
        <template v-else>
          <NqButton v-if="props.contactButton" variant="primary" class="w-full" @click="emit('contact')"><NqIcon :icon="Mail" />{{ t.contact }}</NqButton>
          <NqButton v-else-if="p.email" as="a" :href="`mailto:${p.email}`" variant="primary" class="w-full"><NqIcon :icon="Mail" />{{ t.contact }}</NqButton>
          <NqButton v-if="p.cvHref" as="a" :href="p.cvHref" download variant="secondary" class="w-full"><NqIcon :icon="Download" />{{ t.downloadCv }}</NqButton>
        </template>
      </slot>
    </div>
    <template v-if="bio || p.joined">
      <NqSeparator />
      <div class="flex flex-col gap-3">
        <p v-if="bio" dir="auto" class="text-pretty text-body-sm text-nq-fg-body">{{ bio }}</p>
        <p v-if="p.joined" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
          <NqIcon :icon="CalendarDays" class="size-3.5" />
          {{ fill(t.joined, { date: formatDate(p.joined, locale, { month: "long", year: "numeric" }) }) }}
        </p>
      </div>
    </template>
    <slot />
  </header>
</template>
