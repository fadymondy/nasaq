<script setup lang="ts">
import { ListTree, Menu, Pencil } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { extractToc } from "../blog-index/blog-model";
import { NqPostBody, NqTableOfContents, useActiveHeading } from "../blog-post";
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from "../breadcrumb";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqIcon } from "../icon";
import { NqDateTime } from "../numeric";
import { NqSheet, NqSheetContent, NqSheetDescription, NqSheetTitle } from "../sheet";
import { NqText } from "../text";
import { docsPageMarkdown, docsPrevNext, docsTrail, type DocsNavNode } from "./docs-model";
import NqDocsPagerLink from "./NqDocsPagerLink.vue";
import NqDocsSidebar from "./NqDocsSidebar.vue";
import { docsShellStrings, type DocsPageData, type DocsShellLabels, type DocsShellStrings } from "./labels";

// The documentation layout: a top bar, a tree sidebar (a drawer on phones) with a filter, the page with breadcrumb, title,
// "Copy page", callouts and an "On this page" rail that follows the reader, and previous/next links. It shows the page you
// pass and emits `navigate`; routing is yours.
// Slots: `brand` (left of the top bar), `actions` (end of the top bar), `sidebar-header` (above the tree), `body` ({ page }, replaces the Markdown body).
interface Props {
  /** The navigation tree: sections with pages. */
  nav: DocsNavNode[];
  /** The page to show. Its `id` is the active item of the sidebar. */
  page: DocsPageData;
  /** Filter box above the tree. Default true. */
  searchable?: boolean;
  /** "Copy page" puts the page as Markdown on the clipboard, for pasting to an AI. Default true. */
  copyPage?: boolean;
  /** Pixels headings keep from the top when scrolled to. Default 96. */
  scrollOffset?: number;
  labels?: DocsShellLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { searchable: true, copyPage: true, scrollOffset: 96, labels: undefined });
/** A page was picked in the sidebar or the pager. Navigate, then pass the new `page`. */
const emit = defineEmits<{ navigate: [id: string] }>();

const nq = useNasaq();
const t = computed<DocsShellStrings>(() => ({ ...docsShellStrings[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const menuOpen = ref(false);
const bodyRef = ref<HTMLDivElement | null>(null);
const toc = computed(() => extractToc(props.page.markdown, { minLevel: 2, maxLevel: 3 }));
const active = useActiveHeading(
  () => toc.value.map((i) => i.id),
  bodyRef,
  () => props.scrollOffset,
);
const trail = computed(() => docsTrail(props.nav, props.page.id));
const pn = computed(() => docsPrevNext(props.nav, props.page.id));
function navigate(id: string) {
  menuOpen.value = false;
  emit("navigate", id);
}
</script>

<template>
  <div data-slot="docs-shell" :class="cn('flex min-h-dvh flex-col bg-background text-foreground', props.class)">
    <header class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-4">
      <NqButton variant="ghost" size="icon" class="lg:hidden" :aria-label="t.menu" @click="menuOpen = true">
        <NqIcon :icon="Menu" />
      </NqButton>
      <div class="flex min-w-0 items-center gap-2 font-semibold"><slot name="brand" /></div>
      <div class="ms-auto flex items-center gap-1"><slot name="actions" /></div>
    </header>

    <div class="mx-auto flex w-full max-w-[90rem] flex-1">
      <aside data-slot="docs-sidebar" class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-e border-border p-3 lg:block">
        <NqDocsSidebar :nav="props.nav" :active-id="props.page.id" :searchable="props.searchable" :t="t" @navigate="navigate">
          <template #header><slot name="sidebar-header" /></template>
        </NqDocsSidebar>
      </aside>

      <main class="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <article class="mx-auto flex max-w-[46rem] flex-col gap-6">
          <NqBreadcrumb v-if="trail.length" :aria-label="t.crumbs">
            <NqBreadcrumbList>
              <NqBreadcrumbItem>{{ t.docs }}</NqBreadcrumbItem>
              <template v-for="(node, i) in trail" :key="node.id">
                <NqBreadcrumbSeparator />
                <NqBreadcrumbItem>
                  <NqBreadcrumbPage v-if="i === trail.length - 1">{{ node.title }}</NqBreadcrumbPage>
                  <span v-else>{{ node.title }}</span>
                </NqBreadcrumbItem>
              </template>
            </NqBreadcrumbList>
          </NqBreadcrumb>

          <header class="flex flex-col gap-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <NqText as="h1" variant="h1" dir="auto" class="min-w-0 text-start">{{ props.page.title }}</NqText>
              <NqCopyButton v-if="props.copyPage" :value="() => docsPageMarkdown(props.page)" :label="t.copyPage" :copied-label="t.copied" variant="secondary" size="sm" class="shrink-0">
                {{ t.copyPage }}
              </NqCopyButton>
            </div>
            <p v-if="props.page.description" dir="auto" class="text-body-lg text-muted-foreground">{{ props.page.description }}</p>
          </header>

          <details v-if="toc.length" class="rounded-card border border-border px-3 py-2 xl:hidden">
            <summary class="flex cursor-pointer list-none items-center gap-2 rounded-[2px] text-body-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
              <NqIcon :icon="ListTree" class="size-4 text-muted-foreground" />
              {{ t.onThisPage }}
            </summary>
            <NqTableOfContents :items="toc" :active-id="active" :title="t.onThisPage" class="mt-2 [&>p]:sr-only" />
          </details>

          <div ref="bodyRef" data-slot="docs-body" class="min-w-0">
            <slot name="body" :page="props.page"><NqPostBody :markdown="props.page.markdown" :scroll-offset="props.scrollOffset" /></slot>
          </div>

          <div v-if="props.page.updated || props.page.editHref" class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-caption text-muted-foreground">
            <span v-if="props.page.updated">{{ t.updated }} <NqDateTime :value="props.page.updated" :format="{ dateStyle: 'medium' }" /></span>
            <span v-else />
            <a v-if="props.page.editHref" :href="props.page.editHref" class="inline-flex items-center gap-1.5 rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
              <NqIcon :icon="Pencil" class="size-3.5" />
              {{ t.editPage }}
            </a>
          </div>

          <nav v-if="pn.prev || pn.next" :aria-label="t.pager" class="grid gap-3 sm:grid-cols-2">
            <NqDocsPagerLink v-if="pn.prev" :node="pn.prev" :label="t.previous" direction="prev" @navigate="navigate" />
            <span v-else />
            <NqDocsPagerLink v-if="pn.next" :node="pn.next" :label="t.next" direction="next" @navigate="navigate" />
          </nav>
        </article>
      </main>

      <aside data-slot="docs-toc" class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto p-4 xl:block">
        <NqTableOfContents :items="toc" :active-id="active" :title="t.onThisPage" />
      </aside>
    </div>

    <NqSheet v-model:open="menuOpen">
      <NqSheetContent side="start" :close-label="t.closeMenu" class="p-3">
        <NqSheetTitle class="sr-only">{{ t.nav }}</NqSheetTitle>
        <NqSheetDescription class="sr-only">{{ t.nav }}</NqSheetDescription>
        <div class="mt-8 min-h-0 flex-1 overflow-y-auto">
          <NqDocsSidebar :nav="props.nav" :active-id="props.page.id" :searchable="props.searchable" :t="t" @navigate="navigate">
            <template #header><slot name="sidebar-header" /></template>
          </NqDocsSidebar>
        </div>
      </NqSheetContent>
    </NqSheet>
  </div>
</template>
