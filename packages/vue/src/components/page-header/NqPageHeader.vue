<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from "../breadcrumb";
import { NqIcon } from "../icon";

// The top of a page: an optional back link or breadcrumb trail, the page title, a line of description,
// small meta facts and the page's actions at the inline end. The actions wrap under the title on narrow screens.
const STRINGS = {
  en: { back: "Back" },
  ar: { back: "رجوع" },
};

export interface PageHeaderCrumb {
  /** Leave out `href` on the last crumb: it is the current page. */
  label: string;
  href?: string;
}
export type PageHeaderLabels = (typeof STRINGS)["en"];

interface Props {
  /** The page title. Or use the #title slot. */
  title?: string;
  /** One or two lines under the title. Or the #description slot. */
  description?: string;
  /** The trail above the title. The last crumb without an `href` is marked as the current page. */
  breadcrumbs?: readonly PageHeaderCrumb[];
  /** A "Back" link above the title, for detail pages reached from a list. */
  backHref?: string;
  /** Called instead of following `backHref`, for client-side routers (listen with @back). */
  onBack?: () => void;
  /** Heading element. Default "h1". */
  as?: "h1" | "h2";
  labels?: Partial<PageHeaderLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, breadcrumbs: undefined, backHref: undefined, onBack: undefined, as: "h1", labels: undefined });
defineSlots<{ title?(): unknown; description?(): unknown; meta?(): unknown; actions?(): unknown }>();
const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const hasBack = computed(() => props.backHref !== undefined || props.onBack !== undefined);
function onBackClick(event: MouseEvent) {
  if (!props.onBack) return;
  event.preventDefault();
  props.onBack();
}
</script>

<template>
  <header data-slot="page-header" :class="cn('flex flex-col gap-3', props.class)">
    <NqBreadcrumb v-if="props.breadcrumbs && props.breadcrumbs.length > 0" data-slot="page-header-breadcrumbs">
      <NqBreadcrumbList>
        <template v-for="(crumb, i) in props.breadcrumbs" :key="i">
          <NqBreadcrumbItem>
            <NqBreadcrumbLink v-if="crumb.href && i < props.breadcrumbs.length - 1" :href="crumb.href">{{ crumb.label }}</NqBreadcrumbLink>
            <NqBreadcrumbPage v-else>{{ crumb.label }}</NqBreadcrumbPage>
          </NqBreadcrumbItem>
          <NqBreadcrumbSeparator v-if="i < props.breadcrumbs.length - 1" />
        </template>
      </NqBreadcrumbList>
    </NqBreadcrumb>
    <a
      v-if="hasBack"
      data-slot="page-header-back"
      :href="props.backHref ?? '#'"
      class="inline-flex w-fit items-center gap-1.5 rounded-control text-body-sm text-muted-foreground transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4"
      @click="onBackClick"
    >
      <NqIcon :icon="ArrowLeft" directional />
      {{ t.back }}
    </a>
    <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div class="flex min-w-0 flex-1 basis-80 flex-col gap-1">
        <component :is="props.as" data-slot="page-header-title" class="text-h1 text-balance text-foreground">
          <slot name="title">{{ props.title }}</slot>
        </component>
        <p v-if="props.description || $slots.description" data-slot="page-header-description" class="max-w-prose text-pretty text-body-sm text-muted-foreground">
          <slot name="description">{{ props.description }}</slot>
        </p>
        <div v-if="$slots.meta" data-slot="page-header-meta" class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
          <slot name="meta" />
        </div>
      </div>
      <div v-if="$slots.actions" data-slot="page-header-actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
