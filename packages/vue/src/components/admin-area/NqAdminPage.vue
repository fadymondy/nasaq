<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from "../breadcrumb";
import { adminStrings } from "./strings";

// The body of an admin screen: breadcrumb, title, description, page actions, then your content.
// Slots: default, title (instead of the title prop), description, actions.
export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

interface Props {
  title?: string;
  description?: string;
  breadcrumbs?: readonly AdminBreadcrumb[];
  breadcrumbLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, breadcrumbs: undefined, breadcrumbLabel: undefined });
const nasaq = useNasaq();
const t = computed(() => adminStrings(nasaq.locale.value));
</script>

<template>
  <div data-slot="admin-page" :class="cn('mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6', props.class)">
    <header class="flex flex-col gap-3">
      <NqBreadcrumb v-if="props.breadcrumbs?.length" :aria-label="props.breadcrumbLabel ?? t.breadcrumb">
        <NqBreadcrumbList>
          <template v-for="(crumb, i) in props.breadcrumbs" :key="`${crumb.label}-${i}`">
            <NqBreadcrumbSeparator v-if="i > 0" />
            <NqBreadcrumbItem>
              <NqBreadcrumbPage v-if="i === props.breadcrumbs.length - 1 || !crumb.href">{{ crumb.label }}</NqBreadcrumbPage>
              <NqBreadcrumbLink v-else :href="crumb.href">{{ crumb.label }}</NqBreadcrumbLink>
            </NqBreadcrumbItem>
          </template>
        </NqBreadcrumbList>
      </NqBreadcrumb>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <h1 class="text-h1 text-foreground"><slot name="title">{{ props.title }}</slot></h1>
          <p v-if="props.description || $slots.description" class="text-body text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
        </div>
        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
      </div>
    </header>
    <slot />
  </div>
</template>
