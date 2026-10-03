<script setup lang="ts">
import { Blocks, Store } from "lucide-vue-next";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatDate } from "../numeric";
import { NqProductIcon } from "../product-switcher";
import { NqEmptyState } from "../states";
import NqProfileSection from "./NqProfileSection.vue";
import { fill, useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileApp } from "./types";

// The apps the member uses, with their official marks, role, organisation and when they last opened each one.
const props = defineProps<{
  apps: ProfileApp[];
  /** Where to find more apps: shown in the header and in the empty state. */
  browseHref?: string;
  labels?: Partial<ProfilePageLabels>;
}>();
const { t, locale } = useProfileStrings(() => props.labels);
const meta = (app: ProfileApp) =>
  [app.org, app.lastUsed && fill(t.value.lastUsed, { date: formatDate(app.lastUsed, locale.value, { day: "numeric", month: "short" }) })].filter(Boolean).join(" · ");
const cls = "flex min-w-0 flex-1 items-start gap-3 rounded-card border border-border bg-card p-4";
</script>

<template>
  <NqProfileSection :title="t.apps" :description="t.appsHint" :count="props.apps.length">
    <template v-if="props.apps.length && props.browseHref" #action>
      <NqButton as="a" :href="props.browseHref" variant="ghost" size="sm"><NqIcon :icon="Store" />{{ t.browseApps }}</NqButton>
    </template>
    <ul v-if="props.apps.length" class="grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2">
      <li v-for="app in props.apps" :key="app.id" class="flex">
        <component
          :is="app.href ? 'a' : 'div'"
          :href="app.href"
          :class="[cls, app.href && 'transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus']"
        >
          <NqProductIcon :product="app" :size="36" />
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="flex min-w-0 items-center gap-2">
              <span class="truncate text-label text-foreground">{{ app.name }}</span>
              <NqBadge v-if="app.plan" variant="accent">{{ app.plan }}</NqBadge>
              <NqBadge v-if="app.role" variant="neutral">{{ app.role }}</NqBadge>
            </span>
            <span v-if="app.description" class="truncate text-body-sm text-muted-foreground">{{ app.description }}</span>
            <span v-if="meta(app)" class="truncate text-caption text-muted-foreground">{{ meta(app) }}</span>
          </span>
          <NqBadge v-if="app.badge !== undefined && app.badge !== null" variant="neutral" class="shrink-0 tabular-nums">{{ app.badge }}</NqBadge>
        </component>
      </li>
    </ul>
    <NqEmptyState v-else :icon="Blocks" :title="t.noApps" :description="t.noAppsHint" class="rounded-card border border-border bg-card py-12">
      <template v-if="props.browseHref" #actions>
        <NqButton as="a" :href="props.browseHref" variant="ghost" size="sm"><NqIcon :icon="Store" />{{ t.browseApps }}</NqButton>
      </template>
    </NqEmptyState>
  </NqProfileSection>
</template>
